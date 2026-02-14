const { spawn } = require('child_process');
const { copyFileSync, mkdirSync, existsSync, watch } = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dspDir = path.join(root, 'dsp');
const dspSrcDir = path.join(dspDir, 'src');
const wasmSrc = path.join(dspDir, '_build', 'wasm', 'debug', 'build', 'src', 'src.wasm');
const wasmDestDir = path.join(root, 'ui', 'public', 'wasm');
const wasmDest = path.join(wasmDestDir, 'webvst_dsp.wasm');
const debounceMs = 150;
const buildTimeoutMs = Number.parseInt(process.env.DEV_DSP_BUILD_TIMEOUT_MS ?? '45000', 10);

let buildInProgress = false;
let buildQueued = false;
let debounceTimer = null;
let srcWatcher = null;

function copyWasm() {
  try {
    if (existsSync(wasmSrc)) {
      mkdirSync(wasmDestDir, { recursive: true });
      copyFileSync(wasmSrc, wasmDest);
      console.log('[dev-dsp] Copied WASM -> ui/public/wasm/webvst_dsp.wasm');
    }
  } catch (e) {
    console.error('[dev-dsp] Copy failed:', e.message);
  }
}

function runMoonBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn('moon', ['build', '--target', 'wasm'], {
      cwd: dspDir,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: false,
    });
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        console.error(`[dev-dsp] Build timed out after ${buildTimeoutMs}ms. Terminating moon build...`);
      }

      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
          stdio: 'ignore',
          shell: false,
        });
      } else {
        child.kill('SIGKILL');
      }

      finish(new Error(`moon build timed out after ${buildTimeoutMs}ms`));
    }, buildTimeoutMs);

    const finish = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    child.on('error', (error) => {
      finish(new Error(`failed to start moon build: ${error.message}`));
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        finish();
        return;
      }

      if (signal) {
        finish(new Error(`moon build exited due to signal ${signal}`));
        return;
      }

      finish(new Error(`moon build exited with code ${code}`));
    });
  });
}

function runMoonClean() {
  return new Promise((resolve, reject) => {
    const child = spawn('moon', ['clean'], {
      cwd: dspDir,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: false,
    });

    child.on('error', (error) => {
      reject(new Error(`failed to start moon clean: ${error.message}`));
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`moon clean exited due to signal ${signal}`));
        return;
      }

      reject(new Error(`moon clean exited with code ${code}`));
    });
  });
}

async function buildOnce(reason) {
  if (buildInProgress) {
    buildQueued = true;
    return;
  }

  buildInProgress = true;
  try {
    console.log(`[dev-dsp] Building (${reason})...`);
    try {
      await runMoonBuild();
    } catch (e) {
      console.warn(`[dev-dsp] Build attempt failed, retrying after clean: ${e.message}`);
      await runMoonClean();
      await runMoonBuild();
    }
    copyWasm();
  } catch (e) {
    console.error('[dev-dsp] Build failed:', e.message);
  } finally {
    buildInProgress = false;
    if (buildQueued) {
      buildQueued = false;
      buildOnce('queued change');
    }
  }
}

function scheduleBuild(reason) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    buildOnce(reason);
  }, debounceMs);
}

async function start() {
  await buildOnce('initial');

  srcWatcher = watch(dspSrcDir, { recursive: true }, (_eventType, filename) => {
    if (!filename) {
      scheduleBuild('source change');
      return;
    }

    if (!/\.(mbt|json)$/.test(filename)) {
      return;
    }

    scheduleBuild(`source change: ${filename}`);
  });

  srcWatcher.on('error', (e) => {
    console.error('[dev-dsp] Watcher error:', e.message);
  });

  console.log('[dev-dsp] Watching dsp/src for changes...');
}

process.on('SIGINT', () => {
  if (srcWatcher) {
    srcWatcher.close();
  }
  process.exit();
});

start().catch((e) => {
  console.error('[dev-dsp] Fatal error:', e.message);
  process.exit(1);
});

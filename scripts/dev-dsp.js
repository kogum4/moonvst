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
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`moon build exited with code ${code}`));
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
    await runMoonBuild();
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

const { execSync, spawn } = require('child_process');
const { copyFileSync, mkdirSync, watchFile, existsSync } = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dspDir = path.join(root, 'dsp');
const wasmSrc = path.join(dspDir, '_build', 'wasm', 'debug', 'build', 'src', 'src.wasm');
const wasmDestDir = path.join(root, 'ui', 'public', 'wasm');
const wasmDest = path.join(wasmDestDir, 'webvst_dsp.wasm');

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

// Initial build (release for wasm)
console.log('[dev-dsp] Initial build...');
execSync('moon build --target wasm', { cwd: dspDir, stdio: 'inherit' });
copyWasm();

// Watch the wasm output file for changes and copy
watchFile(wasmSrc, { interval: 500 }, () => {
  copyWasm();
});

// Start moon build --watch
const child = spawn('moon', ['build', '--watch', '--target', 'wasm'], {
  cwd: dspDir,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code);
});

process.on('SIGINT', () => {
  child.kill();
  process.exit();
});

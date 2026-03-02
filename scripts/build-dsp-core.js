const { execFileSync } = require('child_process');
const { copyFileSync, existsSync, mkdirSync } = require('fs');
const path = require('path');

function resolveWasmPath(buildDir, release) {
  const mode = release ? 'release' : 'debug';
  return path.join(buildDir, '_build', 'wasm', mode, 'build', 'src', 'src.wasm');
}

function resolveArchTargetArgs({ platform, arch }) {
  if (arch === 'x64' || arch === 'amd64') {
    return ['--target=x86_64', '--cpu=x86-64'];
  }
  if (platform === 'darwin' && (arch === 'arm64' || arch === 'aarch64')) {
    return ['--target=aarch64-apple-darwin'];
  }
  return [];
}

function resolveSizeLevel(arch) {
  if (arch === 'arm64' || arch === 'aarch64') {
    // WAMR/LLVM rejects the medium code model on AArch64.
    return '3';
  }
  return '1';
}

function resolveWamrcPath({ rootDir, platform = process.platform, exists = existsSync }) {
  const candidates = platform === 'win32'
    ? [
      path.join(rootDir, 'libs', 'wamr', 'wamr-compiler', 'build', 'Release', 'wamrc.exe'),
      path.join(rootDir, 'libs', 'wamr', 'wamr-compiler', 'build', 'wamrc.exe'),
    ]
    : [
      path.join(rootDir, 'libs', 'wamr', 'wamr-compiler', 'build', 'wamrc'),
      path.join(rootDir, 'libs', 'wamr', 'wamr-compiler', 'build', 'Release', 'wamrc'),
    ];

  const wamrcPath = candidates.find((candidate) => exists(candidate));
  if (!wamrcPath) {
    const setupHint = platform === 'win32' ? 'setup-windows.ps1' : 'setup-macos.sh';
    throw new Error(`wamrc not found. Checked: ${candidates.join(', ')}. Run ${setupHint} first to build wamrc.`);
  }

  return wamrcPath;
}

function createBuildPlan({
  rootDir,
  platform = process.platform,
  arch = process.arch,
  env = process.env,
  release = false,
}) {
  const buildDir = env.MOONVST_DSP_BUILD_DIR
    ? path.resolve(rootDir, env.MOONVST_DSP_BUILD_DIR)
    : path.join(rootDir, 'build', 'dsp-active');
  const wasmPath = resolveWasmPath(buildDir, release);

  return {
    rootDir,
    buildDir,
    wasmPath,
    moonArgs: release ? ['build', '--target', 'wasm', '--release'] : ['build', '--target', 'wasm'],
    wasmDestDir: path.join(rootDir, 'packages', 'ui-core', 'public', 'wasm'),
    wasmDestPath: path.join(rootDir, 'packages', 'ui-core', 'public', 'wasm', 'moonvst_dsp.wasm'),
    aotDestDir: path.join(rootDir, 'plugin', 'resources'),
    aotDestPath: path.join(rootDir, 'plugin', 'resources', 'moonvst_dsp.aot'),
    wamrcSizeLevel: resolveSizeLevel(arch),
    wamrcTargetArgs: resolveArchTargetArgs({ platform, arch }),
    platform,
  };
}

function runBuildDspCore({
  rootDir = path.resolve(__dirname, '..'),
  platform = process.platform,
  arch = process.arch,
  env = process.env,
  args = process.argv.slice(2),
  exec = execFileSync,
  exists = existsSync,
  mkdir = mkdirSync,
  copy = copyFileSync,
} = {}) {
  const release = args.includes('--release');
  const plan = createBuildPlan({ rootDir, platform, arch, env, release });

  console.log('=== Building MoonBit DSP ===');
  exec('moon', plan.moonArgs, {
    cwd: plan.buildDir,
    stdio: 'inherit',
  });

  if (!exists(plan.wasmPath)) {
    throw new Error(`WASM output not found at ${plan.wasmPath}`);
  }

  console.log('=== Copying WASM to UI public ===');
  mkdir(plan.wasmDestDir, { recursive: true });
  copy(plan.wasmPath, plan.wasmDestPath);

  console.log('=== AOT Compiling ===');
  const wamrcPath = resolveWamrcPath({ rootDir, platform, exists });
  mkdir(plan.aotDestDir, { recursive: true });
  exec(
    wamrcPath,
    ['--opt-level=3', `--size-level=${plan.wamrcSizeLevel}`, ...plan.wamrcTargetArgs, '-o', plan.aotDestPath, plan.wasmPath],
    { stdio: 'inherit' },
  );

  console.log('=== DSP build complete ===');
  return plan;
}

if (require.main === module) {
  runBuildDspCore();
}

module.exports = {
  createBuildPlan,
  resolveWamrcPath,
  resolveWasmPath,
  resolveSizeLevel,
  runBuildDspCore,
};

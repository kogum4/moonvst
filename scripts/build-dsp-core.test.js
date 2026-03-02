const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

test('build-dsp-core module exports planning utilities', () => {
  const mod = require('./build-dsp-core');
  assert.equal(typeof mod.createBuildPlan, 'function');
  assert.equal(typeof mod.resolveWasmPath, 'function');
  assert.equal(typeof mod.resolveWamrcPath, 'function');
  assert.equal(typeof mod.resolveSizeLevel, 'function');
});

test('createBuildPlan uses debug wasm path by default and x86 target args on x64', () => {
  const { createBuildPlan } = require('./build-dsp-core');
  const plan = createBuildPlan({
    rootDir: path.join(path.sep, 'repo'),
    platform: 'linux',
    arch: 'x64',
    env: {},
    release: false,
  });

  assert.equal(plan.buildDir, path.join(path.sep, 'repo', 'build', 'dsp-active'));
  assert.equal(plan.wasmPath, path.join(path.sep, 'repo', 'build', 'dsp-active', '_build', 'wasm', 'debug', 'build', 'src', 'src.wasm'));
  assert.deepEqual(plan.moonArgs, ['build', '--target', 'wasm']);
  assert.deepEqual(plan.wamrcTargetArgs, ['--target=x86_64', '--cpu=x86-64']);
  assert.equal(plan.wamrcSizeLevel, '1');
});

test('createBuildPlan honors --release and MOONVST_DSP_BUILD_DIR', () => {
  const { createBuildPlan } = require('./build-dsp-core');
  const rootDir = path.join(path.sep, 'repo');
  const customBuildDir = path.join(path.sep, 'custom', 'dsp');
  const plan = createBuildPlan({
    rootDir,
    platform: 'linux',
    arch: 'arm64',
    env: { MOONVST_DSP_BUILD_DIR: customBuildDir },
    release: true,
  });

  assert.equal(plan.buildDir, path.resolve(rootDir, customBuildDir));
  assert.equal(plan.wasmPath, path.join(path.resolve(rootDir, customBuildDir), '_build', 'wasm', 'release', 'build', 'src', 'src.wasm'));
  assert.deepEqual(plan.moonArgs, ['build', '--target', 'wasm', '--release']);
  assert.deepEqual(plan.wamrcTargetArgs, []);
  assert.equal(plan.wamrcSizeLevel, '3');
});

test('createBuildPlan uses darwin arm64 triple for wamrc target', () => {
  const { createBuildPlan } = require('./build-dsp-core');
  const plan = createBuildPlan({
    rootDir: path.join(path.sep, 'repo'),
    platform: 'darwin',
    arch: 'arm64',
    env: {},
    release: false,
  });

  assert.deepEqual(plan.wamrcTargetArgs, ['--target=aarch64-apple-darwin']);
  assert.equal(plan.wamrcSizeLevel, '3');
});

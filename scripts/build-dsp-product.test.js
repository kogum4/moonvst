const test = require('node:test');
const assert = require('node:assert/strict');

test('build-dsp-product exports runBuildDspProduct', () => {
  const mod = require('./build-dsp-product');
  assert.equal(typeof mod.runBuildDspProduct, 'function');
});

test('runBuildDspProduct selects product and invokes node build-dsp-core.js', () => {
  const calls = [];
  const { runBuildDspProduct } = require('./build-dsp-product');

  runBuildDspProduct({
    product: 'showcase',
    root: '/repo',
    args: ['--release'],
    selectProduct: (value) => {
      calls.push(['select', value]);
    },
    execFileSync: (command, commandArgs, options) => {
      calls.push(['exec', command, commandArgs, options]);
    },
  });

  assert.deepEqual(calls[0], ['select', 'showcase']);
  assert.equal(calls[1][0], 'exec');
  assert.equal(calls[1][1], process.execPath);
  assert.deepEqual(calls[1][2], ['scripts/build-dsp-core.js', '--release']);
  assert.equal(calls[1][3].cwd, '/repo');
  assert.equal(calls[1][3].stdio, 'inherit');
});

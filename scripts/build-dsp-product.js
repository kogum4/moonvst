const { execFileSync } = require('child_process');
const path = require('path');
const { selectProduct } = require('./select-product');

function runBuildDspProduct({
  product = process.env.MOONVST_PRODUCT || 'template',
  root = path.resolve(__dirname, '..'),
  args = process.argv.slice(2),
  selectProduct: select = selectProduct,
  execFileSync: execFile = execFileSync,
} = {}) {
  select(product);
  execFile(process.execPath, ['scripts/build-dsp-core.js', ...args], {
    cwd: root,
    stdio: 'inherit',
  });
}

if (require.main === module) {
  runBuildDspProduct();
}

module.exports = {
  runBuildDspProduct,
};

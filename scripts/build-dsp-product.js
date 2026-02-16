const { execSync } = require('child_process');
const path = require('path');
const { selectProduct } = require('./select-product');

const product = process.env.MOONVST_PRODUCT || 'template';
selectProduct(product);

const root = path.resolve(__dirname, '..');
const platformScript = process.platform === 'win32'
  ? 'powershell -File scripts/build-dsp.ps1'
  : 'bash scripts/build-dsp.sh';

execSync(platformScript, {
  cwd: root,
  stdio: 'inherit',
});

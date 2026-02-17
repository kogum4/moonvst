const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VALID_PRODUCT = /^[a-z0-9][a-z0-9-]*$/;
const args = process.argv.slice(2);
const product = process.env.MOONVST_PRODUCT || 'template';
const enableUnity = args.includes('--unity');

if (!VALID_PRODUCT.test(product)) {
  throw new Error(`invalid product name: ${product}`);
}

const root = path.resolve(__dirname, '..');
const productDir = path.join(root, 'products', product);
if (!fs.existsSync(productDir)) {
  throw new Error(`missing product directory: ${productDir}`);
}

const cmakeArgs = [
  '-B',
  'build',
  '-DCMAKE_BUILD_TYPE=Release',
  `-DMOONVST_PRODUCT=${product}`,
  `-DMOONVST_ENABLE_UNITY=${enableUnity ? 'ON' : 'OFF'}`,
];

execFileSync('cmake', cmakeArgs, {
  cwd: root,
  stdio: 'inherit',
});

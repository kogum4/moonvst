const fs = require('fs');
const path = require('path');

const VALID_PRODUCT = /^[a-z0-9][a-z0-9-]*$/;
const REQUIRED_DSP_FILES = ['lib.mbt', 'params.mbt', 'lib_test.mbt'];

function parseProductFromArgs(argv) {
  const productFlagIndex = argv.indexOf('--product');
  if (productFlagIndex !== -1 && argv[productFlagIndex + 1]) {
    return argv[productFlagIndex + 1];
  }
  return process.env.MOONVST_PRODUCT || 'template';
}

function ensureValidProduct(product) {
  if (!VALID_PRODUCT.test(product)) {
    throw new Error(`invalid product name: ${product}`);
  }
}

function copyIfChanged(fromPath, toPath) {
  const source = fs.readFileSync(fromPath, 'utf8');
  const current = fs.existsSync(toPath) ? fs.readFileSync(toPath, 'utf8') : null;
  if (current === source) {
    return false;
  }
  fs.writeFileSync(toPath, source, 'utf8');
  return true;
}

function selectProduct(product) {
  ensureValidProduct(product);

  const root = path.resolve(__dirname, '..');
  const dspEntryDir = path.join(root, 'products', product, 'dsp-entry');
  const dspSrcDir = path.join(root, 'dsp', 'src');

  if (!fs.existsSync(dspEntryDir)) {
    throw new Error(`missing product dsp-entry: ${dspEntryDir}`);
  }

  fs.mkdirSync(dspSrcDir, { recursive: true });

  let changed = false;
  for (const fileName of REQUIRED_DSP_FILES) {
    const sourcePath = path.join(dspEntryDir, fileName);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`missing required dsp entry file: ${sourcePath}`);
    }
    const targetPath = path.join(dspSrcDir, fileName);
    changed = copyIfChanged(sourcePath, targetPath) || changed;
  }

  const selectedProductPath = path.join(root, 'products', '.selected-product');
  fs.writeFileSync(selectedProductPath, `${product}\n`, 'utf8');

  return { product, changed };
}

if (require.main === module) {
  const product = parseProductFromArgs(process.argv.slice(2));
  const result = selectProduct(product);
  console.log(`[select-product] active product: ${result.product} (${result.changed ? 'updated' : 'no changes'})`);
}

module.exports = {
  selectProduct,
};

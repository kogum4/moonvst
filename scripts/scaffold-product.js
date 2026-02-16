const fs = require('fs');
const path = require('path');

const VALID_PRODUCT = /^[a-z0-9][a-z0-9-]*$/;

function parseArgs(argv) {
  const args = { from: 'template', name: '' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--name' && argv[i + 1]) {
      args.name = argv[i + 1];
      i += 1;
      continue;
    }
    if (argv[i] === '--from' && argv[i + 1]) {
      args.from = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function ensureTemplate(fromProduct, root) {
  const templateDir = path.join(root, 'products', fromProduct);
  if (!fs.existsSync(templateDir)) {
    throw new Error(`source product not found: ${fromProduct}`);
  }
  return templateDir;
}

function copyFile(fromPath, toPath) {
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  fs.copyFileSync(fromPath, toPath);
}

function addScriptsToPackageJson(root, productName) {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const nextScripts = packageJson.scripts || {};

  nextScripts[`dev:${productName}`] = `cross-env MOONVST_PRODUCT=${productName} npm-run-all --parallel dev:dsp:product dev:ui:${productName}`;
  nextScripts[`build:dsp:${productName}`] = `cross-env MOONVST_PRODUCT=${productName} node scripts/build-dsp-product.js`;
  nextScripts[`build:ui:${productName}`] = `cd ui && cross-env VITE_PRODUCT=${productName} cross-env VITE_BUILD_TARGET=juce npx vite build`;
  nextScripts[`release:vst:${productName}`] = `npm run build:dsp:${productName} && npm run build:ui:${productName} && npm run build:plugin`;
  nextScripts[`release:unity:${productName}`] = `npm run build:dsp:${productName} && npm run build:ui:${productName} && npm run configure:plugin:unity && npm run build:plugin`;

  packageJson.scripts = Object.fromEntries(Object.entries(nextScripts).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

function scaffoldProduct({ name, from }) {
  const root = path.resolve(__dirname, '..');

  if (!VALID_PRODUCT.test(name)) {
    throw new Error(`invalid product name: ${name}`);
  }

  const productsDir = path.join(root, 'products');
  const productDir = path.join(productsDir, name);
  if (fs.existsSync(productDir)) {
    throw new Error(`product already exists: ${name}`);
  }

  const fromDir = ensureTemplate(from, root);

  copyFile(path.join(fromDir, 'dsp-entry', 'lib.mbt'), path.join(productDir, 'dsp-entry', 'lib.mbt'));
  copyFile(path.join(fromDir, 'dsp-entry', 'params.mbt'), path.join(productDir, 'dsp-entry', 'params.mbt'));
  copyFile(path.join(fromDir, 'dsp-entry', 'lib_test.mbt'), path.join(productDir, 'dsp-entry', 'lib_test.mbt'));
  copyFile(path.join(fromDir, 'ui-entry', 'App.tsx'), path.join(productDir, 'ui-entry', 'App.tsx'));

  fs.writeFileSync(
    path.join(productDir, 'product.config.json'),
    `${JSON.stringify({ name }, null, 2)}\n`,
    'utf8',
  );

  fs.writeFileSync(
    path.join(productDir, 'README.md'),
    `# ${name}\n\nGenerated from ${from}.\n`,
    'utf8',
  );

  fs.writeFileSync(
    path.join(root, 'tests', 'dsp', name, 'README.md'),
    `# DSP tests for ${name}\n`,
    'utf8',
  );

  fs.writeFileSync(
    path.join(root, 'tests', 'ui', name, 'README.md'),
    `# UI tests for ${name}\n`,
    'utf8',
  );

  addScriptsToPackageJson(root, name);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name) {
    throw new Error('usage: npm run scaffold:product -- --name <product-name> [--from template|showcase]');
  }
  scaffoldProduct(args);
  console.log(`[scaffold-product] created product: ${args.name}`);
}

module.exports = {
  scaffoldProduct,
};

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  generateArtifacts,
  runGenMemoryLayout,
} = require('./gen-memory-layout');

test('gen-memory-layout exports required functions', () => {
  assert.equal(typeof generateArtifacts, 'function');
  assert.equal(typeof runGenMemoryLayout, 'function');
});

test('runGenMemoryLayout updates targets from contract json', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moonvst-layout-'));
  const contractsDir = path.join(tmpRoot, 'contracts');
  const dspUtilsDir = path.join(tmpRoot, 'packages', 'dsp-core', 'src', 'utils');
  const workletDir = path.join(tmpRoot, 'packages', 'ui-core', 'public', 'worklet');
  const pluginIncludeDir = path.join(tmpRoot, 'plugin', 'include', 'moonvst');

  fs.mkdirSync(contractsDir, { recursive: true });
  fs.mkdirSync(dspUtilsDir, { recursive: true });
  fs.mkdirSync(workletDir, { recursive: true });
  fs.mkdirSync(pluginIncludeDir, { recursive: true });

  fs.writeFileSync(path.join(contractsDir, 'memory-layout.json'), JSON.stringify({
    bytes_per_sample: 4,
    max_buffer_samples: 16384,
    offsets: {
      input_left: 0x10000,
      input_right: 0x20000,
      output_left: 0x30000,
      output_right: 0x40000,
      string_buf: 0x50000,
      reverb_mem_base_ptr: 0x60000,
      chorus_mem_base_ptr: 0x78000,
    },
  }, null, 2));

  fs.writeFileSync(path.join(dspUtilsDir, 'constants.mbt'), [
    'let sample_rate_hz_box : Array[Float] = [48000.0]',
    '',
    'pub let input_left_offset : Int = 1',
    'pub let input_right_offset : Int = 2',
    'pub let output_left_offset : Int = 3',
    'pub let output_right_offset : Int = 4',
    'pub let string_buf_offset : Int = 5',
    '',
    'pub fn set_sample_rate(sample_rate_hz : Float) -> Unit {',
    '  sample_rate_hz_box[0] = sample_rate_hz',
    '}',
    '',
  ].join('\n'));

  fs.writeFileSync(path.join(workletDir, 'processor.js'), [
    'class MoonVSTProcessor extends AudioWorkletProcessor {',
    '  constructor() {',
    '    this.INPUT_LEFT_OFFSET = 1',
    '    this.INPUT_RIGHT_OFFSET = 2',
    '    this.OUTPUT_LEFT_OFFSET = 3',
    '    this.OUTPUT_RIGHT_OFFSET = 4',
    '  }',
    '}',
    '',
  ].join('\n'));

  runGenMemoryLayout({ rootDir: tmpRoot, check: false });

  const mbt = fs.readFileSync(path.join(dspUtilsDir, 'constants.mbt'), 'utf8');
  const worklet = fs.readFileSync(path.join(workletDir, 'processor.js'), 'utf8');
  const cpp = fs.readFileSync(path.join(pluginIncludeDir, 'memory_layout_gen.h'), 'utf8');

  assert.match(mbt, /pub let input_left_offset : Int = 0x10000/);
  assert.match(mbt, /pub let reverb_mem_base_ptr : Int = 0x60000/);
  assert.match(worklet, /this\.OUTPUT_RIGHT_OFFSET = 0x40000/);
  assert.match(cpp, /static constexpr int INPUT_LEFT_OFFSET = 0x10000;/);
  assert.match(cpp, /static constexpr int MAX_BUFFER_SAMPLES = 16384;/);
});

test('runGenMemoryLayout --check fails when outputs are stale', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moonvst-layout-check-'));
  const contractsDir = path.join(tmpRoot, 'contracts');
  const dspUtilsDir = path.join(tmpRoot, 'packages', 'dsp-core', 'src', 'utils');
  const workletDir = path.join(tmpRoot, 'packages', 'ui-core', 'public', 'worklet');
  const pluginIncludeDir = path.join(tmpRoot, 'plugin', 'include', 'moonvst');

  fs.mkdirSync(contractsDir, { recursive: true });
  fs.mkdirSync(dspUtilsDir, { recursive: true });
  fs.mkdirSync(workletDir, { recursive: true });
  fs.mkdirSync(pluginIncludeDir, { recursive: true });

  fs.writeFileSync(path.join(contractsDir, 'memory-layout.json'), JSON.stringify({
    bytes_per_sample: 4,
    max_buffer_samples: 16384,
    offsets: {
      input_left: 0x10000,
      input_right: 0x20000,
      output_left: 0x30000,
      output_right: 0x40000,
      string_buf: 0x50000,
      reverb_mem_base_ptr: 0x60000,
      chorus_mem_base_ptr: 0x78000,
    },
  }, null, 2));

  fs.writeFileSync(path.join(dspUtilsDir, 'constants.mbt'), [
    'let sample_rate_hz_box : Array[Float] = [48000.0]',
    '',
    'pub let input_left_offset : Int = 123',
    'pub let input_right_offset : Int = 456',
    'pub let output_left_offset : Int = 789',
    'pub let output_right_offset : Int = 987',
    'pub let string_buf_offset : Int = 654',
    '',
    'pub fn set_sample_rate(sample_rate_hz : Float) -> Unit {',
    '  sample_rate_hz_box[0] = sample_rate_hz',
    '}',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(workletDir, 'processor.js'), [
    'class MoonVSTProcessor extends AudioWorkletProcessor {',
    '  constructor() {',
    '    this.INPUT_LEFT_OFFSET = 123',
    '    this.INPUT_RIGHT_OFFSET = 456',
    '    this.OUTPUT_LEFT_OFFSET = 789',
    '    this.OUTPUT_RIGHT_OFFSET = 987',
    '  }',
    '}',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(pluginIncludeDir, 'memory_layout_gen.h'), '// stale\n');

  assert.throws(
    () => runGenMemoryLayout({ rootDir: tmpRoot, check: true }),
    /stale|out of date/i,
  );
});

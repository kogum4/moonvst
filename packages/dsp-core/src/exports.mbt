/// Module init — auto-called on load
fn init {
  for i = 0; i < param_defs.length(); i = i + 1 {
    if i < param_values.length() {
      param_values[i] = param_defs[i].default_val
    }
  }
  product_reset()
}

/// Explicit init for host to call
pub fn dsp_init() -> Unit {
  for i = 0; i < param_defs.length(); i = i + 1 {
    if i < param_values.length() {
      param_values[i] = param_defs[i].default_val
    }
  }
  product_reset()
}

/// Process audio block — main DSP loop
pub fn process_block(num_samples : Int) -> Unit {
  process_audio(num_samples)
}

// --- Generic Parameter API (C++ uses only these) ---

/// Get the number of parameters
pub fn get_param_count() -> Int {
  param_defs.length()
}

/// Get parameter name as a pointer to string in WASM linear memory.
/// Writes the string bytes at string_buf_offset and returns that address.
pub fn get_param_name(index : Int) -> Int {
  if index < 0 || index >= param_defs.length() {
    return 0
  }
  let name = param_defs[index].name
  let buf = @utils.string_buf_offset
  for i = 0; i < name.length(); i = i + 1 {
    @utils.store_u8(buf + i, name[i].to_int())
  }
  buf
}

/// Get the length of a parameter name
pub fn get_param_name_len(index : Int) -> Int {
  if index < 0 || index >= param_defs.length() {
    return 0
  }
  param_defs[index].name.length()
}

/// Get default value for a parameter
pub fn get_param_default(index : Int) -> Float {
  if index < 0 || index >= param_defs.length() {
    return 0.0
  }
  param_defs[index].default_val
}

/// Get minimum value for a parameter
pub fn get_param_min(index : Int) -> Float {
  if index < 0 || index >= param_defs.length() {
    return 0.0
  }
  param_defs[index].min
}

/// Get maximum value for a parameter
pub fn get_param_max(index : Int) -> Float {
  if index < 0 || index >= param_defs.length() {
    return 1.0
  }
  param_defs[index].max
}

/// Set a parameter value by index
pub fn set_param(index : Int, value : Float) -> Unit {
  if index >= 0 && index < param_values.length() {
    param_values[index] = value
  }
}

/// Get a parameter value by index
pub fn get_param(index : Int) -> Float {
  if index >= 0 && index < param_values.length() {
    param_values[index]
  } else {
    0.0
  }
}

/// Main DSP processing function
/// Reads audio from input buffers, applies processing, writes to output buffers.
/// Stereo processing (L/R channels).
fn abs_f32(x : Float) -> Float {
  if x < 0.0 { -x } else { x }
}

fn saturate(x : Float, drive : Float) -> Float {
  let driven = x * drive
  let abs_driven = abs_f32(driven)
  driven / (1.0 + abs_driven)
}

pub fn process_sample(input : Float, gain : Float, drive : Float, mix : Float) -> Float {
  let dry : Float = 1.0 - mix
  let base = input * gain
  let shaped = saturate(base, drive)
  (base * dry) + (shaped * mix)
}

pub fn compute_makeup(input_abs_sum : Float, output_abs_sum : Float) -> Float {
  let epsilon : Float = 0.000001
  let min_makeup : Float = 0.1
  let max_makeup : Float = 1.5

  let raw_makeup : Float =
    if output_abs_sum > epsilon {
      input_abs_sum / output_abs_sum
    } else {
      1.0
    }

  let shaped_makeup : Float = if raw_makeup < 1.0 {
    // Louder-than-input side: attenuate more aggressively.
    raw_makeup * raw_makeup
  } else {
    // Quieter-than-input side: recover conservatively.
    1.0 + (raw_makeup - 1.0) * 0.4
  }

  if shaped_makeup < min_makeup {
    min_makeup
  } else if shaped_makeup > max_makeup {
    max_makeup
  } else {
    shaped_makeup
  }
}

fn process_audio(num_samples : Int) -> Unit {
  let gain = param_values[0]
  let drive = param_values[1]
  let mix = param_values[2]

  let mut input_abs_sum : Float = 0.0
  let mut output_abs_sum : Float = 0.0

  // First pass: process and measure loudness change.
  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4

    let in_l = @utils.load_f32(@utils.input_left_offset + offset)
    let in_r = @utils.load_f32(@utils.input_right_offset + offset)

    let base_l = in_l * gain
    let base_r = in_r * gain

    let out_l = process_sample(in_l, gain, drive, mix)
    let out_r = process_sample(in_r, gain, drive, mix)

    let abs_base_l = abs_f32(base_l)
    let abs_base_r = abs_f32(base_r)
    let abs_out_l = abs_f32(out_l)
    let abs_out_r = abs_f32(out_r)
    input_abs_sum = input_abs_sum + abs_base_l + abs_base_r
    output_abs_sum = output_abs_sum + abs_out_l + abs_out_r

    @utils.store_f32(@utils.output_left_offset + offset, out_l)
    @utils.store_f32(@utils.output_right_offset + offset, out_r)
  }

  let makeup = compute_makeup(input_abs_sum, output_abs_sum)

  // Second pass: apply makeup gain.
  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4
    let out_l = @utils.load_f32(@utils.output_left_offset + offset) * makeup
    let out_r = @utils.load_f32(@utils.output_right_offset + offset) * makeup
    @utils.store_f32(@utils.output_left_offset + offset, out_l)
    @utils.store_f32(@utils.output_right_offset + offset, out_r)
  }
}

/// Main DSP processing function
/// Reads audio from input buffers, applies processing, writes to output buffers.
/// Stereo processing (L/R channels).
fn process_audio(num_samples : Int) -> Unit {
  let gain = param_values[0] // gain parameter
  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4 // f32 = 4 bytes

    // Read input samples
    let in_l = @utils.load_f32(@utils.input_left_offset + offset)
    let in_r = @utils.load_f32(@utils.input_right_offset + offset)

    // Apply gain
    let out_l = in_l * gain
    let out_r = in_r * gain

    // Write output samples
    @utils.store_f32(@utils.output_left_offset + offset, out_l)
    @utils.store_f32(@utils.output_right_offset + offset, out_r)
  }
}

fn process_audio(num_samples : Int) -> Unit {
  let gain = param_values[0]
  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4
    let out_l = @utils.load_f32(@utils.input_left_offset + offset) * gain
    let out_r = @utils.load_f32(@utils.input_right_offset + offset) * gain
    @utils.store_f32(@utils.output_left_offset + offset, out_l)
    @utils.store_f32(@utils.output_right_offset + offset, out_r)
  }
}

pub fn product_reset() -> Unit {
  ()
}

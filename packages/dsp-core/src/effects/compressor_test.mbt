test "compressor attenuates above threshold" {
  let (out_l, out_r) = compressor_process(0.8, -0.8, 0.25, 4.0)
  assert_eq(out_l < 0.8, true)
  assert_eq(out_r > -0.8, true)
}

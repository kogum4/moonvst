test "distortion soft-clips peaks" {
  let (out_l, out_r) = distortion_process(0.9, -0.9, 1.0, 1.0)
  assert_eq(out_l < 1.0, true)
  assert_eq(out_r > -1.0, true)
}

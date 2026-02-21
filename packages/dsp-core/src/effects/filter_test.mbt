test "filter low-pass attenuates first sample from zero state" {
  let (out_l, out_r, _, _) = filter_process_sample(1.0, -1.0, 0.0, 0.0, 0.2, 0.0)
  assert_eq(out_l < 1.0, true)
  assert_eq(out_r > -1.0, true)
}

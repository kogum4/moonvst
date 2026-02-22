test "compressor attenuates above threshold" {
  reset_compressor_state()
  let mut out_l : Float = 0.8
  let mut out_r : Float = -0.8
  for _i = 0; _i < 192; _i = _i + 1 {
    let (next_l, next_r) =
      compressor_process(
        0,
        0.8,
        -0.8,
        0.0,
        -24.0,
        30.0,
        12.0,
        0.003,
        0.25,
        0.0,
        0.0,
        1.0,
      )
    out_l = next_l
    out_r = next_r
  }
  assert_eq(out_l < 0.8, true)
  assert_eq(out_r > -0.8, true)
}

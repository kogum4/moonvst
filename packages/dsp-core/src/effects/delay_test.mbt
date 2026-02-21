fn approx_eq_delay(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "delay uses previous state and updates feedback state" {
  let (out_l_1, out_r_1, state_l_1, state_r_1) =
    delay_process_sample(1.0, -1.0, 0.0, 0.0, 0.5, 1.0)
  assert_eq(approx_eq_delay(out_l_1, 0.0, 0.00001), true)
  assert_eq(approx_eq_delay(out_r_1, 0.0, 0.00001), true)

  let (out_l_2, out_r_2, _, _) =
    delay_process_sample(0.0, 0.0, state_l_1, state_r_1, 0.5, 1.0)
  assert_eq(out_l_2 > 0.0, true)
  assert_eq(out_r_2 < 0.0, true)
}

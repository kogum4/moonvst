fn approx_eq_eq(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "eq with flat gains stays near dry signal at first sample" {
  reset_eq_state()
  let (out_l, out_r) = eq_process(0, 0.3, -0.3, 0.0, 0.0, 0.0, 0.0, 0.0)
  assert_eq(approx_eq_eq(out_l, 0.3, 0.00001), true)
  assert_eq(approx_eq_eq(out_r, -0.3, 0.00001), true)
}

test "eq updates internal svf state and responds to boosts" {
  reset_eq_state()
  let (_, _) = eq_process(0, 0.3, -0.3, 0.0, 0.0, 0.0, 0.0, 0.0)
  let (out_l, out_r) = eq_process(0, 0.3, -0.3, 12.0, 0.0, 0.0, 0.0, 0.0)
  assert_eq(approx_eq_eq(out_l, 0.3, 0.00001), false)
  assert_eq(approx_eq_eq(out_r, -0.3, 0.00001), false)
}

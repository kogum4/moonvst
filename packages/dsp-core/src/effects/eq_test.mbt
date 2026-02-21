fn approx_eq_eq(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "eq applies tone-dependent channel transform" {
  let (out_l, out_r) = eq_process(0.3, -0.3, 1.0, 1.0)
  assert_eq(approx_eq_eq(out_l, 0.3, 0.00001), false)
  assert_eq(approx_eq_eq(out_r, -0.3, 0.00001), false)
}

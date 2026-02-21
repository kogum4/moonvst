fn approx_eq_chorus(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "chorus keeps dry signal at mix 0 and modulates at mix 1" {
  let (dry_l, dry_r) = chorus_process(0.4, -0.2, 0.8, 0.5, 0.0)
  assert_eq(approx_eq_chorus(dry_l, 0.4, 0.00001), true)
  assert_eq(approx_eq_chorus(dry_r, -0.2, 0.00001), true)

  let (wet_l, wet_r) = chorus_process(0.4, -0.2, 0.8, 0.5, 1.0)
  assert_eq(approx_eq_chorus(wet_l, 0.4, 0.00001), false)
  assert_eq(approx_eq_chorus(wet_r, -0.2, 0.00001), false)
}

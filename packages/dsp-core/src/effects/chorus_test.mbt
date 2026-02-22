fn approx_eq_chorus(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "chorus keeps dry signal at mix 0" {
  reset_chorus_state()
  let (dry_l, dry_r) = chorus_process(0.4, -0.2, 0.8, 0.5, 0.0)
  assert_eq(approx_eq_chorus(dry_l, 0.4, 0.00001), true)
  assert_eq(approx_eq_chorus(dry_r, -0.2, 0.00001), true)
}

test "chorus wet path responds as delayed modulation" {
  reset_chorus_state()
  let mut first_l : Float = 0.0
  let mut first_r : Float = 0.0
  let mut saw_delayed_energy = false
  for i = 0; i < 9000; i = i + 1 {
    let in_sample : Float = if i == 0 { 1.0 } else { 0.0 }
    let (out_l, out_r) = chorus_process(in_sample, in_sample, 1.0, 0.5, 1.0)
    if i == 0 {
      first_l = out_l
      first_r = out_r
    } else if !saw_delayed_energy &&
      (!approx_eq_chorus(out_l, 0.0, 0.0000001) || !approx_eq_chorus(out_r, 0.0, 0.0000001)) {
      saw_delayed_energy = true
    }
  }
  assert_eq(approx_eq_chorus(first_l, 1.0, 0.00001), false)
  assert_eq(approx_eq_chorus(first_r, 1.0, 0.00001), false)
  assert_eq(saw_delayed_energy, true)
}

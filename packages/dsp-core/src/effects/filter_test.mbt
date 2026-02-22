fn approx_eq_filter(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "svf low-pass from zero state outputs low energy first sample" {
  let (out_l, _, _, _, _, _) =
    filter_process_sample(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.25, 0.4, 0.0, 1.0)
  assert_eq(out_l > 0.0, true)
  assert_eq(out_l < 1.0, true)
}

test "svf high-pass from zero state keeps stronger transient than low-pass" {
  let (lp_out, _, _, _, _, _) =
    filter_process_sample(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.25, 0.4, 0.0, 1.0)
  let (hp_out, _, _, _, _, _) =
    filter_process_sample(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.25, 0.4, 1.0, 1.0)
  assert_eq(hp_out > lp_out, true)
}

test "svf updates both integrator states" {
  let (_, _, ic1_l, ic2_l, _, _) =
    filter_process_sample(0.7, -0.3, 0.0, 0.0, 0.0, 0.0, 0.4, 0.2, 2.0, 1.0)
  assert_eq(approx_eq_filter(ic1_l, 0.0, 0.000001), false)
  assert_eq(approx_eq_filter(ic2_l, 0.0, 0.000001), false)
}

test "svf mix at zero is dry and at one is filtered" {
  let (dry_l, _, _, _, _, _) =
    filter_process_sample(0.4, -0.2, 0.0, 0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 0.0)
  let (wet_l, _, _, _, _, _) =
    filter_process_sample(0.4, -0.2, 0.0, 0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 1.0)
  assert_eq(approx_eq_filter(dry_l, 0.4, 0.000001), true)
  assert_eq(approx_eq_filter(wet_l, 0.4, 0.000001), false)
}

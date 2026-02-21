fn approx_eq_reverb(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "reverb predelay conversion clamps to valid range" {
  assert_eq(reverb_predelay_ms_to_samples(-10.0), 0)
  assert_eq(reverb_predelay_ms_to_samples(50.0), 2399)
}

test "reverb dry-wet mix helper returns endpoints" {
  let dry_only = reverb_mix_dry_wet(0.25, 0.9, 0.0)
  let wet_only = reverb_mix_dry_wet(0.25, 0.9, 1.0)
  assert_eq(approx_eq_reverb(dry_only, 0.25, 0.00001), true)
  assert_eq(approx_eq_reverb(wet_only, 0.9, 0.00001), true)
}

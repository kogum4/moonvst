fn approx_eq_delay(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

fn abs_delay(x : Float) -> Float {
  if x < 0.0 { -x } else { x }
}

test "delay dry path is unity when wet/dry is fully dry" {
  reset_delay_state()
  let (out_l, out_r) = delay_process_sample(0, 0.25, -0.4, 1.0, 0.0, 0.5, 0.0, 0.0, 0.0)
  assert_eq(approx_eq_delay(out_l, 0.25, 0.000001), true)
  assert_eq(approx_eq_delay(out_r, -0.4, 0.000001), true)
}

test "delay produces delayed wet signal after impulse" {
  reset_delay_state()
  let mut seen_echo_l = false
  let mut seen_echo_r = false
  for i = 0; i < 5000; i = i + 1 {
    let in_l : Float = if i == 0 { 1.0 } else { 0.0 }
    let in_r : Float = if i == 0 { -1.0 } else { 0.0 }
    let (out_l, out_r) = delay_process_sample(0, in_l, in_r, 1.0, 0.0, 0.5, 0.0, 0.0, 1.0)
    if i > 0 && !seen_echo_l && abs_delay(out_l) > 0.000001 {
      seen_echo_l = true
    }
    if i > 0 && !seen_echo_r && abs_delay(out_r) > 0.000001 {
      seen_echo_r = true
    }
  }
  assert_eq(seen_echo_l, true)
  assert_eq(seen_echo_r, true)
}

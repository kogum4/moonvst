fn approx_eq(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "process_sample dry path is clean gain" {
  let out = @src.process_sample(0.8, 0.5, 12.0, 0.0)
  assert_eq(approx_eq(out, 0.4, 0.0001), true)
}

test "process_sample drive saturates when fully wet" {
  let soft = @src.process_sample(0.8, 1.0, 1.0, 1.0)
  let hard = @src.process_sample(0.8, 1.0, 12.0, 1.0)
  assert_eq(hard > soft, true)
}

test "compute_makeup attenuates louder output" {
  let makeup = @src.compute_makeup(1.0, 2.0)
  assert_eq(makeup < 1.0, true)
}

test "compute_makeup never boosts too much" {
  let makeup = @src.compute_makeup(10.0, 0.001)
  assert_eq(approx_eq(makeup, 1.5, 0.0001), true)
}

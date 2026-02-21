fn approx_eq_dist(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "hardvacuum drive controls distortion amount" {
  reset_distortion_state()
  let (low_drive_l, _low_drive_r) = distortion_process(0, 0.9, -0.9, 0.1, 0.5, 0.5, 1.0, 1.0)
  reset_distortion_state()
  let (high_drive_l, _high_drive_r) = distortion_process(0, 0.9, -0.9, 1.0, 0.5, 0.5, 1.0, 1.0)
  assert_eq(approx_eq_dist(low_drive_l, high_drive_l, 0.000001), false)
}

test "hardvacuum state is isolated per node index" {
  reset_distortion_state()
  let (first_l, _first_r) = distortion_process(0, 1.0, -1.0, 0.8, 0.5, 0.5, 1.0, 1.0)
  let (second_l, _second_r) = distortion_process(0, 1.0, -1.0, 0.8, 0.5, 0.5, 1.0, 1.0)
  assert_eq(approx_eq_dist(first_l, second_l, 0.000001), false)

  reset_distortion_state()
  let (node0_l, _node0_r) = distortion_process(0, 1.0, -1.0, 0.8, 0.5, 0.5, 1.0, 1.0)
  let (node1_l, _node1_r) = distortion_process(1, 1.0, -1.0, 0.8, 0.5, 0.5, 1.0, 1.0)
  assert_eq(approx_eq_dist(node0_l, node1_l, 0.000001), true)
}

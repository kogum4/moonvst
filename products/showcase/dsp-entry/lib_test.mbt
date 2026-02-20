fn approx_eq(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "predelay conversion clamps into valid range" {
  assert_eq(@src.predelay_ms_to_samples(-10.0), 0)
  assert_eq(@src.predelay_ms_to_samples(50.0), 2399)
}

test "mix helper returns dry at 0 and wet at 1" {
  let dry_only = @src.mix_dry_wet(0.25, 0.9, 0.0)
  let wet_only = @src.mix_dry_wet(0.25, 0.9, 1.0)
  assert_eq(approx_eq(dry_only, 0.25, 0.00001), true)
  assert_eq(approx_eq(wet_only, 0.9, 0.00001), true)
}

test "reset clears internal state" {
  @src.reset_reverb_state()
  assert_eq(approx_eq(@src.mix_dry_wet(0.1, 0.8, 0.5), 0.45, 0.00001), true)
}

test "showcase exports six params" {
  assert_eq(get_param_count(), 6)
}

test "graph executor schedules nodes topologically and processes stereo block" {
  let gains : Array[Float] = [1.0, 2.0, 0.5]
  let bypasses : Array[Bool] = [false, false, false]
  let edges : Array[@engine.ExecEdge] = [
    @engine.make_exec_edge(0, 1),
    @engine.make_exec_edge(1, 2),
  ]
  let input_l : Array[Float] = [0.25, -0.4]
  let input_r : Array[Float] = [0.5, -0.8]
  let output_l : Array[Float] = [0.0, 0.0]
  let output_r : Array[Float] = [0.0, 0.0]
  let order : Array[Int] = [-1, -1, -1, -1]

  let result = @engine.execute_graph_block(
    gains,
    bypasses,
    edges,
    input_l,
    input_r,
    output_l,
    output_r,
    order,
  )

  assert_eq(result.valid, true)
  assert_eq(result.trace_len, 3)
  assert_eq(order[0], 0)
  assert_eq(order[1], 1)
  assert_eq(order[2], 2)
  assert_eq(approx_eq(output_l[0], 0.25, 0.00001), true)
  assert_eq(approx_eq(output_l[1], -0.4, 0.00001), true)
  assert_eq(approx_eq(output_r[0], 0.5, 0.00001), true)
  assert_eq(approx_eq(output_r[1], -0.8, 0.00001), true)
}

test "graph executor bypass keeps pass-through behavior" {
  let gains : Array[Float] = [1.0, 0.1, 1.0]
  let bypasses : Array[Bool] = [false, true, false]
  let edges : Array[@engine.ExecEdge] = [
    @engine.make_exec_edge(0, 1),
    @engine.make_exec_edge(1, 2),
  ]
  let input_l : Array[Float] = [0.15]
  let input_r : Array[Float] = [-0.3]
  let output_l : Array[Float] = [0.0]
  let output_r : Array[Float] = [0.0]
  let order : Array[Int] = [-1, -1, -1, -1]

  let result = @engine.execute_graph_block(
    gains,
    bypasses,
    edges,
    input_l,
    input_r,
    output_l,
    output_r,
    order,
  )

  assert_eq(result.valid, true)
  assert_eq(result.trace_len, 3)
  assert_eq(approx_eq(output_l[0], 0.15, 0.00001), true)
  assert_eq(approx_eq(output_r[0], -0.3, 0.00001), true)
}

test "graph executor falls back to dry path for invalid graph" {
  let gains : Array[Float] = [1.0, 1.2, 1.0]
  let bypasses : Array[Bool] = [false, false, false]
  let edges : Array[@engine.ExecEdge] = [
    @engine.make_exec_edge(0, 1),
    @engine.make_exec_edge(1, 0),
  ]
  let input_l : Array[Float] = [0.2, 0.7]
  let input_r : Array[Float] = [-0.2, -0.7]
  let output_l : Array[Float] = [0.0, 0.0]
  let output_r : Array[Float] = [0.0, 0.0]
  let order : Array[Int] = [-1, -1, -1, -1]

  let result = @engine.execute_graph_block(
    gains,
    bypasses,
    edges,
    input_l,
    input_r,
    output_l,
    output_r,
    order,
  )

  assert_eq(result.valid, false)
  assert_eq(result.trace_len, 0)
  assert_eq(approx_eq(output_l[0], 0.2, 0.00001), true)
  assert_eq(approx_eq(output_l[1], 0.7, 0.00001), true)
  assert_eq(approx_eq(output_r[0], -0.2, 0.00001), true)
  assert_eq(approx_eq(output_r[1], -0.7, 0.00001), true)
}

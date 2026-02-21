fn approx_eq_engine(a : Float, b : Float, tol : Float) -> Bool {
  let d = if a > b { a - b } else { b - a }
  d <= tol
}

test "graph executor schedules nodes topologically and processes stereo block" {
  let gains : Array[Float] = [1.0, 2.0, 0.5]
  let bypasses : Array[Bool] = [false, false, false]
  let edges : Array[ExecEdge] = [
    make_exec_edge(0, 1),
    make_exec_edge(1, 2),
  ]
  let input_l : Array[Float] = [0.25, -0.4]
  let input_r : Array[Float] = [0.5, -0.8]
  let output_l : Array[Float] = [0.0, 0.0]
  let output_r : Array[Float] = [0.0, 0.0]
  let order : Array[Int] = [-1, -1, -1, -1]

  let result = execute_graph_block(
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
  assert_eq(approx_eq_engine(output_l[0], 0.25, 0.00001), true)
  assert_eq(approx_eq_engine(output_l[1], -0.4, 0.00001), true)
  assert_eq(approx_eq_engine(output_r[0], 0.5, 0.00001), true)
  assert_eq(approx_eq_engine(output_r[1], -0.8, 0.00001), true)
}

test "graph executor bypass keeps pass-through behavior" {
  let gains : Array[Float] = [1.0, 0.1, 1.0]
  let bypasses : Array[Bool] = [false, true, false]
  let edges : Array[ExecEdge] = [
    make_exec_edge(0, 1),
    make_exec_edge(1, 2),
  ]
  let input_l : Array[Float] = [0.15]
  let input_r : Array[Float] = [-0.3]
  let output_l : Array[Float] = [0.0]
  let output_r : Array[Float] = [0.0]
  let order : Array[Int] = [-1, -1, -1, -1]

  let result = execute_graph_block(
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
  assert_eq(approx_eq_engine(output_l[0], 0.15, 0.00001), true)
  assert_eq(approx_eq_engine(output_r[0], -0.3, 0.00001), true)
}

test "graph executor falls back to dry path for invalid graph" {
  let gains : Array[Float] = [1.0, 1.2, 1.0]
  let bypasses : Array[Bool] = [false, false, false]
  let edges : Array[ExecEdge] = [
    make_exec_edge(0, 1),
    make_exec_edge(1, 0),
  ]
  let input_l : Array[Float] = [0.2, 0.7]
  let input_r : Array[Float] = [-0.2, -0.7]
  let output_l : Array[Float] = [0.0, 0.0]
  let output_r : Array[Float] = [0.0, 0.0]
  let order : Array[Int] = [-1, -1, -1, -1]

  let result = execute_graph_block(
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
  assert_eq(approx_eq_engine(output_l[0], 0.2, 0.00001), true)
  assert_eq(approx_eq_engine(output_l[1], 0.7, 0.00001), true)
  assert_eq(approx_eq_engine(output_r[0], -0.2, 0.00001), true)
  assert_eq(approx_eq_engine(output_r[1], -0.7, 0.00001), true)
}

test "graph executor mixed effect chain dispatches through modules" {
  let nodes : Array[ExecNode] = [
    make_exec_node(effect_type_gain(), false, 1.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_distortion(), false, 1.0, 1.0, 0.0, 0.0),
    make_exec_node(effect_type_filter(), false, 0.25, 0.0, 0.0, 0.0),
  ]
  let edges : Array[ExecEdge] = [
    make_exec_edge(0, 1),
    make_exec_edge(1, 2),
  ]
  let input_l : Array[Float] = [1.0, 0.0]
  let input_r : Array[Float] = [-1.0, 0.0]
  let output_l : Array[Float] = [0.0, 0.0]
  let output_r : Array[Float] = [0.0, 0.0]
  let order : Array[Int] = [-1, -1, -1, -1]

  let result = execute_graph_block_fx(
    nodes,
    edges,
    input_l,
    input_r,
    output_l,
    output_r,
    order,
  )

  assert_eq(result.valid, true)
  assert_eq(result.trace_len, 3)
  assert_eq(output_l[0] < 0.6, true)
  assert_eq(output_r[0] > -0.6, true)
  assert_eq(output_l[0] > 0.0, true)
  assert_eq(output_r[0] < 0.0, true)
}

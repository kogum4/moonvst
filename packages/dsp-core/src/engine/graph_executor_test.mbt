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
  reset_effect_states()
  let nodes : Array[ExecNode] = [
    make_exec_node(effect_type_gain(), false, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_distortion(), false, 1.0, 0.5, 0.5, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_filter(), false, 0.25, 0.4, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0),
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
  assert_eq(approx_eq_engine(output_l[0], 1.0, 0.00001), false)
  assert_eq(approx_eq_engine(output_r[0], -1.0, 0.00001), false)
  assert_eq(output_l[0] > 0.0, true)
  assert_eq(output_r[0] < 0.0, true)
}

test "graph executor filter mode and mix parameters affect output" {
  reset_effect_states()
  let lp_nodes : Array[ExecNode] = [
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_filter(), false, 0.2, 0.45, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
  ]
  let hp_nodes : Array[ExecNode] = [
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_filter(), false, 0.2, 0.45, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
  ]
  let dry_nodes : Array[ExecNode] = [
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_filter(), false, 0.2, 0.45, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
  ]
  let edges : Array[ExecEdge] = [
    make_exec_edge(0, 1),
    make_exec_edge(1, 2),
  ]
  let input_l : Array[Float] = [0.75]
  let input_r : Array[Float] = [-0.5]
  let lp_out_l : Array[Float] = [0.0]
  let lp_out_r : Array[Float] = [0.0]
  let hp_out_l : Array[Float] = [0.0]
  let hp_out_r : Array[Float] = [0.0]
  let dry_out_l : Array[Float] = [0.0]
  let dry_out_r : Array[Float] = [0.0]
  let order_a : Array[Int] = [-1, -1, -1, -1]
  let order_b : Array[Int] = [-1, -1, -1, -1]
  let order_c : Array[Int] = [-1, -1, -1, -1]

  let lp_result = execute_graph_block_fx(lp_nodes, edges, input_l, input_r, lp_out_l, lp_out_r, order_a)
  let hp_result = execute_graph_block_fx(hp_nodes, edges, input_l, input_r, hp_out_l, hp_out_r, order_b)
  let dry_result = execute_graph_block_fx(dry_nodes, edges, input_l, input_r, dry_out_l, dry_out_r, order_c)

  assert_eq(lp_result.valid, true)
  assert_eq(hp_result.valid, true)
  assert_eq(dry_result.valid, true)
  assert_eq(approx_eq_engine(lp_out_l[0], hp_out_l[0], 0.00001), false)
  assert_eq(approx_eq_engine(dry_out_l[0], 0.75, 0.00001), true)
  assert_eq(approx_eq_engine(dry_out_r[0], -0.5, 0.00001), true)
}

test "graph executor reverb path changes mono input when wet mix is enabled" {
  reset_effect_states()
  @effects.reset_reverb_state()
  let nodes : Array[ExecNode] = [
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_reverb(), false, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
    make_exec_node(effect_type_gain(), true, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
  ]
  let edges : Array[ExecEdge] = [
    make_exec_edge(0, 1),
    make_exec_edge(1, 2),
  ]
  let input_l : Array[Float] = [0.6, 0.6, 0.6, 0.6]
  let input_r : Array[Float] = [0.6, 0.6, 0.6, 0.6]
  let output_l : Array[Float] = [0.0, 0.0, 0.0, 0.0]
  let output_r : Array[Float] = [0.0, 0.0, 0.0, 0.0]
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
  assert_eq(approx_eq_engine(output_l[1], 0.6, 0.00001), false)
  assert_eq(approx_eq_engine(output_r[1], 0.6, 0.00001), false)
}

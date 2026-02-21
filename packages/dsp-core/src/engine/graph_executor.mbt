let graph_executor_max_nodes : Int = 16
let reverb_default_predelay_ms : Float = 20.0
let reverb_default_decay : Float = 0.78
let reverb_default_damping : Float = 0.35
let reverb_default_diffusion : Float = 0.70
let persistent_effect_state_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let persistent_effect_state_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let persistent_filter_ic1_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let persistent_filter_ic2_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let persistent_filter_ic1_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let persistent_filter_ic2_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

pub struct ExecEdge {
  from : Int
  to : Int
}

pub struct ExecNode {
  effect_type : Int
  bypass : Bool
  p1 : Float
  p2 : Float
  p3 : Float
  p4 : Float
  p5 : Float
}

pub fn make_exec_edge(from : Int, to : Int) -> ExecEdge {
  { from, to }
}

pub fn make_exec_node(
  effect_type : Int,
  bypass : Bool,
  p1 : Float,
  p2 : Float,
  p3 : Float,
  p4 : Float,
  p5 : Float,
) -> ExecNode {
  { effect_type, bypass, p1, p2, p3, p4, p5 }
}

pub fn effect_type_gain() -> Int { 0 }

pub fn effect_type_chorus() -> Int { 1 }

pub fn effect_type_compressor() -> Int { 2 }

pub fn effect_type_delay() -> Int { 3 }

pub fn effect_type_distortion() -> Int { 4 }

pub fn effect_type_eq() -> Int { 5 }

pub fn effect_type_filter() -> Int { 6 }

pub fn effect_type_reverb() -> Int { 7 }

pub struct ExecResult {
  valid : Bool
  trace_len : Int
}

fn min_int(a : Int, b : Int) -> Int {
  if a < b { a } else { b }
}

fn copy_dry_path(
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
) -> Unit {
  let count =
    min_int(
      min_int(input_l.length(), input_r.length()),
      min_int(output_l.length(), output_r.length()),
    )
  for i = 0; i < count; i = i + 1 {
    output_l[i] = input_l[i]
    output_r[i] = input_r[i]
  }
}

fn empty_i32_buffer() -> Array[Int] {
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

fn empty_bool_buffer() -> Array[Bool] {
  [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
}

fn empty_f32_buffer() -> Array[Float] {
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
}

pub fn reset_effect_states() -> Unit {
  for i = 0; i < graph_executor_max_nodes; i = i + 1 {
    persistent_effect_state_l[i] = 0.0
    persistent_effect_state_r[i] = 0.0
    persistent_filter_ic1_l[i] = 0.0
    persistent_filter_ic2_l[i] = 0.0
    persistent_filter_ic1_r[i] = 0.0
    persistent_filter_ic2_r[i] = 0.0
  }
}

fn invalid_result(
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
) -> ExecResult {
  copy_dry_path(input_l, input_r, output_l, output_r)
  { valid: false, trace_len: 0 }
}

fn validate_shapes_legacy(
  gains : Array[Float],
  bypasses : Array[Bool],
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
  order : Array[Int],
) -> Bool {
  let num_nodes = gains.length()
  num_nodes > 0 &&
  num_nodes <= graph_executor_max_nodes &&
  bypasses.length() == num_nodes &&
  order.length() >= num_nodes &&
  input_l.length() == input_r.length() &&
  output_l.length() == input_l.length() &&
  output_r.length() == input_r.length()
}

fn validate_shapes_fx(
  nodes : Array[ExecNode],
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
  order : Array[Int],
) -> Bool {
  let num_nodes = nodes.length()
  num_nodes > 0 &&
  num_nodes <= graph_executor_max_nodes &&
  order.length() >= num_nodes &&
  input_l.length() == input_r.length() &&
  output_l.length() == input_l.length() &&
  output_r.length() == input_r.length()
}

fn build_topological_order(
  num_nodes : Int,
  edges : Array[ExecEdge],
  order : Array[Int],
) -> (Bool, Int, Array[Int]) {
  let indegree = empty_i32_buffer()
  for i = 0; i < edges.length(); i = i + 1 {
    let edge = edges[i]
    if edge.from < 0 || edge.from >= num_nodes || edge.to < 0 || edge.to >= num_nodes || edge.from == edge.to {
      return (false, 0, empty_i32_buffer())
    }
    indegree[edge.to] = indegree[edge.to] + 1
  }

  let indegree_base = empty_i32_buffer()
  for i = 0; i < num_nodes; i = i + 1 {
    indegree_base[i] = indegree[i]
  }

  let processed = empty_bool_buffer()
  let mut trace_len = 0
  for _step = 0; _step < num_nodes; _step = _step + 1 {
    let mut selected = -1
    for i = 0; i < num_nodes; i = i + 1 {
      if !processed[i] && indegree[i] == 0 {
        selected = i
        break
      }
    }
    if selected < 0 {
      return (false, 0, empty_i32_buffer())
    }
    processed[selected] = true
    order[trace_len] = selected
    trace_len = trace_len + 1

    for i = 0; i < edges.length(); i = i + 1 {
      let edge = edges[i]
      if edge.from == selected {
        indegree[edge.to] = indegree[edge.to] - 1
      }
    }
  }
  (true, trace_len, indegree_base)
}

fn execute_node_effect(
  node : ExecNode,
  node_index : Int,
  node_in_l : Float,
  node_in_r : Float,
  effect_state_l : Array[Float],
  effect_state_r : Array[Float],
  filter_state_ic1_l : Array[Float],
  filter_state_ic2_l : Array[Float],
  filter_state_ic1_r : Array[Float],
  filter_state_ic2_r : Array[Float],
) -> (Float, Float) {
  if node.bypass {
    return (node_in_l, node_in_r)
  }

  let kind = node.effect_type
  if kind == effect_type_gain() {
    (node_in_l * node.p1, node_in_r * node.p1)
  } else if kind == effect_type_chorus() {
    @effects.chorus_process(node_in_l, node_in_r, node.p1, node.p2, node.p3)
  } else if kind == effect_type_compressor() {
    @effects.compressor_process(node_in_l, node_in_r, node.p1, node.p2)
  } else if kind == effect_type_delay() {
    let (out_l, out_r, next_l, next_r) =
      @effects.delay_process_sample(node_in_l, node_in_r, effect_state_l[node_index], effect_state_r[node_index], node.p1, node.p2)
    effect_state_l[node_index] = next_l
    effect_state_r[node_index] = next_r
    (out_l, out_r)
  } else if kind == effect_type_distortion() {
    @effects.distortion_process(node_index, node_in_l, node_in_r, node.p1, node.p2, node.p3, node.p4, node.p5)
  } else if kind == effect_type_eq() {
    @effects.eq_process(node_in_l, node_in_r, node.p1, node.p2)
  } else if kind == effect_type_filter() {
    let (out_l, out_r, next_ic1_l, next_ic2_l, next_ic1_r, next_ic2_r) =
      @effects.filter_process_sample(
        node_in_l,
        node_in_r,
        filter_state_ic1_l[node_index],
        filter_state_ic2_l[node_index],
        filter_state_ic1_r[node_index],
        filter_state_ic2_r[node_index],
        node.p1,
        node.p2,
        node.p3 * 5.0,
        node.p4,
      )
    filter_state_ic1_l[node_index] = next_ic1_l
    filter_state_ic2_l[node_index] = next_ic2_l
    filter_state_ic1_r[node_index] = next_ic1_r
    filter_state_ic2_r[node_index] = next_ic2_r
    (out_l, out_r)
  } else if kind == effect_type_reverb() {
    @effects.process_reverb_sample(
      node_in_l,
      node_in_r,
      reverb_default_predelay_ms,
      reverb_default_decay,
      reverb_default_damping,
      reverb_default_diffusion,
      node.p1,
    )
  } else {
    (node_in_l, node_in_r)
  }
}

pub fn execute_graph_block_fx(
  nodes : Array[ExecNode],
  edges : Array[ExecEdge],
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
  order : Array[Int],
) -> ExecResult {
  if !validate_shapes_fx(nodes, input_l, input_r, output_l, output_r, order) {
    return invalid_result(input_l, input_r, output_l, output_r)
  }

  let num_nodes = nodes.length()
  let (is_valid, trace_len, indegree_base) = build_topological_order(num_nodes, edges, order)
  if !is_valid || trace_len <= 0 {
    return invalid_result(input_l, input_r, output_l, output_r)
  }

  let node_out_l = empty_f32_buffer()
  let node_out_r = empty_f32_buffer()
  for sample = 0; sample < input_l.length(); sample = sample + 1 {
    for step = 0; step < trace_len; step = step + 1 {
      let node_index = order[step]
      let mut node_in_l : Float = 0.0
      let mut node_in_r : Float = 0.0

      if indegree_base[node_index] == 0 {
        node_in_l = input_l[sample]
        node_in_r = input_r[sample]
      } else {
        for e = 0; e < edges.length(); e = e + 1 {
          let edge = edges[e]
          if edge.to == node_index {
            node_in_l = node_in_l + node_out_l[edge.from]
            node_in_r = node_in_r + node_out_r[edge.from]
          }
        }
      }

      let (out_l, out_r) = execute_node_effect(
        nodes[node_index],
        node_index,
        node_in_l,
        node_in_r,
        persistent_effect_state_l,
        persistent_effect_state_r,
        persistent_filter_ic1_l,
        persistent_filter_ic2_l,
        persistent_filter_ic1_r,
        persistent_filter_ic2_r,
      )
      node_out_l[node_index] = out_l
      node_out_r[node_index] = out_r
    }

    let last_node = order[trace_len - 1]
    output_l[sample] = node_out_l[last_node]
    output_r[sample] = node_out_r[last_node]
  }

  { valid: true, trace_len }
}

pub fn execute_graph_block(
  gains : Array[Float],
  bypasses : Array[Bool],
  edges : Array[ExecEdge],
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
  order : Array[Int],
) -> ExecResult {
  if !validate_shapes_legacy(gains, bypasses, input_l, input_r, output_l, output_r, order) {
    return invalid_result(input_l, input_r, output_l, output_r)
  }

  let num_nodes = gains.length()
  let (is_valid, trace_len, indegree_base) = build_topological_order(num_nodes, edges, order)
  if !is_valid || trace_len <= 0 {
    return invalid_result(input_l, input_r, output_l, output_r)
  }

  let node_out_l = empty_f32_buffer()
  let node_out_r = empty_f32_buffer()

  for sample = 0; sample < input_l.length(); sample = sample + 1 {
    for step = 0; step < trace_len; step = step + 1 {
      let node = order[step]
      let mut node_in_l : Float = 0.0
      let mut node_in_r : Float = 0.0

      if indegree_base[node] == 0 {
        node_in_l = input_l[sample]
        node_in_r = input_r[sample]
      } else {
        for e = 0; e < edges.length(); e = e + 1 {
          let edge = edges[e]
          if edge.to == node {
            node_in_l = node_in_l + node_out_l[edge.from]
            node_in_r = node_in_r + node_out_r[edge.from]
          }
        }
      }

      if bypasses[node] {
        node_out_l[node] = node_in_l
        node_out_r[node] = node_in_r
      } else {
        let gain = gains[node]
        node_out_l[node] = node_in_l * gain
        node_out_r[node] = node_in_r * gain
      }
    }

    let last_node = order[trace_len - 1]
    output_l[sample] = node_out_l[last_node]
    output_r[sample] = node_out_r[last_node]
  }

  { valid: true, trace_len }
}

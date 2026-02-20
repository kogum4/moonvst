let graph_executor_max_nodes : Int = 16

pub struct ExecEdge {
  from : Int
  to : Int
}

pub fn make_exec_edge(from : Int, to : Int) -> ExecEdge {
  { from, to }
}

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

fn invalid_result(
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
) -> ExecResult {
  copy_dry_path(input_l, input_r, output_l, output_r)
  { valid: false, trace_len: 0 }
}

fn validate_shapes(
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
  if !validate_shapes(gains, bypasses, input_l, input_r, output_l, output_r, order) {
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

let graph_contract_schema : Int = 1
let graph_contract_max_nodes : Int = 16
let graph_contract_max_edges : Int = 64
let graph_node_stride : Int = 11
let graph_edge_stride : Int = 2
let graph_header_offset : Int = 6
let graph_header_size : Int = 4
let graph_node_bank_offset : Int = graph_header_offset + graph_header_size
let graph_edge_bank_offset : Int = graph_node_bank_offset + graph_contract_max_nodes * graph_node_stride
let graph_revision_param_index : Int = graph_edge_bank_offset + graph_contract_max_edges * graph_edge_stride

let graph_contract_err_none : Int = 0
let graph_contract_err_unsupported_version : Int = 1
let graph_contract_err_node_limit : Int = 2
let graph_contract_err_edge_limit : Int = 3

let last_graph_contract_error_box : Array[Int] = [0]
let last_graph_contract_node_count_box : Array[Int] = [2]
let last_graph_contract_edge_count_box : Array[Int] = [1]
let graph_runtime_supported_box : Array[Bool] = [true]
let graph_runtime_has_output_path_box : Array[Bool] = [true]
let graph_runtime_effect_type_box : Array[Int] = [0]
let runtime_graph_node_count_box : Array[Int] = [2]
let runtime_graph_edge_count_box : Array[Int] = [1]
let runtime_node_effect_types : Array[Int] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
let runtime_node_bypasses : Array[Bool] = [true, true, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
let runtime_node_p1 : Array[Float] = [1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p2 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p3 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p4 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p5 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p6 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p7 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p8 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_node_p9 : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let runtime_edge_from : Array[Int] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
let runtime_edge_to : Array[Int] = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
let last_applied_revision_box : Array[Int] = [-1]

fn reset_graph_contract_state() -> Unit {
  @engine.reset_effect_states()
  last_graph_contract_error_box[0] = graph_contract_err_none
  last_graph_contract_node_count_box[0] = 2
  last_graph_contract_edge_count_box[0] = 1
  graph_runtime_supported_box[0] = true
  graph_runtime_has_output_path_box[0] = true
  graph_runtime_effect_type_box[0] = @engine.effect_type_gain()
  runtime_graph_node_count_box[0] = 2
  runtime_graph_edge_count_box[0] = 1
  runtime_node_effect_types[0] = @engine.effect_type_gain()
  runtime_node_effect_types[1] = @engine.effect_type_gain()
  runtime_node_bypasses[0] = true
  runtime_node_bypasses[1] = true
  runtime_node_p1[0] = 1.0
  runtime_node_p1[1] = 1.0
  runtime_node_p2[0] = 0.0
  runtime_node_p2[1] = 0.0
  runtime_node_p3[0] = 0.0
  runtime_node_p3[1] = 0.0
  runtime_node_p4[0] = 0.0
  runtime_node_p4[1] = 0.0
  runtime_node_p5[0] = 0.0
  runtime_node_p5[1] = 0.0
  runtime_node_p6[0] = 0.0
  runtime_node_p6[1] = 0.0
  runtime_node_p7[0] = 0.0
  runtime_node_p7[1] = 0.0
  runtime_node_p8[0] = 0.0
  runtime_node_p8[1] = 0.0
  runtime_node_p9[0] = 0.0
  runtime_node_p9[1] = 0.0
  runtime_edge_from[0] = 0
  runtime_edge_to[0] = 1
  last_applied_revision_box[0] = -1
}

fn validate_graph_contract_payload(schema_version : Int, node_count : Int, edge_count : Int) -> Int {
  if schema_version != graph_contract_schema {
    return graph_contract_err_unsupported_version
  }
  if node_count < 2 || node_count > graph_contract_max_nodes {
    return graph_contract_err_node_limit
  }
  if edge_count < 0 || edge_count > graph_contract_max_edges {
    return graph_contract_err_edge_limit
  }
  graph_contract_err_none
}

fn get_param_value(index : Int, fallback : Float) -> Float {
  if index < 0 || index >= param_values.length() {
    fallback
  } else {
    param_values[index]
  }
}

fn read_graph_revision_from_params() -> Int {
  get_param_value(graph_revision_param_index, 0.0).to_int()
}

fn sync_runtime_graph_from_param_bank() -> Unit {
  let revision = read_graph_revision_from_params()
  if revision == last_applied_revision_box[0] {
    return
  }

  let schema_version = get_param_value(graph_header_offset + 0, graph_contract_schema.to_float()).to_int()
  let node_count = get_param_value(graph_header_offset + 1, 2.0).to_int()
  let edge_count = get_param_value(graph_header_offset + 2, 1.0).to_int()
  let has_output_path = get_param_value(graph_header_offset + 3, 1.0).to_int()

  clear_runtime_graph()

  for i = 0; i < node_count; i = i + 1 {
    let base = graph_node_bank_offset + i * graph_node_stride
    ignore(set_runtime_node(
      i,
      get_param_value(base + 0, 0.0).to_int(),
      get_param_value(base + 1, 1.0).to_int(),
      get_param_value(base + 2, if i < 2 { 1.0 } else { 0.0 }),
      get_param_value(base + 3, 0.0),
      get_param_value(base + 4, 0.0),
      get_param_value(base + 5, 0.0),
      get_param_value(base + 6, 0.0),
      get_param_value(base + 7, 0.0),
      get_param_value(base + 8, 0.0),
      get_param_value(base + 9, 0.0),
      get_param_value(base + 10, 0.0),
    ))
  }

  for i = 0; i < edge_count; i = i + 1 {
    let base = graph_edge_bank_offset + i * graph_edge_stride
    ignore(set_runtime_edge(
      i,
      get_param_value(base + 0, -1.0).to_int(),
      get_param_value(base + 1, -1.0).to_int(),
    ))
  }

  ignore(apply_graph_contract(schema_version, node_count, edge_count))
  ignore(apply_graph_runtime_mode(has_output_path, 0))
  last_applied_revision_box[0] = revision
}

fn build_runtime_nodes() -> Array[@engine.ExecNode] {
  let nodes : Array[@engine.ExecNode] = []
  let count = runtime_graph_node_count_box[0]
  for i = 0; i < count; i = i + 1 {
    nodes.push(
      @engine.make_exec_node(
        runtime_node_effect_types[i],
        runtime_node_bypasses[i],
        runtime_node_p1[i],
        runtime_node_p2[i],
        runtime_node_p3[i],
        runtime_node_p4[i],
        runtime_node_p5[i],
        runtime_node_p6[i],
        runtime_node_p7[i],
        runtime_node_p8[i],
        runtime_node_p9[i],
      ),
    )
  }
  nodes
}

fn build_runtime_edges() -> Array[@engine.ExecEdge] {
  let edges : Array[@engine.ExecEdge] = []
  let count = runtime_graph_edge_count_box[0]
  for i = 0; i < count; i = i + 1 {
    edges.push(@engine.make_exec_edge(runtime_edge_from[i], runtime_edge_to[i]))
  }
  edges
}

fn make_order_buffer() -> Array[Int] {
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

fn copy_dry_to_output(
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
) -> Unit {
  for i = 0; i < input_l.length(); i = i + 1 {
    output_l[i] = input_l[i]
    output_r[i] = input_r[i]
  }
}

fn zero_output(
  output_l : Array[Float],
  output_r : Array[Float],
) -> Unit {
  for i = 0; i < output_l.length(); i = i + 1 {
    output_l[i] = 0.0
    output_r[i] = 0.0
  }
}

fn run_applied_graph(
  input_l : Array[Float],
  input_r : Array[Float],
  output_l : Array[Float],
  output_r : Array[Float],
) -> Unit {
  if last_graph_contract_error_box[0] != graph_contract_err_none {
    copy_dry_to_output(input_l, input_r, output_l, output_r)
    return
  }

  if !graph_runtime_has_output_path_box[0] || last_graph_contract_edge_count_box[0] == 0 {
    zero_output(output_l, output_r)
    return
  }

  if !graph_runtime_supported_box[0] {
    copy_dry_to_output(input_l, input_r, output_l, output_r)
    return
  }

  if runtime_graph_node_count_box[0] <= 0 {
    copy_dry_to_output(input_l, input_r, output_l, output_r)
    return
  }

  let nodes = build_runtime_nodes()
  let edges = build_runtime_edges()
  let order = make_order_buffer()
  let result = @engine.execute_graph_block_fx(
    nodes,
    edges,
    input_l,
    input_r,
    output_l,
    output_r,
    order,
  )
  if !result.valid {
    copy_dry_to_output(input_l, input_r, output_l, output_r)
  }
}

pub fn process_audio_frame_for_test(left : Float, right : Float) -> (Float, Float) {
  sync_runtime_graph_from_param_bank()
  let input_l : Array[Float] = [left]
  let input_r : Array[Float] = [right]
  let output_l : Array[Float] = [0.0]
  let output_r : Array[Float] = [0.0]
  run_applied_graph(input_l, input_r, output_l, output_r)
  (output_l[0], output_r[0])
}

pub fn graph_contract_schema_version() -> Int {
  graph_contract_schema
}

pub fn graph_contract_error_none() -> Int {
  graph_contract_err_none
}

pub fn graph_contract_error_unsupported_version() -> Int {
  graph_contract_err_unsupported_version
}

pub fn graph_contract_error_node_limit() -> Int {
  graph_contract_err_node_limit
}

pub fn graph_contract_error_edge_limit() -> Int {
  graph_contract_err_edge_limit
}

pub fn get_last_graph_contract_error() -> Int {
  last_graph_contract_error_box[0]
}

pub fn get_last_graph_contract_node_count() -> Int {
  last_graph_contract_node_count_box[0]
}

pub fn get_last_graph_contract_edge_count() -> Int {
  last_graph_contract_edge_count_box[0]
}

pub fn apply_graph_contract(schema_version : Int, node_count : Int, edge_count : Int) -> Int {
  let error = validate_graph_contract_payload(schema_version, node_count, edge_count)
  last_graph_contract_error_box[0] = error
  if error == graph_contract_err_none {
    last_graph_contract_node_count_box[0] = node_count
    last_graph_contract_edge_count_box[0] = edge_count
    graph_runtime_supported_box[0] = true
  } else {
    graph_runtime_supported_box[0] = false
  }
  last_applied_revision_box[0] = read_graph_revision_from_params()
  error
}

pub fn apply_graph_runtime_mode(has_output_path : Int, effect_type : Int) -> Int {
  graph_runtime_has_output_path_box[0] = has_output_path != 0
  graph_runtime_effect_type_box[0] = if effect_type < 0 { @engine.effect_type_gain() } else { effect_type }
  last_applied_revision_box[0] = read_graph_revision_from_params()
  0
}

pub fn clear_runtime_graph() -> Unit {
  runtime_graph_node_count_box[0] = 0
  runtime_graph_edge_count_box[0] = 0
  last_applied_revision_box[0] = read_graph_revision_from_params()
}

pub fn set_runtime_node(
  index : Int,
  effect_type : Int,
  bypass : Int,
  p1 : Float,
  p2 : Float,
  p3 : Float,
  p4 : Float,
  p5 : Float,
  p6 : Float,
  p7 : Float,
  p8 : Float,
  p9 : Float,
) -> Int {
  if index < 0 || index >= graph_contract_max_nodes {
    return graph_contract_err_node_limit
  }
  runtime_node_effect_types[index] = effect_type
  runtime_node_bypasses[index] = bypass != 0
  runtime_node_p1[index] = p1
  runtime_node_p2[index] = p2
  runtime_node_p3[index] = p3
  runtime_node_p4[index] = p4
  runtime_node_p5[index] = p5
  runtime_node_p6[index] = p6
  runtime_node_p7[index] = p7
  runtime_node_p8[index] = p8
  runtime_node_p9[index] = p9
  if index + 1 > runtime_graph_node_count_box[0] {
    runtime_graph_node_count_box[0] = index + 1
  }
  last_applied_revision_box[0] = read_graph_revision_from_params()
  graph_contract_err_none
}

pub fn set_runtime_edge(index : Int, from : Int, to : Int) -> Int {
  if index < 0 || index >= graph_contract_max_edges {
    return graph_contract_err_edge_limit
  }
  runtime_edge_from[index] = from
  runtime_edge_to[index] = to
  if index + 1 > runtime_graph_edge_count_box[0] {
    runtime_graph_edge_count_box[0] = index + 1
  }
  last_applied_revision_box[0] = read_graph_revision_from_params()
  graph_contract_err_none
}

fn process_audio(num_samples : Int) -> Unit {
  sync_runtime_graph_from_param_bank()
  let input_l : Array[Float] = []
  let input_r : Array[Float] = []
  let output_l : Array[Float] = []
  let output_r : Array[Float] = []

  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4
    input_l.push(@utils.load_f32(@utils.input_left_offset + offset))
    input_r.push(@utils.load_f32(@utils.input_right_offset + offset))
    output_l.push(0.0)
    output_r.push(0.0)
  }

  run_applied_graph(input_l, input_r, output_l, output_r)

  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4
    @utils.store_f32(@utils.output_left_offset + offset, output_l[i])
    @utils.store_f32(@utils.output_right_offset + offset, output_r[i])
  }
}

pub fn predelay_ms_to_samples(ms : Float) -> Int {
  @effects.reverb_predelay_ms_to_samples(ms)
}

pub fn mix_dry_wet(dry : Float, wet : Float, mix : Float) -> Float {
  @effects.reverb_mix_dry_wet(dry, wet, mix)
}

pub fn reset_reverb_state() -> Unit {
  @effects.reset_reverb_state()
}

pub fn product_reset() -> Unit {
  @engine.reset_effect_states()
  @effects.reset_chorus_state()
  @effects.reset_distortion_state()
  @effects.reset_reverb_state()
  reset_graph_contract_state()
}

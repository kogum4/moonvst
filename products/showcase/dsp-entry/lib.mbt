let graph_contract_schema : Int = 1
let graph_contract_max_nodes : Int = 16
let graph_contract_max_edges : Int = 64

let graph_contract_err_none : Int = 0
let graph_contract_err_unsupported_version : Int = 1
let graph_contract_err_node_limit : Int = 2
let graph_contract_err_edge_limit : Int = 3

let last_graph_contract_error_box : Array[Int] = [0]
let last_graph_contract_node_count_box : Array[Int] = [2]
let last_graph_contract_edge_count_box : Array[Int] = [1]

fn reset_graph_contract_state() -> Unit {
  last_graph_contract_error_box[0] = graph_contract_err_none
  last_graph_contract_node_count_box[0] = 2
  last_graph_contract_edge_count_box[0] = 1
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
  }
  error
}

fn process_audio(num_samples : Int) -> Unit {
  @effects.process_reverb_block(
    num_samples,
    param_values[0],
    param_values[1],
    param_values[2],
    param_values[3],
    param_values[4],
    param_values[5],
  )
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
  @effects.reset_reverb_state()
  reset_graph_contract_state()
}

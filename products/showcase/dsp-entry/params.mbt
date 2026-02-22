priv struct ParamDef {
  name : String
  min : Float
  max : Float
  default_val : Float
}

fn push_param(
  defs : Array[ParamDef],
  name : String,
  min : Float,
  max : Float,
  default_val : Float,
) -> Unit {
  defs.push({ name, min, max, default_val })
}

fn build_param_defs() -> Array[ParamDef] {
  let pb_base_param_count : Int = 6
  let pb_max_nodes : Int = 16
  let pb_max_edges : Int = 64
  let pb_node_stride : Int = 11
  let pb_edge_stride : Int = 2
  let pb_header_size : Int = 4
  let pb_node_bank_offset : Int = pb_base_param_count + pb_header_size
  let pb_edge_bank_offset : Int = pb_node_bank_offset + pb_max_nodes * pb_node_stride

  let defs : Array[ParamDef] = []

  push_param(defs, "gain", 0.0, 1.5, 1.0)
  push_param(defs, "pre_delay_ms", 0.0, 50.0, 20.0)
  push_param(defs, "decay", 0.0, 0.98, 0.78)
  push_param(defs, "damping", 0.0, 0.95, 0.35)
  push_param(defs, "diffusion", 0.0, 0.95, 0.70)
  push_param(defs, "mix", 0.0, 1.0, 0.35)

  push_param(defs, "graph_schema", 0.0, 8.0, 1.0)
  push_param(defs, "graph_nodes", 0.0, Float::from_int(pb_max_nodes), 2.0)
  push_param(defs, "graph_edges", 0.0, Float::from_int(pb_max_edges), 1.0)
  push_param(defs, "graph_has_output_path", 0.0, 1.0, 1.0)

  for i = 0; i < pb_max_nodes; i = i + 1 {
    let prefix = "graph_node_" + i.to_string() + "_"
    push_param(defs, prefix + "effect_type", -1.0, 16.0, 0.0)
    push_param(defs, prefix + "bypass", 0.0, 1.0, 1.0)
    push_param(defs, prefix + "p1", -128.0, 128.0, if i < 2 { 1.0 } else { 0.0 })
    push_param(defs, prefix + "p2", -128.0, 128.0, 0.0)
    push_param(defs, prefix + "p3", -128.0, 128.0, 0.0)
    push_param(defs, prefix + "p4", -128.0, 128.0, 0.0)
    push_param(defs, prefix + "p5", -128.0, 128.0, 0.0)
    push_param(defs, prefix + "p6", -128.0, 128.0, 0.0)
    push_param(defs, prefix + "p7", -128.0, 128.0, 0.0)
    push_param(defs, prefix + "p8", -128.0, 128.0, 0.0)
    push_param(defs, prefix + "p9", -128.0, 128.0, 0.0)
  }

  for i = 0; i < pb_max_edges; i = i + 1 {
    let prefix = "graph_edge_" + i.to_string() + "_"
    let edge_max = Float::from_int(pb_max_nodes)
    push_param(defs, prefix + "from", -1.0, edge_max, if i == 0 { 0.0 } else { -1.0 })
    push_param(defs, prefix + "to", -1.0, edge_max, if i == 0 { 1.0 } else { -1.0 })
  }

  let _ = pb_edge_bank_offset + pb_max_edges * pb_edge_stride
  push_param(defs, "graph_revision", 0.0, 16777216.0, 0.0)

  defs
}

fn build_param_values(defs : Array[ParamDef]) -> Array[Float] {
  let values : Array[Float] = []
  for i = 0; i < defs.length(); i = i + 1 {
    values.push(defs[i].default_val)
  }
  values
}

let param_defs : Array[ParamDef] = build_param_defs()
let param_values : Array[Float] = build_param_values(param_defs)

fn process_audio(num_samples : Int) -> Unit {
  let gain = param_values[0]
  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4
    let out_l = @utils.load_f32(@utils.input_left_offset + offset) * gain
    let out_r = @utils.load_f32(@utils.input_right_offset + offset) * gain
    @utils.store_f32(@utils.output_left_offset + offset, out_l)
    @utils.store_f32(@utils.output_right_offset + offset, out_r)
  }
}

pub fn product_reset() -> Unit {
  ()
}

pub fn apply_graph_contract(_schema_version : Int, _node_count : Int, _edge_count : Int) -> Int {
  0
}

pub fn apply_graph_runtime_mode(_has_output_path : Int, _effect_type : Int) -> Int {
  0
}

pub fn clear_runtime_graph() -> Unit {
  ()
}

pub fn set_runtime_node(
  _index : Int,
  _effect_type : Int,
  _bypass : Int,
  _p1 : Float,
  _p2 : Float,
  _p3 : Float,
  _p4 : Float,
  _p5 : Float,
  _p6 : Float,
  _p7 : Float,
  _p8 : Float,
  _p9 : Float,
) -> Int {
  0
}

pub fn set_runtime_edge(_index : Int, _from : Int, _to : Int) -> Int {
  0
}

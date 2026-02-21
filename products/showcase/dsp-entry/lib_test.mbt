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

test "graph contract apply validates schema version and limits" {
  let invalid_version = @src.apply_graph_contract(99, 2, 1)
  assert_eq(invalid_version, @src.graph_contract_error_unsupported_version())
  assert_eq(@src.get_last_graph_contract_error(), @src.graph_contract_error_unsupported_version())

  let invalid_nodes = @src.apply_graph_contract(@src.graph_contract_schema_version(), 99, 1)
  assert_eq(invalid_nodes, @src.graph_contract_error_node_limit())
  assert_eq(@src.get_last_graph_contract_error(), @src.graph_contract_error_node_limit())
}

test "graph contract apply stores validated payload shape" {
  let result = @src.apply_graph_contract(@src.graph_contract_schema_version(), 4, 3)
  assert_eq(result, @src.graph_contract_error_none())
  assert_eq(@src.get_last_graph_contract_error(), @src.graph_contract_error_none())
  assert_eq(@src.get_last_graph_contract_node_count(), 4)
  assert_eq(@src.get_last_graph_contract_edge_count(), 3)
}

test "process audio output reflects runtime graph state changes" {
  product_reset()
  @src.clear_runtime_graph()
  assert_eq(@src.set_runtime_node(0, @engine.effect_type_gain(), 1, 1.0, 0.0, 0.0, 0.0, 0.0), 0)
  assert_eq(@src.set_runtime_node(1, @engine.effect_type_gain(), 0, 0.8, 0.0, 0.0, 0.0, 0.0), 0)
  assert_eq(@src.set_runtime_node(2, @engine.effect_type_gain(), 1, 1.0, 0.0, 0.0, 0.0, 0.0), 0)
  assert_eq(@src.set_runtime_edge(0, 0, 1), 0)
  assert_eq(@src.set_runtime_edge(1, 1, 2), 0)
  let err_a = @src.apply_graph_contract(@src.graph_contract_schema_version(), 3, 2)
  assert_eq(err_a, @src.graph_contract_error_none())
  assert_eq(@src.apply_graph_runtime_mode(1, 0), 0)
  let (out_a_l, out_a_r) = @src.process_audio_frame_for_test(0.5, -0.25)

  assert_eq(@src.set_runtime_node(1, @engine.effect_type_gain(), 0, 0.5, 0.0, 0.0, 0.0, 0.0), 0)
  let (out_b_l, out_b_r) = @src.process_audio_frame_for_test(0.5, -0.25)

  assert_eq(approx_eq(out_a_l, out_b_l, 0.00001), false)
  assert_eq(approx_eq(out_a_r, out_b_r, 0.00001), false)
}

test "process audio falls back to dry-safe path for invalid graph contract" {
  product_reset()
  @src.clear_runtime_graph()
  assert_eq(@src.set_runtime_node(0, @engine.effect_type_gain(), 1, 1.0, 0.0, 0.0, 0.0, 0.0), 0)
  assert_eq(@src.set_runtime_node(1, @engine.effect_type_distortion(), 0, 1.0, 0.5, 0.5, 1.0, 1.0), 0)
  assert_eq(@src.set_runtime_node(2, @engine.effect_type_gain(), 1, 1.0, 0.0, 0.0, 0.0, 0.0), 0)
  assert_eq(@src.set_runtime_edge(0, 0, 1), 0)
  assert_eq(@src.set_runtime_edge(1, 1, 2), 0)
  let valid_err = @src.apply_graph_contract(@src.graph_contract_schema_version(), 3, 2)
  assert_eq(valid_err, @src.graph_contract_error_none())
  assert_eq(@src.apply_graph_runtime_mode(1, 0), 0)
  let (valid_out_l, valid_out_r) = @src.process_audio_frame_for_test(0.4, -0.2)
  assert_eq(approx_eq(valid_out_l, 0.4, 0.00001), false)
  assert_eq(approx_eq(valid_out_r, -0.2, 0.00001), false)

  let unsupported_err = @src.apply_graph_contract(99, 3, 2)
  assert_eq(unsupported_err, @src.graph_contract_error_unsupported_version())
  let (fallback_out_l, fallback_out_r) = @src.process_audio_frame_for_test(0.4, -0.2)
  assert_eq(approx_eq(fallback_out_l, 0.4, 0.00001), true)
  assert_eq(approx_eq(fallback_out_r, -0.2, 0.00001), true)
}

test "process audio mutes when graph has no edges" {
  product_reset()
  let err = @src.apply_graph_contract(@src.graph_contract_schema_version(), 2, 0)
  assert_eq(err, @src.graph_contract_error_none())
  let (out_l, out_r) = @src.process_audio_frame_for_test(0.4, -0.2)
  assert_eq(approx_eq(out_l, 0.0, 0.00001), true)
  assert_eq(approx_eq(out_r, 0.0, 0.00001), true)
}

test "process audio mutes when no input-to-output path is reported" {
  product_reset()
  let err = @src.apply_graph_contract(@src.graph_contract_schema_version(), 3, 2)
  assert_eq(err, @src.graph_contract_error_none())
  assert_eq(@src.apply_graph_runtime_mode(0, 7), 0)
  let (out_l, out_r) = @src.process_audio_frame_for_test(0.4, -0.2)
  assert_eq(approx_eq(out_l, 0.0, 0.00001), true)
  assert_eq(approx_eq(out_r, 0.0, 0.00001), true)
}

test "runtime graph node params and bypass affect output" {
  product_reset()
  @src.clear_runtime_graph()
  assert_eq(@src.set_runtime_node(0, @engine.effect_type_gain(), 1, 1.0, 0.0, 0.0, 0.0, 0.0), 0)
  assert_eq(@src.set_runtime_node(1, @engine.effect_type_distortion(), 0, 1.0, 0.5, 0.5, 1.0, 1.0), 0)
  assert_eq(@src.set_runtime_node(2, @engine.effect_type_gain(), 1, 1.0, 0.0, 0.0, 0.0, 0.0), 0)
  assert_eq(@src.set_runtime_edge(0, 0, 1), 0)
  assert_eq(@src.set_runtime_edge(1, 1, 2), 0)
  assert_eq(@src.apply_graph_contract(@src.graph_contract_schema_version(), 3, 2), @src.graph_contract_error_none())
  assert_eq(@src.apply_graph_runtime_mode(1, 0), 0)

  let (wet_l, wet_r) = @src.process_audio_frame_for_test(0.8, -0.8)
  assert_eq(approx_eq(wet_l, 0.8, 0.00001), false)
  assert_eq(approx_eq(wet_r, -0.8, 0.00001), false)

  assert_eq(@src.set_runtime_node(1, @engine.effect_type_distortion(), 1, 1.0, 0.5, 0.5, 1.0, 1.0), 0)
  let (dry_l, dry_r) = @src.process_audio_frame_for_test(0.8, -0.8)
  assert_eq(approx_eq(dry_l, 0.8, 0.00001), true)
  assert_eq(approx_eq(dry_r, -0.8, 0.00001), true)
}

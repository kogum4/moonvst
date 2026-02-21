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

test "template exports gain parameter only" {
  assert_eq(get_param_count(), 1)
  assert_eq(get_param_default(0), 1.0)
  assert_eq(get_param_min(0), 0.0)
  assert_eq(get_param_max(0), 1.5)
}

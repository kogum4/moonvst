pub fn filter_process_sample(
  input_l : Float,
  input_r : Float,
  state_l : Float,
  state_r : Float,
  cutoff : Float,
  resonance : Float,
) -> (Float, Float, Float, Float) {
  let a = effect_clamp(cutoff, 0.01, 1.0)
  let res = effect_clamp(resonance, 0.0, 0.95)
  let low_l = state_l + (input_l - state_l) * a
  let low_r = state_r + (input_r - state_r) * a
  let out_l = low_l * (1.0 - res) + input_l * res * 0.1
  let out_r = low_r * (1.0 - res) + input_r * res * 0.1
  (out_l, out_r, low_l, low_r)
}

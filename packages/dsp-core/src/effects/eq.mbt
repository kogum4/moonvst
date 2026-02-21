pub fn eq_process(
  input_l : Float,
  input_r : Float,
  tone : Float,
  amount : Float,
) -> (Float, Float) {
  let t = effect_clamp(tone, -1.0, 1.0)
  let amt = effect_clamp(amount, 0.0, 2.0)
  let mid = (input_l + input_r) * 0.5
  let side = (input_l - input_r) * 0.5
  let low = mid * (1.0 - t * 0.5)
  let high = side * (1.0 + t * 0.5)
  (low + high * amt, low - high * amt)
}

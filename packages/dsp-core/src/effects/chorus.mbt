pub fn chorus_process(
  input_l : Float,
  input_r : Float,
  depth : Float,
  rate : Float,
  mix : Float,
) -> (Float, Float) {
  let depth_amt = effect_clamp(depth, 0.0, 1.0)
  let rate_amt = effect_clamp(rate, 0.0, 1.0)
  let modulation = effect_clamp(depth_amt * 0.45 + rate_amt * 0.2, 0.0, 0.8)
  let wet_l = input_l * (1.0 - modulation) + input_r * modulation
  let wet_r = input_r * (1.0 - modulation) + input_l * modulation
  (
    effect_mix_dry_wet(input_l, wet_l, mix),
    effect_mix_dry_wet(input_r, wet_r, mix),
  )
}

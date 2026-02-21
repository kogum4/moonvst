pub fn delay_process_sample(
  input_l : Float,
  input_r : Float,
  state_l : Float,
  state_r : Float,
  feedback : Float,
  mix : Float,
) -> (Float, Float, Float, Float) {
  let fb = effect_clamp(feedback, 0.0, 0.95)
  let wet_l = state_l
  let wet_r = state_r
  let next_state_l = input_l + wet_l * fb
  let next_state_r = input_r + wet_r * fb
  (
    effect_mix_dry_wet(input_l, wet_l, mix),
    effect_mix_dry_wet(input_r, wet_r, mix),
    next_state_l,
    next_state_r,
  )
}

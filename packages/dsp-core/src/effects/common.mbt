pub fn effect_clamp(x : Float, min_val : Float, max_val : Float) -> Float {
  if x < min_val {
    min_val
  } else if x > max_val {
    max_val
  } else {
    x
  }
}

pub fn effect_abs(x : Float) -> Float {
  if x < 0.0 { -x } else { x }
}

pub fn effect_mix_dry_wet(dry : Float, wet : Float, mix : Float) -> Float {
  let wet_mix = effect_clamp(mix, 0.0, 1.0)
  dry * (1.0 - wet_mix) + wet * wet_mix
}

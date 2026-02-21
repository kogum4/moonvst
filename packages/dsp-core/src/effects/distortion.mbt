fn distortion_soft_clip(input : Float, drive : Float) -> Float {
  let gain : Float = 1.0 + effect_clamp(drive, 0.0, 1.0) * 9.0
  let x = input * gain
  x / (1.0 + effect_abs(x))
}

pub fn distortion_process(
  input_l : Float,
  input_r : Float,
  drive : Float,
  mix : Float,
) -> (Float, Float) {
  let wet_l = distortion_soft_clip(input_l, drive)
  let wet_r = distortion_soft_clip(input_r, drive)
  (
    effect_mix_dry_wet(input_l, wet_l, mix),
    effect_mix_dry_wet(input_r, wet_r, mix),
  )
}

fn compressor_apply_sample(input : Float, threshold : Float, ratio : Float) -> Float {
  let th = effect_clamp(threshold, 0.0, 1.0)
  let ratio_safe : Float = if ratio < 1.0 { 1.0 } else { ratio }
  let magnitude = effect_abs(input)
  if magnitude <= th {
    input
  } else {
    let over = magnitude - th
    let compressed : Float = th + over / ratio_safe
    if input < 0.0 { -compressed } else { compressed }
  }
}

pub fn compressor_process(
  input_l : Float,
  input_r : Float,
  threshold : Float,
  ratio : Float,
) -> (Float, Float) {
  (
    compressor_apply_sample(input_l, threshold, ratio),
    compressor_apply_sample(input_r, threshold, ratio),
  )
}

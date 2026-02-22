let filter_sample_rate_hz : Float = 48000.0
let filter_pi : Float = 3.141592653589793

pub fn svf_default_sample_rate_hz() -> Float {
  filter_sample_rate_hz
}

pub fn svf_compute_g_from_hz(freq_hz : Float, sample_rate_hz : Float) -> Float {
  let sr = if sample_rate_hz <= 1000.0 { filter_sample_rate_hz } else { sample_rate_hz }
  let hz = effect_clamp(freq_hz, 5.0, sr * 0.49)
  @math.tanf(filter_pi * (hz / sr))
}

pub fn svf_compute_a(g : Float, k : Float) -> (Float, Float, Float) {
  let a1 : Float = 1.0 / (1.0 + g * (g + k))
  let a2 : Float = g * a1
  let a3 : Float = g * a2
  (a1, a2, a3)
}

pub fn svf_step(
  input : Float,
  ic1eq : Float,
  ic2eq : Float,
  a1 : Float,
  a2 : Float,
  a3 : Float,
) -> (Float, Float, Float, Float) {
  let v3 : Float = input - ic2eq
  let v1 : Float = a1 * ic1eq + a2 * v3
  let v2 : Float = ic2eq + a2 * ic1eq + a3 * v3
  (v1, v2, 2.0 * v1 - ic1eq, 2.0 * v2 - ic2eq)
}

pub fn svf_mix_output(
  input : Float,
  v1 : Float,
  v2 : Float,
  m0 : Float,
  m1 : Float,
  m2 : Float,
) -> Float {
  m0 * input + m1 * v1 + m2 * v2
}

fn filter_mode_to_index(mode : Float) -> Int {
  let mode_clamped = effect_clamp(mode, 0.0, 5.0)
  let idx = mode_clamped.to_int()
  if idx < 0 {
    0
  } else if idx > 5 {
    5
  } else {
    idx
  }
}

fn filter_cutoff_to_hz(cutoff : Float) -> Float {
  let normalized = effect_clamp(cutoff, 0.01, 1.0)
  let unit = (normalized - 0.01) / 0.99
  40.0 + unit * (12000.0 - 40.0)
}

fn svf_process_single_channel(
  input : Float,
  ic1eq : Float,
  ic2eq : Float,
  cutoff : Float,
  resonance : Float,
  mode_index : Int,
) -> (Float, Float, Float) {
  let cutoff_hz = filter_cutoff_to_hz(cutoff)
  let g : Float = svf_compute_g_from_hz(cutoff_hz, filter_sample_rate_hz)
  let k : Float = effect_clamp(resonance, 0.0, 1.0) * 2.0
  let (a1, a2, a3) = svf_compute_a(g, k)
  let (v1, v2, next_ic1, next_ic2) = svf_step(input, ic1eq, ic2eq, a1, a2, a3)
  let hp : Float = input - k * v1 - v2
  let lp : Float = v2
  let bp : Float = v1
  let notch : Float = lp + hp
  let peak : Float = lp - hp
  let allpass : Float = notch - k * bp
  let output : Float =
    if mode_index == 0 {
      lp
    } else if mode_index == 1 {
      hp
    } else if mode_index == 2 {
      bp
    } else if mode_index == 3 {
      notch
    } else if mode_index == 4 {
      peak
    } else {
      allpass
    }

  (output, next_ic1, next_ic2)
}

pub fn filter_process_sample(
  input_l : Float,
  input_r : Float,
  ic1eq_l : Float,
  ic2eq_l : Float,
  ic1eq_r : Float,
  ic2eq_r : Float,
  cutoff : Float,
  resonance : Float,
  mode : Float,
  mix : Float,
) -> (Float, Float, Float, Float, Float, Float) {
  let mode_index = filter_mode_to_index(mode)
  let mix_amt = effect_clamp(mix, 0.0, 1.0)
  let (wet_l, next_ic1_l, next_ic2_l) =
    svf_process_single_channel(input_l, ic1eq_l, ic2eq_l, cutoff, resonance, mode_index)
  let (wet_r, next_ic1_r, next_ic2_r) =
    svf_process_single_channel(input_r, ic1eq_r, ic2eq_r, cutoff, resonance, mode_index)

  (
    effect_mix_dry_wet(input_l, wet_l, mix_amt),
    effect_mix_dry_wet(input_r, wet_r, mix_amt),
    next_ic1_l,
    next_ic2_l,
    next_ic1_r,
    next_ic2_r,
  )
}

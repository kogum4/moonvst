let eq_max_nodes : Int = 16
let eq_band_count : Int = 5
let eq_state_slots : Int = eq_max_nodes * eq_band_count

let eq_state_ic1_l : Array[Float] = []
let eq_state_ic2_l : Array[Float] = []
let eq_state_ic1_r : Array[Float] = []
let eq_state_ic2_r : Array[Float] = []

fn ensure_eq_state() -> Unit {
  for i = eq_state_ic1_l.length(); i < eq_state_slots; i = i + 1 {
    eq_state_ic1_l.push(0.0)
    eq_state_ic2_l.push(0.0)
    eq_state_ic1_r.push(0.0)
    eq_state_ic2_r.push(0.0)
  }
}

pub fn reset_eq_state() -> Unit {
  ensure_eq_state()
  for i = 0; i < eq_state_slots; i = i + 1 {
    eq_state_ic1_l[i] = 0.0
    eq_state_ic2_l[i] = 0.0
    eq_state_ic1_r[i] = 0.0
    eq_state_ic2_r[i] = 0.0
  }
}

fn eq_node_index(node_index : Int) -> Int {
  if node_index < 0 {
    0
  } else if node_index >= eq_max_nodes {
    eq_max_nodes - 1
  } else {
    node_index
  }
}

fn eq_state_index(node_index : Int, band_index : Int) -> Int {
  let clamped_band =
    if band_index < 0 {
      0
    } else if band_index >= eq_band_count {
      eq_band_count - 1
    } else {
      band_index
    }
  eq_node_index(node_index) * eq_band_count + clamped_band
}

fn eq_db_to_amp(gain_db : Float) -> Float {
  @math.powf(10.0, gain_db / 40.0)
}

fn eq_compute_coefficients(
  gain_db : Float,
  freq_hz : Float,
  q : Float,
  is_shelf_low : Bool,
  is_shelf_high : Bool,
) -> (Float, Float, Float, Float, Float, Float) {
  let gain_amp = eq_db_to_amp(gain_db)
  let aa = gain_amp * gain_amp
  let q_safe = effect_clamp(q, 0.25, 8.0)

  if is_shelf_low || is_shelf_high {
    let sqrt_gain = @math.powf(gain_amp, 0.5)
    let g = svf_compute_g_from_hz(freq_hz, svf_default_sample_rate_hz()) / sqrt_gain
    let k : Float = Float::from_int(1) / q_safe
    let (a1, a2, a3) = svf_compute_a(g, k)
    if is_shelf_low {
      (a1, a2, a3, 1.0, k * (gain_amp - 1.0), aa - 1.0)
    } else {
      (a1, a2, a3, aa, k * (1.0 - gain_amp) * gain_amp, 1.0 - aa)
    }
  } else {
    let g = svf_compute_g_from_hz(freq_hz, svf_default_sample_rate_hz())
    let k : Float = Float::from_int(1) / (q_safe * gain_amp)
    let (a1, a2, a3) = svf_compute_a(g, k)
    (a1, a2, a3, 1.0, k * (aa - 1.0), 0.0)
  }
}

fn eq_process_band(
  node_index : Int,
  band_index : Int,
  input : Float,
  gain_db : Float,
  freq_hz : Float,
  q : Float,
  is_shelf_low : Bool,
  is_shelf_high : Bool,
  state_ic1 : Array[Float],
  state_ic2 : Array[Float],
) -> Float {
  let idx = eq_state_index(node_index, band_index)
  let (a1, a2, a3, m0, m1, m2) =
    eq_compute_coefficients(gain_db, freq_hz, q, is_shelf_low, is_shelf_high)
  let (v1, v2, next_ic1, next_ic2) = svf_step(input, state_ic1[idx], state_ic2[idx], a1, a2, a3)
  state_ic1[idx] = next_ic1
  state_ic2[idx] = next_ic2
  svf_mix_output(input, v1, v2, m0, m1, m2)
}

fn eq_process_channel(
  node_index : Int,
  input : Float,
  low_gain_db : Float,
  low_mid_gain_db : Float,
  mid_gain_db : Float,
  high_mid_gain_db : Float,
  high_gain_db : Float,
  state_ic1 : Array[Float],
  state_ic2 : Array[Float],
) -> Float {
  let b0 = eq_process_band(node_index, 0, input, low_gain_db, 90.0, 0.707, true, false, state_ic1, state_ic2)
  let b1 = eq_process_band(node_index, 1, b0, low_mid_gain_db, 350.0, 0.9, false, false, state_ic1, state_ic2)
  let b2 = eq_process_band(node_index, 2, b1, mid_gain_db, 1200.0, 1.0, false, false, state_ic1, state_ic2)
  let b3 = eq_process_band(node_index, 3, b2, high_mid_gain_db, 4200.0, 0.9, false, false, state_ic1, state_ic2)
  eq_process_band(node_index, 4, b3, high_gain_db, 11000.0, 0.707, false, true, state_ic1, state_ic2)
}

pub fn eq_process(
  node_index : Int,
  input_l : Float,
  input_r : Float,
  low_gain_db : Float,
  low_mid_gain_db : Float,
  mid_gain_db : Float,
  high_mid_gain_db : Float,
  high_gain_db : Float,
) -> (Float, Float) {
  ensure_eq_state()

  let low = effect_clamp(low_gain_db, -18.0, 18.0)
  let low_mid = effect_clamp(low_mid_gain_db, -18.0, 18.0)
  let mid = effect_clamp(mid_gain_db, -18.0, 18.0)
  let high_mid = effect_clamp(high_mid_gain_db, -18.0, 18.0)
  let high = effect_clamp(high_gain_db, -18.0, 18.0)

  (
    eq_process_channel(node_index, input_l, low, low_mid, mid, high_mid, high, eq_state_ic1_l, eq_state_ic2_l),
    eq_process_channel(node_index, input_r, low, low_mid, mid, high_mid, high, eq_state_ic1_r, eq_state_ic2_r),
  )
}

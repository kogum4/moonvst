let delay_sample_rate_hz : Float = 48000.0
let delay_ref_sample_rate_hz : Float = 44100.0
let delay_pi : Float = 3.141592653589793238
let delay_two_pi : Float = delay_pi * 2.0
let delay_delay_samples : Int = 88211
let delay_delay_wrap : Int = 88200
let delay_delay_wrap_f : Float = 88200.0
let delay_max_nodes : Int = 16
let delay_ref_slots : Int = 10
let delay_tiny_threshold : Float = 0.0000000000000000000000118
let delay_tiny_noise : Float = 0.0000000000000000118
let delay_phi : Float = 1.6180339887498948482

let delay_line_l : Array[Float] = []
let delay_line_r : Array[Float] = []
let delay_prev_sample_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_prev_sample_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_pos_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_pos_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_sweep_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_sweep_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_regen_z1_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_regen_z1_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_regen_z2_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_regen_z2_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_out_z1_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_out_z1_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_out_z2_l : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_out_z2_r : Array[Float] = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
let delay_cycle : Array[Int] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
let delay_last_ref_l : Array[Float] = []
let delay_last_ref_r : Array[Float] = []

fn delay_ref_offset(node_index : Int, ref_index : Int) -> Int {
  node_index * delay_ref_slots + ref_index
}

fn delay_abs(x : Float) -> Float {
  if x < 0.0 { -x } else { x }
}

fn delay_sin(x : Float) -> Float {
  @math.sinf(x)
}

fn delay_tan(x : Float) -> Float {
  @math.tanf(x)
}

fn delay_cycle_end() -> Int {
  let mut cycle_end = (delay_sample_rate_hz / delay_ref_sample_rate_hz).to_int()
  if cycle_end < 1 {
    cycle_end = 1
  } else if cycle_end > 4 {
    cycle_end = 4
  }
  cycle_end
}

fn ensure_delay_buffers() -> Unit {
  let target_samples = delay_max_nodes * delay_delay_samples
  for i = delay_line_l.length(); i < target_samples; i = i + 1 {
    delay_line_l.push(0.0)
    delay_line_r.push(0.0)
  }
  let target_refs = delay_max_nodes * delay_ref_slots
  for i = delay_last_ref_l.length(); i < target_refs; i = i + 1 {
    delay_last_ref_l.push(0.0)
    delay_last_ref_r.push(0.0)
  }
}

pub fn reset_delay_state() -> Unit {
  ensure_delay_buffers()
  for i = 0; i < delay_line_l.length(); i = i + 1 {
    delay_line_l[i] = 0.0
    delay_line_r[i] = 0.0
  }
  for node = 0; node < delay_max_nodes; node = node + 1 {
    delay_prev_sample_l[node] = 0.0
    delay_prev_sample_r[node] = 0.0
    delay_pos_l[node] = 0.0
    delay_pos_r[node] = 0.0
    delay_sweep_l[node] = 0.0
    delay_sweep_r[node] = 0.0
    delay_regen_z1_l[node] = 0.0
    delay_regen_z1_r[node] = 0.0
    delay_regen_z2_l[node] = 0.0
    delay_regen_z2_r[node] = 0.0
    delay_out_z1_l[node] = 0.0
    delay_out_z1_r[node] = 0.0
    delay_out_z2_l[node] = 0.0
    delay_out_z2_r[node] = 0.0
    delay_cycle[node] = 0
  }
  for i = 0; i < delay_last_ref_l.length(); i = i + 1 {
    delay_last_ref_l[i] = 0.0
    delay_last_ref_r[i] = 0.0
  }
}

fn delay_calc_coeff(freq : Float, q : Float) -> (Float, Float, Float, Float) {
  let k : Float = delay_tan(delay_pi * freq)
  let norm : Float = 1.0 / (1.0 + (k / q) + k * k)
  let b0 : Float = (k / q) * norm
  let b1 : Float = -b0
  let a1 : Float = 2.0 * (k * k - 1.0) * norm
  let a2 : Float = (1.0 - (k / q) + k * k) * norm
  (b0, b1, a1, a2)
}

fn delay_process_channel(
  node_index : Int,
  input_sample : Float,
  speed : Float,
  feedback : Float,
  line : Array[Float],
  prev_sample : Array[Float],
  delay_pos : Array[Float],
  regen_z1 : Array[Float],
  regen_z2 : Array[Float],
  out_z1 : Array[Float],
  out_z2 : Array[Float],
  regen_b0 : Float,
  regen_b1 : Float,
  regen_a1 : Float,
  regen_a2 : Float,
  out_b0 : Float,
  out_b1 : Float,
  out_a1 : Float,
  out_a2 : Float,
) -> Float {
  let line_base = node_index * delay_delay_samples
  let mut pos = delay_pos[node_index].to_int()

  let mut new_sample = input_sample + line[line_base + pos] * feedback
  let mut temp_sample = new_sample * regen_b0 + regen_z1[node_index]
  regen_z1[node_index] = -(temp_sample * regen_a1) + regen_z2[node_index]
  regen_z2[node_index] = new_sample * regen_b1 - (temp_sample * regen_a2)
  new_sample = temp_sample

  let mut next_delay_pos = delay_pos[node_index] - speed
  if next_delay_pos < 0.0 {
    next_delay_pos = next_delay_pos + delay_delay_wrap_f
  }
  let delay_target = next_delay_pos.to_int()
  let increment = (new_sample - prev_sample[node_index]) / speed

  line[line_base + pos] = prev_sample[node_index]
  while pos != delay_target {
    line[line_base + pos] = prev_sample[node_index]
    prev_sample[node_index] = prev_sample[node_index] + increment
    pos = pos - 1
    if pos < 0 {
      pos = delay_delay_wrap
    }
  }
  prev_sample[node_index] = new_sample
  pos = delay_target
  let mut output = line[line_base + pos]
  temp_sample = output * out_b0 + out_z1[node_index]
  out_z1[node_index] = -(temp_sample * out_a1) + out_z2[node_index]
  out_z2[node_index] = output * out_b1 - (temp_sample * out_a2)
  output = temp_sample
  delay_pos[node_index] = next_delay_pos
  output
}

pub fn delay_process_sample(
  node_index : Int,
  input_l : Float,
  input_r : Float,
  speed : Float,
  feedback : Float,
  filter_freq : Float,
  filter_q : Float,
  flutter : Float,
  wet_dry : Float,
) -> (Float, Float) {
  if node_index < 0 || node_index >= delay_max_nodes {
    return (input_l, input_r)
  }
  ensure_delay_buffers()

  let speed_amt = effect_clamp(speed, 0.0, 1.0)
  let feedback_amt = effect_clamp(feedback, 0.0, 1.0)
  let filter_freq_amt = effect_clamp(filter_freq, 0.0, 1.0)
  let filter_q_amt = effect_clamp(filter_q, 0.0, 1.0)
  let flutter_amt = effect_clamp(flutter, 0.0, 1.0)
  let wet_dry_amt = effect_clamp(wet_dry, 0.0, 1.0)

  let speed_sq = speed_amt * speed_amt
  let base_speed = speed_sq * speed_sq * 25.0 + 1.0
  let feedback_gain = feedback_amt * feedback_amt

  let regen_freq = filter_freq_amt * filter_freq_amt * filter_freq_amt * 0.4 + 0.0001
  let regen_q = filter_q_amt * filter_q_amt + 0.01
  let (regen_b0, regen_b1, regen_a1, regen_a2) = delay_calc_coeff(regen_freq, regen_q)

  let out_q = regen_q * delay_phi
  let (out_b0, out_b1, out_a1, out_a2) = delay_calc_coeff(regen_freq, out_q)

  let flutter_pow = flutter_amt * flutter_amt * flutter_amt * flutter_amt * flutter_amt
  let vib_speed = flutter_pow * base_speed * ((regen_freq * 0.09) + 0.025)

  let mut wet : Float = wet_dry_amt * 2.0
  let mut dry : Float = 2.0 - wet
  wet = effect_clamp(wet, 0.0, 1.0)
  dry = effect_clamp(dry, 0.0, 1.0)

  let mut input_sample_l = input_l
  let mut input_sample_r = input_r
  if delay_abs(input_sample_l) < delay_tiny_threshold {
    input_sample_l = delay_tiny_noise
  }
  if delay_abs(input_sample_r) < delay_tiny_threshold {
    input_sample_r = delay_tiny_noise
  }
  let mut dry_sample_l = input_sample_l
  let mut dry_sample_r = input_sample_r

  let cycle_end = delay_cycle_end()
  let mut cycle = delay_cycle[node_index] + 1
  let mut wet_sample_l : Float = 0.0
  let mut wet_sample_r : Float = 0.0

  if cycle == cycle_end {
    let speed_l = base_speed + vib_speed * (delay_sin(delay_sweep_l[node_index]) + 1.0)
    let speed_r = base_speed + vib_speed * (delay_sin(delay_sweep_r[node_index]) + 1.0)
    delay_sweep_l[node_index] = delay_sweep_l[node_index] + 0.05 * input_sample_l * input_sample_l
    if delay_sweep_l[node_index] > delay_two_pi {
      delay_sweep_l[node_index] = delay_sweep_l[node_index] - delay_two_pi
    }
    delay_sweep_r[node_index] = delay_sweep_r[node_index] + 0.05 * input_sample_r * input_sample_r
    if delay_sweep_r[node_index] > delay_two_pi {
      delay_sweep_r[node_index] = delay_sweep_r[node_index] - delay_two_pi
    }

    wet_sample_l = delay_process_channel(
      node_index,
      input_sample_l,
      speed_l,
      feedback_gain,
      delay_line_l,
      delay_prev_sample_l,
      delay_pos_l,
      delay_regen_z1_l,
      delay_regen_z2_l,
      delay_out_z1_l,
      delay_out_z2_l,
      regen_b0,
      regen_b1,
      regen_a1,
      regen_a2,
      out_b0,
      out_b1,
      out_a1,
      out_a2,
    )
    wet_sample_r = delay_process_channel(
      node_index,
      input_sample_r,
      speed_r,
      feedback_gain,
      delay_line_r,
      delay_prev_sample_r,
      delay_pos_r,
      delay_regen_z1_r,
      delay_regen_z2_r,
      delay_out_z1_r,
      delay_out_z2_r,
      regen_b0,
      regen_b1,
      regen_a1,
      regen_a2,
      out_b0,
      out_b1,
      out_a1,
      out_a2,
    )

    if cycle_end == 4 {
      let ref0 = delay_ref_offset(node_index, 0)
      let ref1 = delay_ref_offset(node_index, 1)
      let ref2 = delay_ref_offset(node_index, 2)
      let ref3 = delay_ref_offset(node_index, 3)
      let ref4 = delay_ref_offset(node_index, 4)
      delay_last_ref_l[ref0] = delay_last_ref_l[ref4]
      delay_last_ref_l[ref2] = (delay_last_ref_l[ref0] + wet_sample_l) * 0.5
      delay_last_ref_l[ref1] = (delay_last_ref_l[ref0] + delay_last_ref_l[ref2]) * 0.5
      delay_last_ref_l[ref3] = (delay_last_ref_l[ref2] + wet_sample_l) * 0.5
      delay_last_ref_l[ref4] = wet_sample_l
      delay_last_ref_r[ref0] = delay_last_ref_r[ref4]
      delay_last_ref_r[ref2] = (delay_last_ref_r[ref0] + wet_sample_r) * 0.5
      delay_last_ref_r[ref1] = (delay_last_ref_r[ref0] + delay_last_ref_r[ref2]) * 0.5
      delay_last_ref_r[ref3] = (delay_last_ref_r[ref2] + wet_sample_r) * 0.5
      delay_last_ref_r[ref4] = wet_sample_r
    } else if cycle_end == 3 {
      let ref0 = delay_ref_offset(node_index, 0)
      let ref1 = delay_ref_offset(node_index, 1)
      let ref2 = delay_ref_offset(node_index, 2)
      let ref3 = delay_ref_offset(node_index, 3)
      delay_last_ref_l[ref0] = delay_last_ref_l[ref3]
      delay_last_ref_l[ref2] = (delay_last_ref_l[ref0] + delay_last_ref_l[ref0] + wet_sample_l) / 3.0
      delay_last_ref_l[ref1] = (delay_last_ref_l[ref0] + wet_sample_l + wet_sample_l) / 3.0
      delay_last_ref_l[ref3] = wet_sample_l
      delay_last_ref_r[ref0] = delay_last_ref_r[ref3]
      delay_last_ref_r[ref2] = (delay_last_ref_r[ref0] + delay_last_ref_r[ref0] + wet_sample_r) / 3.0
      delay_last_ref_r[ref1] = (delay_last_ref_r[ref0] + wet_sample_r + wet_sample_r) / 3.0
      delay_last_ref_r[ref3] = wet_sample_r
    } else if cycle_end == 2 {
      let ref0 = delay_ref_offset(node_index, 0)
      let ref1 = delay_ref_offset(node_index, 1)
      let ref2 = delay_ref_offset(node_index, 2)
      delay_last_ref_l[ref0] = delay_last_ref_l[ref2]
      delay_last_ref_l[ref1] = (delay_last_ref_l[ref0] + wet_sample_l) * 0.5
      delay_last_ref_l[ref2] = wet_sample_l
      delay_last_ref_r[ref0] = delay_last_ref_r[ref2]
      delay_last_ref_r[ref1] = (delay_last_ref_r[ref0] + wet_sample_r) * 0.5
      delay_last_ref_r[ref2] = wet_sample_r
    } else {
      let ref0 = delay_ref_offset(node_index, 0)
      delay_last_ref_l[ref0] = wet_sample_l
      delay_last_ref_r[ref0] = wet_sample_r
    }
    cycle = 0
    wet_sample_l = delay_last_ref_l[delay_ref_offset(node_index, cycle)]
    wet_sample_r = delay_last_ref_r[delay_ref_offset(node_index, cycle)]
  } else {
    wet_sample_l = delay_last_ref_l[delay_ref_offset(node_index, cycle)]
    wet_sample_r = delay_last_ref_r[delay_ref_offset(node_index, cycle)]
  }

  if cycle_end >= 4 {
    let ref8 = delay_ref_offset(node_index, 8)
    let ref7 = delay_ref_offset(node_index, 7)
    delay_last_ref_l[ref8] = wet_sample_l
    wet_sample_l = (wet_sample_l + delay_last_ref_l[ref7]) * 0.5
    delay_last_ref_l[ref7] = delay_last_ref_l[ref8]
    delay_last_ref_r[ref8] = wet_sample_r
    wet_sample_r = (wet_sample_r + delay_last_ref_r[ref7]) * 0.5
    delay_last_ref_r[ref7] = delay_last_ref_r[ref8]
  }
  if cycle_end >= 3 {
    let ref8 = delay_ref_offset(node_index, 8)
    let ref6 = delay_ref_offset(node_index, 6)
    delay_last_ref_l[ref8] = wet_sample_l
    wet_sample_l = (wet_sample_l + delay_last_ref_l[ref6]) * 0.5
    delay_last_ref_l[ref6] = delay_last_ref_l[ref8]
    delay_last_ref_r[ref8] = wet_sample_r
    wet_sample_r = (wet_sample_r + delay_last_ref_r[ref6]) * 0.5
    delay_last_ref_r[ref6] = delay_last_ref_r[ref8]
  }
  if cycle_end >= 2 {
    let ref8 = delay_ref_offset(node_index, 8)
    let ref5 = delay_ref_offset(node_index, 5)
    delay_last_ref_l[ref8] = wet_sample_l
    wet_sample_l = (wet_sample_l + delay_last_ref_l[ref5]) * 0.5
    delay_last_ref_l[ref5] = delay_last_ref_l[ref8]
    delay_last_ref_r[ref8] = wet_sample_r
    wet_sample_r = (wet_sample_r + delay_last_ref_r[ref5]) * 0.5
    delay_last_ref_r[ref5] = delay_last_ref_r[ref8]
  }

  if wet < 1.0 {
    wet_sample_l = wet_sample_l * wet
    wet_sample_r = wet_sample_r * wet
  }
  if dry < 1.0 {
    dry_sample_l = dry_sample_l * dry
    dry_sample_r = dry_sample_r * dry
  }

  delay_cycle[node_index] = cycle
  (wet_sample_l + dry_sample_l, wet_sample_r + dry_sample_r)
}

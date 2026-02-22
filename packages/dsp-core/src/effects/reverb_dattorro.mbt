/// Dattorro-style stereo reverb network.
/// Memory below heap start is reserved for fixed-size delay lines.
let reverb_sample_rate_hz : Float = 48000.0
let reverb_pre_delay_len : Int = 2400
let reverb_in_ap1_len : Int = 142
let reverb_in_ap2_len : Int = 107
let reverb_tank_l_ap1_len : Int = 672
let reverb_tank_l_d1_len : Int = 4453
let reverb_tank_l_ap2_len : Int = 1800
let reverb_tank_l_d2_len : Int = 3720
let reverb_tank_r_ap1_len : Int = 908
let reverb_tank_r_d1_len : Int = 4217
let reverb_tank_r_ap2_len : Int = 2656
let reverb_tank_r_d2_len : Int = 3163

let reverb_mem_base_ptr : Int = 0x60000
let reverb_fallback_state_l_box : Array[Float] = [0.0]
let reverb_fallback_state_r_box : Array[Float] = [0.0]

priv struct ReverbLayout {
  pre_delay_ptr : Int
  in_ap1_ptr : Int
  in_ap2_ptr : Int
  tank_l_ap1_ptr : Int
  tank_l_d1_ptr : Int
  tank_l_ap2_ptr : Int
  tank_l_d2_ptr : Int
  tank_r_ap1_ptr : Int
  tank_r_d1_ptr : Int
  tank_r_ap2_ptr : Int
  tank_r_d2_ptr : Int
  state_pre_delay_idx_ptr : Int
  state_in_ap1_idx_ptr : Int
  state_in_ap2_idx_ptr : Int
  state_tank_l_ap1_idx_ptr : Int
  state_tank_l_d1_idx_ptr : Int
  state_tank_l_ap2_idx_ptr : Int
  state_tank_l_d2_idx_ptr : Int
  state_tank_r_ap1_idx_ptr : Int
  state_tank_r_d1_idx_ptr : Int
  state_tank_r_ap2_idx_ptr : Int
  state_tank_r_d2_idx_ptr : Int
  state_tank_feedback_l_ptr : Int
  state_tank_feedback_r_ptr : Int
  state_damping_state_l_ptr : Int
  state_damping_state_r_ptr : Int
  required_bytes : Int
}

fn build_reverb_layout(
  base_ptr : Int,
  pre_delay_len : Int,
  in_ap1_len : Int,
  in_ap2_len : Int,
  tank_l_ap1_len : Int,
  tank_l_d1_len : Int,
  tank_l_ap2_len : Int,
  tank_l_d2_len : Int,
  tank_r_ap1_len : Int,
  tank_r_d1_len : Int,
  tank_r_ap2_len : Int,
  tank_r_d2_len : Int,
) -> ReverbLayout {
  let mut cursor = base_ptr

  let pre_delay_span = @utils.alloc_f32_samples(cursor, pre_delay_len)
  let pre_delay_ptr = pre_delay_span.ptr
  cursor = pre_delay_span.next
  let in_ap1_span = @utils.alloc_f32_samples(cursor, in_ap1_len)
  let in_ap1_ptr = in_ap1_span.ptr
  cursor = in_ap1_span.next
  let in_ap2_span = @utils.alloc_f32_samples(cursor, in_ap2_len)
  let in_ap2_ptr = in_ap2_span.ptr
  cursor = in_ap2_span.next
  let tank_l_ap1_span = @utils.alloc_f32_samples(cursor, tank_l_ap1_len)
  let tank_l_ap1_ptr = tank_l_ap1_span.ptr
  cursor = tank_l_ap1_span.next
  let tank_l_d1_span = @utils.alloc_f32_samples(cursor, tank_l_d1_len)
  let tank_l_d1_ptr = tank_l_d1_span.ptr
  cursor = tank_l_d1_span.next
  let tank_l_ap2_span = @utils.alloc_f32_samples(cursor, tank_l_ap2_len)
  let tank_l_ap2_ptr = tank_l_ap2_span.ptr
  cursor = tank_l_ap2_span.next
  let tank_l_d2_span = @utils.alloc_f32_samples(cursor, tank_l_d2_len)
  let tank_l_d2_ptr = tank_l_d2_span.ptr
  cursor = tank_l_d2_span.next
  let tank_r_ap1_span = @utils.alloc_f32_samples(cursor, tank_r_ap1_len)
  let tank_r_ap1_ptr = tank_r_ap1_span.ptr
  cursor = tank_r_ap1_span.next
  let tank_r_d1_span = @utils.alloc_f32_samples(cursor, tank_r_d1_len)
  let tank_r_d1_ptr = tank_r_d1_span.ptr
  cursor = tank_r_d1_span.next
  let tank_r_ap2_span = @utils.alloc_f32_samples(cursor, tank_r_ap2_len)
  let tank_r_ap2_ptr = tank_r_ap2_span.ptr
  cursor = tank_r_ap2_span.next
  let tank_r_d2_span = @utils.alloc_f32_samples(cursor, tank_r_d2_len)
  let tank_r_d2_ptr = tank_r_d2_span.ptr
  cursor = tank_r_d2_span.next

  let state_pre_delay_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_pre_delay_idx_ptr = state_pre_delay_idx_span.ptr
  cursor = state_pre_delay_idx_span.next
  let state_in_ap1_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_in_ap1_idx_ptr = state_in_ap1_idx_span.ptr
  cursor = state_in_ap1_idx_span.next
  let state_in_ap2_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_in_ap2_idx_ptr = state_in_ap2_idx_span.ptr
  cursor = state_in_ap2_idx_span.next
  let state_tank_l_ap1_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_l_ap1_idx_ptr = state_tank_l_ap1_idx_span.ptr
  cursor = state_tank_l_ap1_idx_span.next
  let state_tank_l_d1_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_l_d1_idx_ptr = state_tank_l_d1_idx_span.ptr
  cursor = state_tank_l_d1_idx_span.next
  let state_tank_l_ap2_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_l_ap2_idx_ptr = state_tank_l_ap2_idx_span.ptr
  cursor = state_tank_l_ap2_idx_span.next
  let state_tank_l_d2_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_l_d2_idx_ptr = state_tank_l_d2_idx_span.ptr
  cursor = state_tank_l_d2_idx_span.next
  let state_tank_r_ap1_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_r_ap1_idx_ptr = state_tank_r_ap1_idx_span.ptr
  cursor = state_tank_r_ap1_idx_span.next
  let state_tank_r_d1_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_r_d1_idx_ptr = state_tank_r_d1_idx_span.ptr
  cursor = state_tank_r_d1_idx_span.next
  let state_tank_r_ap2_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_r_ap2_idx_ptr = state_tank_r_ap2_idx_span.ptr
  cursor = state_tank_r_ap2_idx_span.next
  let state_tank_r_d2_idx_span = @utils.alloc_i32_slots(cursor, 1)
  let state_tank_r_d2_idx_ptr = state_tank_r_d2_idx_span.ptr
  cursor = state_tank_r_d2_idx_span.next
  let state_tank_feedback_l_span = @utils.alloc_f32_samples(cursor, 1)
  let state_tank_feedback_l_ptr = state_tank_feedback_l_span.ptr
  cursor = state_tank_feedback_l_span.next
  let state_tank_feedback_r_span = @utils.alloc_f32_samples(cursor, 1)
  let state_tank_feedback_r_ptr = state_tank_feedback_r_span.ptr
  cursor = state_tank_feedback_r_span.next
  let state_damping_state_l_span = @utils.alloc_f32_samples(cursor, 1)
  let state_damping_state_l_ptr = state_damping_state_l_span.ptr
  cursor = state_damping_state_l_span.next
  let state_damping_state_r_span = @utils.alloc_f32_samples(cursor, 1)
  let state_damping_state_r_ptr = state_damping_state_r_span.ptr
  cursor = state_damping_state_r_span.next

  {
    pre_delay_ptr,
    in_ap1_ptr,
    in_ap2_ptr,
    tank_l_ap1_ptr,
    tank_l_d1_ptr,
    tank_l_ap2_ptr,
    tank_l_d2_ptr,
    tank_r_ap1_ptr,
    tank_r_d1_ptr,
    tank_r_ap2_ptr,
    tank_r_d2_ptr,
    state_pre_delay_idx_ptr,
    state_in_ap1_idx_ptr,
    state_in_ap2_idx_ptr,
    state_tank_l_ap1_idx_ptr,
    state_tank_l_d1_idx_ptr,
    state_tank_l_ap2_idx_ptr,
    state_tank_l_d2_idx_ptr,
    state_tank_r_ap1_idx_ptr,
    state_tank_r_d1_idx_ptr,
    state_tank_r_ap2_idx_ptr,
    state_tank_r_d2_idx_ptr,
    state_tank_feedback_l_ptr,
    state_tank_feedback_r_ptr,
    state_damping_state_l_ptr,
    state_damping_state_r_ptr,
    required_bytes: cursor,
  }
}

fn reverb_layout() -> ReverbLayout {
  build_reverb_layout(
    reverb_mem_base_ptr,
    reverb_pre_delay_len,
    reverb_in_ap1_len,
    reverb_in_ap2_len,
    reverb_tank_l_ap1_len,
    reverb_tank_l_d1_len,
    reverb_tank_l_ap2_len,
    reverb_tank_l_d2_len,
    reverb_tank_r_ap1_len,
    reverb_tank_r_d1_len,
    reverb_tank_r_ap2_len,
    reverb_tank_r_d2_len,
  )
}

fn reverb_clamp(x : Float, min_val : Float, max_val : Float) -> Float {
  effect_clamp(x, min_val, max_val)
}

fn reverb_next_index(idx : Int, len : Int) -> Int {
  let next = idx + 1
  if next >= len { 0 } else { next }
}

fn reverb_read_line(base_ptr : Int, idx : Int) -> Float {
  @utils.load_f32(base_ptr + idx * 4)
}

fn reverb_write_line(base_ptr : Int, idx : Int, value : Float) -> Unit {
  @utils.store_f32(base_ptr + idx * 4, value)
}

fn reverb_delay_process(base_ptr : Int, idx : Int, input : Float) -> Float {
  let delayed = reverb_read_line(base_ptr, idx)
  reverb_write_line(base_ptr, idx, input)
  delayed
}

fn reverb_allpass_process(base_ptr : Int, idx : Int, input : Float, g : Float) -> Float {
  let delayed = reverb_read_line(base_ptr, idx)
  let output = delayed - input * g
  reverb_write_line(base_ptr, idx, input + output * g)
  output
}

pub fn reverb_predelay_ms_to_samples(ms : Float) -> Int {
  let raw = (reverb_clamp(ms, 0.0, 50.0) * (reverb_sample_rate_hz / 1000.0)).to_int()
  if raw >= reverb_pre_delay_len { reverb_pre_delay_len - 1 } else { raw }
}

pub fn reverb_mix_dry_wet(dry : Float, wet : Float, mix : Float) -> Float {
  effect_mix_dry_wet(dry, wet, mix)
}

fn clear_line(base_ptr : Int, len : Int) -> Unit {
  for i = 0; i < len; i = i + 1 {
    reverb_write_line(base_ptr, i, 0.0)
  }
}

fn has_reverb_memory() -> Bool {
  let layout = reverb_layout()
  @utils.memory_pages() * 65536 >= layout.required_bytes
}

pub fn reset_reverb_state() -> Unit {
  reverb_fallback_state_l_box[0] = 0.0
  reverb_fallback_state_r_box[0] = 0.0
  if !has_reverb_memory() {
    return
  }
  let layout = reverb_layout()

  clear_line(layout.pre_delay_ptr, reverb_pre_delay_len)
  clear_line(layout.in_ap1_ptr, reverb_in_ap1_len)
  clear_line(layout.in_ap2_ptr, reverb_in_ap2_len)
  clear_line(layout.tank_l_ap1_ptr, reverb_tank_l_ap1_len)
  clear_line(layout.tank_l_d1_ptr, reverb_tank_l_d1_len)
  clear_line(layout.tank_l_ap2_ptr, reverb_tank_l_ap2_len)
  clear_line(layout.tank_l_d2_ptr, reverb_tank_l_d2_len)
  clear_line(layout.tank_r_ap1_ptr, reverb_tank_r_ap1_len)
  clear_line(layout.tank_r_d1_ptr, reverb_tank_r_d1_len)
  clear_line(layout.tank_r_ap2_ptr, reverb_tank_r_ap2_len)
  clear_line(layout.tank_r_d2_ptr, reverb_tank_r_d2_len)

  @utils.store_i32(layout.state_pre_delay_idx_ptr, 0)
  @utils.store_i32(layout.state_in_ap1_idx_ptr, 0)
  @utils.store_i32(layout.state_in_ap2_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_l_ap1_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_l_d1_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_l_ap2_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_l_d2_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_r_ap1_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_r_d1_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_r_ap2_idx_ptr, 0)
  @utils.store_i32(layout.state_tank_r_d2_idx_ptr, 0)

  @utils.store_f32(layout.state_tank_feedback_l_ptr, 0.0)
  @utils.store_f32(layout.state_tank_feedback_r_ptr, 0.0)
  @utils.store_f32(layout.state_damping_state_l_ptr, 0.0)
  @utils.store_f32(layout.state_damping_state_r_ptr, 0.0)
}

pub fn process_reverb_sample(
  dry_l : Float,
  dry_r : Float,
  pre_delay_ms : Float,
  decay : Float,
  damping : Float,
  diffusion : Float,
  mix : Float,
) -> (Float, Float) {
  let mix_amt = reverb_clamp(mix, 0.0, 1.0)
  if !has_reverb_memory() {
    let feedback : Float = 0.72
    let wet_l = dry_l + reverb_fallback_state_l_box[0] * feedback
    let wet_r = dry_r + reverb_fallback_state_r_box[0] * feedback
    reverb_fallback_state_l_box[0] = wet_l
    reverb_fallback_state_r_box[0] = wet_r
    return (
      reverb_mix_dry_wet(dry_l, wet_l, mix_amt),
      reverb_mix_dry_wet(dry_r, wet_r, mix_amt),
    )
  }

  let pre_delay_samples = reverb_predelay_ms_to_samples(pre_delay_ms)
  let decay_amt = reverb_clamp(decay, 0.0, 0.98)
  let damping_amt = reverb_clamp(damping, 0.0, 0.95)
  let diffusion_amt = reverb_clamp(diffusion, 0.0, 0.95)
  let tank_ap_gain : Float = 0.2 + diffusion_amt * 0.6
  let tank_ap2_gain : Float = 0.1 + diffusion_amt * 0.5
  let damp_in : Float = 1.0 - damping_amt
  let layout = reverb_layout()

  let mut pre_delay_idx : Int = @utils.load_i32(layout.state_pre_delay_idx_ptr)
  let mut in_ap1_idx : Int = @utils.load_i32(layout.state_in_ap1_idx_ptr)
  let mut in_ap2_idx : Int = @utils.load_i32(layout.state_in_ap2_idx_ptr)
  let mut tank_l_ap1_idx : Int = @utils.load_i32(layout.state_tank_l_ap1_idx_ptr)
  let mut tank_l_d1_idx : Int = @utils.load_i32(layout.state_tank_l_d1_idx_ptr)
  let mut tank_l_ap2_idx : Int = @utils.load_i32(layout.state_tank_l_ap2_idx_ptr)
  let mut tank_l_d2_idx : Int = @utils.load_i32(layout.state_tank_l_d2_idx_ptr)
  let mut tank_r_ap1_idx : Int = @utils.load_i32(layout.state_tank_r_ap1_idx_ptr)
  let mut tank_r_d1_idx : Int = @utils.load_i32(layout.state_tank_r_d1_idx_ptr)
  let mut tank_r_ap2_idx : Int = @utils.load_i32(layout.state_tank_r_ap2_idx_ptr)
  let mut tank_r_d2_idx : Int = @utils.load_i32(layout.state_tank_r_d2_idx_ptr)

  let mut tank_feedback_l : Float = @utils.load_f32(layout.state_tank_feedback_l_ptr)
  let mut tank_feedback_r : Float = @utils.load_f32(layout.state_tank_feedback_r_ptr)
  let mut damping_state_l : Float = @utils.load_f32(layout.state_damping_state_l_ptr)
  let mut damping_state_r : Float = @utils.load_f32(layout.state_damping_state_r_ptr)

  let mono = (dry_l + dry_r) * 0.5
  let mut pre_read_idx = pre_delay_idx - pre_delay_samples
  if pre_read_idx < 0 {
    pre_read_idx = pre_read_idx + reverb_pre_delay_len
  }
  let pre_delayed = reverb_read_line(layout.pre_delay_ptr, pre_read_idx)
  reverb_write_line(layout.pre_delay_ptr, pre_delay_idx, mono)
  pre_delay_idx = reverb_next_index(pre_delay_idx, reverb_pre_delay_len)

  let diff1 = reverb_allpass_process(layout.in_ap1_ptr, in_ap1_idx, pre_delayed, diffusion_amt)
  in_ap1_idx = reverb_next_index(in_ap1_idx, reverb_in_ap1_len)
  let diff2 = reverb_allpass_process(layout.in_ap2_ptr, in_ap2_idx, diff1, diffusion_amt)
  in_ap2_idx = reverb_next_index(in_ap2_idx, reverb_in_ap2_len)

  let tank_in_l = diff2 + tank_feedback_r * decay_amt
  let tank_in_r = diff2 + tank_feedback_l * decay_amt

  let l_ap1_out = reverb_allpass_process(layout.tank_l_ap1_ptr, tank_l_ap1_idx, tank_in_l, tank_ap_gain)
  tank_l_ap1_idx = reverb_next_index(tank_l_ap1_idx, reverb_tank_l_ap1_len)
  let l_d1_out = reverb_delay_process(layout.tank_l_d1_ptr, tank_l_d1_idx, l_ap1_out)
  tank_l_d1_idx = reverb_next_index(tank_l_d1_idx, reverb_tank_l_d1_len)
  damping_state_l = damping_state_l * damping_amt + l_d1_out * damp_in
  let l_ap2_out = reverb_allpass_process(layout.tank_l_ap2_ptr, tank_l_ap2_idx, damping_state_l, tank_ap2_gain)
  tank_l_ap2_idx = reverb_next_index(tank_l_ap2_idx, reverb_tank_l_ap2_len)
  let l_d2_out = reverb_delay_process(layout.tank_l_d2_ptr, tank_l_d2_idx, l_ap2_out)
  tank_l_d2_idx = reverb_next_index(tank_l_d2_idx, reverb_tank_l_d2_len)

  let r_ap1_out = reverb_allpass_process(layout.tank_r_ap1_ptr, tank_r_ap1_idx, tank_in_r, tank_ap_gain)
  tank_r_ap1_idx = reverb_next_index(tank_r_ap1_idx, reverb_tank_r_ap1_len)
  let r_d1_out = reverb_delay_process(layout.tank_r_d1_ptr, tank_r_d1_idx, r_ap1_out)
  tank_r_d1_idx = reverb_next_index(tank_r_d1_idx, reverb_tank_r_d1_len)
  damping_state_r = damping_state_r * damping_amt + r_d1_out * damp_in
  let r_ap2_out = reverb_allpass_process(layout.tank_r_ap2_ptr, tank_r_ap2_idx, damping_state_r, tank_ap2_gain)
  tank_r_ap2_idx = reverb_next_index(tank_r_ap2_idx, reverb_tank_r_ap2_len)
  let r_d2_out = reverb_delay_process(layout.tank_r_d2_ptr, tank_r_d2_idx, r_ap2_out)
  tank_r_d2_idx = reverb_next_index(tank_r_d2_idx, reverb_tank_r_d2_len)

  tank_feedback_l = l_d2_out
  tank_feedback_r = r_d2_out

  let wet_l = l_d2_out * 0.6 + r_ap2_out * 0.4
  let wet_r = r_d2_out * 0.6 + l_ap2_out * 0.4

  @utils.store_i32(layout.state_pre_delay_idx_ptr, pre_delay_idx)
  @utils.store_i32(layout.state_in_ap1_idx_ptr, in_ap1_idx)
  @utils.store_i32(layout.state_in_ap2_idx_ptr, in_ap2_idx)
  @utils.store_i32(layout.state_tank_l_ap1_idx_ptr, tank_l_ap1_idx)
  @utils.store_i32(layout.state_tank_l_d1_idx_ptr, tank_l_d1_idx)
  @utils.store_i32(layout.state_tank_l_ap2_idx_ptr, tank_l_ap2_idx)
  @utils.store_i32(layout.state_tank_l_d2_idx_ptr, tank_l_d2_idx)
  @utils.store_i32(layout.state_tank_r_ap1_idx_ptr, tank_r_ap1_idx)
  @utils.store_i32(layout.state_tank_r_d1_idx_ptr, tank_r_d1_idx)
  @utils.store_i32(layout.state_tank_r_ap2_idx_ptr, tank_r_ap2_idx)
  @utils.store_i32(layout.state_tank_r_d2_idx_ptr, tank_r_d2_idx)
  @utils.store_f32(layout.state_tank_feedback_l_ptr, tank_feedback_l)
  @utils.store_f32(layout.state_tank_feedback_r_ptr, tank_feedback_r)
  @utils.store_f32(layout.state_damping_state_l_ptr, damping_state_l)
  @utils.store_f32(layout.state_damping_state_r_ptr, damping_state_r)

  (
    reverb_mix_dry_wet(dry_l, wet_l, mix_amt),
    reverb_mix_dry_wet(dry_r, wet_r, mix_amt),
  )
}

pub fn process_reverb_block(
  num_samples : Int,
  gain : Float,
  pre_delay_ms : Float,
  decay : Float,
  damping : Float,
  diffusion : Float,
  mix : Float,
) -> Unit {
  if !has_reverb_memory() {
    for i = 0; i < num_samples; i = i + 1 {
      let offset = i * 4
      let out_l = @utils.load_f32(@utils.input_left_offset + offset) * gain
      let out_r = @utils.load_f32(@utils.input_right_offset + offset) * gain
      @utils.store_f32(@utils.output_left_offset + offset, out_l)
      @utils.store_f32(@utils.output_right_offset + offset, out_r)
    }
    return
  }

  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4
    let dry_l = @utils.load_f32(@utils.input_left_offset + offset) * gain
    let dry_r = @utils.load_f32(@utils.input_right_offset + offset) * gain
    let (out_l, out_r) = process_reverb_sample(
      dry_l,
      dry_r,
      pre_delay_ms,
      decay,
      damping,
      diffusion,
      mix,
    )
    @utils.store_f32(@utils.output_left_offset + offset, out_l)
    @utils.store_f32(@utils.output_right_offset + offset, out_r)
  }
}

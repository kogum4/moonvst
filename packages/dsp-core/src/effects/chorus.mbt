let chorus_sample_rate_hz : Float = 48000.0
let chorus_total_samples : Int = 16386
let chorus_loop_limit : Int = 8176
let chorus_loop_limit_f : Float = 8176.0
let chorus_mem_base_ptr : Int = 0x78000
let chorus_tiny_threshold : Float = 0.0000000000000000000000118
let chorus_tiny_noise : Float = 0.0000000000000000118
let chorus_pi : Float = 3.141592653589793238
let chorus_tupi : Float = chorus_pi * 2.0
let chorus_fallback_d_l : Array[Float] = []
let chorus_fallback_d_r : Array[Float] = []
let chorus_fallback_sweep_box : Array[Float] = [chorus_pi * 0.5]
let chorus_fallback_gcount_box : Array[Int] = [0]
let chorus_fallback_air_prev_l_box : Array[Float] = [0.0]
let chorus_fallback_air_even_l_box : Array[Float] = [0.0]
let chorus_fallback_air_odd_l_box : Array[Float] = [0.0]
let chorus_fallback_air_prev_r_box : Array[Float] = [0.0]
let chorus_fallback_air_even_r_box : Array[Float] = [0.0]
let chorus_fallback_air_odd_r_box : Array[Float] = [0.0]
let chorus_fallback_fp_flip_box : Array[Bool] = [true]

priv struct ChorusLayout {
  d_l_ptr : Int
  d_r_ptr : Int
  state_sweep_ptr : Int
  state_gcount_ptr : Int
  state_air_prev_l_ptr : Int
  state_air_even_l_ptr : Int
  state_air_odd_l_ptr : Int
  state_air_prev_r_ptr : Int
  state_air_even_r_ptr : Int
  state_air_odd_r_ptr : Int
  state_fp_flip_ptr : Int
  required_bytes : Int
}

fn build_chorus_layout(base_ptr : Int) -> ChorusLayout {
  let mut cursor = base_ptr

  let d_l_span = @utils.alloc_f32_samples(cursor, chorus_total_samples)
  let d_l_ptr = d_l_span.ptr
  cursor = d_l_span.next
  let d_r_span = @utils.alloc_f32_samples(cursor, chorus_total_samples)
  let d_r_ptr = d_r_span.ptr
  cursor = d_r_span.next

  let state_sweep_span = @utils.alloc_f32_samples(cursor, 1)
  let state_sweep_ptr = state_sweep_span.ptr
  cursor = state_sweep_span.next
  let state_gcount_span = @utils.alloc_i32_slots(cursor, 1)
  let state_gcount_ptr = state_gcount_span.ptr
  cursor = state_gcount_span.next
  let state_air_prev_l_span = @utils.alloc_f32_samples(cursor, 1)
  let state_air_prev_l_ptr = state_air_prev_l_span.ptr
  cursor = state_air_prev_l_span.next
  let state_air_even_l_span = @utils.alloc_f32_samples(cursor, 1)
  let state_air_even_l_ptr = state_air_even_l_span.ptr
  cursor = state_air_even_l_span.next
  let state_air_odd_l_span = @utils.alloc_f32_samples(cursor, 1)
  let state_air_odd_l_ptr = state_air_odd_l_span.ptr
  cursor = state_air_odd_l_span.next
  let state_air_prev_r_span = @utils.alloc_f32_samples(cursor, 1)
  let state_air_prev_r_ptr = state_air_prev_r_span.ptr
  cursor = state_air_prev_r_span.next
  let state_air_even_r_span = @utils.alloc_f32_samples(cursor, 1)
  let state_air_even_r_ptr = state_air_even_r_span.ptr
  cursor = state_air_even_r_span.next
  let state_air_odd_r_span = @utils.alloc_f32_samples(cursor, 1)
  let state_air_odd_r_ptr = state_air_odd_r_span.ptr
  cursor = state_air_odd_r_span.next
  let state_fp_flip_span = @utils.alloc_i32_slots(cursor, 1)
  let state_fp_flip_ptr = state_fp_flip_span.ptr
  cursor = state_fp_flip_span.next

  {
    d_l_ptr,
    d_r_ptr,
    state_sweep_ptr,
    state_gcount_ptr,
    state_air_prev_l_ptr,
    state_air_even_l_ptr,
    state_air_odd_l_ptr,
    state_air_prev_r_ptr,
    state_air_even_r_ptr,
    state_air_odd_r_ptr,
    state_fp_flip_ptr,
    required_bytes: cursor,
  }
}

fn chorus_layout() -> ChorusLayout {
  build_chorus_layout(chorus_mem_base_ptr)
}

fn has_chorus_memory() -> Bool {
  let layout = chorus_layout()
  @utils.memory_pages() * 65536 >= layout.required_bytes
}

fn chorus_read_line(base_ptr : Int, idx : Int) -> Float {
  @utils.load_f32(base_ptr + idx * 4)
}

fn chorus_write_line(base_ptr : Int, idx : Int, value : Float) -> Unit {
  @utils.store_f32(base_ptr + idx * 4, value)
}

fn chorus_abs(x : Float) -> Float {
  if x < 0.0 { -x } else { x }
}

fn chorus_sin(x : Float) -> Float {
  @math.sinf(x)
}

fn chorus_speed_from_rate(rate : Float) -> Float {
  let overallscale = chorus_sample_rate_hz / 44100.0
  let a2 = rate * rate
  let a4 = a2 * a2
  a4 * 0.001 * overallscale
}

fn chorus_range_from_depth(depth : Float) -> Float {
  let b2 = depth * depth
  let b4 = b2 * b2
  b4 * chorus_loop_limit_f * 0.499
}

fn clear_chorus_line(base_ptr : Int) -> Unit {
  for i = 0; i < chorus_total_samples; i = i + 1 {
    chorus_write_line(base_ptr, i, 0.0)
  }
}

fn ensure_fallback_lines() -> Unit {
  for i = chorus_fallback_d_l.length(); i < chorus_total_samples; i = i + 1 {
    chorus_fallback_d_l.push(0.0)
    chorus_fallback_d_r.push(0.0)
  }
}

fn clear_fallback_line(line : Array[Float]) -> Unit {
  for i = 0; i < chorus_total_samples; i = i + 1 {
    line[i] = 0.0
  }
}

pub fn reset_chorus_state() -> Unit {
  ensure_fallback_lines()
  clear_fallback_line(chorus_fallback_d_l)
  clear_fallback_line(chorus_fallback_d_r)
  chorus_fallback_sweep_box[0] = chorus_pi * 0.5
  chorus_fallback_gcount_box[0] = 0
  chorus_fallback_air_prev_l_box[0] = 0.0
  chorus_fallback_air_even_l_box[0] = 0.0
  chorus_fallback_air_odd_l_box[0] = 0.0
  chorus_fallback_air_prev_r_box[0] = 0.0
  chorus_fallback_air_even_r_box[0] = 0.0
  chorus_fallback_air_odd_r_box[0] = 0.0
  chorus_fallback_fp_flip_box[0] = true

  if has_chorus_memory() {
    let layout = chorus_layout()
    clear_chorus_line(layout.d_l_ptr)
    clear_chorus_line(layout.d_r_ptr)
    @utils.store_f32(layout.state_sweep_ptr, chorus_pi * 0.5)
    @utils.store_i32(layout.state_gcount_ptr, 0)
    @utils.store_f32(layout.state_air_prev_l_ptr, 0.0)
    @utils.store_f32(layout.state_air_even_l_ptr, 0.0)
    @utils.store_f32(layout.state_air_odd_l_ptr, 0.0)
    @utils.store_f32(layout.state_air_prev_r_ptr, 0.0)
    @utils.store_f32(layout.state_air_even_r_ptr, 0.0)
    @utils.store_f32(layout.state_air_odd_r_ptr, 0.0)
    @utils.store_i32(layout.state_fp_flip_ptr, 1)
  }
}

pub fn chorus_process(
  input_l : Float,
  input_r : Float,
  depth : Float,
  rate : Float,
  mix : Float,
) -> (Float, Float) {
  let mix_amt = effect_clamp(mix, 0.0, 1.0)
  let range = chorus_range_from_depth(effect_clamp(depth, 0.0, 1.0))
  let wet = mix_amt
  let modulation = range * wet
  let speed = chorus_speed_from_rate(effect_clamp(rate, 0.0, 1.0))
  if !has_chorus_memory() {
    ensure_fallback_lines()
    let mut sweep = chorus_fallback_sweep_box[0]
    let mut gcount = chorus_fallback_gcount_box[0]
    let mut air_prev_l = chorus_fallback_air_prev_l_box[0]
    let mut air_even_l = chorus_fallback_air_even_l_box[0]
    let mut air_odd_l = chorus_fallback_air_odd_l_box[0]
    let mut air_prev_r = chorus_fallback_air_prev_r_box[0]
    let mut air_even_r = chorus_fallback_air_even_r_box[0]
    let mut air_odd_r = chorus_fallback_air_odd_r_box[0]
    let mut fp_flip = chorus_fallback_fp_flip_box[0]

    let mut input_sample_l = input_l
    let mut input_sample_r = input_r
    if chorus_abs(input_sample_l) < chorus_tiny_threshold {
      input_sample_l = chorus_tiny_noise
    }
    if chorus_abs(input_sample_r) < chorus_tiny_threshold {
      input_sample_r = chorus_tiny_noise
    }
    let dry_sample_l = input_sample_l
    let dry_sample_r = input_sample_r

    let mut air_factor_l = air_prev_l - input_sample_l
    if fp_flip {
      air_even_l = air_even_l + air_factor_l
      air_odd_l = air_odd_l - air_factor_l
      air_factor_l = air_even_l
    } else {
      air_odd_l = air_odd_l + air_factor_l
      air_even_l = air_even_l - air_factor_l
      air_factor_l = air_odd_l
    }
    air_odd_l = (air_odd_l - ((air_odd_l - air_even_l) / 256.0)) / 1.0001
    air_even_l = (air_even_l - ((air_even_l - air_odd_l) / 256.0)) / 1.0001
    air_prev_l = input_sample_l
    input_sample_l = input_sample_l + (air_factor_l * wet)

    let mut air_factor_r = air_prev_r - input_sample_r
    if fp_flip {
      air_even_r = air_even_r + air_factor_r
      air_odd_r = air_odd_r - air_factor_r
      air_factor_r = air_even_r
    } else {
      air_odd_r = air_odd_r + air_factor_r
      air_even_r = air_even_r - air_factor_r
      air_factor_r = air_odd_r
    }
    air_odd_r = (air_odd_r - ((air_odd_r - air_even_r) / 256.0)) / 1.0001
    air_even_r = (air_even_r - ((air_even_r - air_odd_r) / 256.0)) / 1.0001
    air_prev_r = input_sample_r
    input_sample_r = input_sample_r + (air_factor_r * wet)

    if gcount < 1 || gcount > chorus_loop_limit {
      gcount = chorus_loop_limit
    }
    let mut count = gcount
    chorus_fallback_d_l[count] = input_sample_l
    chorus_fallback_d_l[count + chorus_loop_limit] = input_sample_l
    chorus_fallback_d_r[count] = input_sample_r
    chorus_fallback_d_r[count + chorus_loop_limit] = input_sample_r
    gcount = gcount - 1

    let offset = range + (modulation * chorus_sin(sweep))
    let floor_offset = offset.to_int()
    let floor_offset_f = Float::from_int(floor_offset)
    let interpolation = offset - floor_offset_f
    count = count + floor_offset

    let d_l0 = chorus_fallback_d_l[count]
    let d_l1 = chorus_fallback_d_l[count + 1]
    let d_l2 = chorus_fallback_d_l[count + 2]
    input_sample_l = d_l0 * (1.0 - interpolation)
    input_sample_l = input_sample_l + d_l1
    input_sample_l = input_sample_l + (d_l2 * interpolation)
    input_sample_l = input_sample_l - (((d_l0 - d_l1) - (d_l1 - d_l2)) / 50.0)

    let d_r0 = chorus_fallback_d_r[count]
    let d_r1 = chorus_fallback_d_r[count + 1]
    let d_r2 = chorus_fallback_d_r[count + 2]
    input_sample_r = d_r0 * (1.0 - interpolation)
    input_sample_r = input_sample_r + d_r1
    input_sample_r = input_sample_r + (d_r2 * interpolation)
    input_sample_r = input_sample_r - (((d_r0 - d_r1) - (d_r1 - d_r2)) / 50.0)

    input_sample_l = input_sample_l * 0.5
    input_sample_r = input_sample_r * 0.5

    sweep = sweep + speed
    if sweep > chorus_tupi {
      sweep = sweep - chorus_tupi
    }

    if wet != 1.0 {
      input_sample_l = input_sample_l * wet + dry_sample_l * (1.0 - wet)
      input_sample_r = input_sample_r * wet + dry_sample_r * (1.0 - wet)
    }
    fp_flip = !fp_flip

    chorus_fallback_sweep_box[0] = sweep
    chorus_fallback_gcount_box[0] = gcount
    chorus_fallback_air_prev_l_box[0] = air_prev_l
    chorus_fallback_air_even_l_box[0] = air_even_l
    chorus_fallback_air_odd_l_box[0] = air_odd_l
    chorus_fallback_air_prev_r_box[0] = air_prev_r
    chorus_fallback_air_even_r_box[0] = air_even_r
    chorus_fallback_air_odd_r_box[0] = air_odd_r
    chorus_fallback_fp_flip_box[0] = fp_flip
    return (input_sample_l, input_sample_r)
  }

  let layout = chorus_layout()
  let mut sweep = @utils.load_f32(layout.state_sweep_ptr)
  let mut gcount = @utils.load_i32(layout.state_gcount_ptr)
  let mut air_prev_l = @utils.load_f32(layout.state_air_prev_l_ptr)
  let mut air_even_l = @utils.load_f32(layout.state_air_even_l_ptr)
  let mut air_odd_l = @utils.load_f32(layout.state_air_odd_l_ptr)
  let mut air_prev_r = @utils.load_f32(layout.state_air_prev_r_ptr)
  let mut air_even_r = @utils.load_f32(layout.state_air_even_r_ptr)
  let mut air_odd_r = @utils.load_f32(layout.state_air_odd_r_ptr)
  let mut fp_flip = @utils.load_i32(layout.state_fp_flip_ptr) != 0

  let mut input_sample_l = input_l
  let mut input_sample_r = input_r
  if chorus_abs(input_sample_l) < chorus_tiny_threshold {
    input_sample_l = chorus_tiny_noise
  }
  if chorus_abs(input_sample_r) < chorus_tiny_threshold {
    input_sample_r = chorus_tiny_noise
  }
  let dry_sample_l = input_sample_l
  let dry_sample_r = input_sample_r

  let mut air_factor_l = air_prev_l - input_sample_l
  if fp_flip {
    air_even_l = air_even_l + air_factor_l
    air_odd_l = air_odd_l - air_factor_l
    air_factor_l = air_even_l
  } else {
    air_odd_l = air_odd_l + air_factor_l
    air_even_l = air_even_l - air_factor_l
    air_factor_l = air_odd_l
  }
  air_odd_l = (air_odd_l - ((air_odd_l - air_even_l) / 256.0)) / 1.0001
  air_even_l = (air_even_l - ((air_even_l - air_odd_l) / 256.0)) / 1.0001
  air_prev_l = input_sample_l
  input_sample_l = input_sample_l + (air_factor_l * wet)

  let mut air_factor_r = air_prev_r - input_sample_r
  if fp_flip {
    air_even_r = air_even_r + air_factor_r
    air_odd_r = air_odd_r - air_factor_r
    air_factor_r = air_even_r
  } else {
    air_odd_r = air_odd_r + air_factor_r
    air_even_r = air_even_r - air_factor_r
    air_factor_r = air_odd_r
  }
  air_odd_r = (air_odd_r - ((air_odd_r - air_even_r) / 256.0)) / 1.0001
  air_even_r = (air_even_r - ((air_even_r - air_odd_r) / 256.0)) / 1.0001
  air_prev_r = input_sample_r
  input_sample_r = input_sample_r + (air_factor_r * wet)

  if gcount < 1 || gcount > chorus_loop_limit {
    gcount = chorus_loop_limit
  }
  let mut count = gcount
  chorus_write_line(layout.d_l_ptr, count, input_sample_l)
  chorus_write_line(layout.d_l_ptr, count + chorus_loop_limit, input_sample_l)
  chorus_write_line(layout.d_r_ptr, count, input_sample_r)
  chorus_write_line(layout.d_r_ptr, count + chorus_loop_limit, input_sample_r)
  gcount = gcount - 1

  let offset = range + (modulation * chorus_sin(sweep))
  let floor_offset = offset.to_int()
  let floor_offset_f = Float::from_int(floor_offset)
  let interpolation = offset - floor_offset_f
  count = count + floor_offset

  let d_l0 = chorus_read_line(layout.d_l_ptr, count)
  let d_l1 = chorus_read_line(layout.d_l_ptr, count + 1)
  let d_l2 = chorus_read_line(layout.d_l_ptr, count + 2)
  input_sample_l = d_l0 * (1.0 - interpolation)
  input_sample_l = input_sample_l + d_l1
  input_sample_l = input_sample_l + (d_l2 * interpolation)
  input_sample_l = input_sample_l - (((d_l0 - d_l1) - (d_l1 - d_l2)) / 50.0)

  let d_r0 = chorus_read_line(layout.d_r_ptr, count)
  let d_r1 = chorus_read_line(layout.d_r_ptr, count + 1)
  let d_r2 = chorus_read_line(layout.d_r_ptr, count + 2)
  input_sample_r = d_r0 * (1.0 - interpolation)
  input_sample_r = input_sample_r + d_r1
  input_sample_r = input_sample_r + (d_r2 * interpolation)
  input_sample_r = input_sample_r - (((d_r0 - d_r1) - (d_r1 - d_r2)) / 50.0)

  input_sample_l = input_sample_l * 0.5
  input_sample_r = input_sample_r * 0.5

  sweep = sweep + speed
  if sweep > chorus_tupi {
    sweep = sweep - chorus_tupi
  }

  if wet != 1.0 {
    input_sample_l = input_sample_l * wet + dry_sample_l * (1.0 - wet)
    input_sample_r = input_sample_r * wet + dry_sample_r * (1.0 - wet)
  }
  fp_flip = !fp_flip

  @utils.store_f32(layout.state_sweep_ptr, sweep)
  @utils.store_i32(layout.state_gcount_ptr, gcount)
  @utils.store_f32(layout.state_air_prev_l_ptr, air_prev_l)
  @utils.store_f32(layout.state_air_even_l_ptr, air_even_l)
  @utils.store_f32(layout.state_air_odd_l_ptr, air_odd_l)
  @utils.store_f32(layout.state_air_prev_r_ptr, air_prev_r)
  @utils.store_f32(layout.state_air_even_r_ptr, air_even_r)
  @utils.store_f32(layout.state_air_odd_r_ptr, air_odd_r)
  @utils.store_i32(layout.state_fp_flip_ptr, if fp_flip { 1 } else { 0 })

  (input_sample_l, input_sample_r)
}

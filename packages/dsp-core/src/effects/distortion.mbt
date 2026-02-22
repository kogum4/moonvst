let distortion_max_nodes : Int = 16
let distortion_pi : Float = 3.1415926
let distortion_half_pi : Float = 1.57079633
let distortion_gain_stage : Float = 1.557079633
let distortion_warmth_scale : Float = 0.557079633

let distortion_last_sample_l : Array[Float] = []
let distortion_last_sample_r : Array[Float] = []

fn distortion_node_index(node_index : Int) -> Int {
  if node_index < 0 {
    0
  } else if node_index >= distortion_max_nodes {
    distortion_max_nodes - 1
  } else {
    node_index
  }
}

fn ensure_distortion_state() -> Unit {
  for i = distortion_last_sample_l.length(); i < distortion_max_nodes; i = i + 1 {
    distortion_last_sample_l.push(0.0)
    distortion_last_sample_r.push(0.0)
  }
}

pub fn reset_distortion_state() -> Unit {
  ensure_distortion_state()
  for i = 0; i < distortion_max_nodes; i = i + 1 {
    distortion_last_sample_l[i] = 0.0
    distortion_last_sample_r[i] = 0.0
  }
}

fn hardvacuum_process_channel(
  input_sample : Float,
  last_sample : Float,
  multistage : Float,
  warmth : Float,
  invwarmth : Float,
  aura : Float,
  output_gain : Float,
  wet : Float,
  denorm_seed : Float,
) -> (Float, Float) {
  let mut x = input_sample
  if effect_abs(x) < 1.18e-23 {
    x = denorm_seed * 1.18e-17
  }
  let dry = x

  let mut skew = x - last_sample
  let updated_last = x

  let mut bridgerectifier = effect_abs(skew)
  if bridgerectifier > distortion_pi {
    bridgerectifier = distortion_pi
  }
  bridgerectifier = @math.sinf(bridgerectifier)

  if skew > 0.0 {
    skew = bridgerectifier * aura
  } else {
    skew = -bridgerectifier * aura
  }

  skew = skew * x
  skew = skew * distortion_gain_stage

  let mut countdown = multistage
  for _i = 0; _i < 4; _i = _i + 1 {
    if countdown <= 0.0 {
      break
    }

    let drive =
      if countdown > 1.0 {
        distortion_gain_stage
      } else {
        countdown * (1.0 + (distortion_warmth_scale * invwarmth))
      }

    let positive = drive - warmth
    let negative = drive + warmth

    let mut br = effect_abs(x)
    br = br + skew
    if br > distortion_half_pi {
      br = distortion_half_pi
    }
    br = @math.sinf(br)
    br = br * drive
    br = br + skew
    if br > distortion_half_pi {
      br = distortion_half_pi
    }
    br = @math.sinf(br)

    if x > 0.0 {
      x = (x * (1.0 - positive + skew)) + (br * (positive + skew))
    } else {
      x = (x * (1.0 - negative + skew)) - (br * (negative + skew))
    }

    countdown = countdown - 1.0
  }

  if output_gain != 1.0 {
    x = x * output_gain
  }

  if wet != 1.0 {
    x = (x * wet) + (dry * (1.0 - wet))
  }

  (x, updated_last)
}

pub fn distortion_process(
  node_index : Int,
  input_l : Float,
  input_r : Float,
  drive_param : Float,
  warmth_param : Float,
  aura_param : Float,
  output_param : Float,
  wet_param : Float,
) -> (Float, Float) {
  ensure_distortion_state()
  let idx = distortion_node_index(node_index)

  let drive = effect_clamp(drive_param, 0.0, 1.0)
  let warmth_control = effect_clamp(warmth_param, 0.0, 1.0)
  let warmth = warmth_control / distortion_half_pi
  let invwarmth = Float::from_int(1) - warmth_control
  let aura = effect_clamp(aura_param, 0.0, 1.0) * distortion_pi
  let output_gain = effect_clamp(output_param, 0.0, 1.0)
  let wet = effect_clamp(wet_param, 0.0, 1.0)

  let mut multistage = drive * 2.0
  if multistage > 1.0 {
    multistage = multistage * multistage
  }

  let (out_l, last_l) = hardvacuum_process_channel(
    input_l,
    distortion_last_sample_l[idx],
    multistage,
    warmth,
    invwarmth,
    aura,
    output_gain,
    wet,
    Float::from_int(idx + 1),
  )
  distortion_last_sample_l[idx] = last_l

  let (out_r, last_r) = hardvacuum_process_channel(
    input_r,
    distortion_last_sample_r[idx],
    multistage,
    warmth,
    invwarmth,
    aura,
    output_gain,
    wet,
    Float::from_int(idx + 17),
  )
  distortion_last_sample_r[idx] = last_r

  (out_l, out_r)
}

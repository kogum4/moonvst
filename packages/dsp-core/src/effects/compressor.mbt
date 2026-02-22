let compressor_max_nodes : Int = 16
let compressor_max_delay : Int = 1024
let compressor_samples_per_update : Int = 32
let compressor_spacing_db : Float = 5.0
let compressor_sample_rate_hz : Float = 48000.0
let compressor_ang_90 : Float = 1.57079633
let compressor_ang_90_inv : Float = 0.63661977236
let compressor_release_zone1 : Float = 0.090
let compressor_release_zone2 : Float = 0.160
let compressor_release_zone3 : Float = 0.420
let compressor_release_zone4 : Float = 0.980

let compressor_linearpregain : Array[Float] = []
let compressor_linearthreshold : Array[Float] = []
let compressor_slope : Array[Float] = []
let compressor_attacksamplesinv : Array[Float] = []
let compressor_satreleasesamplesinv : Array[Float] = []
let compressor_wet : Array[Float] = []
let compressor_dry : Array[Float] = []
let compressor_k : Array[Float] = []
let compressor_kneedboffset : Array[Float] = []
let compressor_linearthresholdknee : Array[Float] = []
let compressor_mastergain : Array[Float] = []
let compressor_a : Array[Float] = []
let compressor_b : Array[Float] = []
let compressor_c : Array[Float] = []
let compressor_d : Array[Float] = []
let compressor_detectoravg : Array[Float] = []
let compressor_compgain : Array[Float] = []
let compressor_maxcompdiffdb : Array[Float] = []
let compressor_metergain : Array[Float] = []
let compressor_meterrelease : Array[Float] = []
let compressor_delaybufsize : Array[Int] = []
let compressor_delaywritepos : Array[Int] = []
let compressor_delayreadpos : Array[Int] = []
let compressor_chunk_counter : Array[Int] = []
let compressor_chunk_enveloperate : Array[Float] = []
let compressor_chunk_scaleddesiredgain : Array[Float] = []
let compressor_threshold_db : Array[Float] = []
let compressor_knee_db : Array[Float] = []

let compressor_last_pregain_db : Array[Float] = []
let compressor_last_threshold_db : Array[Float] = []
let compressor_last_knee_db : Array[Float] = []
let compressor_last_ratio : Array[Float] = []
let compressor_last_attack_sec : Array[Float] = []
let compressor_last_release_sec : Array[Float] = []
let compressor_last_predelay_sec : Array[Float] = []
let compressor_last_postgain_db : Array[Float] = []
let compressor_last_wet : Array[Float] = []

let compressor_delay_l : Array[Float] = []
let compressor_delay_r : Array[Float] = []

fn compressor_node_index(node_index : Int) -> Int {
  if node_index < 0 {
    0
  } else if node_index >= compressor_max_nodes {
    compressor_max_nodes - 1
  } else {
    node_index
  }
}

fn compressor_db2lin(db : Float) -> Float {
  @math.powf(10.0, 0.05 * db)
}

fn compressor_lin2db(lin : Float) -> Float {
  let safe_lin : Float =
    if lin < 0.000000000001 {
      0.000000000001
    } else {
      lin
    }
  20.0 * Float::from_double(@math.log10(safe_lin.to_double()))
}

fn compressor_kneecurve(x : Float, k : Float, linearthreshold : Float) -> Float {
  linearthreshold + (1.0 - @math.expf(-k * (x - linearthreshold))) / k
}

fn compressor_kneeslope(x : Float, k : Float, linearthreshold : Float) -> Float {
  k *
  x /
  (((k * linearthreshold + 1.0) * @math.expf(k * (x - linearthreshold))) - 1.0)
}

fn compressor_compcurve(
  x : Float,
  k : Float,
  slope : Float,
  linearthreshold : Float,
  linearthresholdknee : Float,
  threshold_db : Float,
  knee_db : Float,
  kneedboffset : Float,
) -> Float {
  if x < linearthreshold {
    return x
  }
  if knee_db <= 0.0 {
    return compressor_db2lin(threshold_db + slope * (compressor_lin2db(x) - threshold_db))
  }
  if x < linearthresholdknee {
    return compressor_kneecurve(x, k, linearthreshold)
  }
  compressor_db2lin(
    kneedboffset + slope * (compressor_lin2db(x) - threshold_db - knee_db),
  )
}

fn compressor_adaptivereleasecurve(x : Float, a : Float, b : Float, c : Float, d : Float) -> Float {
  let x2 = x * x
  a * x2 * x + b * x2 + c * x + d
}

fn compressor_fixf(v : Float, default_val : Float) -> Float {
  if v != v {
    default_val
  } else if effect_abs(v) > 1.0e15 {
    default_val
  } else {
    v
  }
}

fn compressor_delay_offset(node_index : Int, sample_index : Int) -> Int {
  node_index * compressor_max_delay + sample_index
}

fn ensure_compressor_state() -> Unit {
  for i = compressor_linearpregain.length(); i < compressor_max_nodes; i = i + 1 {
    compressor_linearpregain.push(1.0)
    compressor_linearthreshold.push(compressor_db2lin(-24.0))
    compressor_slope.push(1.0 / 12.0)
    compressor_attacksamplesinv.push(1.0 / (compressor_sample_rate_hz * 0.003))
    compressor_satreleasesamplesinv.push(1.0 / (compressor_sample_rate_hz * 0.0025))
    compressor_wet.push(1.0)
    compressor_dry.push(0.0)
    compressor_k.push(5.0)
    compressor_kneedboffset.push(0.0)
    compressor_linearthresholdknee.push(0.0)
    compressor_mastergain.push(1.0)
    compressor_a.push(0.0)
    compressor_b.push(0.0)
    compressor_c.push(0.0)
    compressor_d.push(0.0)
    compressor_detectoravg.push(0.0)
    compressor_compgain.push(1.0)
    compressor_maxcompdiffdb.push(-1.0)
    compressor_metergain.push(0.0)
    compressor_meterrelease.push(0.0)
    compressor_delaybufsize.push(1)
    compressor_delaywritepos.push(0)
    compressor_delayreadpos.push(0)
    compressor_chunk_counter.push(0)
    compressor_chunk_enveloperate.push(1.0)
    compressor_chunk_scaleddesiredgain.push(1.0)
    compressor_threshold_db.push(-24.0)
    compressor_knee_db.push(30.0)

    compressor_last_pregain_db.push(-1000000.0)
    compressor_last_threshold_db.push(-1000000.0)
    compressor_last_knee_db.push(-1000000.0)
    compressor_last_ratio.push(-1000000.0)
    compressor_last_attack_sec.push(-1000000.0)
    compressor_last_release_sec.push(-1000000.0)
    compressor_last_predelay_sec.push(-1000000.0)
    compressor_last_postgain_db.push(-1000000.0)
    compressor_last_wet.push(-1000000.0)
  }
  let target = compressor_max_nodes * compressor_max_delay
  for j = compressor_delay_l.length(); j < target; j = j + 1 {
    compressor_delay_l.push(0.0)
    compressor_delay_r.push(0.0)
  }
}

fn compressor_reset_node_runtime(idx : Int) -> Unit {
  compressor_detectoravg[idx] = 0.0
  compressor_compgain[idx] = 1.0
  compressor_maxcompdiffdb[idx] = -1.0
  compressor_delaywritepos[idx] = 0
  compressor_delayreadpos[idx] = if compressor_delaybufsize[idx] > 1 { 1 } else { 0 }
  compressor_chunk_counter[idx] = 0
  compressor_chunk_enveloperate[idx] = 1.0
  compressor_chunk_scaleddesiredgain[idx] = 1.0
}

fn compressor_reconfigure(
  idx : Int,
  pregain_db : Float,
  threshold_db : Float,
  knee_db : Float,
  ratio : Float,
  attack_sec : Float,
  release_sec : Float,
  predelay_sec : Float,
  postgain_db : Float,
  wet : Float,
  reset_runtime : Bool,
) -> Unit {
  let clamped_ratio : Float = if ratio < 1.0 { 1.0 } else { ratio }
  let clamped_attack_sec : Float = effect_clamp(attack_sec, 0.000001, 1.0)
  let clamped_release_sec : Float = effect_clamp(release_sec, 0.000001, 1.0)
  let clamped_predelay_sec : Float = effect_clamp(predelay_sec, 0.0, 1.0)
  let clamped_knee_db : Float = effect_clamp(knee_db, 0.0, 40.0)
  let clamped_wet : Float = effect_clamp(wet, 0.0, 1.0)
  let mut delaybufsize = (compressor_sample_rate_hz * clamped_predelay_sec).to_int()
  if delaybufsize < 1 {
    delaybufsize = 1
  } else if delaybufsize > compressor_max_delay {
    delaybufsize = compressor_max_delay
  }
  let old_delaybufsize = compressor_delaybufsize[idx]
  compressor_delaybufsize[idx] = delaybufsize
  if reset_runtime || old_delaybufsize != delaybufsize {
    for i = 0; i < delaybufsize; i = i + 1 {
      let pos = compressor_delay_offset(idx, i)
      compressor_delay_l[pos] = 0.0
      compressor_delay_r[pos] = 0.0
    }
    compressor_delaywritepos[idx] = 0
    compressor_delayreadpos[idx] = if delaybufsize > 1 { 1 } else { 0 }
    compressor_chunk_counter[idx] = 0
    compressor_chunk_enveloperate[idx] = 1.0
    compressor_chunk_scaleddesiredgain[idx] = 1.0
  }

  let linearpregain : Float = compressor_db2lin(pregain_db)
  let linearthreshold : Float = compressor_db2lin(threshold_db)
  let slope : Float = 1.0 / clamped_ratio
  let attacksamples : Float = compressor_sample_rate_hz * clamped_attack_sec
  let releasesamples : Float = compressor_sample_rate_hz * clamped_release_sec
  let attacksamplesinv : Float = 1.0 / attacksamples
  let satreleasesamplesinv : Float = 1.0 / (compressor_sample_rate_hz * 0.0025)
  let dry : Float = 1.0 - clamped_wet
  let meterrelease : Float = 1.0 - @math.expf(-1.0 / (compressor_sample_rate_hz * 0.325))

  let mut k : Float = 5.0
  let mut kneedboffset : Float = 0.0
  let mut linearthresholdknee : Float = 0.0
  if clamped_knee_db > 0.0 {
    let xknee : Float = compressor_db2lin(threshold_db + clamped_knee_db)
    let mut mink : Float = 0.1
    let mut maxk : Float = 10000.0
    for _i = 0; _i < 15; _i = _i + 1 {
      if compressor_kneeslope(xknee, k, linearthreshold) < slope {
        maxk = k
      } else {
        mink = k
      }
      k = @math.powf(mink * maxk, 0.5)
    }
    kneedboffset = compressor_lin2db(compressor_kneecurve(xknee, k, linearthreshold))
    linearthresholdknee = compressor_db2lin(threshold_db + clamped_knee_db)
  }

  let fulllevel : Float =
    compressor_compcurve(
      1.0,
      k,
      slope,
      linearthreshold,
      linearthresholdknee,
      threshold_db,
      clamped_knee_db,
      kneedboffset,
    )
  let raw_mastergain : Float =
    compressor_db2lin(postgain_db) *
    @math.powf(1.0 / fulllevel, 0.6)
  let mastergain : Float = effect_clamp(compressor_fixf(raw_mastergain, 1.0), 0.0, 16.0)

  let y1 : Float = releasesamples * compressor_release_zone1
  let y2 : Float = releasesamples * compressor_release_zone2
  let y3 : Float = releasesamples * compressor_release_zone3
  let y4 : Float = releasesamples * compressor_release_zone4
  let a : Float = (-y1 + 3.0 * y2 - 3.0 * y3 + y4) / 6.0
  let b : Float = y1 - 2.5 * y2 + 2.0 * y3 - 0.5 * y4
  let c : Float = (-11.0 * y1 + 18.0 * y2 - 9.0 * y3 + 2.0 * y4) / 6.0
  let d : Float = y1

  compressor_linearpregain[idx] = linearpregain
  compressor_linearthreshold[idx] = linearthreshold
  compressor_slope[idx] = slope
  compressor_attacksamplesinv[idx] = attacksamplesinv
  compressor_satreleasesamplesinv[idx] = satreleasesamplesinv
  compressor_wet[idx] = clamped_wet
  compressor_dry[idx] = dry
  compressor_k[idx] = k
  compressor_kneedboffset[idx] = kneedboffset
  compressor_linearthresholdknee[idx] = linearthresholdknee
  compressor_mastergain[idx] = mastergain
  compressor_a[idx] = a
  compressor_b[idx] = b
  compressor_c[idx] = c
  compressor_d[idx] = d
  compressor_metergain[idx] = 1.0
  compressor_meterrelease[idx] = meterrelease
  compressor_threshold_db[idx] = threshold_db
  compressor_knee_db[idx] = clamped_knee_db
  if reset_runtime {
    compressor_reset_node_runtime(idx)
  }
}

fn compressor_needs_reconfigure(
  idx : Int,
  pregain_db : Float,
  threshold_db : Float,
  knee_db : Float,
  ratio : Float,
  attack_sec : Float,
  release_sec : Float,
  predelay_sec : Float,
  postgain_db : Float,
  wet : Float,
) -> Bool {
  compressor_last_pregain_db[idx] != pregain_db ||
  compressor_last_threshold_db[idx] != threshold_db ||
  compressor_last_knee_db[idx] != knee_db ||
  compressor_last_ratio[idx] != ratio ||
  compressor_last_attack_sec[idx] != attack_sec ||
  compressor_last_release_sec[idx] != release_sec ||
  compressor_last_predelay_sec[idx] != predelay_sec ||
  compressor_last_postgain_db[idx] != postgain_db ||
  compressor_last_wet[idx] != wet
}

fn compressor_store_last_params(
  idx : Int,
  pregain_db : Float,
  threshold_db : Float,
  knee_db : Float,
  ratio : Float,
  attack_sec : Float,
  release_sec : Float,
  predelay_sec : Float,
  postgain_db : Float,
  wet : Float,
) -> Unit {
  compressor_last_pregain_db[idx] = pregain_db
  compressor_last_threshold_db[idx] = threshold_db
  compressor_last_knee_db[idx] = knee_db
  compressor_last_ratio[idx] = ratio
  compressor_last_attack_sec[idx] = attack_sec
  compressor_last_release_sec[idx] = release_sec
  compressor_last_predelay_sec[idx] = predelay_sec
  compressor_last_postgain_db[idx] = postgain_db
  compressor_last_wet[idx] = wet
}

pub fn reset_compressor_state() -> Unit {
  ensure_compressor_state()
  for idx = 0; idx < compressor_max_nodes; idx = idx + 1 {
    compressor_reconfigure(
      idx,
      0.0,
      -24.0,
      30.0,
      12.0,
      0.003,
      0.25,
      0.006,
      0.0,
      1.0,
      true,
    )
    compressor_store_last_params(
      idx,
      0.0,
      -24.0,
      30.0,
      12.0,
      0.003,
      0.25,
      0.006,
      0.0,
      1.0,
    )
  }
}

pub fn compressor_process(
  node_index : Int,
  input_l : Float,
  input_r : Float,
  pregain_db : Float,
  threshold_db : Float,
  knee_db : Float,
  ratio : Float,
  attack_sec : Float,
  release_sec : Float,
  predelay_sec : Float,
  postgain_db : Float,
  wet : Float,
) -> (Float, Float) {
  ensure_compressor_state()
  let idx = compressor_node_index(node_index)
  if compressor_needs_reconfigure(
    idx,
    pregain_db,
    threshold_db,
    knee_db,
    ratio,
    attack_sec,
    release_sec,
    predelay_sec,
    postgain_db,
    wet,
  ) {
    let should_reset_runtime = compressor_last_pregain_db[idx] == -1000000.0
    compressor_reconfigure(
      idx,
      pregain_db,
      threshold_db,
      knee_db,
      ratio,
      attack_sec,
      release_sec,
      predelay_sec,
      postgain_db,
      wet,
      should_reset_runtime,
    )
    compressor_store_last_params(
      idx,
      pregain_db,
      threshold_db,
      knee_db,
      ratio,
      attack_sec,
      release_sec,
      predelay_sec,
      postgain_db,
      wet,
    )
  }

  let linearpregain = compressor_linearpregain[idx]
  let threshold = compressor_threshold_db[idx]
  let knee = compressor_knee_db[idx]
  let linearthreshold = compressor_linearthreshold[idx]
  let slope = compressor_slope[idx]
  let k = compressor_k[idx]
  let linearthresholdknee = compressor_linearthresholdknee[idx]
  let kneedboffset = compressor_kneedboffset[idx]
  let dry = compressor_dry[idx]
  let wet_mix = compressor_wet[idx]
  let mastergain = compressor_mastergain[idx]
  let a = compressor_a[idx]
  let b = compressor_b[idx]
  let c = compressor_c[idx]
  let d = compressor_d[idx]
  let attacksamplesinv = compressor_attacksamplesinv[idx]
  let satreleasesamplesinv = compressor_satreleasesamplesinv[idx]
  let meterrelease = compressor_meterrelease[idx]
  let delaybufsize = compressor_delaybufsize[idx]
  let mut delaywritepos = compressor_delaywritepos[idx]
  let mut delayreadpos = compressor_delayreadpos[idx]
  let mut detectoravg = compressor_detectoravg[idx]
  let mut compgain = compressor_compgain[idx]
  let mut maxcompdiffdb = compressor_maxcompdiffdb[idx]
  let mut metergain = compressor_metergain[idx]
  let mut chunk_counter = compressor_chunk_counter[idx]
  let mut enveloperate = compressor_chunk_enveloperate[idx]
  let mut scaleddesiredgain = compressor_chunk_scaleddesiredgain[idx]

  if chunk_counter == 0 {
    detectoravg = compressor_fixf(detectoravg, 1.0)
    let desiredgain = detectoravg
    scaleddesiredgain =
      compressor_fixf(@math.asinf(desiredgain) * compressor_ang_90_inv, 1.0)
    let mut compdiffdb = compressor_lin2db(compgain / scaleddesiredgain)
    if compdiffdb < 0.0 {
      compdiffdb = compressor_fixf(compdiffdb, -1.0)
      maxcompdiffdb = -1.0
      let x = (effect_clamp(compdiffdb, -12.0, 0.0) + 12.0) * 0.25
      let releasesamples = compressor_adaptivereleasecurve(x, a, b, c, d)
      enveloperate = compressor_db2lin(compressor_spacing_db / releasesamples)
    } else {
      compdiffdb = compressor_fixf(compdiffdb, 1.0)
      if maxcompdiffdb == -1.0 || maxcompdiffdb < compdiffdb {
        maxcompdiffdb = compdiffdb
      }
      let mut attenuate = maxcompdiffdb
      if attenuate < 0.5 {
        attenuate = 0.5
      }
      enveloperate = 1.0 - @math.powf(0.25 / attenuate, attacksamplesinv)
    }
  }

  let input_pregain_l = input_l * linearpregain
  let input_pregain_r = input_r * linearpregain
  let write_offset = compressor_delay_offset(idx, delaywritepos)
  compressor_delay_l[write_offset] = input_pregain_l
  compressor_delay_r[write_offset] = input_pregain_r

  let inputmax =
    if effect_abs(input_pregain_l) > effect_abs(input_pregain_r) {
      effect_abs(input_pregain_l)
    } else {
      effect_abs(input_pregain_r)
    }

  let attenuation : Float =
    if inputmax < 0.0001 {
      1.0
    } else {
      let inputcomp =
        compressor_compcurve(
          inputmax,
          k,
          slope,
          linearthreshold,
          linearthresholdknee,
          threshold,
          knee,
          kneedboffset,
        )
      inputcomp / inputmax
    }

  let rate : Float =
    if attenuation > detectoravg {
      let mut attenuationdb = -compressor_lin2db(attenuation)
      if attenuationdb < 2.0 {
        attenuationdb = 2.0
      }
      let dbpersample = attenuationdb * satreleasesamplesinv
      compressor_db2lin(dbpersample) - 1.0
    } else {
      1.0
    }

  detectoravg = detectoravg + (attenuation - detectoravg) * rate
  if detectoravg > 1.0 {
    detectoravg = 1.0
  }
  detectoravg = compressor_fixf(detectoravg, 1.0)

  if enveloperate < 1.0 {
    compgain = compgain + (scaleddesiredgain - compgain) * enveloperate
  } else {
    compgain = compgain * enveloperate
    if compgain > 1.0 {
      compgain = 1.0
    }
  }

  let premixgain = @math.sinf(compressor_ang_90 * compgain)
  let gain = effect_clamp(compressor_fixf(dry + wet_mix * mastergain * premixgain, 1.0), 0.0, 16.0)

  let premixgaindb = compressor_lin2db(premixgain)
  if premixgaindb < metergain {
    metergain = premixgaindb
  } else {
    metergain = metergain + (premixgaindb - metergain) * meterrelease
  }

  let read_offset = compressor_delay_offset(idx, delayreadpos)
  let out_l = compressor_fixf(compressor_delay_l[read_offset] * gain, 0.0)
  let out_r = compressor_fixf(compressor_delay_r[read_offset] * gain, 0.0)

  delayreadpos = if delayreadpos + 1 >= delaybufsize { 0 } else { delayreadpos + 1 }
  delaywritepos = if delaywritepos + 1 >= delaybufsize { 0 } else { delaywritepos + 1 }
  chunk_counter =
    if chunk_counter + 1 >= compressor_samples_per_update {
      0
    } else {
      chunk_counter + 1
    }

  compressor_delaywritepos[idx] = delaywritepos
  compressor_delayreadpos[idx] = delayreadpos
  compressor_detectoravg[idx] = detectoravg
  compressor_compgain[idx] = compgain
  compressor_maxcompdiffdb[idx] = maxcompdiffdb
  compressor_metergain[idx] = metergain
  compressor_chunk_counter[idx] = chunk_counter
  compressor_chunk_enveloperate[idx] = enveloperate
  compressor_chunk_scaleddesiredgain[idx] = scaleddesiredgain

  (out_l, out_r)
}

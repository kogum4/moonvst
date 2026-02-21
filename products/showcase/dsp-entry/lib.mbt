fn process_audio(num_samples : Int) -> Unit {
  @effects.process_reverb_block(
    num_samples,
    param_values[0],
    param_values[1],
    param_values[2],
    param_values[3],
    param_values[4],
    param_values[5],
  )
}

pub fn predelay_ms_to_samples(ms : Float) -> Int {
  @effects.reverb_predelay_ms_to_samples(ms)
}

pub fn mix_dry_wet(dry : Float, wet : Float, mix : Float) -> Float {
  @effects.reverb_mix_dry_wet(dry, wet, mix)
}

pub fn reset_reverb_state() -> Unit {
  @effects.reset_reverb_state()
}

pub fn product_reset() -> Unit {
  @effects.reset_reverb_state()
}

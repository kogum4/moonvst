// Memory layout constants
// Each buffer: max 16384 samples × 4 bytes = 64KB

let sample_rate_hz_box : Array[Float] = [48000.0]

pub let input_left_offset : Int = 0x10000

pub let input_right_offset : Int = 0x20000

pub let output_left_offset : Int = 0x30000

pub let output_right_offset : Int = 0x40000

pub let string_buf_offset : Int = 0x50000

pub let reverb_mem_base_ptr : Int = 0x60000

pub let chorus_mem_base_ptr : Int = 0x78000

pub fn set_sample_rate(sample_rate_hz : Float) -> Unit {
  let safe_sample_rate_hz : Float =
    if sample_rate_hz < 1000.0 {
      48000.0
    } else {
      sample_rate_hz
    }
  sample_rate_hz_box[0] = safe_sample_rate_hz
}

pub fn get_sample_rate() -> Float {
  sample_rate_hz_box[0]
}

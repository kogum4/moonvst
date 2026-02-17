// Memory layout constants
// Each buffer: max 16384 samples × 4 bytes = 64KB

pub let input_left_offset : Int = 0x10000   // 65536

pub let input_right_offset : Int = 0x20000  // 131072

pub let output_left_offset : Int = 0x30000  // 196608

pub let output_right_offset : Int = 0x40000 // 262144

pub let string_buf_offset : Int = 0x50000   // 327680 — parameter name string buffer

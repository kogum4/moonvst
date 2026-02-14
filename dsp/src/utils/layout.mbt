pub struct AllocSpan {
  ptr : Int
  next : Int
}

pub fn alloc_bytes(cursor : Int, size : Int) -> AllocSpan {
  { ptr: cursor, next: cursor + size }
}

pub fn alloc_f32_samples(cursor : Int, sample_count : Int) -> AllocSpan {
  alloc_bytes(cursor, sample_count * 4)
}

pub fn alloc_i32_slots(cursor : Int, slot_count : Int) -> AllocSpan {
  alloc_bytes(cursor, slot_count * 4)
}

pub extern "wasm" fn load_f32(ptr : Int) -> Float =
  #|(func (param i32) (result f32) (f32.load (local.get 0)))

pub extern "wasm" fn store_f32(ptr : Int, value : Float) =
  #|(func (param i32) (param f32) (f32.store (local.get 0) (local.get 1)))

pub extern "wasm" fn store_u8(ptr : Int, value : Int) =
  #|(func (param i32) (param i32) (i32.store8 (local.get 0) (local.get 1)))

pub extern "wasm" fn load_u8(ptr : Int) -> Int =
  #|(func (param i32) (result i32) (i32.load8_u (local.get 0)))

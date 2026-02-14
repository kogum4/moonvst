// Parameter definition struct
priv struct ParamDef {
  name : String
  min : Float
  max : Float
  default_val : Float
}

// Parameter definitions — add new parameters here!
// Just add a new entry to this array, no C++ changes needed.
let param_defs : Array[ParamDef] = [
  { name: "gain", min: 0.0, max: 1.0, default_val: 0.5 },
  { name: "drive", min: 1.0, max: 12.0, default_val: 2.0 },
  { name: "mix", min: 0.0, max: 1.0, default_val: 1.0 },
]

// Current parameter values (mutable, initialized from defaults)
let param_values : Array[Float] = [0.5, 2.0, 1.0]

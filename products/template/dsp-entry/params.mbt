// Parameter definition struct
priv struct ParamDef {
  name : String
  min : Float
  max : Float
  default_val : Float
}

// Template product parameter surface: gain only.
let param_defs : Array[ParamDef] = [
  { name: "gain", min: 0.0, max: 1.5, default_val: 1.0 },
]

let param_values : Array[Float] = [1.0]

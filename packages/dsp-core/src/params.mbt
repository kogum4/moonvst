// Parameter definition struct
priv struct ParamDef {
  name : String
  min : Float
  max : Float
  default_val : Float
}

let param_defs : Array[ParamDef] = [
  { name: "gain", min: 0.0, max: 1.5, default_val: 1.0 },
  { name: "pre_delay_ms", min: 0.0, max: 50.0, default_val: 20.0 },
  { name: "decay", min: 0.0, max: 0.98, default_val: 0.78 },
  { name: "damping", min: 0.0, max: 0.95, default_val: 0.35 },
  { name: "diffusion", min: 0.0, max: 0.95, default_val: 0.70 },
  { name: "mix", min: 0.0, max: 1.0, default_val: 0.35 },
]

let param_values : Array[Float] = [1.0, 20.0, 0.78, 0.35, 0.70, 0.35]

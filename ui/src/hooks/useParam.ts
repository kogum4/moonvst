import { useState, useEffect, useCallback } from 'react'
import type { AudioRuntime, ParamInfo } from '../runtime/types'

export function useParam(runtime: AudioRuntime | null, name: string) {
  const paramInfo = runtime?.getParams().find(p => p.name === name) ?? null
  const [value, setValue] = useState(paramInfo?.defaultValue ?? 0)

  useEffect(() => {
    if (!runtime || !paramInfo) return
    setValue(runtime.getParam(paramInfo.index))
    return runtime.onParamChange(paramInfo.index, setValue)
  }, [runtime, paramInfo])

  const set = useCallback((v: number) => {
    if (runtime && paramInfo) {
      runtime.setParam(paramInfo.index, v)
      setValue(v)
    }
  }, [runtime, paramInfo])

  return { value, set, info: paramInfo as ParamInfo | null }
}

import { NodeEditorShell } from './components/NodeEditorShell'
import { useRuntime } from '../../../packages/ui-core/src/runtime/useRuntime'
import { WebAudioMenu } from '../../../packages/ui-core/src/components/WebAudioMenu'
import type { WebAudioRuntime } from '../../../packages/ui-core/src/runtime/types'

function isWebAudioRuntime(runtime: { type: 'juce' | 'web' } | null): runtime is WebAudioRuntime {
  return runtime?.type === 'web'
}

export default function App() {
  const { runtime } = useRuntime()

  return (
    <>
      {isWebAudioRuntime(runtime) ? <WebAudioMenu runtime={runtime} /> : null}
      <NodeEditorShell runtime={runtime} />
    </>
  )
}

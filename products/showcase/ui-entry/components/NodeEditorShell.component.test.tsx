import { fireEvent, render, screen } from '../test/testing'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NodeEditorShell } from './NodeEditorShell'
import {
  SHOWCASE_PRESET_STORAGE_KEY,
  SHOWCASE_UI_STATE_STORAGE_KEY,
  serializeShowcaseUiState,
} from '../runtime/graphUiState'
import { createDefaultGraphState, graphReducer } from '../state/graphReducer'

describe('node editor shell layout', () => {
  const seedUserPreset = (name: string) => {
    window.localStorage.setItem(
      SHOWCASE_PRESET_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'preset-seeded',
          name,
          createdAt: 1,
          updatedAt: 1,
          graphPayload: '{"version":1,"nodes":[],"edges":[]}',
        },
      ]),
    )
  }

  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  test('renders Pencil-mapped regions with semantic roles and region ids', () => {
    render(<NodeEditorShell />)

    expect(screen.getByRole('banner', { name: 'Top Bar' })).toHaveAttribute('data-region-id', 'FMWVd')
    expect(screen.getByRole('navigation', { name: 'Node Library' })).toHaveAttribute('data-region-id', 'XQtg4')
    expect(screen.getByRole('main', { name: 'Graph Canvas' })).toHaveAttribute('data-region-id', 'jJBPL')
    expect(screen.getByRole('complementary', { name: 'Properties Panel' })).toHaveAttribute('data-region-id', 'P0JNl')
    expect(screen.getByRole('contentinfo', { name: 'Status Bar' })).toHaveAttribute('data-region-id', 'gkrb8')
    expect(screen.getByRole('link', { name: 'Open GitHub Repository' })).toHaveAttribute('href', 'https://github.com/kogum4/moonvst')
  })

  test('updates inspector node dot color to match selected node kind', () => {
    render(<NodeEditorShell />)

    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#38BDF8')
    expect(screen.getByText('No editable parameters for current selection.')).toBeInTheDocument()

    const inputNode = screen.getByRole('group', { name: 'I/O Node INPUT' })
    fireEvent.click(inputNode)
    expect(inputNode).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#4ADE80')
    expect(screen.getByTestId('connection-dot-out-0')).toHaveAttribute('data-node-color', '#FB923C')
    expect(screen.getByRole('button', { name: 'Bypass Input' })).toBeDisabled()

    const outputNode = screen.getByRole('group', { name: 'I/O Node OUTPUT' })
    fireEvent.click(outputNode)
    expect(outputNode).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#FB923C')
    expect(screen.getByTestId('connection-dot-in-0')).toHaveAttribute('data-node-color', '#4ADE80')
    expect(screen.getByRole('button', { name: 'Bypass Output' })).toBeDisabled()
  })

  test('keeps fixed connection value slots for IN and OUT rows', () => {
    render(<NodeEditorShell />)

    expect(screen.getByTestId('connections-in-value')).toBeInTheDocument()
    expect(screen.getByTestId('connections-out-value')).toBeInTheDocument()

    const inputNode = screen.getByRole('group', { name: 'I/O Node INPUT' })
    fireEvent.click(inputNode)

    expect(screen.getByTestId('connections-in-value')).toBeInTheDocument()
    expect(screen.getByTestId('connections-out-value')).toBeInTheDocument()
  })

  test('applies themed canvas scrollbar styling', () => {
    render(<NodeEditorShell />)

    const canvas = screen.getByRole('main', { name: 'Graph Canvas' })
    expect(canvas).toHaveStyle({
      scrollbarWidth: 'none',
      scrollbarColor: 'transparent transparent',
    })
    expect(canvas).toHaveAttribute('data-can-scroll-x', 'false')
    expect(canvas).toHaveAttribute('data-can-scroll-y', 'false')
  })

  test('prevents accidental text selection in properties panel', () => {
    render(<NodeEditorShell />)

    const inspector = screen.getByRole('complementary', { name: 'Properties Panel' })
    expect(inspector).toHaveStyle({ userSelect: 'none' })
  })

  test('prevents accidental text selection in top, left and bottom bars', () => {
    render(<NodeEditorShell />)

    const topBar = screen.getByRole('banner', { name: 'Top Bar' })
    const library = screen.getByRole('navigation', { name: 'Node Library' })
    const statusBar = screen.getByRole('contentinfo', { name: 'Status Bar' })

    expect(topBar).toHaveStyle({ userSelect: 'none' })
    expect(library).toHaveStyle({ userSelect: 'none' })
    expect(statusBar).toHaveStyle({ userSelect: 'none' })
  })

  test('supports undo/redo and reset from top bar controls', () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))
    expect(screen.getByRole('group', { name: 'Effect Node Chorus' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.queryByRole('group', { name: 'Effect Node Chorus' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByRole('group', { name: 'Effect Node Chorus' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.queryByRole('group', { name: 'Effect Node Chorus' })).not.toBeInTheDocument()
    expect(screen.getByText('Default Preset')).toBeInTheDocument()
  })

  test('saves and loads presets from top bar dropdown + save dialog', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const prompt = vi.spyOn(window, 'prompt').mockImplementation(() => 'Legacy prompt')

    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))
    expect(screen.getByRole('group', { name: 'Effect Node Chorus' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Save Preset Dialog' }))
    expect(screen.getByRole('dialog', { name: 'Save Preset Dialog' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Preset Name'), { target: { value: 'MyPreset' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Save Preset' }))
    expect(screen.queryByRole('dialog', { name: 'Save Preset Dialog' })).not.toBeInTheDocument()
    expect(screen.getByText('MyPreset')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.queryByRole('group', { name: 'Effect Node Chorus' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Preset Dropdown' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Load preset MyPreset' }))
    expect(screen.getByRole('group', { name: 'Effect Node Chorus' })).toBeInTheDocument()
    expect(alert).not.toHaveBeenCalled()
    expect(prompt).not.toHaveBeenCalled()
  })

  test('keeps user preset when delete is canceled from confirmation dialog', () => {
    seedUserPreset('MyPreset')
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Preset Dropdown' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete preset MyPreset' }))

    expect(screen.getByRole('dialog', { name: 'Delete Preset Dialog' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Delete Preset' }))
    expect(screen.queryByRole('dialog', { name: 'Delete Preset Dialog' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Preset Dropdown' }))
    expect(screen.getByRole('menuitem', { name: 'Load preset MyPreset' })).toBeInTheDocument()
  })

  test('deletes user preset from dropdown via trash icon with confirmation dialog', () => {
    seedUserPreset('MyPreset')
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Preset Dropdown' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete preset MyPreset' }))

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete Preset' }))

    expect(screen.queryByRole('dialog', { name: 'Delete Preset Dialog' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Load preset MyPreset' })).not.toBeInTheDocument()
  })

  test('shows overwrite warning when saving with existing preset name', () => {
    seedUserPreset('MyPreset')
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Save Preset Dialog' }))
    fireEvent.change(screen.getByLabelText('Preset Name'), { target: { value: 'MyPreset' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Save Preset' }))

    expect(screen.getByRole('dialog', { name: 'Save Preset Dialog' })).toBeInTheDocument()
    expect(screen.getByText('This preset name already exists. Click Overwrite to replace it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Overwrite Preset' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Overwrite Preset' }))
    expect(screen.queryByRole('dialog', { name: 'Save Preset Dialog' })).not.toBeInTheDocument()
  })

  test('opens preset dropdown from Default Preset selector', () => {
    render(<NodeEditorShell />)

    expect(screen.queryByRole('menu', { name: 'Preset Dropdown Menu' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Preset Dropdown' }))

    expect(screen.getByRole('menu', { name: 'Preset Dropdown Menu' })).toBeInTheDocument()
    expect(screen.getByText('FACTORY')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Load preset Default Preset' })).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Create New Preset' })).toBeInTheDocument()
  })

  test('closes preset dropdown when clicking outside', () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Preset Dropdown' }))
    expect(screen.getByRole('menu', { name: 'Preset Dropdown Menu' })).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByRole('main', { name: 'Graph Canvas' }))
    expect(screen.queryByRole('menu', { name: 'Preset Dropdown Menu' })).not.toBeInTheDocument()
  })

  test('shows loading screen and hides editor while JUCE hydration is pending', async () => {
    let resolveUiState: (value: unknown) => void = () => {}
    const pendingUiState = new Promise<unknown>((resolve) => {
      resolveUiState = resolve
    })
    const runtime = {
      type: 'juce' as const,
      getParams: () => [],
      setParam: () => {},
      getParam: () => 0,
      getLevel: () => 0,
      onParamChange: () => () => {},
      invokeNative: vi.fn(async (name: string) => (name === 'getUiState' ? pendingUiState : undefined)),
      dispose: () => {},
    }

    render(<NodeEditorShell runtime={runtime} />)

    expect(screen.getByRole('status', { name: 'Loading Screen' })).toHaveAttribute('data-region-id', 'syYFs')
    expect(screen.queryByRole('banner', { name: 'Top Bar' })).not.toBeInTheDocument()

    resolveUiState('')

    await vi.waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Loading Screen' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('banner', { name: 'Top Bar' })).toBeInTheDocument()
  })

  test('renders editor only after JUCE getUiState resolves', async () => {
    const runtime = {
      type: 'juce' as const,
      getParams: () => [],
      setParam: () => {},
      getParam: () => 0,
      getLevel: () => 0,
      onParamChange: () => () => {},
      invokeNative: vi.fn(async (name: string) => (name === 'getUiState' ? '' : undefined)),
      dispose: () => {},
    }

    render(<NodeEditorShell runtime={runtime} />)

    expect(screen.getByRole('status', { name: 'Loading Screen' })).toBeInTheDocument()

    await vi.waitFor(() => {
      expect(runtime.invokeNative).toHaveBeenCalledWith('getUiState')
      expect(screen.getByRole('main', { name: 'Graph Canvas' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('status', { name: 'Loading Screen' })).not.toBeInTheDocument()
  })

  test('does not bootstrap JUCE instance state from browser localStorage when host ui state is empty', async () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'chorus', x: 220, y: 140, id: 'fx-1' })
    window.localStorage.setItem(
      SHOWCASE_UI_STATE_STORAGE_KEY,
      JSON.stringify(serializeShowcaseUiState(state, 'Leaked Local Preset')),
    )

    const runtime = {
      type: 'juce' as const,
      getParams: () => [],
      setParam: () => {},
      getParam: () => 0,
      getLevel: () => 0,
      onParamChange: () => () => {},
      invokeNative: vi.fn(async (name: string) => (name === 'getUiState' ? '' : undefined)),
      dispose: () => {},
    }

    render(<NodeEditorShell runtime={runtime} />)

    await vi.waitFor(() => {
      expect(runtime.invokeNative).toHaveBeenCalledWith('getUiState')
      expect(screen.queryByRole('status', { name: 'Loading Screen' })).not.toBeInTheDocument()
    })

    expect(screen.queryByRole('group', { name: 'Effect Node Chorus' })).not.toBeInTheDocument()
    expect(screen.getByText('Default Preset')).toBeInTheDocument()
  })

  test('persists first edit to JUCE host state immediately after hydration', async () => {
    const runtime = {
      type: 'juce' as const,
      getParams: () => [],
      setParam: () => {},
      getParam: () => 0,
      getLevel: () => 0,
      onParamChange: () => () => {},
      invokeNative: vi.fn(async (name: string) => (name === 'getUiState' ? '' : undefined)),
      dispose: () => {},
    }

    render(<NodeEditorShell runtime={runtime} />)

    await vi.waitFor(() => {
      expect(runtime.invokeNative).toHaveBeenCalledWith('getUiState')
    })

    await vi.waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Loading Screen' })).not.toBeInTheDocument()
      expect(screen.getByRole('main', { name: 'Graph Canvas' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))

    await vi.waitFor(() => {
      expect(runtime.invokeNative).toHaveBeenCalledWith('setUiState', expect.any(String))
    })
  })

})

import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'

const isJuceBuild = process.env.VITE_BUILD_TARGET === 'juce'
const product = process.env.VITE_PRODUCT === 'showcase' ? 'showcase' : 'template'
const base = process.env.VITE_BASE_PATH ?? '/'
const dspWasmPath = path.resolve(__dirname, 'public', 'wasm', 'moonvst_dsp.wasm')

function normalizePath(filePath: string): string {
  return path.resolve(filePath).replace(/\\/g, '/').toLowerCase()
}

function dspWasmReloadPlugin(): Plugin {
  const watchedPath = normalizePath(dspWasmPath)

  return {
    name: 'dsp-wasm-full-reload',
    configureServer(server: ViteDevServer) {
      server.watcher.add(dspWasmPath)

      const triggerReload = (changedPath: string) => {
        if (normalizePath(changedPath) !== watchedPath) {
          return
        }

        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', triggerReload)
      server.watcher.on('change', triggerReload)
    },
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    dspWasmReloadPlugin(),
    ...(isJuceBuild ? [viteSingleFile()] : []),
  ],
  build: {
    outDir: isJuceBuild ? 'dist' : 'dist-web',
    ...(isJuceBuild && {
      assetsInlineLimit: Infinity,
      cssCodeSplit: false,
    }),
  },
  define: {
    'import.meta.env.VITE_RUNTIME': JSON.stringify(isJuceBuild ? 'juce' : 'web'),
    'import.meta.env.VITE_PRODUCT': JSON.stringify(product),
  },
  resolve: {
    alias: {
      'lucide-react': path.resolve(__dirname, 'node_modules', 'lucide-react'),
      '@fontsource': path.resolve(__dirname, 'node_modules', '@fontsource'),
    },
  },
})

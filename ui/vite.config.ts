import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const isJuceBuild = process.env.VITE_BUILD_TARGET === 'juce'

export default defineConfig({
  plugins: [
    react(),
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
  },
})

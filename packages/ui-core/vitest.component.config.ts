import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@testing-library/react': path.resolve(__dirname, 'node_modules', '@testing-library', 'react'),
      'lucide-react': path.resolve(__dirname, 'node_modules', 'lucide-react'),
      '@fontsource': path.resolve(__dirname, 'node_modules', '@fontsource'),
    },
  },
  server: {
    fs: {
      allow: ['..', '../..'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.component.test.tsx', '../../products/**/*.component.test.tsx'],
    css: true,
    clearMocks: true,
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/sdui-kit/react-basic/' : '/',
  plugins: [react()],
}))

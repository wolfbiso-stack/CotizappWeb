import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    // Only the web entry point; Android build reports are not Vite pages.
    optimizeDeps: { entries: ['index.html'] },
})

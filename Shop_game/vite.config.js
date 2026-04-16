import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from "vite-plugin-singlefile"
// https://vite.dev/config/
export default defineConfig({
  base: '/Global_South_Games_for_intellectually_disabled/Shop_game/',
  plugins: [react(),viteSingleFile()],
})

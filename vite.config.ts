import { defineConfig } from "vite"
import paths from "vite-tsconfig-paths"
import wasm from "vite-plugin-wasm"

export default defineConfig({
  plugins: [paths(), wasm()],
  optimizeDeps: {
    exclude: ["wasml"]
  }
})

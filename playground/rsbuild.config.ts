import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

export default defineConfig({
  html: {
    title: 'Leafer X Snap',
  },
  plugins: [pluginReact()],
})

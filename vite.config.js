import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    clearScreen: false,
    server: {
        open: true
    },
    plugins: [
        viteStaticCopy({
          targets: [
            { src: 'node_modules/three/examples/jsm/libs/ammo.wasm.js', dest: 'jsm/libs/' },
			      { src: 'node_modules/three/examples/jsm/libs/ammo.wasm.wasm', dest: 'jsm/libs/' }
          ]
        })
      ]
})


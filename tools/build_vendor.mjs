import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'vite';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  configFile: false,
  root,
  build: {
    emptyOutDir: false,
    outDir: process.argv[2] || 'src/vendor',
    lib: {
      entry: path.join(root, 'tools/vendor-entry.js'),
      name: 'HUD3D',
      formats: ['iife'],
      fileName: () => 'engine.js',
    },
    minify: true,
  },
});

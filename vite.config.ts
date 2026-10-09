import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import adminVendorCascade from './scripts/admin-vendor-cascade.mjs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    css: { postcss: { plugins: [adminVendorCascade()] } },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Function-form manualChunks (performance task §1/§2): only the React
          // runtime is forced into its own cacheable chunk. The previous
          // object-form config listed 'lucide-react' by package name, which
          // forced ALL ~1,600 icon modules into one 763 KB "vendor-icons"
          // chunk (measured) and defeated tree-shaking; react was also pulled
          // into it via the barrel import. With the function form, lucide
          // tree-shakes naturally to only the icons the app imports, and
          // every other dependency is split along dynamic-import boundaries
          // (admin, checkout, services routes each get their own chunks).
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

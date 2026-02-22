import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const medgemmaUrl = env.VITE_MEDGEMMA_URL || 'https://20d4-34-73-64-199.ngrok-free.app';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/medgemma-api': {
          target: medgemmaUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/medgemma-api/, ''),
          // ngrok requires this header to pass the browser-warning page
          headers: { 'ngrok-skip-browser-warning': '1' },
        },
      },
    },
  };
});

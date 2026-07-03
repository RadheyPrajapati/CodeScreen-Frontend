// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  return {
    plugins: [
      react(),
      ...(isDev ? [basicSsl()] : [])
    ],

    server: {
      host: true,
      port: 5173,
      proxy: {
        '/auth': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/interview': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/question': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/submission': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/feedback': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/resume': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      host: true,
      port: Number(process.env.PORT) || 5173,
      strictPort: true,
    }
  };
});
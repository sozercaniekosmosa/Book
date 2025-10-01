import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
    base: '',
    plugins: [tailwindcss(), react()],
    build: {
        outDir: "./dist",
        rollupOptions: {
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        }
    },
    server: {
        // host: '0.0.0.0',
        port: 5173, // Порт Vite
        proxy: {
            '/api': {
                target: 'http://localhost:3000', // Порт Express
                changeOrigin: true,
                // rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
})
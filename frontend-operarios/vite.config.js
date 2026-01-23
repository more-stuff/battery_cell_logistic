import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permite que Docker exponga el servidor
    port: 5173,
    watch: {
      usePolling: true, // A veces necesario en Windows/Docker para detectar cambios
    },
    proxy: {
      "/api": {
        target: "http://backend:8000", // Apunta al contenedor "backend"
        changeOrigin: true,
        secure: false,
        // Esta línea elimina "/api" de la URL, igual que hacía Nginx
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});

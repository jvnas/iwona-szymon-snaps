import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  // For Cloudflare Pages, we don't need a base path
  // For GitHub Pages, we need the repository name as the base path
  // For local development, we use the root path
  base: mode === 'production' && process.env.CF_PAGES ? '/' : mode === 'production' ? "/iwona-szymon-snaps/" : "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

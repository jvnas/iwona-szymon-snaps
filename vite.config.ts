import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: env.VITE_APP_BASE_URL || '/',
    server: {
      host: 'localhost',
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Add this to handle SPA fallback in production
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    // This ensures that environment variables are available in the client
    define: {
      'process.env': {}
    }
  };
});

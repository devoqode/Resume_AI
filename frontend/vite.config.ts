import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Keep React together to avoid hook issues
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // Group Radix UI components
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          // Group form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'form-vendor';
          }
          // Group query libraries
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          // Group chart libraries
          if (id.includes('recharts')) {
            return 'chart-vendor';
          }
          // Group other UI libraries
          if (id.includes('lucide-react') || id.includes('class-variance-authority') || id.includes('clsx')) {
            return 'ui-utils-vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}));

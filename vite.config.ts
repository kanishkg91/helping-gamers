/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

// BUILD_SINGLE=1 produces a fully self-contained single HTML file (used for
// portable demos). The normal build is a standard static SPA for Vercel.
async function plugins(): Promise<PluginOption[]> {
  const base: PluginOption[] = [react()];
  if (process.env.BUILD_SINGLE) {
    const { viteSingleFile } = await import('vite-plugin-singlefile');
    base.push(viteSingleFile({ removeViteModuleLoader: true }));
  }
  return base;
}

export default defineConfig(async () => ({
  plugins: await plugins(),
  define: {
    // Lets app code skip service-worker registration in the single-file demo.
    'import.meta.env.BUILD_SINGLE': JSON.stringify(Boolean(process.env.BUILD_SINGLE)),
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));

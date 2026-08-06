import { resolve } from 'path';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import manifest from './src/manifest.ts';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'test'
      ? []
      : [
          crx({
            manifest,
            contentScripts: {
              injectCss: true,
            },
          }),
        ]),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@utils': resolve(import.meta.dirname, './src/utils'),
      '@assets': resolve(import.meta.dirname, './src/assets'),
    },
  },
  // Vitest config is not part of Vite's runtime config. When running Vitest,
  // it will read this block. During normal vite build, this key is ignored.
  ...(mode === 'test'
    ? {
        test: {
          globals: true,
          environment: 'node',
          include: [
            'src/**/*.vitest.{ts,tsx}',
            'src/**/__tests__/**/*.vitest.{ts,tsx}',
          ],
          setupFiles: ['src/test/setup.ts'],
        },
      }
    : {
        server: {
          cors: true, // Set to true to allow all origins during development
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
          },
          hmr: {
            // Force the HMR websocket to use the same protocol as the page
            // This allows Chrome extension pages to connect to the WebSocket
            protocol: 'ws',
            host: 'localhost',
            port: 5174,
          },
        },
      }),
}));

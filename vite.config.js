import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// フロントエンドのビルド設定
// レセコンとのポート競合を避けるため 5717 / 3717 を使用
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5717,
    // バックエンドAPIへのプロキシ設定（/api を localhost:3717 に転送）
    proxy: {
      '/api': {
        target: 'http://localhost:3717',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});

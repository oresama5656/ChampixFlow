import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// サーバーレス構成のビルド設定
// バックエンドAPIなし - File System Access API でローカルに直接保存
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5717,
  },
  build: {
    outDir: 'dist',
  },
});

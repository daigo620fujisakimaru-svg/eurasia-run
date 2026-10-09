import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA：ホーム画面に追加してアプリのように使えるようにする
    VitePWA({
      registerType: 'autoUpdate', // 新しい版を公開したら、次に開いたとき自動で更新
      // 通知を受け取るため、Service Worker は自分で書いた src/sw.js を使う（保存するファイルの一覧だけ自動で入れてもらう）
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'ユーラシアラン',
        short_name: 'ユーラシアラン',
        description: 'みんなで走って、姫路城からロカ岬までユーラシア大陸を横断しよう',
        lang: 'ja',
        start_url: '/',
        display: 'standalone', // ブラウザのアドレスバーを消してアプリのように表示
        orientation: 'portrait',
        theme_color: '#f97316',
        background_color: '#f5f5f4',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // アプリ本体とルートデータをスマホに保存しておき、2回目からは一瞬で開く
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,geojson}'],
      },
    }),
  ],
  build: {
    // Firebase（ログイン＋データベース）だけで約530KBあり、これ以上は分けられないので基準を少し上げる。
    // PWAが初回にスマホへ保存するので、2回目以降の起動速度には影響しない
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // 部品ごとにファイルを分ける。アプリを更新しても、変わっていない部品は
        // 保存済みのものが使われるので、更新のたびに全部を読み直さずに済む
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/, priority: 3 },
            { name: 'map', test: /node_modules[\\/](leaflet|react-leaflet|@react-leaflet|@turf)[\\/]/, priority: 2 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
})

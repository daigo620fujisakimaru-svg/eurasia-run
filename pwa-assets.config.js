// アイコン画像の作り方の設定（実行: npx pwa-assets-generator）
// デザインがすでに中央に収まっているので、余白なし・背景オレンジで作る
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

const noPadding = { padding: 0, resizeOptions: { background: '#f97316' } }

export default defineConfig({
  preset: {
    ...preset,
    transparent: { ...preset.transparent, ...noPadding },
    maskable: { ...preset.maskable, ...noPadding },
    apple: { ...preset.apple, ...noPadding },
  },
  images: ['public/icon.svg'],
})

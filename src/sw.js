// Service Worker：アプリの裏で動く小さなプログラム
// ① アプリのファイルをスマホに保存して、2回目から一瞬で開く
// ② アプリを閉じていても届いた通知を表示し、タップされたらアプリを開く
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import { firebaseConfig } from './firebaseConfig.js'

// 新しい版を公開したら、すぐに入れ替わるようにする
self.skipWaiting()
clientsClaim()

// ① ファイルの保存（self.__WB_MANIFEST には、ビルド時に保存するファイルの一覧が入る）
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// ページの移動はアプリ本体（index.html）で答える。ただし Firebase のログイン用ページ(/__/...)は横取りしない
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/__\//] }))

// ② 通知の表示。通知サーバーは「タイトル・本文・開くURL」をデータとして送ってくる
const messaging = getMessaging(initializeApp(firebaseConfig))
onBackgroundMessage(messaging, (payload) => {
  const { title = 'ユーラシアラン', body = '', url = '/', tag } = payload.data ?? {}
  return self.registration.showNotification(title, {
    body,
    tag, // 同じ tag の通知は上書きされる（チャットの通知がたまりすぎないように）
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url },
  })
})

// 通知をタップしたら、アプリを開く（開いていれば前に出す）
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin)
      if (win) {
        win.navigate(url)
        return win.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})

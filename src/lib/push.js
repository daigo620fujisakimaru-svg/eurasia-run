// 通知（Web Push）の受け取り設定。スマホごとの「宛先（トークン）」をデータベースに保存し、
// 通知サーバー（GitHub Actions）がそこへ送る
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { app, db } from '../firebase.js'
import { VAPID_KEY } from '../firebaseConfig.js'

const TOKEN_KEY = 'eurasia-run.pushToken' // この端末で登録した宛先

function savedToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 保存できなくても、通知の登録自体は済んでいる
  }
}

// この端末で通知が使えるか：'ok' / 'ios-install'（ホーム画面から開く必要あり）/ 'unsupported' / 'denied'
export async function pushStatus() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  if (ios && !standalone) return 'ios-install'
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'ok'
}

export const isPushOn = () => Boolean(savedToken()) && Notification.permission === 'granted'

// 公開版で登録される Service Worker（src/sw.js）を探す。開発中（npm run dev）は無いので使えない
async function swRegistration() {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) throw new Error('通知は公開版のアプリでだけ使えます')
  return navigator.serviceWorker.ready
}

async function registerToken(uid) {
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: await swRegistration() })
  await setDoc(doc(db, 'pushTokens', token), {
    uid,
    token,
    device: navigator.userAgent.slice(0, 120),
    updatedAt: serverTimestamp(),
  })
  const old = savedToken()
  if (old && old !== token) await deleteDoc(doc(db, 'pushTokens', old)).catch(() => {})
  saveToken(token)
  return token
}

// 「通知を受け取る」をオンにする（ボタンを押したときに呼ぶ。iPhone はボタン操作からでないと許可を求められない）
export async function enablePush(uid) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('通知が許可されませんでした')
  return registerToken(uid)
}

export async function disablePush() {
  const token = savedToken()
  if (token) await deleteDoc(doc(db, 'pushTokens', token)).catch(() => {})
  await deleteToken(getMessaging(app)).catch(() => {})
  saveToken(null)
}

// アプリを開いたときに宛先を更新する（宛先はときどき変わるため）。
// アプリを開いている最中に届いた通知も、スマホの通知として表示する
export async function refreshPush(uid) {
  if (!isPushOn() || (await pushStatus()) !== 'ok') return
  await registerToken(uid).catch(() => {})
  onMessage(getMessaging(app), async ({ data = {} }) => {
    const reg = await navigator.serviceWorker.ready
    reg.showNotification(data.title ?? 'ユーラシアラン', {
      body: data.body ?? '',
      tag: data.tag,
      icon: '/pwa-192x192.png',
      data: { url: data.url ?? '/' },
    })
  })
}

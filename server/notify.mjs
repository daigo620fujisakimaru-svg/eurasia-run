// 通知を送るプログラム（GitHub Actions から実行する）
// 使い方: node notify.mjs <mode> [メールアドレス] [--dry-run]
//   morning … 明日の「朝」に○の人へ（日本時間21時に実行）
//   noon    … 今日の「昼」に○の人へ（7時）
//   night   … 今日の「夜」に○の人へ（12時）
//   chat    … チャットの新着を通知（5分ごと）。予定の通知の送り忘れもここで補う
//   test    … 指定したメールアドレスの人に試しの通知を送る
//   --dry-run … 実際には送らず、送る内容を表示するだけ
import { readFileSync } from 'node:fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { pickMotivation } from './motivation.mjs'

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const [mode, emailArg] = args.filter((a) => !a.startsWith('--'))

// 鍵（サービスアカウント）は GitHub の Secrets から環境変数で受け取る。手元で試すときはファイルの場所を指定
const key = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(readFileSync(process.env.SERVICE_ACCOUNT_FILE, 'utf8'))
initializeApp({ credential: cert(key) })
const db = getFirestore()
const messaging = getMessaging()

// ---------- 日本時間の日付 ----------
const JST = 9 * 3600 * 1000
const jstNow = () => new Date(Date.now() + JST) // getUTC〇〇 で日本時間の値が取れる
const dateKey = (offsetDays = 0) => {
  const d = jstNow()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
const WEEK = ['日', '月', '火', '水', '木', '金', '土']
const dayLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return `${m}月${d}日(${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`
}

const SLOTS = {
  morning: { slot: '朝', offset: 1, when: '明日の朝', emoji: '🌅', hours: [21, 23] }, // 21:00〜23:59 の間に送る
  noon: { slot: '昼', offset: 0, when: '今日の昼', emoji: '☀️', hours: [7, 10] },
  night: { slot: '夜', offset: 0, when: '今日の夜', emoji: '🌙', hours: [12, 16] },
}

// ---------- 共通 ----------
async function loadMembers() {
  const snap = await db.collection('members').get()
  return new Map(snap.docs.map((d) => [d.id, d.data()]))
}
async function tokensByUid() {
  const snap = await db.collection('pushTokens').get()
  const map = new Map()
  for (const d of snap.docs) {
    const { uid } = d.data()
    if (!map.has(uid)) map.set(uid, [])
    map.get(uid).push(d.id)
  }
  return map
}
async function teamKm() {
  const snap = await db.collection('runs').select('distanceKm').get()
  return snap.docs.reduce((sum, d) => sum + (d.get('distanceKm') ?? 0), 0)
}

// 通知を送る。データだけを送り、表示はアプリの Service Worker が行う（タイトル・本文・開くURL）
async function send(tokens, { title, body, url = '/', tag }) {
  if (!tokens?.length) return
  if (DRY) {
    console.log(`--- 送信予定（${tokens.length}台） ---\n${title}\n${body}\n→ ${url}`)
    return
  }
  const res = await messaging.sendEachForMulticast({
    tokens,
    data: { title, body, url, tag: tag ?? '' },
    webpush: { headers: { Urgency: 'high', TTL: String(6 * 3600) } }, // 6時間以内に届かなければ破棄
  })
  // 使われなくなった宛先（アプリを消した等）は削除
  await Promise.all(
    res.responses.map((r, i) => {
      const code = r.error?.code ?? ''
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token'))
        return db.doc(`pushTokens/${tokens[i]}`).delete()
      if (r.error) console.error('送信失敗:', code, r.error.message)
      return null
    }),
  )
  console.log(`送信: 成功 ${res.successCount} / 失敗 ${res.failureCount}`)
}

// ---------- 予定の通知 ----------
async function remind(name) {
  const { slot, offset, when, emoji } = SLOTS[name]
  const date = dateKey(offset)
  // 二重送信を防ぐ：送ったら notifyLog に印をつける（すでにあれば何もしない）
  const logRef = db.doc(`notifyLog/${date}_${slot}`)
  if ((await logRef.get()).exists) return console.log(`${date} ${slot}: 送信済み`)

  const avail = await db.collection('availability').where('date', '==', date).get()
  const uids = avail.docs.filter((d) => d.get('slots')?.includes(slot)).map((d) => d.get('uid'))
  console.log(`${date} ${slot}: ○は ${uids.length} 人`)
  if (!DRY) await logRef.set({ sentAt: Timestamp.now(), count: uids.length })
  if (!uids.length) return

  const [members, tokens, km] = await Promise.all([loadMembers(), tokensByUid(), teamKm()])
  for (const uid of uids) {
    if (!tokens.get(uid)) continue // 通知をオンにしていない人
    const others = uids.filter((u) => u !== uid).map((u) => members.get(u)?.name ?? '仲間')
    const withWho = others.length ? `${others.join('・')}と走る予定です！` : '今のところ一人。チャットで誰か誘ってみよう！'
    const cheer = await pickMotivation(db, km, DRY)
    await send(tokens.get(uid), {
      title: `${emoji} ${when}はランの日！`,
      body: `${dayLabel(date)} ${slot}｜${withWho}\n${cheer}`,
      url: `/?tab=calendar&date=${date}`,
      tag: `remind-${date}-${slot}`,
    })
  }
}

// GitHub が混んで決まった時刻の実行を飛ばしたときのため、送るべき時間帯なのに未送信なら送る
async function catchUpReminders() {
  const hour = jstNow().getUTCHours()
  for (const [name, { hours }] of Object.entries(SLOTS)) {
    if (hour >= hours[0] && hour <= hours[1]) await remind(name)
  }
}

// ---------- チャットの通知 ----------
const shorten = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s)

async function notifyChat() {
  const metaRef = db.doc('meta/chatNotify')
  const meta = await metaRef.get()
  const now = Timestamp.now()
  if (!meta.exists) {
    // 初回は「今」から数える（過去のメッセージをまとめて通知しない）
    if (!DRY) await metaRef.set({ lastAt: now })
    return console.log('チャット: 確認の開始時刻を記録しました')
  }
  const since = meta.get('lastAt')
  const snap = await db.collection('chat').where('createdAt', '>', since).orderBy('createdAt').get()
  console.log(`チャット: 新着 ${snap.size} 件`)
  if (snap.empty) return
  const msgs = snap.docs.map((d) => d.data())

  const [members, tokens] = await Promise.all([loadMembers(), tokensByUid()])
  for (const [uid, list] of tokens) {
    const fromOthers = msgs.filter((m) => m.uid !== uid) // 自分の発言は通知しない
    if (!fromOthers.length) continue
    const lines = fromOthers.slice(-3).map((m) => `${members.get(m.uid)?.name ?? '仲間'}：${shorten(m.text.replace(/\n/g, ' '), 50)}`)
    const more = fromOthers.length > 3 ? `\nほか${fromOthers.length - 3}件` : ''
    await send(list, {
      title: `💬 みんなのチャット${fromOthers.length > 1 ? `（${fromOthers.length}件）` : ''}`,
      body: lines.join('\n') + more,
      url: '/?tab=calendar',
      tag: 'chat', // 同じ tag なので、前のチャット通知を上書きする
    })
  }
  if (!DRY) await metaRef.set({ lastAt: msgs.at(-1).createdAt })
}

// 投稿から1週間たったチャットを削除
async function cleanupChat() {
  const old = await db.collection('chat').where('expireAt', '<', Timestamp.now()).limit(400).get()
  if (old.empty) return
  if (DRY) return console.log(`期限切れのチャット ${old.size} 件（削除予定）`)
  const batch = db.batch()
  old.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  console.log(`期限切れのチャットを ${old.size} 件削除`)
}

// ---------- 試し送信 ----------
async function test(email) {
  if (!email) throw new Error('test にはメールアドレスを指定してください')
  const members = await loadMembers()
  const uid = [...members].find(([, m]) => m.email === email)?.[0]
  if (!uid) throw new Error(`${email} のメンバーが見つかりません`)
  const tokens = (await tokensByUid()).get(uid)
  if (!tokens) throw new Error('この人は通知をオンにしていません（アプリの記録タブで「通知を受け取る」を押してください）')
  const cheer = await pickMotivation(db, await teamKm(), DRY)
  await send(tokens, { title: '🔔 ユーラシアランの通知テスト', body: `通知は正しく届いています！\n${cheer}`, url: '/?tab=calendar' })
}

// ---------- 実行 ----------
if (SLOTS[mode]) await remind(mode)
else if (mode === 'chat') {
  await notifyChat()
  await catchUpReminders()
  await cleanupChat()
} else if (mode === 'test') await test(emailArg || process.env.EMAIL)
else throw new Error(`モードの指定が正しくありません: ${mode}`)

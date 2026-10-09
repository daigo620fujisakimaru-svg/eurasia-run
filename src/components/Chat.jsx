// みんなのチャット（LINE風）：集合時間や場所を決めるためのグループチャット。投稿から1週間で消える
import { useEffect, useRef, useState } from 'react'
import { CHAT_MAX_LENGTH, sendChat } from '../lib/data.js'
import './Chat.css'

const dayKey = (d) => d.toLocaleDateString('sv-SE')
const timeLabel = (d) => d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

// 日付の区切りの文字：今日／昨日／10月9日(金)
function dayLabel(key, todayKey) {
  const yesterday = new Date(`${todayKey}T00:00`)
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === todayKey) return '今日'
  if (key === dayKey(yesterday)) return '昨日'
  return new Date(`${key}T00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

export default function Chat({ messages, members, me }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  // 「今」を1分ごとに更新（期限切れのメッセージを隠す・「今日」の判定に使う）
  const [now, setNow] = useState(() => Date.now())
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // 期限切れを除き、古い順に並べる
  const shown = messages
    .filter((m) => m.createdAt && m.expireAt?.toMillis() > now)
    .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())

  // 新しいメッセージが来たら一番下までスクロール
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [shown.length])

  const memberOf = (uid) => members.find((m) => m.id === uid) ?? { name: '？', color: '#999' }
  const todayKey = dayKey(new Date(now))

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      await sendChat(me.uid, body)
      setText('')
      if (inputRef.current) inputRef.current.style.height = ''
    } catch (err) {
      alert(`送信できませんでした: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  // 入力欄を文字の量に合わせて伸ばす（最大4行くらい）
  const onInput = (e) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'
  }
  // パソコンでは Ctrl + Enter（Mac は ⌘ + Enter）でも送信できる
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
  }

  return (
    <section className="card chat">
      <h2>
        💬 みんなのチャット <small>集合時間や場所を決めよう。メッセージは1週間で消えます</small>
      </h2>

      <div className="chat-list" ref={listRef}>
        {shown.length === 0 && <p className="chat-empty">まだメッセージはありません。最初のひとことを送ろう！</p>}
        {shown.map((m, i) => {
          const at = m.createdAt.toDate()
          const key = dayKey(at)
          const prev = shown[i - 1]
          const newDay = !prev || dayKey(prev.createdAt.toDate()) !== key
          // 同じ人が続けて送ったときは、名前と丸を省略（LINEと同じ）
          const continued = !newDay && prev.uid === m.uid
          const mine = m.uid === me.uid
          const who = memberOf(m.uid)
          return (
            <div key={m.id}>
              {newDay && <div className="chat-day"><span>{dayLabel(key, todayKey)}</span></div>}
              <div className={`chat-row ${mine ? 'mine' : 'theirs'} ${continued ? 'continued' : ''}`}>
                {!mine && (
                  <span className="chat-avatar" style={{ background: continued ? 'transparent' : who.color }}>
                    {continued ? '' : who.name.slice(0, 1)}
                  </span>
                )}
                <div className="chat-body">
                  {!mine && !continued && <span className="chat-name">{who.name}</span>}
                  <div className="chat-line">
                    <p className="chat-bubble">{m.text}</p>
                    <time className="chat-time">{timeLabel(at)}</time>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="chat-input">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="メッセージを入力"
          onChange={onInput}
          onKeyDown={onKeyDown}
        />
        <button className="chat-send" disabled={!text.trim() || sending} onClick={send} aria-label="送信">
          ➤
        </button>
      </div>
    </section>
  )
}

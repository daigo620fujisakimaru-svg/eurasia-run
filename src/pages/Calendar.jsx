// 予定タブ：行ける日に○をつけて、みんなで走れる日を見つける
import { useMemo, useState } from 'react'
import Chat from '../components/Chat.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { setAvailability } from '../lib/data.js'
import { useMember } from '../lib/members.js'
import './Calendar.css'

const SLOTS = [
  { id: '朝', icon: '🌅' },
  { id: '昼', icon: '☀️' },
  { id: '夜', icon: '🌙' },
]
const WEEK = ['日', '月', '火', '水', '木', '金', '土']

// 日付 → '2026-10-06'（日付どうしを文字のまま大小比較できる形）
const dateKey = (d) => d.toLocaleDateString('sv-SE')
const fromKey = (key) => new Date(`${key}T00:00`)
const formatDay = (key) => fromKey(key).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

export default function Calendar({ availability, members, chat }) {
  const me = useMember()
  // 「今日」は画面を開いたときに1回だけ求める（描画のたびに時計を読むと結果がぶれるため）
  const [today] = useState(() => dateKey(new Date()))
  // 通知から開いたときは、URL の ?date=2026-10-10 の日を選んだ状態で始める
  const [selected, setSelected] = useState(() => {
    const d = new URLSearchParams(location.search).get('date')
    return /^\d{4}-\d{2}-\d{2}$/.test(d ?? '') ? d : today
  })
  const [month, setMonth] = useState(() => {
    const d = fromKey(selected)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // 日付ごとに「時間帯 → 行ける人のID一覧」にまとめる
  const byDate = useMemo(() => {
    const map = {}
    for (const a of availability) {
      map[a.date] ??= { 朝: [], 昼: [], 夜: [] }
      for (const slot of a.slots) map[a.date][slot]?.push(a.uid)
    }
    return map
  }, [availability])

  // その日に時間帯が合う人がいるか。'all' 全員そろう / 'some' 2人以上そろう
  const matchOf = (key) => {
    const day = byDate[key]
    if (!day) return null
    const all = SLOTS.filter((s) => members.length >= 2 && day[s.id].length === members.length)
    if (all.length) return { level: 'all', slots: all }
    const some = SLOTS.filter((s) => day[s.id].length >= 2)
    if (some.length) return { level: 'some', slots: some }
    return null
  }

  const nextAllDay = Object.keys(byDate)
    .filter((key) => key >= today && matchOf(key)?.level === 'all')
    .sort()[0]

  // カレンダーのマス：月の初日の曜日ぶん空白を入れてから 1日〜末日
  const year = month.getFullYear()
  const m = month.getMonth()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const cells = [
    ...Array(month.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(year, m, i + 1))),
  ]
  const moveMonth = (diff) => setMonth(new Date(year, m + diff, 1))

  return (
    <div className="page">
      <PageHeader title="📅 予定" />

      <section className={`card next-run ${nextAllDay ? 'found' : ''}`}>
        {nextAllDay ? (
          <>
            次に全員で走れる日
            <b>
              {formatDay(nextAllDay)}{' '}
              {matchOf(nextAllDay).slots.map((s) => `${s.icon}${s.id}`).join(' ')}
            </b>
          </>
        ) : (
          <span className="muted">全員がそろう日はまだありません。行ける日に○をつけよう！</span>
        )}
      </section>

      <div className="month-nav">
        <button onClick={() => moveMonth(-1)} aria-label="前の月">‹</button>
        <b>
          {year}年{m + 1}月
        </b>
        <button onClick={() => moveMonth(1)} aria-label="次の月">›</button>
      </div>

      <div className="calendar">
        {WEEK.map((w) => (
          <div key={w} className="weekday">
            {w}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`blank-${i}`} />
          const day = byDate[key]
          const uids = day ? [...new Set(SLOTS.flatMap((s) => day[s.id]))] : []
          const match = matchOf(key)
          const classes = ['day', match?.level, key === selected && 'selected', key === today && 'today', key < today && 'past']
          return (
            <button key={key} className={classes.filter(Boolean).join(' ')} onClick={() => setSelected(key)}>
              <span className="num">{fromKey(key).getDate()}</span>
              <span className="dots">
                {uids.map((uid) => (
                  <span key={uid} className="dot" style={{ background: members.find((mb) => mb.id === uid)?.color }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <p className="legend muted">
        <span className="swatch all" /> 全員そろう <span className="swatch some" /> 2人以上そろう
      </p>

      <DayDetail
        dateKey={selected}
        day={byDate[selected]}
        members={members}
        me={me}
        isPast={selected < today}
      />

      <Chat messages={chat} members={members} me={me} />
    </div>
  )
}

// 選んだ日の詳細：自分の○の付け外しと、時間帯ごとの参加者
function DayDetail({ dateKey: key, day, members, me, isPast }) {
  const mySlots = SLOTS.filter((s) => day?.[s.id].includes(me.uid)).map((s) => s.id)

  const toggle = (slot) => {
    const next = SLOTS.map((s) => s.id).filter((id) => (id === slot ? !mySlots.includes(id) : mySlots.includes(id)))
    setAvailability(key, me.uid, next).catch((err) => alert(`保存できませんでした: ${err.message}`))
  }

  return (
    <section className="card">
      <h2>{formatDay(key)}</h2>
      {isPast ? (
        <p className="hint">過ぎた日は変更できません。</p>
      ) : (
        <>
          <p className="hint">あなたが走れる時間帯をタップ</p>
          <div className="slot-buttons">
            {SLOTS.map((s) => (
              <button key={s.id} className={mySlots.includes(s.id) ? 'on' : ''} onClick={() => toggle(s.id)}>
                {s.icon} {s.id}
                <span>{mySlots.includes(s.id) ? '○' : '−'}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {SLOTS.map((s) => {
        const people = members.filter((mb) => day?.[s.id].includes(mb.id))
        return (
          <div key={s.id} className="slot-row">
            <span className="slot-label">
              {s.icon} {s.id}
            </span>
            {people.length === 0 ? (
              <span className="muted">−</span>
            ) : (
              people.map((p) => (
                <span key={p.id} className="person">
                  <span className="dot" style={{ background: p.color }} /> {p.name}
                </span>
              ))
            )}
            {members.length >= 2 && people.length === members.length && <b className="all-tag">全員OK！</b>}
          </div>
        )
      })}
    </section>
  )
}

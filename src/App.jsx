import { useEffect, useState } from 'react'
import { useCollection } from './lib/data.js'
import { useMember } from './lib/members.js'
import { refreshPush } from './lib/push.js'
import Calendar from './pages/Calendar.jsx'
import Journey from './pages/Journey.jsx'
import Runs from './pages/Runs.jsx'
import './App.css'

// テスト用スライダーは、開発中(npm run dev)に URL の最後へ ?test を付けたときだけ出す
// 例: http://localhost:5173/?test
const canPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('test')

const TABS = [
  { id: 'journey', icon: '🌏', label: '旅' },
  { id: 'runs', icon: '🏃', label: '記録' },
  { id: 'calendar', icon: '📅', label: '予定' },
]

// チャットを最後に見た時刻を、この端末に覚えておく（未読の数を数えるため）
const LAST_READ_KEY = 'eurasia-run.chatLastRead'
function loadLastRead() {
  try {
    return Number(localStorage.getItem(LAST_READ_KEY)) || 0
  } catch {
    return 0
  }
}
// 「今」を既読の時刻として保存し、その時刻を返す（タブを押したときに呼ぶ）
function saveLastReadNow() {
  const t = Date.now()
  try {
    localStorage.setItem(LAST_READ_KEY, String(t))
  } catch {
    // 保存できなくても、未読の数が正しく出ないだけなので無視
  }
  return t
}

// 通知をタップして開いたときは、URL の ?tab=calendar で指定されたタブから始める
function initialTab() {
  const t = new URLSearchParams(location.search).get('tab')
  return TABS.some((x) => x.id === t) ? t : 'journey'
}

function App() {
  const me = useMember()
  const [tab, setTab] = useState(initialTab)
  const chat = useCollection('chat', 'createdAt')
  const [lastRead, setLastRead] = useState(loadLastRead)

  // 通知をオンにしている端末なら、開くたびに宛先を最新にする
  useEffect(() => {
    refreshPush(me.uid)
  }, [me.uid])

  // 予定タブ（チャットがある）を開いたとき・離れたときに既読にする
  const changeTab = (id) => {
    if (id === 'calendar' || tab === 'calendar') setLastRead(saveLastReadNow())
    setTab(id)
  }
  // みんなのデータを見張る（誰かが記録すると全員の画面が自動で更新される）
  const runs = useCollection('runs', 'start')
  const courses = useCollection('courses', 'createdAt')
  const members = useCollection('members')
  const availability = useCollection('availability')
  // テスト用スライダーの値（null なら本物のチーム累計を表示）
  const [previewKm, setPreviewKm] = useState(null)

  if (!runs || !courses || !members || !availability || !chat) return <p className="loading">データを読み込み中…</p>

  const teamKm = runs.reduce((sum, r) => sum + r.distanceKm, 0)
  // 未読：最後に見た時刻より新しい、他の人の発言（予定タブを開いている間は 0）
  const unread =
    tab === 'calendar' ? 0 : chat.filter((m) => m.uid !== me.uid && m.createdAt?.toMillis() > lastRead).length

  return (
    <div className="app">
      <main>
        {tab === 'journey' && (
          <Journey
            km={previewKm ?? teamKm}
            runs={runs}
            members={members}
            isPreview={previewKm !== null}
            onPreviewChange={canPreview ? setPreviewKm : undefined}
          />
        )}
        {/* GPS記録中にタブを切り替えても記録が消えないよう、記録タブは隠すだけにする */}
        <div className="tab-panel" hidden={tab !== 'runs'}>
          <Runs runs={runs} courses={courses} members={members} />
        </div>
        {tab === 'calendar' && <Calendar availability={availability} members={members} chat={chat} />}
      </main>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => changeTab(t.id)}>
            <span>{t.icon}</span>
            {t.label}
            {t.id === 'calendar' && unread > 0 && <b className="badge">{unread > 99 ? '99+' : unread}</b>}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App

// 記録タブ：記録の一覧と、各記録方法への入口
import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase.js'
import PageHeader from '../components/PageHeader.jsx'
import PushToggle from '../components/PushToggle.jsx'
import { deleteCourse, deleteRun } from '../lib/data.js'
import { formatDuration, formatKm, formatPace } from '../lib/geo.js'
import { useMember } from '../lib/members.js'
import CourseEditor from './CourseEditor.jsx'
import ManualEntry from './ManualEntry.jsx'
import RunRecorder from './RunRecorder.jsx'
import './Runs.css'

export default function Runs({ runs, courses, members }) {
  const me = useMember()
  const [mode, setMode] = useState('list') // list | gps | manual | course
  const [showAll, setShowAll] = useState(false)
  const back = () => setMode('list')

  if (mode === 'gps') return <RunRecorder onDone={back} />
  if (mode === 'manual') return <ManualEntry courses={courses} onDone={back} onCreateCourse={() => setMode('course')} />
  if (mode === 'course') return <CourseEditor onDone={back} />

  const memberOf = (uid) => members.find((m) => m.id === uid) ?? { name: '？', color: '#999' }
  const myRuns = runs.filter((r) => r.uid === me.uid)
  const myKm = myRuns.reduce((sum, r) => sum + r.distanceKm, 0)
  const shown = showAll ? runs : myRuns

  return (
    <div className="page">
      <PageHeader title="🏃 記録" />

      <section className="card summary">
        <span className="dot" style={{ background: me.color }} />
        <div>
          <b>{me.name}</b> の累計
          <div className="big">{formatKm(myKm)} km</div>
          <span className="muted">{myRuns.length} 回のランニング</span>
        </div>
      </section>

      <div className="actions">
        <button className="primary" onClick={() => setMode('gps')}>▶ GPSで記録</button>
        <button className="secondary" onClick={() => setMode('manual')}>✍ 手入力で記録</button>
        <button className="secondary" onClick={() => setMode('course')}>🗺 コースを作る</button>
      </div>

      <div className="toggle">
        <button className={showAll ? '' : 'active'} onClick={() => setShowAll(false)}>自分</button>
        <button className={showAll ? 'active' : ''} onClick={() => setShowAll(true)}>みんな</button>
      </div>

      {shown.length === 0 && <p className="muted center">まだ記録がありません。最初の一歩を踏み出そう！</p>}
      <ul className="run-list">
        {shown.map((r) => (
          <RunItem key={r.id} run={r} member={memberOf(r.uid)} mine={r.uid === me.uid} />
        ))}
      </ul>

      <h2 className="section-title">保存したコース</h2>
      {courses.length === 0 && <p className="muted">まだありません。</p>}
      <ul className="course-list">
        {courses.map((c) => (
          <li key={c.id}>
            <span className="dot" style={{ background: memberOf(c.createdBy).color }} />
            {c.name}
            <span className="muted">{formatKm(c.distanceKm)} km</span>
            {c.createdBy === me.uid && (
              <button
                className="link"
                onClick={() => confirm(`コース「${c.name}」を削除しますか？`) && deleteCourse(c.id)}
              >
                削除
              </button>
            )}
          </li>
        ))}
      </ul>

      <PushToggle />

      <p className="logout">
        <button className="link" onClick={() => signOut(auth)}>ログアウト</button>
      </p>
    </div>
  )
}

function RunItem({ run, member, mine }) {
  const start = run.start.toDate()
  const ms = run.end.toDate() - start
  const day = start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })
  const time = (d) => d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

  return (
    <li className="card run">
      <div className="run-head">
        <span className="dot" style={{ background: member.color }} />
        <b>{member.name}</b>
        <span className="muted">
          {day} {time(start)}〜{time(run.end.toDate())}
        </span>
      </div>
      <div className="run-body">
        <span className="big">{formatKm(run.distanceKm)} km</span>
        <span>{formatDuration(ms)}</span>
        <span>{run.avgSpeedKmh.toFixed(1)} km/h</span>
        <span>{formatPace(run.distanceKm, ms)}</span>
      </div>
      <div className="run-foot muted">
        {run.method === 'gps' ? '📡 GPS' : '✍ 手入力'}
        {run.courseName && `・${run.courseName}`}
        {run.laps > 1 && ` ×${run.laps}周`}
        {mine && (
          <button className="link" onClick={() => confirm('この記録を削除しますか？') && deleteRun(run.id)}>
            削除
          </button>
        )}
      </div>
    </li>
  )
}

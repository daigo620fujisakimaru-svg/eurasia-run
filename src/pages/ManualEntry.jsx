// 手入力で記録：スマホを持たずに走った日、保存コースと時刻から記録する
import { useState } from 'react'
import MiniMap from '../components/MiniMap.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Stat from '../components/Stat.jsx'
import { addRun } from '../lib/data.js'
import { formatDuration, formatKm, formatPace, speedKmh } from '../lib/geo.js'
import { useMember } from '../lib/members.js'

// 'sv-SE'（スウェーデン）の書式は「2026-10-06 07:30」の形なので、入力欄の初期値に使いやすい
const nowParts = (offsetMin = 0) => new Date(Date.now() + offsetMin * 60_000).toLocaleString('sv-SE').split(' ')
const hhmm = (time) => time.slice(0, 5)

export default function ManualEntry({ courses, onDone, onCreateCourse }) {
  const member = useMember()
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [date, setDate] = useState(nowParts(-30)[0])
  const [startTime, setStartTime] = useState(hhmm(nowParts(-30)[1]))
  const [endTime, setEndTime] = useState(hhmm(nowParts()[1]))
  const [laps, setLaps] = useState(1)
  const [saving, setSaving] = useState(false)

  if (courses.length === 0) {
    return (
      <div className="page">
        <PageHeader title="✍ 手入力で記録" onBack={onDone} />
        <p className="hint">まだコースがありません。先に走ったコースを作りましょう。</p>
        <button className="primary wide" onClick={onCreateCourse}>🗺 コースを作る</button>
      </div>
    )
  }

  const course = courses.find((c) => c.id === courseId)
  const start = new Date(`${date}T${startTime}`)
  const end = new Date(`${date}T${endTime}`)
  const ms = end - start
  const km = course ? course.distanceKm * laps : 0
  const valid = course && ms > 0 && laps >= 1

  const save = async () => {
    setSaving(true)
    try {
      await addRun({
        uid: member.uid,
        start,
        end,
        distanceKm: km,
        avgSpeedKmh: speedKmh(km, ms),
        courseId: course.id,
        courseName: course.name,
        laps,
        method: 'manual',
      })
      onDone()
    } catch (err) {
      alert(`保存できませんでした: ${err.message}`)
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader title="✍ 手入力で記録" onBack={onDone} />

      <label className="field">
        コース
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}（{formatKm(c.distanceKm)} km）
            </option>
          ))}
        </select>
      </label>
      {course && <MiniMap points={course.points} height={200} />}

      <label className="field">
        日付
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="row">
        <label className="field">
          開始
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="field">
          終了
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <label className="field">
          周回
          <input type="number" min="1" value={laps} onChange={(e) => setLaps(Math.max(1, Number(e.target.value)))} />
        </label>
      </div>

      {ms <= 0 ? (
        <p className="error">終了時刻は開始時刻より後にしてください。</p>
      ) : (
        <div className="stats">
          <Stat label="距離" value={`${formatKm(km)} km`} />
          <Stat label="時間" value={formatDuration(ms)} />
          <Stat label="平均速度" value={`${speedKmh(km, ms).toFixed(1)} km/h`} />
          <Stat label="ペース" value={formatPace(km, ms)} />
        </div>
      )}

      <button className="primary wide" disabled={!valid || saving} onClick={save}>
        {saving ? '保存中…' : '記録する'}
      </button>
    </div>
  )
}

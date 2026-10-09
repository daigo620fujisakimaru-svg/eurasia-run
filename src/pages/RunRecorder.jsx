// GPSで記録：スマホを持って走り、位置の変化から距離を測る
import { useEffect, useRef, useState } from 'react'
import MiniMap from '../components/MiniMap.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Stat from '../components/Stat.jsx'
import { addCourse, addRun } from '../lib/data.js'
import { distanceKm, formatDuration, formatKm, formatPace, speedKmh } from '../lib/geo.js'
import { useMember } from '../lib/members.js'

const MAX_ACCURACY_M = 30 // これより誤差が大きい位置は捨てる
const MIN_STEP_KM = 0.005 // 5m未満の動きは「止まっている」とみなす（GPSのふらつき対策）
const MAX_SPEED_KMH = 30 // 人が走れない速さの移動は「GPSの飛び」とみなす

export default function RunRecorder({ onDone }) {
  const member = useMember()
  const [status, setStatus] = useState('idle') // idle → recording → finished
  const [points, setPoints] = useState([])
  const [km, setKm] = useState(0)
  const [startAt, setStartAt] = useState(null)
  const [endAt, setEndAt] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [accuracy, setAccuracy] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const [courseName, setCourseName] = useState('')
  const [saving, setSaving] = useState(false)
  const lastPoint = useRef(null)

  // GPSは安全な接続(https か localhost)でしか使えない
  const supported = window.isSecureContext && 'geolocation' in navigator

  // 1秒ごとに経過時間を更新
  useEffect(() => {
    if (status !== 'recording') return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [status])

  // 記録中は画面を消さない（Wake Lock）。画面が消えるとGPSも止まってしまうため
  useEffect(() => {
    if (status !== 'recording' || !navigator.wakeLock) return
    let lock = null
    let active = true
    const request = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => (active ? (lock = l) : l.release())) // 終了後に許可が届いたらすぐ手放す
        .catch(() => {})
    // 別のアプリから戻ってきたら、もう一度お願いする
    const onVisible = () => document.visibilityState === 'visible' && request()
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [status])

  // 位置を見張り続け、動いた分だけ距離を足していく
  useEffect(() => {
    if (status !== 'recording') return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords
        setAccuracy(Math.round(acc))
        setGpsError(null)
        if (acc > MAX_ACCURACY_M) return

        const point = { lat, lng, t: pos.timestamp }
        const prev = lastPoint.current
        if (prev) {
          const step = distanceKm(prev, point)
          if (step < MIN_STEP_KM) return
          if (speedKmh(step, point.t - prev.t) > MAX_SPEED_KMH) return
          setKm((total) => total + step)
        }
        lastPoint.current = point
        setPoints((list) => [...list, { lat, lng }])
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [status])

  const start = () => {
    lastPoint.current = null
    setStartAt(Date.now())
    setNow(Date.now())
    setStatus('recording')
  }

  const finish = () => {
    if (!confirm('ランニングを終了しますか？')) return
    setEndAt(Date.now())
    setStatus('finished')
  }

  const discard = () => {
    if (confirm('この記録を保存せずに捨てますか？')) onDone()
  }

  const back = () => {
    if (status === 'idle' || confirm('記録中のデータは消えます。戻りますか？')) onDone()
  }

  const save = async () => {
    setSaving(true)
    try {
      const ms = endAt - startAt
      let courseId = null
      if (courseName.trim() && points.length >= 2) {
        const ref = await addCourse({ name: courseName.trim(), points, distanceKm: km, createdBy: member.uid })
        courseId = ref.id
      }
      await addRun({
        uid: member.uid,
        start: new Date(startAt),
        end: new Date(endAt),
        distanceKm: km,
        avgSpeedKmh: speedKmh(km, ms),
        courseId,
        courseName: courseName.trim() || null,
        points,
        method: 'gps',
      })
      onDone()
    } catch (err) {
      alert(`保存できませんでした: ${err.message}`)
      setSaving(false)
    }
  }

  if (!supported) {
    return (
      <div className="page">
        <PageHeader title="▶ GPSで記録" onBack={onDone} />
        <p className="error">この接続ではGPSが使えません。</p>
        <p className="hint">
          GPSは安全な接続（https）でしか動きません。アプリを公開（ステップ6）したあとに使えるようになります。
        </p>
      </div>
    )
  }

  const ms = (status === 'finished' ? endAt : now) - (startAt ?? now)

  return (
    <div className="page">
      <PageHeader title="▶ GPSで記録" onBack={back} />

      <div className="stats">
        <Stat label="距離" value={`${formatKm(km)} km`} />
        <Stat label="時間" value={formatDuration(ms)} />
        <Stat label="平均速度" value={`${speedKmh(km, ms).toFixed(1)} km/h`} />
        <Stat label="ペース" value={formatPace(km, ms)} />
      </div>

      <MiniMap points={points} mode={status === 'finished' ? 'fit' : 'follow'} height={300} />

      {status === 'recording' && (
        <p className="hint">
          {gpsError ? `⚠ ${gpsError}` : accuracy ? `GPS精度 ±${accuracy}m` : 'GPSを探しています…'}
          <br />
          記録中は画面を消さないでください（画面が消えるとGPSが止まります）。
        </p>
      )}

      {status === 'idle' && (
        <button className="primary wide huge" onClick={start}>
          ▶ スタート
        </button>
      )}
      {status === 'recording' && (
        <button className="danger wide huge" onClick={finish}>
          ■ 終了
        </button>
      )}
      {status === 'finished' && (
        <>
          <label className="field">
            このコースを保存する（任意）
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="コース名を入れると、次から手入力で選べます"
            />
          </label>
          <button className="primary wide" disabled={saving} onClick={save}>
            {saving ? '保存中…' : '記録を保存'}
          </button>
          <button className="secondary wide" disabled={saving} onClick={discard}>
            保存せずに捨てる
          </button>
        </>
      )}
    </div>
  )
}

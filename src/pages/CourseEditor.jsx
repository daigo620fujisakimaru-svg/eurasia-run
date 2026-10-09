// コースを作る：地図をタップして点を打ち、線でつないで保存する
import { useEffect, useState } from 'react'
import MiniMap from '../components/MiniMap.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { addCourse } from '../lib/data.js'
import { formatKm, pathKm } from '../lib/geo.js'
import { useMember } from '../lib/members.js'

export default function CourseEditor({ onDone }) {
  const member = useMember()
  const [points, setPoints] = useState([])
  const [center, setCenter] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  // 最初に一度だけ、地図を現在地に合わせる（取れなければ姫路のまま）
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    )
  }, [])

  const km = pathKm(points)
  const canSave = points.length >= 2 && name.trim() !== '' && !saving

  const save = async () => {
    setSaving(true)
    try {
      await addCourse({ name: name.trim(), points, distanceKm: km, createdBy: member.uid })
      onDone()
    } catch (err) {
      alert(`保存できませんでした: ${err.message}`)
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader title="🗺 コースを作る" onBack={onDone} />
      <p className="hint">走る道に沿って地図をタップしていきます。曲がり角ごとに点を打つと正確になります。</p>
      <MiniMap points={points} center={center} mode="free" onTap={(p) => setPoints([...points, p])} height={360} />

      <div className="row">
        <span className="big">{formatKm(km)} km</span>
        <button className="secondary small" disabled={!points.length} onClick={() => setPoints(points.slice(0, -1))}>
          1つ戻す
        </button>
        <button className="secondary small" disabled={!points.length} onClick={() => setPoints([])}>
          全部消す
        </button>
      </div>

      <label className="field">
        コース名
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：川沿い一周" />
      </label>
      <button className="primary wide" disabled={!canSave} onClick={save}>
        {saving ? '保存中…' : 'コースを保存'}
      </button>
    </div>
  )
}

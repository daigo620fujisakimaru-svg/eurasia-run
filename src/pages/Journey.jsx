import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { loadJourney, getProgress } from '../lib/journey.js'
import { fetchNearby, fetchSummary } from '../lib/wikipedia.js'
import './Journey.css'

const fmt = (n) => n.toLocaleString('ja-JP', { maximumFractionDigits: 1 })

// 走る人のアイコン（絵文字は左向き＝西へ向かう旅にぴったり）
const runnerIcon = L.divIcon({ html: '🏃', className: 'runner-icon', iconSize: [32, 32], iconAnchor: [16, 28] })

// 現在地が動いたら地図もついていく
function FollowPosition({ position }) {
  const map = useMap()
  useEffect(() => {
    map.panTo(position, { animate: false })
  }, [map, position])
  return null
}

// ルートは一度読み込んだら使い回す（タブを切り替えるたびに読み込まない）
let journeyPromise = null

export default function Journey(props) {
  const [journey, setJourney] = useState(null)

  useEffect(() => {
    journeyPromise ??= loadJourney()
    journeyPromise.then(setJourney)
  }, [])

  if (!journey) return <p className="loading">ルートを読み込み中…</p>
  return <JourneyView journey={journey} {...props} />
}

function JourneyView({ journey, km, runs, members, isPreview, onPreviewChange }) {
  const p = getProgress(journey, km)
  const routeLine = useMemo(() => journey.route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), [journey])

  return (
    <div className="journey">
      <MapContainer className="journey-map" center={p.position} zoom={7} zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Polyline positions={routeLine} pathOptions={{ color: '#9ca3af', weight: 4, dashArray: '6 8' }} />
        <Polyline positions={p.traveled} pathOptions={{ color: '#f97316', weight: 5 }} />
        {journey.checkpoints.map((cp, i) => (
          <CircleMarker
            key={cp.id}
            center={[cp.lat, cp.lng]}
            radius={5}
            pathOptions={{ color: '#f97316', fillColor: i <= p.passedIndex ? '#f97316' : '#fff', fillOpacity: 1 }}
          />
        ))}
        <Marker position={p.position} icon={runnerIcon} />
        <FollowPosition position={p.position} />
      </MapContainer>

      <div className="journey-panel">
        <ArrivalToast checkpoints={journey.checkpoints} passedIndex={p.passedIndex} remember={!isPreview} />

        <section className="card">
          <div className="total">
            <span className="total-km">{fmt(p.distance)}</span> km
            <span className="total-of"> / {fmt(p.totalKm)} km</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${p.percent}%` }} />
          </div>
          <p className="percent">{p.percent.toFixed(1)}% 達成</p>

          {p.finished ? (
            <p className="next">🏁 ユーラシア大陸横断、達成！</p>
          ) : (
            <p className="next">
              {p.passed.flag} {p.passed.name} → {p.next.flag} <b>{p.next.name}</b>まで あと <b>{fmt(p.kmToNext)} km</b>
            </p>
          )}

          {onPreviewChange && (
            <label className="test-slider">
              開発用：累計kmを動かして見る（保存されません）
              <input
                type="range"
                min="0"
                max={Math.ceil(p.totalKm)}
                value={km}
                onChange={(e) => onPreviewChange(Number(e.target.value))}
              />
              {isPreview && (
                <button className="link" onClick={() => onPreviewChange(null)}>
                  本当の累計に戻す
                </button>
              )}
            </label>
          )}
        </section>

        <Contributions runs={runs} members={members} />
        <CityCard city={p.nearest} />
        <Scenery position={p.position} city={p.nearest} />
      </div>
    </div>
  )
}

// 前回アプリを開いたときに通過済みだった地点を、このスマホに覚えておく
const SEEN_KEY = 'eurasia-run.seenIndex'
function loadSeenIndex(max) {
  try {
    const saved = localStorage.getItem(SEEN_KEY)
    const index = Number(saved)
    return saved !== null && Number.isInteger(index) && index <= max ? index : null
  } catch {
    return null // プライベートブラウズなどで保存領域が使えない場合
  }
}
function saveSeenIndex(index) {
  try {
    localStorage.setItem(SEEN_KEY, String(index))
  } catch {
    // 保存できなくてもお祝いが出ないだけなので無視
  }
}

// 街に着いた瞬間、国が変わった瞬間にお祝いを出す。
// remember=true のときは、前回開いてから新しく着いた街もアプリを開いたときにお祝いする。
function ArrivalToast({ checkpoints, passedIndex, remember }) {
  const [message, setMessage] = useState(null)
  const [before, setBefore] = useState(() => (remember ? loadSeenIndex(checkpoints.length - 1) : null) ?? passedIndex)

  // 通過した地点が変わったら、描画中にその場で判定する（React推奨の書き方）
  if (passedIndex !== before) {
    const passed = checkpoints[passedIndex]
    setBefore(passedIndex)
    if (passedIndex < before) setMessage(null) // 逆戻り（記録の削除やテスト用スライダー）では出さない
    else if (passed.country !== checkpoints[before].country) setMessage(`${passed.flag} ${passed.country}に入国！`)
    else setMessage(`🎉 ${passed.name}に到着！`)
  }

  useEffect(() => {
    if (remember) saveSeenIndex(passedIndex)
  }, [remember, passedIndex])

  // 表示から3秒たったら消す
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [message])

  return message && <div className="toast">{message}</div>
}

// みんなの貢献：メンバーごとの累計km（多い順）
const MEDALS = ['🥇', '🥈', '🥉']

function Contributions({ runs, members }) {
  const rows = members
    .map((m) => ({ ...m, km: runs.filter((r) => r.uid === m.id).reduce((sum, r) => sum + r.distanceKm, 0) }))
    .sort((a, b) => b.km - a.km)
  // 順位：同じ距離なら同じ順位（例：1位, 2位, 2位, 4位）
  rows.forEach((m, i) => (m.rank = i > 0 && m.km === rows[i - 1].km ? rows[i - 1].rank : i + 1))
  const maxKm = Math.max(...rows.map((r) => r.km), 1)

  return (
    <section className="card">
      <h2>👟 みんなの貢献</h2>
      {rows.map((m) => (
        <div key={m.id} className="contrib">
          <span className={`contrib-rank ${m.rank <= 3 ? 'medal' : ''}`}>{MEDALS[m.rank - 1] ?? `${m.rank}位`}</span>
          <span className="contrib-name">
            <span className="dot" style={{ background: m.color }} /> {m.name}
          </span>
          <div className="contrib-bar">
            <div style={{ width: `${(m.km / maxKm) * 100}%`, background: m.color }} />
          </div>
          <b>{fmt(m.km)} km</b>
        </div>
      ))}
    </section>
  )
}

function CityCard({ city }) {
  return (
    <section className="card">
      <h2>
        {city.flag} {city.name} <small>{city.country}・スタートから {fmt(city.km)} km</small>
      </h2>
      <h3>📜 歴史</h3>
      <p>{city.history}</p>
      <h3>🌤 気候</h3>
      <p>{city.climate}</p>
      <h3>📍 観光地</h3>
      <ul>
        {city.sights.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </section>
  )
}

// 「ここから見える景色」：現在地の周りのWikipedia記事の写真
const sceneryCache = new Map()

function Scenery({ position, city }) {
  // 小数2桁（約1km）に丸めて、少し動いただけでは取り直さない
  const key = position.map((n) => n.toFixed(2)).join(',')
  // 取得済みならキャッシュから表示。null は「取得中」
  const views = sceneryCache.get(key) ?? null
  // 取得が終わったことを React に知らせて再描画させるための状態
  const [, setLoadedKey] = useState(null)

  useEffect(() => {
    if (sceneryCache.has(key)) return
    // スライダー操作中に何度も通信しないよう、止まってから0.6秒後に取得
    const timer = setTimeout(async () => {
      const [lat, lng] = key.split(',').map(Number)
      let result = await fetchNearby(lat, lng).catch(() => [])
      if (result.length === 0) {
        const summary = await fetchSummary(city.wiki).catch(() => null)
        result = summary?.image ? [{ ...summary, fallback: true }] : []
      }
      sceneryCache.set(key, result)
      setLoadedKey(key)
    }, 600)
    return () => clearTimeout(timer)
  }, [key, city.wiki])

  return (
    <section className="card">
      <h2>🏞 ここから見える景色</h2>
      {views === null && <p className="muted">景色を探しています…</p>}
      {views?.length === 0 && <p className="muted">見渡すかぎり、何もない大地が続いています。</p>}
      {views?.[0]?.fallback && <p className="muted">周りには何もありません。近くの街の景色です。</p>}
      <div className="views">
        {views?.slice(0, 4).map((v) => (
          <a key={v.title} className="view" href={v.url} target="_blank" rel="noreferrer">
            <img src={v.image} alt={v.title} loading="lazy" />
            <b>{v.title}</b>
            <span>{v.extract}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

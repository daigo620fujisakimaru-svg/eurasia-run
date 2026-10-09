// 記録・コース用の小さな地図
import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const HIMEJI = { lat: 34.8394, lng: 134.6939 } // 現在地が分からないときに表示する場所
const toLatLng = (p) => [p.lat, p.lng]

// mode: 'fit' 線全体が収まるように表示 / 'follow' 最後の点を追いかける / 'free' 自由に動かせる
export default function MiniMap({ points = [], center, mode = 'fit', onTap, height = 260 }) {
  const first = points[0]
  const last = points.at(-1)

  return (
    <MapContainer className="mini-map" style={{ height }} center={toLatLng(center ?? first ?? HIMEJI)} zoom={16}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      {points.length > 1 && <Polyline positions={points.map(toLatLng)} pathOptions={{ color: '#f97316', weight: 5 }} />}
      {first && <Dot point={first} color="#22c55e" />}
      {points.length > 1 && <Dot point={last} color="#ef4444" />}
      {onTap && <TapHandler onTap={onTap} />}
      <ViewController points={points} center={center} mode={mode} />
    </MapContainer>
  )
}

// スタートは緑、最後の点は赤
function Dot({ point, color }) {
  return (
    <CircleMarker
      center={toLatLng(point)}
      radius={7}
      pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}
    />
  )
}

function TapHandler({ onTap }) {
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function ViewController({ points, center, mode }) {
  const map = useMap()
  const last = points.at(-1)

  // 地図の枠の大きさが変わったら描き直す（タブ切り替えで隠れていたときの対策）
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  useEffect(() => {
    if (mode === 'fit' && points.length > 1) map.fitBounds(points.map(toLatLng), { padding: [24, 24] })
  }, [map, mode, points])

  useEffect(() => {
    if (mode === 'follow' && last) map.panTo(toLatLng(last))
  }, [map, mode, last])

  useEffect(() => {
    if (center) map.setView(toLatLng(center))
  }, [map, center])

  return null
}

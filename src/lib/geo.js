// 距離・速さ・時間の計算と表示
const EARTH_RADIUS_KM = 6371
const rad = (deg) => (deg * Math.PI) / 180

// 2地点間の距離(km)。地球を球として計算する「ハバーサイン公式」
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

// 点を順番につないだ線の長さ(km)
export function pathKm(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distanceKm(points[i - 1], points[i])
  return total
}

// 平均速度(km/h) = 距離 ÷ 時間
export const speedKmh = (km, ms) => (ms > 0 ? km / (ms / 3_600_000) : 0)

// 1kmあたり何分何秒か（ランナーがよく使う「ペース」）
export function formatPace(km, ms) {
  if (!km) return '-'
  const secPerKm = Math.round(ms / 1000 / km)
  return `${Math.floor(secPerKm / 60)}'${String(secPerKm % 60).padStart(2, '0')}"/km`
}

// ミリ秒 → 「1:02:03」「12:34」
export function formatDuration(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(sec / 3600)
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(h ? 2 : 1, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const formatKm = (km) => km.toLocaleString('ja-JP', { maximumFractionDigits: 2 })

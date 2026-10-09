// 累計距離から「旅のどこにいるか」を計算する
import { along, lineSliceAlong } from '@turf/turf'

// ルートの線と都市データを読み込む（public/data/ に置いたファイル）
export async function loadJourney() {
  const [route, checkpoints] = await Promise.all([
    fetch('/data/route.geojson').then((res) => res.json()),
    fetch('/data/checkpoints.json').then((res) => res.json()),
  ])
  const { totalKm, checkpointKm } = route.properties
  checkpoints.forEach((cp, i) => (cp.km = checkpointKm[i]))
  return { route, checkpoints, totalKm }
}

// Turf は [経度, 緯度]、Leaflet は [緯度, 経度] の順なので入れ替える
const toLatLng = ([lng, lat]) => [lat, lng]

export function getProgress(journey, km) {
  const { route, checkpoints, totalKm } = journey
  const distance = Math.min(Math.max(km, 0), totalKm)
  const options = { units: 'kilometers' }

  const position = toLatLng(along(route, distance, options).geometry.coordinates)
  const traveled =
    distance > 0 ? lineSliceAlong(route, 0, distance, options).geometry.coordinates.map(toLatLng) : []

  // 最後に通過した地点の番号（km が地点以上なら通過済み）
  const passedIndex = checkpoints.findLastIndex((cp) => cp.km <= distance)
  const passed = checkpoints[passedIndex]
  const next = checkpoints[passedIndex + 1] ?? null

  // 情報を表示するのは、前後の地点のうち近いほう
  const nearest = next && next.km - distance < distance - passed.km ? next : passed

  return {
    distance,
    totalKm,
    percent: (distance / totalKm) * 100,
    position,
    traveled,
    passedIndex,
    passed,
    next,
    kmToNext: next ? next.km - distance : 0,
    nearest,
    finished: distance >= totalKm,
  }
}

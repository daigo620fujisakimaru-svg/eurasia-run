// 横断ルートの線（route.geojson）を作るスクリプト
// 実行: node scripts/build-route.mjs
//
// 隣り合う地点どうしの「道路ルート」を公開の経路検索サーバー(OSRM)に問い合わせ、
// 1本の線につなげて保存する。フェリー区間や取得に失敗した区間は直線でつなぐ。
import { readFile, writeFile } from 'node:fs/promises'
import { lineString, simplify, length } from '@turf/turf'

const CHECKPOINTS = new URL('../public/data/checkpoints.json', import.meta.url)
const OUTPUT = new URL('../public/data/route.geojson', import.meta.url)
const OSRM = 'https://router.project-osrm.org/route/v1/driving'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 2地点間の道路ルートを [[lng, lat], ...] で返す
async function fetchRoad(a, b) {
  const url = `${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`
  const res = await fetch(url, { headers: { 'User-Agent': 'eurasia-run (personal learning project)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(data.code)
  return data.routes[0].geometry.coordinates
}

const checkpoints = JSON.parse(await readFile(CHECKPOINTS, 'utf8'))
const coords = []
const checkpointKm = [0]
let totalKm = 0

for (let i = 0; i < checkpoints.length - 1; i++) {
  const a = checkpoints[i]
  const b = checkpoints[i + 1]
  let segment
  let kind = 'フェリー'

  if (!a.ferryToNext) {
    try {
      segment = await fetchRoad(a, b)
      kind = '道路'
    } catch (err) {
      kind = `直線（取得失敗: ${err.message}）`
    }
    await sleep(1100) // 公開サーバーの決まり：1秒に1回まで
  }

  // 線が必ず地点そのものを通るよう、両端に地点の座標を足す
  segment = [[a.lng, a.lat], ...(segment ?? []), [b.lng, b.lat]]
  // 点を間引いてファイルを軽くする（約0.5km以内のズレは無視）
  segment = simplify(lineString(segment), { tolerance: 0.005 }).geometry.coordinates

  const km = length(lineString(segment), { units: 'kilometers' })
  totalKm += km
  checkpointKm.push(Math.round(totalKm * 10) / 10)

  // 前の区間の終点と今の区間の始点は同じ点なので重複を除く
  coords.push(...(i === 0 ? segment : segment.slice(1)))
  console.log(`${a.name} → ${b.name}: ${km.toFixed(1)} km [${kind}]`)
}

const round = (n) => Math.round(n * 1e5) / 1e5
const geojson = {
  type: 'Feature',
  properties: { totalKm: Math.round(totalKm * 10) / 10, checkpointKm },
  geometry: { type: 'LineString', coordinates: coords.map(([lng, lat]) => [round(lng), round(lat)]) },
}

await writeFile(OUTPUT, JSON.stringify(geojson))
console.log(`\n合計 ${totalKm.toFixed(1)} km / ${coords.length} 点 → public/data/route.geojson`)

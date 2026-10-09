// Wikipedia（日本語版）から写真と解説を取ってくる
const API = 'https://ja.wikipedia.org/w/api.php'

// 指定地点の半径10km以内にある記事を探す
export async function fetchNearby(lat, lng) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*', // 別のサイトから読むための許可（CORS）を求める
    generator: 'geosearch',
    ggscoord: `${lat}|${lng}`,
    ggsradius: '10000',
    ggslimit: '8',
    prop: 'pageimages|extracts',
    piprop: 'thumbnail',
    pithumbsize: '400',
    exintro: '1',
    explaintext: '1',
    exsentences: '2',
    exlimit: '8',
  })
  const data = await fetch(`${API}?${params}`).then((res) => res.json())
  const pages = Object.values(data.query?.pages ?? {})
  return pages
    .filter((p) => p.thumbnail) // 景色を見せたいので写真がある記事だけ
    .map((p) => ({
      title: p.title,
      extract: p.extract,
      image: p.thumbnail.source,
      url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
    }))
}

// 記事名から写真と要約を取る（周りに記事がない砂漠などで使う）
export async function fetchSummary(title) {
  const res = await fetch(`https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
  if (!res.ok) return null
  const p = await res.json()
  return {
    title: p.title,
    extract: p.extract,
    image: p.thumbnail?.source,
    url: p.content_urls?.mobile?.page,
  }
}

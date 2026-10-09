// 通知に添える励ましの言葉。毎回違う言葉になるよう、並び順をデータベース(meta/motivation)に覚えて順番に使う
import { readFileSync } from 'node:fs'

const PHRASES = [
  '今日の一歩が、ロカ岬への一歩。',
  '走り出せば、気分はあとからついてくる！',
  '仲間が待ってる。それだけで走る理由になる。',
  '昨日の自分より、ちょっとだけ前へ。',
  'ゆっくりでも、止まらなければ必ず進む。',
  '靴ひもを結んだら、もう半分成功！',
  '走ったあとのごはんは、いつもよりおいしい。',
  '風を感じに行こう。',
  '1kmでも走れば、地図の上の旅は進む。',
  '今日のがんばりは、明日の自分へのプレゼント。',
  '雨の日も晴れの日も、旅は続く。',
  '息が上がるのは、生きている証拠。',
  'ペースより、楽しむことが一番。',
  'みんなで走れば、遠い道も近くなる。',
  '最初の5分を乗り越えたら、こっちのもの！',
  '走るたび、世界が少し近づく。',
  'シルクロードの旅人も、一歩ずつ歩いた。',
  '今日の汗は、明日の笑顔になる。',
  '無理せず、でもサボらず。',
  'お気に入りの音楽をお供にどうぞ。',
  '走り終わった自分を想像してみよう。きっと気持ちいい。',
  '小さな積み重ねが、17,321kmになる。',
  'やる気は、走り出してから湧いてくる。',
  '景色を楽しみながら、のんびりいこう。',
  '今日は記録より、記憶に残るランを。',
  '仲間の背中は、最高のペースメーカー。',
  '体が軽く感じたら、それは成長のしるし。',
  '朝の空気は、ランナーだけのごほうび。',
  '夕焼けの中を走るのは、最高に気持ちいい。',
  '夜風のランは、一日のリセットボタン。',
  '走れる体に、ありがとう。',
  '前に進むことだけ考えよう。',
  'つらい坂の先には、いい景色がある。',
  '今日のランが、誰かの「行こう」につながる。',
  'ストレッチも忘れずにね。',
  '水分補給を忘れずに！',
  '笑顔で走ると、不思議と足も軽くなる。',
  'がんばった分だけ、チームの旅が進む。',
  '続けることが、いちばんの才能。',
  '今日もスタートラインに立つあなたが素敵。',
  '一緒に走る仲間がいるって、心強い。',
  'ゴールの先で、みんなでハイタッチしよう。',
  '雲の形を見ながら走るのもおすすめ。',
  '走ったぶんだけ、地図にオレンジの線が伸びる。',
  '心が重い日こそ、体を動かそう。',
  'ちょっとだけ遠回りしてみる？',
  '自分のペースが、いちばん速いペース。',
  'いつもの道にも、新しい発見がある。',
  '旅の次の街が、あなたを待ってる。',
  'がんばらなくていい。楽しめばいい。',
  '今日走れば、明日はもっと楽になる。',
  'あと少しの勇気で、玄関を出よう。',
  '深呼吸して、さあ行こう！',
  '足音のリズムを楽しもう。',
  '季節の匂いを感じに行こう。',
  'ランナーズハイ、今日はやってくるかも？',
  '今日の自分をほめる準備をしておこう。',
  '走ることは、自分との約束を守ること。',
  'どんなに遠い場所も、一歩から始まる。',
  'チームの記録に、あなたの名前を刻もう。',
  '疲れたら歩いてもOK。止まらなければ旅は続く。',
  '今日のランは、未来の自分への貯金。',
  '「行ってよかった」と思える日にしよう。',
  '空が広く見える日は、走りたくなる。',
  'がんばるあなたを、仲間が応援してる。',
  '走ったら、チャットで報告しよう！',
  'ゆっくり走るのも、立派なトレーニング。',
  'フォームを意識すると、走りが変わる。',
  '今日も無事に走れますように。',
  'いい汗かいて、ぐっすり眠ろう。',
  '小さな「できた」を集めよう。',
  'ライバルは、昨日の自分。',
  '仲間と話しながら走るのも楽しいよ。',
  'ちょっとした冒険に出かけよう。',
  '一歩ごとに、大陸の向こうが近づく。',
  '走るのに、遅すぎる日はない。',
  '今日のコンディションに合わせていこう。',
  'がんばった日は、自分にごほうびを。',
  '地球の上を走ってる、って考えるとワクワクする。',
  '昨日より1分長く、を目指してみる？',
  '足が止まりそうな時こそ、景色を見上げよう。',
  'あなたの1kmが、チームの1km。',
  'リズムよく、軽やかに。',
  '走ることで、頭もすっきり。',
  '旅人の気分で、街を走ろう。',
  'マイペースでいこう。それが一番続く。',
  '今日も「走る」を選んだあなたに拍手。',
  '体を動かすと、心も元気になる。',
  '一緒に走れる日は、特別な日。',
  'さあ、地図の続きを描きに行こう。',
  'たまには写真を撮りながら走ってみよう。',
  'いいランは、いい準備から。',
  '今日もケガなく、楽しく！',
  '一人で走っても、心はチームと一緒。',
  'ちりも積もれば、ユーラシア横断。',
  '走る時間は、自分だけの時間。',
  'あきらめない人だけが、ロカ岬に立てる。',
  '今日のランが、旅の新しい1ページ。',
  'みんなの足あとが、大陸をつなぐ。',
  'よし、行こう！🏃',
]

// 旅の現在地（チーム累計km → 今どこ・次の街まであと何km）
const route = JSON.parse(readFileSync(new URL('../public/data/route.geojson', import.meta.url), 'utf8'))
const checkpoints = JSON.parse(readFileSync(new URL('../public/data/checkpoints.json', import.meta.url), 'utf8'))
const cpKm = route.properties.checkpointKm
const totalKm = route.properties.totalKm

function journeyLines(teamKm) {
  const km = Math.min(teamKm, totalKm)
  const passed = cpKm.findLastIndex((k) => k <= km)
  const now = checkpoints[passed]
  const next = checkpoints[passed + 1]
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('ja-JP')
  if (!next) return ['ユーラシア大陸横断、達成！みんな本当におつかれさま🎉']
  const toNext = cpKm[passed + 1] - km
  return [
    `チームは今${now.flag}${now.name}を通過！${next.flag}${next.name}まであと${fmt(toNext)}km。`,
    `次の街は${next.flag}${next.name}。あと${fmt(toNext)}kmで到着のお祝いが待ってる🎉`,
    `ロカ岬まであと${fmt(totalKm - km)}km。全体の${((km / totalKm) * 100).toFixed(1)}%まで来たよ！`,
    `${next.flag}${next.name}の見どころは「${next.sights[0]}」。早く着きたいね！`,
  ]
}

// 並び順をシャッフル（フィッシャー–イェーツ法：どの並びも同じ確率で出る）
function shuffledIndexes(n) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const PHRASE_COUNT = PHRASES.length

// 言葉を1つ選ぶ。3回に1回は旅の話題、それ以外は PHRASES を使い切るまで重複なく順番に。
// dryRun のときは、使った位置を保存しない
export async function pickMotivation(db, teamKm, dryRun = false) {
  const ref = db.doc('meta/motivation')
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    let { order = [], pos = 0, count = 0 } = snap.exists ? snap.data() : {}
    count++
    let text
    if (count % 3 === 0) {
      const lines = journeyLines(teamKm)
      text = lines[Math.floor(count / 3) % lines.length]
    } else {
      if (order.length !== PHRASES.length || pos >= order.length) {
        order = shuffledIndexes(PHRASES.length) // 使い切ったら、並び順をシャッフルし直す
        pos = 0
      }
      text = PHRASES[order[pos++]]
    }
    if (!dryRun) tx.set(ref, { order, pos, count })
    return text
  })
}

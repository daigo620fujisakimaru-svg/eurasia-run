// 「距離 5.2 km」のような数値の小さな表示枠
export default function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

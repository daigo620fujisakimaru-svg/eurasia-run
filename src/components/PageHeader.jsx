// サブ画面の上部（戻るボタン＋タイトル）
export default function PageHeader({ title, onBack }) {
  return (
    <header className="page-header">
      {onBack && (
        <button className="back" onClick={onBack} aria-label="戻る">
          ‹
        </button>
      )}
      <h1>{title}</h1>
    </header>
  )
}

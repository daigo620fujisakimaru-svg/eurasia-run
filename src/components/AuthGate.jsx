// ログインの門番：ログインして、招待されたメンバーだと確認できた人だけ中に入れる
import { useEffect, useState } from 'react'
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { auth, googleProvider, isConfigured } from '../firebase.js'
import { registerMember, MemberContext } from '../lib/members.js'
import './AuthGate.css'

export default function AuthGate({ children }) {
  // loading → signedOut / notInvited / error / ready のどれかになる
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (!isConfigured) return
    // ログイン状態が変わるたびに呼ばれる（アプリを開き直してもログインは保たれる）
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return setState({ status: 'signedOut' })
      try {
        setState({ status: 'ready', member: await registerMember(user) })
      } catch (err) {
        const status = err.code === 'permission-denied' ? 'notInvited' : 'error'
        setState({ status, email: user.email, message: err.message })
      }
    })
  }, [])

  if (!isConfigured) {
    return (
      <Screen>
        <p>Firebase の設定がまだです。</p>
        <p className="muted">src/firebase.js に firebaseConfig を貼り付けてください。</p>
      </Screen>
    )
  }
  if (state.status === 'loading') return <Screen><p className="muted">読み込み中…</p></Screen>
  if (state.status === 'signedOut') return <LoginScreen />
  if (state.status === 'notInvited') {
    return (
      <Screen>
        <p>
          <b>{state.email}</b> は招待されていません。
        </p>
        <p className="muted">仲間にメールアドレスを追加してもらってから、もう一度ログインしてください。</p>
        <button className="secondary" onClick={() => signOut(auth)}>別のアカウントでログイン</button>
      </Screen>
    )
  }
  if (state.status === 'error') {
    return (
      <Screen>
        <p>エラーが起きました。</p>
        <p className="muted">{state.message}</p>
        <button className="secondary" onClick={() => signOut(auth)}>ログアウト</button>
      </Screen>
    )
  }
  return <MemberContext.Provider value={state.member}>{children}</MemberContext.Provider>
}

// スマホやホーム画面から開いたときは、小窓(ポップアップ)ではなくページ移動(リダイレクト)でログインする。
// iPhoneのホーム画面アプリではポップアップがうまく戻ってこないことがあるため
const preferRedirect =
  window.matchMedia('(display-mode: standalone)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent)

function LoginScreen() {
  const [error, setError] = useState(null)

  // リダイレクトから戻ってきたときに失敗していたら表示する（成功時は onAuthStateChanged が拾う）
  useEffect(() => {
    getRedirectResult(auth).catch((err) => setError(err.message))
  }, [])

  const login = () => {
    setError(null)
    if (preferRedirect) {
      signInWithRedirect(auth, googleProvider).catch((err) => setError(err.message))
      return
    }
    signInWithPopup(auth, googleProvider).catch((err) => {
      if (err.code !== 'auth/popup-closed-by-user') setError(err.message)
    })
  }

  return (
    <Screen>
      <p className="lead">
        姫路城からロカ岬まで
        <br />
        みんなで走ってユーラシア大陸を横断しよう
      </p>
      <button className="primary" onClick={login}>Googleでログイン</button>
      {error && <p className="error">{error}</p>}
    </Screen>
  )
}

function Screen({ children }) {
  return (
    <div className="auth-screen">
      <h1>🏃 ユーラシアラン</h1>
      {children}
    </div>
  )
}

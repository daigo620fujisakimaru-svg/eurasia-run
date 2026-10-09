// メンバー（一緒に旅する仲間）の登録と取得
import { createContext, useContext } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'

// カレンダーや記録で人を見分けるための色
const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#14b8a6', '#ef4444']

// ログインした人を members に登録する（2回目以降は読むだけ）。
// 招待されていない人は firestore.rules に止められ、permission-denied エラーになる。
export async function registerMember(user) {
  const ref = doc(db, 'members', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return { uid: user.uid, ...snap.data() }

  const member = {
    name: user.displayName ?? 'ランナー',
    email: user.email,
    photoURL: user.photoURL ?? null,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    joinedAt: serverTimestamp(),
  }
  await setDoc(ref, member)
  return { uid: user.uid, ...member }
}

// ログイン中のメンバー情報を、どの画面からでも取り出せるようにする仕組み（Context）
export const MemberContext = createContext(null)
export const useMember = () => useContext(MemberContext)

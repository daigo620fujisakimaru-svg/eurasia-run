// Firestore（データベース）の読み書き
import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'

// コレクション（データの棚）を見張り、誰かが追加・削除したら自動で最新にする。
// 読み込み中は null を返す。
export function useCollection(name, orderField) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    const ref = orderField ? query(collection(db, name), orderBy(orderField, 'desc')) : collection(db, name)
    // serverTimestamps: 'estimate' … 送信直後でサーバーの時刻がまだ届いていないときは、だいたいの時刻で表示する
    return onSnapshot(ref, (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
    )
  }, [name, orderField])

  return items
}

export const addRun = (run) => addDoc(collection(db, 'runs'), { ...run, createdAt: serverTimestamp() })
export const deleteRun = (id) => deleteDoc(doc(db, 'runs', id))

export const addCourse = (course) => addDoc(collection(db, 'courses'), { ...course, createdAt: serverTimestamp() })
export const deleteCourse = (id) => deleteDoc(doc(db, 'courses', id))

// チャット：投稿から1週間で消える（期限 expireAt を一緒に保存し、通知サーバーが期限切れを削除する）
export const CHAT_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
export const CHAT_MAX_LENGTH = 500
export const sendChat = (uid, text) =>
  addDoc(collection(db, 'chat'), {
    uid,
    text,
    createdAt: serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + CHAT_LIFETIME_MS),
  })

// 予定：1人1日1件（ID は「日付_ユーザーID」）。時間帯が空になったら消す
export function setAvailability(date, uid, slots) {
  const ref = doc(db, 'availability', `${date}_${uid}`)
  return slots.length ? setDoc(ref, { date, uid, slots, updatedAt: serverTimestamp() }) : deleteDoc(ref)
}

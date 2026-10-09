// Firebase（Googleの無料サーバー）への接続設定
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig.js'

export const isConfigured = firebaseConfig.apiKey !== ''

export const app = isConfigured ? initializeApp(firebaseConfig) : null
export const auth = app && getAuth(app)
export const db = app && getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

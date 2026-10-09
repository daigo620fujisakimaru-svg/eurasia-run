// Firebase の設定値（アプリ本体と Service Worker の両方から読み込む）
// ※これは秘密の鍵ではなく、アプリの「住所」のようなもの（ブラウザから誰でも見える前提）。
//   データを守っているのは firestore.rules（許可したメンバー以外は読み書きできない）。
export const firebaseConfig = {
  apiKey: 'AIzaSyCSHeyMcUziZXiXld0SsoHGRPrCGeH7pfo',
  authDomain: 'eurasia-run.firebaseapp.com',
  projectId: 'eurasia-run',
  storageBucket: 'eurasia-run.firebasestorage.app',
  messagingSenderId: '983476282463',
  appId: '1:983476282463:web:076bf31c3817c6dd6027ea',
}

// 通知（Web Push）用の公開鍵。Firebase の「Cloud Messaging → ウェブプッシュ証明書」で作ったもの（公開してよい）
export const VAPID_KEY = 'BBdWKjYgn6EyHcZhj8ZhU2Vg0VXpM27cUb55vE8c2LyB9mwYDF8kPHPMU2_cysWDdrQpi5RDsMHqKatY4ttgprw'

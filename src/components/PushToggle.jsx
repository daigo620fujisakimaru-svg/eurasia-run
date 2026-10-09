// 「🔔 通知を受け取る」の設定（記録タブに置く）
import { useEffect, useState } from 'react'
import { disablePush, enablePush, isPushOn, pushStatus } from '../lib/push.js'
import { useMember } from '../lib/members.js'

const MESSAGES = {
  'ios-install': 'iPhoneでは、Safariの共有ボタン →「ホーム画面に追加」をして、ホーム画面のアイコンから開くと通知を使えます（iOS 16.4以降）。',
  unsupported: 'このブラウザは通知に対応していません。',
  denied: '通知がブロックされています。スマホの設定でこのアプリ（またはブラウザ）の通知を許可してください。',
}

export default function PushToggle() {
  const me = useMember()
  const [status, setStatus] = useState(null) // 調べ中は null
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    pushStatus().then((s) => {
      setStatus(s)
      setOn(s === 'ok' && isPushOn())
    })
  }, [])

  const toggle = async () => {
    setBusy(true)
    try {
      if (on) {
        await disablePush()
        setOn(false)
      } else {
        await enablePush(me.uid)
        setOn(true)
      }
    } catch (err) {
      alert(err.message)
      setStatus(await pushStatus())
    } finally {
      setBusy(false)
    }
  }

  if (status === null) return null
  return (
    <section className="card push-toggle">
      <h2>
        🔔 通知 <small>走る予定の前（朝の予定→前日21時、昼→当日7時、夜→当日12時）とチャットの新着をお知らせ</small>
      </h2>
      {status === 'ok' ? (
        <button className={on ? 'secondary wide' : 'primary wide'} disabled={busy} onClick={toggle}>
          {busy ? '設定中…' : on ? '通知をオフにする' : '通知を受け取る'}
        </button>
      ) : (
        <p className="hint">{MESSAGES[status]}</p>
      )}
      {on && <p className="hint">このスマホで通知を受け取ります ✅</p>}
    </section>
  )
}

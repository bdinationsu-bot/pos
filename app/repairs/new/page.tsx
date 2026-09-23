'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ERROR_TYPES = [
  { key: 'error_lcd', label: 'LCD / Display', icon: '📱' },
  { key: 'error_battery', label: 'Battery', icon: '🔋' },
  { key: 'error_body', label: 'Body / Casing', icon: '📦' },
  { key: 'error_faceid', label: 'Face ID / Touch ID', icon: '👁️' },
  { key: 'error_camera', label: 'Camera', icon: '📷' }
]

export default function NewRepair() {
  const router = useRouter()
  const [f, setF] = useState({
    customer_name: '', customer_phone: '',
    imei: '', model: '', storage: '', color: '',
    passcode: '', accessories: '',
    issue: '', estimated_cost: 0,
    note: '',
    error_lcd: false,
    error_battery: false,
    error_body: false,
    error_faceid: false,
    error_camera: false,
    error_other: ''
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!f.issue) return alert('ပြဿနာ ဖော်ပြပါ')
    if (!f.model) return alert('Model ထည့်ပါ')

    const hasError = ERROR_TYPES.some(e => (f as any)[e.key])
    if (!hasError && !f.error_other) {
      return alert('ချို့ယွင်းချက် အနည်းဆုံး တစ်ခု ရွေးပါ')
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('create_repair', {
      p_customer_name: f.customer_name,
      p_customer_phone: f.customer_phone,
      p_imei: f.imei || null,
      p_serial: null,
      p_model: f.model,
      p_storage: f.storage,
      p_color: f.color,
      p_passcode: f.passcode,
      p_accessories: f.accessories,
      p_issue: f.issue,
      p_estimated_cost: f.estimated_cost,
      p_technician_id: null,
      p_note: f.note
    })

    if (error) { setSaving(false); return alert('Error: ' + error.message) }

    // Update error types
    await supabase.from('repairs').update({
      error_lcd: f.error_lcd,
      error_battery: f.error_battery,
      error_body: f.error_body,
      error_faceid: f.error_faceid,
      error_camera: f.error_camera,
      error_other: f.error_other
    }).eq('id', data)

    setSaving(false)
    alert('✅ Ticket ဖွင့်ပြီးပါပြီ')
    router.push(`/repairs/${data}`)
  }

  const input = (key: keyof typeof f, ph: string, type = 'text') => (
    <input type={type} value={f[key] as any}
      onChange={e => setF({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value })}
      placeholder={ph}
      className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
  )

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4 text-green-800">🔧 Service Ticket အသစ်</h1>

      {/* Customer */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">👤 ဖောက်သည်</h2>
        <div className="grid grid-cols-2 gap-3">
          {input('customer_name', 'နာမည်')}
          {input('customer_phone', 'ဖုန်း')}
        </div>
      </div>

      {/* Device */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">📱 စက် အချက်အလက်</h2>
        <div className="grid grid-cols-3 gap-3">
          {input('imei', 'IMEI')}
          {input('model', 'Model * (iPhone 13)')}
          {input('storage', 'Storage')}
          {input('color', 'Color')}
          {input('passcode', 'Passcode / Pattern')}
          {input('accessories', 'ပါလာတဲ့ အပိုပစ္စည်း (charger, case...)')}
        </div>
      </div>

      {/* ERROR TYPES */}
      <div className="bg-white rounded shadow p-4 mb-4 border-2 border-orange-300">
        <h2 className="font-bold mb-3 text-orange-700">🔧 ချို့ယွင်းချက် အမျိုးအစား * (Error Types)</h2>
        <div className="grid grid-cols-5 gap-3 mb-4">
          {ERROR_TYPES.map(e => {
            const checked = (f as any)[e.key]
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => setF({ ...f, [e.key]: !checked })}
                className={`border-2 rounded-lg p-3 text-center transition ${
                  checked
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 bg-white hover:border-orange-300'
                }`}
              >
                <div className="text-2xl mb-1">{e.icon}</div>
                <div className={`text-xs font-bold ${checked ? 'text-orange-700' : 'text-gray-600'}`}>
                  {e.label}
                </div>
                <div className={`text-lg mt-1 ${checked ? 'text-orange-600' : 'text-gray-300'} font-bold`}>
                  {checked ? '☑' : '☐'}
                </div>
              </button>
            )
          })}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">အခြား ချို့ယွင်းချက်</label>
          <input
            value={f.error_other}
            onChange={e => setF({ ...f, error_other: e.target.value })}
            placeholder="ဥပမာ — WiFi မရ၊ Speaker အက်သံ၊ Mic မလုပ်"
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {/* Issue */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-red-700">⚠️ ပြဿနာ အသေးစိတ် *</h2>
        <textarea
          value={f.issue}
          onChange={e => setF({ ...f, issue: e.target.value })}
          placeholder="ဖောက်သည် ပြောတဲ့ ပြဿနာ အသေးစိတ်..."
          className="border p-3 rounded w-full"
          rows={4}
        />
      </div>

      {/* Estimate + Note */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium">ခန့်မှန်း ကုန်ကျစရိတ် (Ks)</label>
            <input
              type="number"
              value={f.estimated_cost || ''}
              onChange={e => setF({ ...f, estimated_cost: +e.target.value || 0 })}
              className="border p-2 rounded w-full text-lg font-bold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">မှတ်ချက်</label>
            <input
              value={f.note}
              onChange={e => setF({ ...f, note: e.target.value })}
              className="border p-2 rounded w-full"
              placeholder="optional"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-medium disabled:opacity-50">
          {saving ? 'သိမ်းနေတယ်...' : '✅ Ticket ဖွင့်'}
        </button>
        <button onClick={() => router.push('/repairs')}
          className="bg-gray-200 px-8 py-3 rounded font-medium">ပယ်ဖျက်</button>
      </div>
    </div>
  )
}

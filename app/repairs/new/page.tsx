'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ERROR_TYPES = [
  { key: 'error_lcd', label: 'LCD / Display', icon: '📱' },
  { key: 'error_battery', label: 'Battery', icon: '🔋' },
  { key: 'error_camera', label: 'Camera', icon: '📷' },
  { key: 'error_body', label: 'Body / Casing', icon: '📦' },
  { key: 'error_back_glass', label: 'Back Glass', icon: '🔙' },
  { key: 'error_glass', label: 'Glass', icon: '🔷' }
]

export default function NewRepair() {
  const router = useRouter()

  const [f, setF] = useState({
    customer_name: '', customer_phone: '',

    id_type: 'imei', // 'imei' | 'serial' | 'both'
    imei: '',
    serial: '',

    model: '', storage: '', color: '',
    passcode: '', accessories: '',
    issue: '', estimated_cost: 0,
    note: '',
    error_lcd: false,
    error_battery: false,
    error_camera: false,
    error_body: false,
    error_back_glass: false,
    error_glass: false,
    error_other: ''
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!f.issue) return alert('ပြဿနာ ဖော်ပြပါ')
    if (!f.model) return alert('Model ထည့်ပါ')

    // Validate ID based on type
    if (f.id_type === 'imei' && !f.imei) return alert('IMEI ထည့်ပါ')
    if (f.id_type === 'serial' && !f.serial) return alert('Serial ထည့်ပါ')
    if (f.id_type === 'both' && (!f.imei || !f.serial)) return alert('IMEI နဲ့ Serial နှစ်ခုလုံး ထည့်ပါ')

    const hasError = ERROR_TYPES.some(e => (f as any)[e.key])
    if (!hasError && !f.error_other) {
      return alert('ချို့ယွင်းချက် အနည်းဆုံး တစ်ခု ရွေးပါ')
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('create_repair', {
      p_customer_name: f.customer_name,
      p_customer_phone: f.customer_phone,
      p_imei: f.imei || null,
      p_serial: f.serial || null,
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

    await supabase.from('repairs').update({
      error_lcd: f.error_lcd,
      error_battery: f.error_battery,
      error_camera: f.error_camera,
      error_body: f.error_body,
      error_back_glass: f.error_back_glass,
      error_glass: f.error_glass,
      error_other: f.error_other
    }).eq('id', data)

    setSaving(false)
    alert('✅ Service Ticket ဖွင့်ပြီးပါပြီ')
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

      {/* Device ID — Type Dropdown + Value */}
      <div className="bg-white rounded shadow p-4 mb-4 border-2 border-blue-300">
        <h2 className="font-bold mb-3 text-blue-700">🔑 စက် ID</h2>

        {/* ID Type Selector */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">ID အမျိုးအစား *</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setF({ ...f, id_type: 'imei', serial: '' })}
              className={`py-3 rounded border-2 font-medium transition ${
                f.id_type === 'imei'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              📱 IMEI ပဲ
            </button>
            <button
              type="button"
              onClick={() => setF({ ...f, id_type: 'serial', imei: '' })}
              className={`py-3 rounded border-2 font-medium transition ${
                f.id_type === 'serial'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              🔢 Serial ပဲ
            </button>
            <button
              type="button"
              onClick={() => setF({ ...f, id_type: 'both' })}
              className={`py-3 rounded border-2 font-medium transition ${
                f.id_type === 'both'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              📋 နှစ်ခုလုံး
            </button>
          </div>
        </div>

        {/* Value Inputs */}
        <div className="grid grid-cols-2 gap-3">
          {(f.id_type === 'imei' || f.id_type === 'both') && (
            <div>
              <label className="block text-sm font-medium mb-1">
                IMEI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={f.imei}
                onChange={e => setF({ ...f, imei: e.target.value })}
                placeholder="356789012345678"
                maxLength={15}
                className="border-2 border-blue-500 p-3 rounded w-full font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                {f.imei.length}/15 {f.imei.length === 15 && '✅'}
              </div>
            </div>
          )}

          {(f.id_type === 'serial' || f.id_type === 'both') && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Serial <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={f.serial}
                onChange={e => setF({ ...f, serial: e.target.value })}
                placeholder="F17X001XXXXX"
                className="border-2 border-blue-500 p-3 rounded w-full font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Device Info */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">📱 စက် အချက်အလက်</h2>
        <div className="grid grid-cols-3 gap-3">
          {input('model', 'Model * (iPhone 13)')}
          {input('storage', 'Storage (128GB)')}
          {input('color', 'Color')}
          {input('passcode', 'Passcode / Pattern')}
          <div className="col-span-2">
            {input('accessories', 'ပါလာတဲ့ အပိုပစ္စည်း (charger, case...)')}
          </div>
        </div>
      </div>

      {/* Error Types */}
      <div className="bg-white rounded shadow p-4 mb-4 border-2 border-orange-300">
        <h2 className="font-bold mb-3 text-orange-700">🔧 ချို့ယွင်းချက် * (Error Types)</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {ERROR_TYPES.map(e => {
            const checked = (f as any)[e.key]
            return (
              <label
                key={e.key}
                className={`flex items-center gap-3 border-2 rounded-lg p-3 cursor-pointer transition ${
                  checked ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-white hover:border-orange-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={ev => setF({ ...f, [e.key]: ev.target.checked })}
                  className="w-5 h-5 accent-orange-500"
                />
                <span className="text-xl">{e.icon}</span>
                <span className={`text-sm font-bold ${checked ? 'text-orange-700' : 'text-gray-700'}`}>
                  {e.label}
                </span>
              </label>
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
          {saving ? 'သိမ်းနေတယ်...' : '✅ Service Ticket ဖွင့်'}
        </button>
        <button onClick={() => router.push('/repairs')}
          className="bg-gray-200 px-8 py-3 rounded font-medium">ပယ်ဖျက်</button>
      </div>
    </div>
  )
}

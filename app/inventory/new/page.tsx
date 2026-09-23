'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewDevicePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [f, setF] = useState({
    imei: '', model: '', storage: '', color: '', region: 'Physical',
    battery_health: 0, cycle_count: 0,
    screen_ok: true, faceid_ok: true, camera_ok: true, battery_ok: true,
    speaker_ok: true, mic_ok: true, wifi_ok: true, cellular_ok: true,
    truetone_ok: true, icloud_locked: false, water_damage: false, motherboard_ok: true,
    parts_changed: '', condition_note: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    supplier_id: null as number | null,
    warranty_days: 0, cost_price: 0, sale_price: 0
  })

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('suppliers').select('*').order('name')
      setSuppliers(data ?? [])
    })()
  }, [])

  async function save() {
    if (!f.model) return alert('Model ထည့်ပါ')
    if (!f.imei) return alert('IMEI ထည့်ပါ')
    if (f.icloud_locked) return alert('⚠️ iCloud Locked စက်ကို လက်မခံပါ')

    setSaving(true)
    const { error } = await supabase.from('devices').insert({
      imei: f.imei,
      model: f.model,
      storage: f.storage || null,
      color: f.color || null,
      region: f.region || null,
      battery_health: f.battery_health ? Math.round(f.battery_health) : null,
      cycle_count: f.cycle_count ? Math.round(f.cycle_count) : null,
      cost_price: Math.round(f.cost_price) || 0,
      sale_price: Math.round(f.sale_price) || 0,
      warranty_days: Math.round(f.warranty_days) || 0,
      purchase_date: f.purchase_date || null,
      supplier_id: f.supplier_id,
      status: 'in_stock',
      condition_note: buildNote()
    })
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    alert('✅ Device သိမ်းပြီးပါပြီ')
    router.push('/inventory')
  }

  function buildNote() {
    const lines = []
    if (f.parts_changed) lines.push(`အစားထိုး: ${f.parts_changed}`)
    if (!f.screen_ok) lines.push('❌ Screen')
    if (!f.faceid_ok) lines.push('❌ Face ID')
    if (!f.camera_ok) lines.push('❌ Camera')
    if (!f.battery_ok) lines.push('❌ Battery')
    if (!f.speaker_ok) lines.push('❌ Speaker')
    if (!f.mic_ok) lines.push('❌ Mic')
    if (!f.wifi_ok) lines.push('❌ WiFi')
    if (!f.cellular_ok) lines.push('❌ Cellular')
    if (!f.truetone_ok) lines.push('❌ True Tone')
    if (f.water_damage) lines.push('⚠️ Water Damage')
    if (!f.motherboard_ok) lines.push('❌ Motherboard')
    if (f.condition_note) lines.push(f.condition_note)
    return lines.join(' | ')
  }

  const input = (key: keyof typeof f, ph: string, type = 'text') => (
    <input type={type} value={f[key] as any}
      onChange={e => setF({ ...f, [key]: type === 'number' ? (+e.target.value || 0) : e.target.value })}
      placeholder={ph} className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
  )

  const check = (k: keyof typeof f, label: string, color = 'text-green-700') => (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input type="checkbox" checked={f[k] as boolean}
        onChange={e => setF({ ...f, [k]: e.target.checked })} className="w-4 h-4" />
      <span className={f[k] ? color : 'text-red-600 font-medium'}>{label}</span>
    </label>
  )

  const batteryColor = f.battery_health >= 90 ? 'text-green-600'
    : f.battery_health >= 80 ? 'text-yellow-600'
    : f.battery_health > 0 ? 'text-red-600' : 'text-gray-400'

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4 text-green-800">Device အသစ် ထည့်</h1>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">📱 အခြေခံ အချက်အလက်</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm mb-1 font-medium">IMEI <span className="text-red-500">*</span></label>
            <input type="text" value={f.imei} onChange={e => setF({ ...f, imei: e.target.value })}
              placeholder="356789012345678"
              className="border-2 border-green-500 p-3 rounded w-full font-mono text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={15} />
            <div className="text-xs text-gray-500 mt-1">{f.imei.length}/15 {f.imei.length === 15 && '✅'}</div>
          </div>
          {input('model', 'Model * (iPhone 13 Pro)')}
          {input('storage', 'Storage (128GB)')}
          {input('color', 'Color')}
          <div>
            <label className="block text-sm mb-1 font-medium">Region</label>
            <select value={f.region} onChange={e => setF({ ...f, region: e.target.value })} className="border p-2 rounded w-full">
              <option value="Physical">Physical SIM</option>
              <option value="eSIM">eSIM</option>
              <option value="Physical + eSIM">Physical + eSIM (Dual)</option>
              <option value="LL/A">LL/A — USA</option>
              <option value="ZP/A">ZP/A — Hong Kong</option>
              <option value="ZA/A">ZA/A — Singapore</option>
              <option value="MY/A">MY/A — Malaysia</option>
              <option value="TH/A">TH/A — Thailand</option>
              <option value="J/A">J/A — Japan</option>
              <option value="KH/A">KH/A — Korea</option>
              <option value="X/A">X/A — Australia</option>
              <option value="Other">အခြား</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-orange-700">🔋 Secondhand အခြေအနေ</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium">Battery Health (%)</label>
            <input type="number" value={f.battery_health || ''} onChange={e => setF({ ...f, battery_health: +e.target.value || 0 })}
              className={`border p-2 rounded w-full text-2xl font-bold text-center ${batteryColor}`} min="0" max="100" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Cycle Count</label>
            <input type="number" value={f.cycle_count || ''} onChange={e => setF({ ...f, cycle_count: +e.target.value || 0 })}
              className="border p-2 rounded w-full text-2xl font-bold text-center" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-blue-700">🛍️ ဝယ်ယူမှု အချက်အလက်</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium">ဝယ်ယူသည့် ရက်စွဲ</label>
            <input type="date" value={f.purchase_date} onChange={e => setF({ ...f, purchase_date: e.target.value })} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Supplier</label>
            <select value={f.supplier_id ?? ''} onChange={e => setF({ ...f, supplier_id: e.target.value ? +e.target.value : null })} className="border p-2 rounded w-full">
              <option value="">-- ရွေး --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-blue-700">🔍 အစိတ်အပိုင်း စစ်ဆေးချက်</h2>
        <div className="grid grid-cols-4 gap-3">
          {check('screen_ok', 'Screen')}
          {check('faceid_ok', 'Face ID')}
          {check('camera_ok', 'Camera')}
          {check('battery_ok', 'Battery')}
          {check('speaker_ok', 'Speaker')}
          {check('mic_ok', 'Microphone')}
          {check('wifi_ok', 'WiFi')}
          {check('cellular_ok', 'Cellular')}
          {check('truetone_ok', 'True Tone')}
          {check('motherboard_ok', 'Mainboard')}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
          {check('water_damage', '⚠️ Water Damage ရှိ', 'text-red-700')}
          {check('icloud_locked', '⚠️ iCloud Locked', 'text-red-700')}
        </div>
        {f.icloud_locked && (
          <div className="mt-3 bg-red-50 border border-red-300 text-red-700 p-3 rounded text-sm font-bold">
            ❌ iCloud Locked စက်ကို လက်ခံလို့ မရပါ
          </div>
        )}
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-purple-700">🔧 အစားထိုးထားတဲ့ အစိတ်အပိုင်း</h2>
        <input value={f.parts_changed} onChange={e => setF({ ...f, parts_changed: e.target.value })}
          placeholder="ဥပမာ — Screen အသစ်, Battery အသစ်" className="border p-2 rounded w-full mb-3" />
        <textarea value={f.condition_note} onChange={e => setF({ ...f, condition_note: e.target.value })}
          placeholder="အခြား မှတ်ချက်..." className="border p-2 rounded w-full" rows={2} />
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">💰 ဈေးနှုန်း</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium">ဝယ်ဈေး</label>
            <input type="number" value={f.cost_price || ''} onChange={e => setF({ ...f, cost_price: +e.target.value || 0 })}
              className="border p-2 rounded w-full text-lg font-bold" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">ရောင်းဈေး</label>
            <input type="number" value={f.sale_price || ''} onChange={e => setF({ ...f, sale_price: +e.target.value || 0 })}
              className="border p-2 rounded w-full text-lg font-bold text-green-700" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">အာမခံ (ရက်)</label>
            <input type="number" value={f.warranty_days || ''} onChange={e => setF({ ...f, warranty_days: +e.target.value || 0 })}
              className="border p-2 rounded w-full text-lg font-bold" />
          </div>
        </div>
        {f.cost_price > 0 && f.sale_price > 0 && (
          <div className="mt-3 bg-green-50 border border-green-300 p-3 rounded text-sm">
            <div className="flex justify-between">
              <span>မြတ်မည့် ပမာဏ:</span>
              <strong className="text-green-700">{(f.sale_price - f.cost_price).toLocaleString()} Ks</strong>
            </div>
            <div className="flex justify-between mt-1">
              <span>မြတ်နှုန်း:</span>
              <strong className="text-green-700">{f.cost_price > 0 ? (((f.sale_price - f.cost_price) / f.cost_price) * 100).toFixed(1) : 0}%</strong>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving || f.icloud_locked}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-medium disabled:opacity-50">
          {saving ? 'သိမ်းနေတယ်...' : '💾 သိမ်း'}
        </button>
        <button onClick={() => router.push('/inventory')} className="bg-gray-200 px-8 py-3 rounded font-medium">ပယ်ဖျက်</button>
      </div>
    </div>
  )
}

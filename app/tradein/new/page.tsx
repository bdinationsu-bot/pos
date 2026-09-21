'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TradeinNew() {
  const router = useRouter()
  const [f, setF] = useState({
    customer_name: '', customer_phone: '',
    old_imei: '', model: '', storage: '', color: '',
    battery_health: 0,
    screen_ok: true, faceid_ok: true, camera_ok: true,
    icloud_locked: false, water_damage: false,
    truetone_ok: true, motherboard_ok: true,
    condition_note: '', appraisal_price: 0
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!f.model) return alert('Model ထည့်ပါ')
    if (!f.appraisal_price) return alert('Appraisal Price ထည့်ပါ')
    setSaving(true)

    let customerId: number | null = null
    if (f.customer_phone) {
      const { data: exist } = await supabase
        .from('customers').select('id').eq('phone', f.customer_phone).maybeSingle()
      if (exist) {
        customerId = exist.id
      } else {
        const { data: created } = await supabase
          .from('customers')
          .insert({ name: f.customer_name || 'Unknown', phone: f.customer_phone })
          .select().single()
        customerId = created?.id ?? null
      }
    }

    const { data: ti, error } = await supabase.from('tradeins').insert({
      customer_id: customerId,
      old_imei: f.old_imei || null,
      model: f.model, storage: f.storage, color: f.color,
      battery_health: f.battery_health || null,
      screen_ok: f.screen_ok, faceid_ok: f.faceid_ok, camera_ok: f.camera_ok,
      icloud_locked: f.icloud_locked, water_damage: f.water_damage,
      truetone_ok: f.truetone_ok, motherboard_ok: f.motherboard_ok,
      condition_note: f.condition_note,
      appraisal_price: f.appraisal_price,
      status: 'accepted'
    }).select().single()

    if (error || !ti) {
      setSaving(false)
      return alert('Error: ' + error?.message)
    }

    const { error: devErr } = await supabase.from('devices').insert({
      imei: f.old_imei || null,
      model: f.model, storage: f.storage, color: f.color,
      battery_health: f.battery_health || null,
      cost_price: f.appraisal_price,
      sale_price: Math.round(f.appraisal_price * 1.2),
      status: 'in_stock',
      tradein_id: ti.id
    })

    setSaving(false)
    if (devErr) return alert('Device save error: ' + devErr.message)

    await supabase.from('cash_transactions').insert({
      type: 'out', amount: f.appraisal_price,
      ref_type: 'tradein', ref_id: ti.id,
      note: `Trade-in ${f.model}`
    })

    alert('Trade-in သိမ်းပြီးပါပြီ')
    router.push('/inventory')
  }

  const input = (key: keyof typeof f, placeholder: string, type = 'text') => (
    <input
      type={type}
      value={f[key] as any}
      onChange={e => setF({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value })}
      placeholder={placeholder}
      className="border p-2 rounded w-full"
    />
  )

  const check = (k: keyof typeof f, label: string) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={f[k] as boolean}
        onChange={e => setF({ ...f, [k]: e.target.checked })}
      />
      <span>{label}</span>
    </label>
  )

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Trade-in အသစ်</h1>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2">Customer</h2>
        <div className="grid grid-cols-2 gap-3">
          {input('customer_name', 'Customer Name')}
          {input('customer_phone', 'Phone')}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2">Device</h2>
        <div className="grid grid-cols-2 gap-3">
          {input('old_imei', 'IMEI')}
          {input('model', 'Model (iPhone 12)')}
          {input('storage', 'Storage')}
          {input('color', 'Color')}
          {input('battery_health', 'Battery %', 'number')}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2">Condition Check</h2>
        <div className="grid grid-cols-3 gap-3">
          {check('screen_ok', 'Screen OK')}
          {check('faceid_ok', 'Face ID OK')}
          {check('camera_ok', 'Camera OK')}
          {check('truetone_ok', 'True Tone OK')}
          {check('motherboard_ok', 'Mainboard OK')}
          {check('icloud_locked', 'iCloud Locked ⚠')}
          {check('water_damage', 'Water Damage ⚠')}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <textarea
          value={f.condition_note}
          onChange={e => setF({ ...f, condition_note: e.target.value })}
          placeholder="Note"
          className="border p-2 rounded w-full"
          rows={3}
        />
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <label className="block mb-2 font-bold">Appraisal Price (Ks)</label>
        <input
          type="number"
          value={f.appraisal_price || ''}
          onChange={e => setF({ ...f, appraisal_price: +e.target.value })}
          className="border p-3 rounded w-full text-2xl font-bold"
          placeholder="0"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded disabled:opacity-50"
        >
          {saving ? 'သိမ်းနေတယ်...' : 'Trade-in သိမ်း'}
        </button>
        <button
          onClick={() => router.push('/inventory')}
          className="bg-gray-300 px-6 py-3 rounded"
        >
          ပယ်ဖျက်
        </button>
      </div>
    </div>
  )
}

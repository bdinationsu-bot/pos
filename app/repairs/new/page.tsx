'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewRepair() {
  const router = useRouter()
  const [techs, setTechs] = useState<any[]>([])
  const [f, setF] = useState({
    customer_name: '', customer_phone: '',
    imei: '', serial: '', model: '', storage: '', color: '',
    passcode: '', accessories: '',
    issue: '', estimated_cost: 0,
    technician_id: null as number | null,
    note: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('staff').select('*').eq('active', true)
        .in('role', ['technician', 'manager']).order('name')
      setTechs(data ?? [])
    })()
  }, [])

  async function save() {
    if (!f.issue) return alert('ပြဿနာ ဖော်ပြပါ')
    if (!f.model) return alert('Model ထည့်ပါ')
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
      p_technician_id: f.technician_id,
      p_note: f.note
    })

    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    alert('✅ Ticket ဖွင့်ပြီးပါပြီ')
    router.push(`/repairs/${data}`)
  }

  const input = (key: keyof typeof f, ph: string, type = 'text') => (
    <input
      type={type}
      value={f[key] as any}
      onChange={e => setF({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value })}
      placeholder={ph}
      className="border p-2 rounded w-full"
    />
  )

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4 text-green-800">Ticket အသစ် — Repair လက်ခံ</h1>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">👤 Customer</h2>
        <div className="grid grid-cols-2 gap-3">
          {input('customer_name', 'နာမည်')}
          {input('customer_phone', 'ဖုန်း')}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">📱 Device</h2>
        <div className="grid grid-cols-3 gap-3">
          {input('imei', 'IMEI')}
          {input('serial', 'Serial')}
          {input('model', 'Model * (iPhone 13)')}
          {input('storage', 'Storage')}
          {input('color', 'Color')}
          {input('passcode', 'Passcode / Pattern')}
          <input
            placeholder="ပါလာတဲ့ အပိုပစ္စည်း (charger, case...)"
            value={f.accessories}
            onChange={e => setF({ ...f, accessories: e.target.value })}
            className="border p-2 rounded col-span-3"
          />
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-red-700">⚠️ ပြဿနာ (Issue)</h2>
        <textarea
          value={f.issue}
          onChange={e => setF({ ...f, issue: e.target.value })}
          placeholder="ဥပမာ — Screen ကွဲ၊ အားမသွင်း၊ Face ID မလုပ်"
          className="border p-3 rounded w-full"
          rows={3}
        />
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-blue-700">🔧 Assignment & Estimate</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">နည်းပညာရှင်</label>
            <select
              value={f.technician_id ?? ''}
              onChange={e => setF({ ...f, technician_id: e.target.value ? +e.target.value : null })}
              className="border p-2 rounded w-full"
            >
              <option value="">-- ရွေး --</option>
              {techs.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {input('estimated_cost', 'ခန့်မှန်း ကုန်ကျစရိတ် (Ks)', 'number')}
        </div>
        <textarea
          value={f.note}
          onChange={e => setF({ ...f, note: e.target.value })}
          placeholder="မှတ်ချက်"
          className="border p-2 rounded w-full mt-3"
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-medium disabled:opacity-50"
        >
          {saving ? 'သိမ်းနေတယ်...' : '✅ Ticket ဖွင့်'}
        </button>
        <button onClick={() => router.push('/repairs')} className="bg-gray-200 px-8 py-3 rounded font-medium">
          ပယ်ဖျက်
        </button>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewDevicePage() {
  const router = useRouter()
  const [f, setF] = useState({
    imei: '', serial: '', model: '', storage: '', color: '',
    battery_health: 0, cycle_count: 0, grade: 'A',
    condition_note: '', cost_price: 0, sale_price: 0
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!f.model) return alert('Model ထည့်ပါ')
    setSaving(true)
    const { error } = await supabase.from('devices').insert({
      ...f,
      battery_health: f.battery_health || null,
      cycle_count: f.cycle_count || null,
      status: 'in_stock'
    })
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    alert('သိမ်းပြီးပါပြီ')
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

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Device အသစ်</h1>

      <div className="bg-white rounded shadow p-4 grid grid-cols-2 gap-3">
        {input('imei', 'IMEI')}
        {input('serial', 'Serial')}
        {input('model', 'Model (iPhone 13 Pro)')}
        {input('storage', 'Storage (128GB)')}
        {input('color', 'Color')}
        <select
          value={f.grade}
          onChange={e => setF({ ...f, grade: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="A">Grade A</option>
          <option value="B">Grade B</option>
          <option value="C">Grade C</option>
          <option value="D">Grade D</option>
        </select>
        {input('battery_health', 'Battery %', 'number')}
        {input('cycle_count', 'Cycle Count', 'number')}
        {input('cost_price', 'Cost Price (Ks)', 'number')}
        {input('sale_price', 'Sale Price (Ks)', 'number')}
        <textarea
          value={f.condition_note}
          onChange={e => setF({ ...f, condition_note: e.target.value })}
          placeholder="Condition Note"
          className="border p-2 rounded col-span-2"
          rows={3}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {saving ? 'သိမ်းနေတယ်...' : 'သိမ်း'}
        </button>
        <button
          onClick={() => router.push('/inventory')}
          className="bg-gray-300 px-6 py-2 rounded"
        >
          ပယ်ဖျက်
        </button>
      </div>
    </div>
  )
}

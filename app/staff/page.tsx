'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StaffPage() {
  const [list, setList] = useState<any[]>([])
  const [f, setF] = useState({ name: '', phone: '', role: 'sales' })
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const { data } = await supabase.from('staff').select('*').order('id', { ascending: false })
    setList(data ?? [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!f.name) return alert('နာမည် ထည့်ပါ')
    const { error } = await supabase.from('staff').insert(f)
    if (error) return alert(error.message)
    setF({ name: '', phone: '', role: 'sales' })
    setShowForm(false)
    load()
  }

  async function toggle(id: number, active: boolean) {
    await supabase.from('staff').update({ active: !active }).eq('id', id)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Sales Staff</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + ဝန်ထမ်း အသစ်
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 grid grid-cols-3 gap-3">
          <input
            placeholder="နာမည်"
            value={f.name}
            onChange={e => setF({ ...f, name: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            placeholder="ဖုန်း"
            value={f.phone}
            onChange={e => setF({ ...f, phone: e.target.value })}
            className="border p-2 rounded"
          />
          <select
            value={f.role}
            onChange={e => setF({ ...f, role: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="sales">အရောင်း</option>
            <option value="manager">မန်နေဂျာ</option>
            <option value="technician">နည်းပညာ</option>
          </select>
          <button onClick={add} className="btn-primary col-span-3">သိမ်း</button>
        </div>
      )}

      <div className="card">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">နာမည်</th>
              <th className="p-2 text-left">ဖုန်း</th>
              <th className="p-2 text-left">ရာထူး</th>
              <th className="p-2 text-center">အခြေအနေ</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">ဝန်ထမ်း မရှိပါ</td></tr>
            )}
            {list.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2">{s.phone || '-'}</td>
                <td className="p-2 capitalize">{s.role}</td>
                <td className="p-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    s.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {s.active ? 'အလုပ်လုပ်' : 'ရပ်'}
                  </span>
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => toggle(s.id, s.active)}
                    className="text-sm text-green-700 hover:underline"
                  >
                    {s.active ? 'ရပ်' : 'ပြန်ဖွင့်'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

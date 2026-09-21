'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AccessoriesPage() {
  const [list, setList] = useState<any[]>([])
  const [f, setF] = useState({ name: '', category: '', qty: 0, cost: 0, price: 0, sku: '' })
  const [showForm, setShowForm] = useState(false)
  const [q, setQ] = useState('')

  async function load() {
    let query = supabase.from('accessories').select('*').order('id', { ascending: false })
    if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
    const { data } = await query
    setList(data ?? [])
  }
  useEffect(() => { load() }, [q])

  async function save() {
    if (!f.name) return alert('နာမည် ထည့်ပါ')
    const { error } = await supabase.from('accessories').insert(f)
    if (error) return alert(error.message)
    setF({ name: '', category: '', qty: 0, cost: 0, price: 0, sku: '' })
    setShowForm(false)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Accessories</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
          + Accessory အသစ်
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded shadow p-4 mb-4 grid grid-cols-3 gap-3">
          <input placeholder="SKU" value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} className="border p-2 rounded" />
          <input placeholder="နာမည် *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="border p-2 rounded" />
          <input placeholder="အမျိုးအစား" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} className="border p-2 rounded" />
          <input type="number" placeholder="Qty" value={f.qty || ''} onChange={e => setF({ ...f, qty: +e.target.value })} className="border p-2 rounded" />
          <input type="number" placeholder="ဝယ်ဈေး" value={f.cost || ''} onChange={e => setF({ ...f, cost: +e.target.value })} className="border p-2 rounded" />
          <input type="number" placeholder="ရောင်းဈေး" value={f.price || ''} onChange={e => setF({ ...f, price: +e.target.value })} className="border p-2 rounded" />
          <button onClick={save} className="bg-green-600 text-white py-2 rounded col-span-3">သိမ်း</button>
        </div>
      )}

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 ရှာ" className="border p-3 rounded w-full max-w-md mb-4" />

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">နာမည်</th>
              <th className="p-3 text-left">အမျိုးအစား</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3 text-right">ဝယ်ဈေး</th>
              <th className="p-3 text-right">ရောင်းဈေး</th>
              <th className="p-3 text-right">တန်ဖိုး</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Accessory မရှိပါ</td></tr>
            )}
            {list.map(a => (
              <tr key={a.id} className="border-t hover:bg-green-50">
                <td className="p-3 font-mono text-xs">{a.sku || '-'}</td>
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3">{a.category || '-'}</td>
                <td className={`p-3 text-right font-bold ${a.qty <= 5 ? 'text-red-700' : ''}`}>{a.qty}</td>
                <td className="p-3 text-right">{Number(a.cost).toLocaleString()}</td>
                <td className="p-3 text-right">{Number(a.price).toLocaleString()}</td>
                <td className="p-3 text-right text-green-700 font-medium">
                  {(a.qty * Number(a.cost)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

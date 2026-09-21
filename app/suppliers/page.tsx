'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SuppliersPage() {
  const [list, setList] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', company: '', address: '', note: '' })
  const [stats, setStats] = useState<Record<number, { total: number; paid: number }>>({})

  async function load() {
    let query = supabase.from('suppliers').select('*').order('id', { ascending: false })
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,company.ilike.%${q}%`)
    const { data } = await query
    setList(data ?? [])

    const { data: purchases } = await supabase.from('purchases').select('supplier_id,total,paid,balance')
    const s: Record<number, { total: number; paid: number }> = {}
    ;(purchases ?? []).forEach((p: any) => {
      if (!p.supplier_id) return
      if (!s[p.supplier_id]) s[p.supplier_id] = { total: 0, paid: 0 }
      s[p.supplier_id].total += Number(p.total)
      s[p.supplier_id].paid += Number(p.paid)
    })
    setStats(s)
  }
  useEffect(() => { load() }, [q])

  async function save() {
    if (!f.name) return alert('နာမည် ထည့်ပါ')
    const { error } = await supabase.from('suppliers').insert(f)
    if (error) return alert(error.message)
    setF({ name: '', phone: '', company: '', address: '', note: '' })
    setShowForm(false)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Suppliers</h1>
        <div className="flex gap-2">
          <Link href="/purchases/new" className="bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded hover:bg-green-50 font-medium">
            + Purchase ဝယ်
          </Link>
          <button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            + Supplier အသစ်
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded shadow p-4 mb-4 grid grid-cols-2 gap-3">
          <input placeholder="နာမည် *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="border p-2 rounded" />
          <input placeholder="ဖုန်း" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="border p-2 rounded" />
          <input placeholder="ကုမ္ပဏီ" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} className="border p-2 rounded" />
          <input placeholder="လိပ်စာ" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} className="border p-2 rounded" />
          <textarea placeholder="မှတ်ချက်" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className="border p-2 rounded col-span-2" rows={2} />
          <button onClick={save} className="bg-green-600 text-white py-2 rounded col-span-2">သိမ်း</button>
        </div>
      )}

      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="🔍 နာမည် / ဖုန်း / ကုမ္ပဏီ ရှာ"
        className="border p-3 rounded w-full max-w-md mb-4"
      />

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="p-3 text-left">နာမည်</th>
              <th className="p-3 text-left">ဖုန်း</th>
              <th className="p-3 text-left">ကုမ္ပဏီ</th>
              <th className="p-3 text-right">စုစုပေါင်း ဝယ်</th>
              <th className="p-3 text-right">ပေးပြီး</th>
              <th className="p-3 text-right">ကျန်</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Supplier မရှိပါ</td></tr>
            )}
            {list.map(s => {
              const st = stats[s.id] || { total: 0, paid: 0 }
              const bal = st.total - st.paid
              return (
                <tr key={s.id} className="border-t hover:bg-green-50">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{s.phone || '-'}</td>
                  <td className="p-3">{s.company || '-'}</td>
                  <td className="p-3 text-right">{st.total.toLocaleString()}</td>
                  <td className="p-3 text-right text-green-700">{st.paid.toLocaleString()}</td>
                  <td className={`p-3 text-right font-bold ${bal > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                    {bal.toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

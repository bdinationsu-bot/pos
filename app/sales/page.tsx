'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SalesHistory() {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(monthAgo)
  const [to, setTo] = useState(today)
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*, staff:staff_id(name)')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('id', { ascending: false })

    if (q) query = query.ilike('invoice_no', `%${q}%`)

    const { data } = await query
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [from, to, q])

  const total = list.reduce((s, x) => s + Number(x.total), 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Sales History</h1>
        <div className="text-sm text-gray-600">
          စုစုပေါင်း: <strong className="text-green-700">{total.toLocaleString()}</strong> Ks
        </div>
      </div>

      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <label className="text-sm">မှ</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
        <label className="text-sm">ထိ</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="🔍 Invoice No ရှာ"
          className="border p-2 rounded flex-1 max-w-xs" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-400">စစ်နေတယ်...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">Date / Time</th>
                <th className="p-3 text-left">Staff</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3 text-right">Trade-in</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Print</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Sale မရှိပါ</td></tr>
              )}
              {list.map(s => (
                <tr key={s.id} className="border-t hover:bg-green-50">
                  <td className="p-3 font-mono text-xs">
                    <Link href={`/sales/${s.id}`} className="text-green-700 font-medium hover:underline">
                      {s.invoice_no}
                    </Link>
                  </td>
                  <td className="p-3">
                    <div>{new Date(s.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="p-3 text-gray-600">{s.staff?.name || '-'}</td>
                  <td className="p-3 text-right">{Number(s.subtotal).toLocaleString()}</td>
                  <td className="p-3 text-right text-orange-600">
                    {Number(s.discount) > 0 ? `-${Number(s.discount).toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-right text-blue-600">
                    {Number(s.tradein_amount) > 0 ? `-${Number(s.tradein_amount).toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-right font-bold text-green-700">
                    {Number(s.total).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => window.open(`/print/invoice/${s.id}`, '_blank', 'width=400,height=700')}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      🖨️ Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

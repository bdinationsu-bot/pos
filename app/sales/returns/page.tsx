'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SalesReturnsPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
  const [to, setTo] = useState(new Date().toISOString().slice(0,10))
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    let query = supabase
      .from('sales_returns')
      .select('*')
      .gte('return_date', from)
      .lte('return_date', to)
      .order('id', { ascending: false })
    if (q) query = query.ilike('return_no', `%${q}%`)
    const { data } = await query
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [from, to, q])

  const total = list.reduce((s, x) => s + Number(x.total), 0)
  const totalRefund = list.reduce((s, x) => s + Number(x.refund_amount), 0)
  const totalCredit = list.reduce((s, x) => s + Number(x.credit_amount), 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">↩️ Sales Returns</h1>
        <Link href="/sales/returns/new" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">
          + Return အသစ်
        </Link>
      </div>

      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <label className="text-sm">မှ</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
        <label className="text-sm">ထိ</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Return No ရှာ"
          className="border p-2 rounded flex-1 max-w-xs" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
          <div className="text-xs text-gray-600">စုစုပေါင်း Return</div>
          <div className="text-xl font-bold text-blue-700">{total.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-red-500">
          <div className="text-xs text-gray-600">Refund ပြန်ပေး</div>
          <div className="text-xl font-bold text-red-700">{totalRefund.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-orange-500">
          <div className="text-xs text-gray-600">Credit ပေး</div>
          <div className="text-xl font-bold text-orange-700">{totalCredit.toLocaleString()} Ks</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? <p className="p-8 text-center text-gray-400">စစ်နေတယ်...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-red-50">
              <tr>
                <th className="p-3 text-left">Return No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-center">Type</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Refund</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Return မရှိပါ</td></tr>
              )}
              {list.map(r => (
                <tr key={r.id} className="border-t hover:bg-red-50">
                  <td className="p-3 font-mono text-xs font-bold text-red-700">{r.return_no}</td>
                  <td className="p-3">{r.return_date}</td>
                  <td className="p-3">
                    <div>{r.customer_name || '-'}</div>
                    <div className="text-xs text-gray-500">{r.customer_phone}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      r.return_type === 'refund' ? 'bg-red-100 text-red-800' :
                      r.return_type === 'credit' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>{r.return_type}</span>
                  </td>
                  <td className="p-3 text-right font-bold">{Number(r.total).toLocaleString()}</td>
                  <td className="p-3 text-right text-red-700">
                    {Number(r.refund_amount) > 0 ? Number(r.refund_amount).toLocaleString() : '-'}
                  </td>
                  <td className="p-3 text-right text-orange-700">
                    {Number(r.credit_amount) > 0 ? Number(r.credit_amount).toLocaleString() : '-'}
                  </td>
                  <td className="p-3 text-xs text-gray-600">{r.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

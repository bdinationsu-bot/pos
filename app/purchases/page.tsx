'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import DateRangeFilter, { type DateRange, getRangeFromPreset } from '@/components/DateRangeFilter'

export default function PurchasesPage() {
  const [range, setRange] = useState<DateRange>(() => {
    const r = getRangeFromPreset('month')
    return { ...r, preset: 'month' }
  })
  const [list, setList] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [payFilter, setPayFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  async function load() {
    let query = supabase
      .from('purchases')
      .select('*, supplier:supplier_id(name)')
      .gte('purchase_date', range.from)
      .lte('purchase_date', range.to)
      .order('id', { ascending: false })

    if (q) query = query.ilike('purchase_no', `%${q}%`)
    if (typeFilter !== 'all') query = query.eq('purchase_type', typeFilter)

    const { data } = await query
    let rows = data ?? []
    if (payFilter === 'paid') rows = rows.filter(r => Number(r.balance) === 0)
    if (payFilter === 'unpaid') rows = rows.filter(r => Number(r.balance) > 0)
    setList(rows)
  }
  useEffect(() => { load() }, [range, q, payFilter, typeFilter])

  const total = list.reduce((s, x) => s + Number(x.total), 0)
  const paid = list.reduce((s, x) => s + Number(x.paid), 0)
  const balance = total - paid

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">🛍️ Purchases</h1>
        <div className="flex gap-2">
          <Link href="/purchases/returns" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-medium">
            ↩️ Returns
          </Link>
          <Link href="/purchases/new" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            + Purchase အသစ်
          </Link>
        </div>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
          <div className="text-xs text-gray-600">PO အရေအတွက်</div>
          <div className="text-xl font-bold text-blue-700">{list.length} ခု</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-purple-500">
          <div className="text-xs text-gray-600">စုစုပေါင်းဝယ်</div>
          <div className="text-xl font-bold text-purple-700">{total.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-green-500">
          <div className="text-xs text-gray-600">ပေးပြီး</div>
          <div className="text-xl font-bold text-green-700">{paid.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-red-500">
          <div className="text-xs text-gray-600">ကျန်ငွေ</div>
          <div className="text-xl font-bold text-red-700">{balance.toLocaleString()} Ks</div>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 PO No ရှာ"
          className="border p-3 rounded flex-1 max-w-xs" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border p-3 rounded">
          <option value="all">Type အားလုံး</option>
          <option value="device">Device</option>
          <option value="accessory">Accessory</option>
          <option value="mixed">Mixed</option>
        </select>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} className="border p-3 rounded">
          <option value="all">ငွေအခြေအနေ အားလုံး</option>
          <option value="paid">ပေးပြီး</option>
          <option value="unpaid">ကျန်ငွေရှိ</option>
        </select>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="p-3 text-left">PO No</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Balance</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Purchase မရှိပါ</td></tr>
            )}
            {list.map(p => (
              <tr key={p.id} className="border-t hover:bg-green-50">
                <td className="p-3 font-mono text-xs">
                  <Link href={`/purchases/${p.id}`} className="text-green-700 font-medium hover:underline">
                    {p.purchase_no}
                  </Link>
                </td>
                <td className="p-3">{p.purchase_date}</td>
                <td className="p-3">{p.supplier?.name || '-'}</td>
                <td className="p-3 text-center capitalize text-xs">{p.purchase_type}</td>
                <td className="p-3 text-right">{Number(p.total).toLocaleString()}</td>
                <td className="p-3 text-right text-green-700">{Number(p.paid).toLocaleString()}</td>
                <td className={`p-3 text-right font-bold ${Number(p.balance) > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                  {Number(p.balance).toLocaleString()}
                </td>
                <td className="p-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <Link href={`/purchases/${p.id}`} className="text-blue-600 hover:underline text-xs">👁️</Link>
                    <button onClick={() => window.open(`/print/purchase/${p.id}`, '_blank', 'width=900,height=1200')}
                      className="text-green-600 hover:underline text-xs">🖨️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

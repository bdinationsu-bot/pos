'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PurchasesPage() {
  const [list, setList] = useState<any[]>([])
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
  const [to, setTo] = useState(new Date().toISOString().slice(0,10))

  async function load() {
    const { data } = await supabase
      .from('purchases')
      .select('*, supplier:supplier_id(name)')
      .gte('purchase_date', from)
      .lte('purchase_date', to)
      .order('id', { ascending: false })
    setList(data ?? [])
  }
  useEffect(() => { load() }, [from, to])

  const total = list.reduce((s, x) => s + Number(x.total), 0)
  const paid = list.reduce((s, x) => s + Number(x.paid), 0)
  const balance = total - paid

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Purchases</h1>
        <Link href="/purchases/new" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
          + Purchase အသစ်
        </Link>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <label className="text-sm">မှ</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
        <label className="text-sm">ထိ</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded shadow p-3 border-l-4 border-blue-500">
          <div className="text-xs text-gray-600">စုစုပေါင်း ဝယ်</div>
          <div className="text-xl font-bold text-blue-700">{total.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-3 border-l-4 border-green-500">
          <div className="text-xs text-gray-600">ပေးပြီး</div>
          <div className="text-xl font-bold text-green-700">{paid.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-3 border-l-4 border-red-500">
          <div className="text-xs text-gray-600">ကျန်ငွေ</div>
          <div className="text-xl font-bold text-red-700">{balance.toLocaleString()} Ks</div>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
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
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Purchase မရှိပါ</td></tr>
            )}
            {list.map(p => (
              <tr key={p.id} className="border-t hover:bg-green-50">
                <td className="p-3 font-mono text-xs"><Link href={`/purchases/${p.id}`} className="text-green-700 font-medium hover:underline">{p.purchase_no}</Link></td>
                <td className="p-3">{p.purchase_date}</td>
                <td className="p-3">{p.supplier?.name || '-'}</td>
                <td className="p-3 text-center capitalize">{p.purchase_type}</td>
                <td className="p-3 text-right">{Number(p.total).toLocaleString()}</td>
                <td className="p-3 text-right text-green-700">{Number(p.paid).toLocaleString()}</td>
                <td className={`p-3 text-right font-bold ${Number(p.balance) > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                  {Number(p.balance).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

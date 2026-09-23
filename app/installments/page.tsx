'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InstallmentsPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')

  async function load() {
    setLoading(true)
    let query = supabase.from('installment_summary').select('*').order('id', { ascending: false })
    if (typeFilter !== 'all') query = query.eq('installment_type', typeFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query
    let rows = data ?? []
    if (q) {
      const ql = q.toLowerCase()
      rows = rows.filter(r =>
        r.installment_no?.toLowerCase().includes(ql) ||
        r.customer_name?.toLowerCase().includes(ql) ||
        r.customer_phone?.toLowerCase().includes(ql)
      )
    }
    setList(rows)
    setLoading(false)
  }
  useEffect(() => { load() }, [q, typeFilter, statusFilter])

  // Summary
  const r2oList = list.filter(i => i.installment_type === 'rent2own')
  const mhbList = list.filter(i => i.installment_type === 'maharbawga')
  const r2oBalance = r2oList.reduce((s, x) => s + Math.max(0, Number(x.microfinance_balance || 0)), 0)
  const mhbBalance = mhbList.reduce((s, x) => s + Math.max(0, Number(x.microfinance_balance || 0)), 0)
  const totalBalance = r2oBalance + mhbBalance
  const r2oCount = r2oList.filter(i => Number(i.microfinance_balance || 0) > 0).length
  const mhbCount = mhbList.filter(i => Number(i.microfinance_balance || 0) > 0).length

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">💳 Installments</h1>
        <Link href="/pos" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
          + POS မှ ရောင်း
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-5">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm opacity-90">🏠 Rent2Own — MF ရရန်ကျန်</div>
            <div className="text-2xl">🔑</div>
          </div>
          <div className="text-3xl font-bold mb-1">{r2oBalance.toLocaleString()}</div>
          <div className="text-xs opacity-80">Ks • {r2oCount} invoice ကျန်</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-5">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm opacity-90">🕌 Maharbawga — MF ရရန်ကျန်</div>
            <div className="text-2xl">💎</div>
          </div>
          <div className="text-3xl font-bold mb-1">{mhbBalance.toLocaleString()}</div>
          <div className="text-xs opacity-80">Ks • {mhbCount} invoice ကျန်</div>
        </div>
        
      
        <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-lg shadow-lg p-5">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm opacity-90">💼 Microfinance ရရန်ကျန်</div>
            <div className="text-2xl">💰</div>
          </div>
          <div className="text-3xl font-bold mb-1">
            {(list.filter(i => i.microfinance_name).reduce((s, x) => s + Math.max(0, Number(x.balance)), 0)).toLocaleString()}
          </div>
          <div className="text-xs opacity-80">Ks • {list.filter(i => i.microfinance_name && Number(i.balance) > 0).length} invoice</div>
        </div>
</div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="🔍 No / Customer ရှာ"
          className="border p-3 rounded flex-1 max-w-md" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border p-3 rounded">
          <option value="all">Type အားလုံး</option>
          <option value="rent2own">🏠 Rent2Own</option>
          <option value="maharbawga">🕌 Maharbawga</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border p-3 rounded">
          <option value="all">Status အားလုံး</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? <p className="p-8 text-center text-gray-400">...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 text-left">No</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">DP</th>
                <th className="p-3 text-right">Financed</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">MF Balance</th>
                <th className="p-3 text-center">Progress</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-gray-400">Installment မရှိပါ</td></tr>
              )}
              {list.map(i => {
                const progress = Number(i.financed_amount) > 0
                  ? Math.min(100, (Number(i.total_paid) - Number(i.down_payment)) / Number(i.financed_amount) * 100)
                  : 0
                return (
                  <tr key={i.id} className="border-t hover:bg-green-50">
                    <td className="p-3 font-mono text-xs font-bold">
                      <Link href={`/installments/${i.id}`} className="text-green-700 hover:underline">
                        {i.installment_no}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        i.installment_type === 'rent2own'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {i.installment_type === 'rent2own' ? '🏠 Rent2Own' : '🕌 Maharbawga'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{i.customer_name || '-'}</div>
                      <div className="text-xs text-gray-500">{i.customer_phone}</div>
                    </td>
                    <td className="p-3 text-right">{Number(i.total_amount).toLocaleString()}</td>
                    <td className="p-3 text-right text-blue-700">{Number(i.down_payment).toLocaleString()}</td>
                    <td className="p-3 text-right">{Number(i.financed_amount).toLocaleString()}</td>
                    <td className="p-3 text-right text-green-700">{Number(i.total_paid).toLocaleString()}</td>
                    <td className={`p-3 text-right font-bold ${Number(i.microfinance_balance) > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                      {Number(i.microfinance_balance).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mx-auto">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: progress + '%' }} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{i.paid_count}/{i.installments_count}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        i.status === 'active' ? 'bg-green-100 text-green-800' :
                        i.status === 'completed' ? 'bg-gray-200 text-gray-700' :
                        i.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{i.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

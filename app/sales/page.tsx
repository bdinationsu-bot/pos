'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import DateRangeFilter, { type DateRange, getRangeFromPreset } from '@/components/DateRangeFilter'

export default function SalesHistory() {
  const [range, setRange] = useState<DateRange>(() => {
    const r = getRangeFromPreset('month')
    return { ...r, preset: 'month' }
  })
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [payFilter, setPayFilter] = useState('all')

  async function load() {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select('*, staff:staff_id(name)')
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`)
      .order('id', { ascending: false })

    if (q) query = query.ilike('invoice_no', `%${q}%`)
    if (payFilter !== 'all') query = query.eq('payment_status', payFilter)

    const { data } = await query
    setList(data ?? [])
    setSelected(new Set())
    setLoading(false)
  }
  useEffect(() => { load() }, [range, q, payFilter])

  function toggle(id: number) {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSelected(s)
  }

  function toggleAll() {
    if (selected.size === list.length) setSelected(new Set())
    else setSelected(new Set(list.map(s => s.id)))
  }

  async function deleteSelected() {
    if (selected.size === 0) return alert('Sale ရွေးပါ')
    const total = list.filter(s => selected.has(s.id)).reduce((sum, s) => sum + Number(s.total), 0)
    if (!confirm(`⚠️ Sale ${selected.size} ခု ဖျက်မှာ သေချာလား?\n\nစုစုပေါင်း: ${total.toLocaleString()} Ks`)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။')) return
    setDeleting(true)
    let ok = 0, fail = 0
    for (const id of Array.from(selected)) {
      const { error } = await supabase.rpc('delete_sale', { p_sale_id: id })
      if (error) fail++; else ok++
    }
    setDeleting(false)
    alert(`✅ ${ok} ခု ဖျက်ပြီး${fail > 0 ? `\n❌ ${fail} ခု မဖျက်နိုင်ဘူး` : ''}`)
    load()
  }

  async function deleteOne(id: number, invoiceNo: string) {
    if (!confirm(`⚠️ ${invoiceNo} ကို ဖျက်မှာ သေချာလား?`)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။')) return
    setDeleting(true)
    const { error } = await supabase.rpc('delete_sale', { p_sale_id: id })
    setDeleting(false)
    if (error) return alert('❌ ' + error.message)
    alert('✅ ဖျက်ပြီးပါပြီ')
    load()
  }

  const total = list.reduce((s, x) => s + Number(x.total), 0)
  const totalDiscount = list.reduce((s, x) => s + Number(x.discount), 0)
  const totalTradein = list.reduce((s, x) => s + Number(x.tradein_amount), 0)
  const selectedTotal = list.filter(s => selected.has(s.id)).reduce((s, x) => s + Number(x.total), 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">🧾 Sales History</h1>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter value={range} onChange={setRange} />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
          <div className="text-xs text-gray-600">စုစုပေါင်း</div>
          <div className="text-xl font-bold text-blue-700">{list.length} ခု</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-green-500">
          <div className="text-xs text-gray-600">Revenue</div>
          <div className="text-xl font-bold text-green-700">{total.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-orange-500">
          <div className="text-xs text-gray-600">Discount</div>
          <div className="text-xl font-bold text-orange-700">{totalDiscount.toLocaleString()} Ks</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-purple-500">
          <div className="text-xs text-gray-600">Trade-in</div>
          <div className="text-xl font-bold text-purple-700">{totalTradein.toLocaleString()} Ks</div>
        </div>
      </div>

      {/* Search + Payment Filter */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Invoice No ရှာ"
          className="border p-3 rounded flex-1 max-w-xs" />
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} className="border p-3 rounded">
          <option value="all">Payment အားလုံး</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded p-3 mb-4 flex justify-between items-center">
          <div className="text-sm font-medium text-red-800">
            ⚠️ Sale {selected.size} ခု — <strong>{selectedTotal.toLocaleString()} Ks</strong>
          </div>
          <div className="flex gap-2">
            <button onClick={deleteSelected} disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50">
              {deleting ? '...' : `🗑️ ဖျက် (${selected.size})`}
            </button>
            <button onClick={() => setSelected(new Set())} className="bg-gray-200 px-4 py-2 rounded font-medium text-sm">
              ပယ်ဖျက်
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? <p className="p-8 text-center text-gray-400">...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 w-10">
                  <input type="checkbox" checked={selected.size === list.length && list.length > 0} onChange={toggleAll} />
                </th>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Staff</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Sale မရှိပါ</td></tr>
              )}
              {list.map(s => (
                <tr key={s.id} className={`border-t hover:bg-green-50 ${selected.has(s.id) ? 'bg-red-50' : ''}`}>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  </td>
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
                  <td className="p-3 text-right font-bold text-green-700">{Number(s.total).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      s.payment_status === 'refunded' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>{s.payment_status}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => window.open(`/print/invoice/${s.id}`, '_blank', 'width=900,height=1200')}
                        className="text-blue-600 hover:underline text-xs">🖨️</button>
                      <button onClick={() => deleteOne(s.id, s.invoice_no)} disabled={deleting}
                        className="text-red-600 hover:underline text-xs disabled:opacity-50">🗑️</button>
                    </div>
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

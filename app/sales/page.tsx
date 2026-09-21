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
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

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
    setSelected(new Set())
    setLoading(false)
  }
  useEffect(() => { load() }, [from, to, q])

  function toggle(id: number) {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelected(s)
  }

  function toggleAll() {
    if (selected.size === list.length) setSelected(new Set())
    else setSelected(new Set(list.map(s => s.id)))
  }

  async function deleteSelected() {
    if (selected.size === 0) return alert('Sale ရွေးပါ')

    const total = list
      .filter(s => selected.has(s.id))
      .reduce((sum, s) => sum + Number(s.total), 0)

    const msg = `⚠️ Sale ${selected.size} ခု ဖျက်မှာ သေချာလား?\n\n` +
      `စုစုပေါင်း: ${total.toLocaleString()} Ks\n\n` +
      `• Device status → in_stock ပြန်\n` +
      `• Cashbook entry ဖျက်\n` +
      `• Payment records ဖျက်\n` +
      `• ပြန်ယူလို့ မရပါ`

    if (!confirm(msg)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။ DELETE ဖြစ်သွားရင် ပြန်မရနိုင်ပါ။')) return

    setDeleting(true)
    let success = 0
    let failed = 0

    for (const id of Array.from(selected)) {
      const { error } = await supabase.rpc('delete_sale', { p_sale_id: id })
      if (error) {
        console.error('Delete error:', error)
        failed++
      } else {
        success++
      }
    }

    setDeleting(false)
    alert(`✅ ${success} ခု ဖျက်ပြီး${failed > 0 ? `\n❌ ${failed} ခု မဖျက်နိုင်ဘူး` : ''}`)
    load()
  }

  async function deleteOne(id: number, invoiceNo: string) {
    if (!confirm(`⚠️ ${invoiceNo} ကို ဖျက်မှာ သေချာလား?\n\nDevice status → in_stock ပြန်မယ်`)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။')) return

    setDeleting(true)
    const { error } = await supabase.rpc('delete_sale', { p_sale_id: id })
    setDeleting(false)

    if (error) return alert('❌ Error: ' + error.message)
    alert('✅ ဖျက်ပြီးပါပြီ')
    load()
  }

  const total = list.reduce((s, x) => s + Number(x.total), 0)
  const selectedTotal = list
    .filter(s => selected.has(s.id))
    .reduce((s, x) => s + Number(x.total), 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Sales History</h1>
        <div className="text-sm text-gray-600">
          စုစုပေါင်း: <strong className="text-green-700">{total.toLocaleString()}</strong> Ks
          {' '}({list.length} ခု)
        </div>
      </div>

      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <label className="text-sm">မှ</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
        <label className="text-sm">ထိ</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Invoice No ရှာ"
          className="border p-2 rounded flex-1 max-w-xs"
        />
      </div>

      {selected.size > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded p-3 mb-4 flex justify-between items-center">
          <div className="text-sm font-medium text-red-800">
            ⚠️ Sale {selected.size} ခု ရွေးထားပြီ — စုစုပေါင်း <strong>{selectedTotal.toLocaleString()} Ks</strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-50"
            >
              {deleting ? 'ဖျက်နေတယ်...' : `🗑️ ဖျက် (${selected.size})`}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-medium text-sm"
            >
              ပယ်ဖျက်
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <p className="p-8 text-center text-gray-400">စစ်နေတယ်...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === list.length && list.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">Date / Time</th>
                <th className="p-3 text-left">Staff</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3 text-right">Trade-in</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400">Sale မရှိပါ</td></tr>
              )}
              {list.map(s => (
                <tr
                  key={s.id}
                  className={`border-t hover:bg-green-50 ${selected.has(s.id) ? 'bg-red-50' : ''}`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
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
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => window.open(`/print/invoice/${s.id}`, '_blank', 'width=900,height=1200')}
                        className="text-blue-600 hover:underline text-xs"
                        title="Print"
                      >
                        🖨️
                      </button>
                      <button
                        onClick={() => deleteOne(s.id, s.invoice_no)}
                        disabled={deleting}
                        className="text-red-600 hover:underline text-xs disabled:opacity-50"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && (
        <div className="mt-3 text-sm text-gray-500 flex justify-between">
          <div>စုစုပေါင်း: <strong className="text-green-700">{list.length}</strong> sale</div>
          {selected.size > 0 && (
            <div>ရွေးထား: <strong className="text-red-700">{selected.size}</strong></div>
          )}
        </div>
      )}
    </div>
  )
}

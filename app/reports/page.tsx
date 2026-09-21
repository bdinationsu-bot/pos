'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [sales, setSales] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const from = `${date}T00:00:00`
      const to = `${date}T23:59:59`

      const { data: s } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', from)
        .lte('created_at', to)
      setSales(s ?? [])

      const ids = (s ?? []).map(x => x.id)
      if (ids.length) {
        const { data: it } = await supabase.from('sale_items').select('*').in('sale_id', ids)
        setItems(it ?? [])
      } else {
        setItems([])
      }

      const { data: e } = await supabase.from('expenses').select('*').eq('spent_at', date)
      setExpenses(e ?? [])
      setLoading(false)
    })()
  }, [date])

  const revenue = sales.reduce((s, x) => s + Number(x.total), 0)
  const cogs = items.reduce((s, x) => s + Number(x.cost) * x.qty, 0)
  const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const grossProfit = revenue - cogs
  const netProfit = grossProfit - expenseTotal

  const cards = [
    { label: 'Revenue', value: revenue, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'COGS', value: cogs, color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'Gross Profit', value: grossProfit, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Expenses', value: expenseTotal, color: 'text-red-700', bg: 'bg-red-50' },
    { label: 'Net Profit', value: netProfit, color: 'text-purple-700', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} border rounded p-3`}>
            <div className="text-xs text-gray-600">{c.label}</div>
            <div className={`text-lg font-bold ${c.color}`}>
              {c.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <p>စစ်နေတယ်...</p>
      ) : (
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-3">Sale ({sales.length} ခု)</h2>
          {sales.length === 0 ? (
            <p className="text-gray-400 text-center py-6">ဒီနေ့ ရောင်းမှု မရှိပါ</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Invoice</th>
                  <th className="p-2 text-right">Subtotal</th>
                  <th className="p-2 text-right">Discount</th>
                  <th className="p-2 text-right">Trade-in</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{s.invoice_no}</td>
                    <td className="p-2 text-right">{Number(s.subtotal).toLocaleString()}</td>
                    <td className="p-2 text-right">{Number(s.discount).toLocaleString()}</td>
                    <td className="p-2 text-right">{Number(s.tradein_amount).toLocaleString()}</td>
                    <td className="p-2 text-right font-bold">{Number(s.total).toLocaleString()}</td>
                    <td className="p-2 text-gray-500">
                      {new Date(s.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

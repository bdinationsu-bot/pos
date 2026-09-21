'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EXPENSE_CATEGORIES } from '../pos/payment-options'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function AccountingPage() {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today)
  const [sales, setSales] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('summary')

  const [expForm, setExpForm] = useState({ category: 'rent', amount: 0, note: '', spent_at: today })
  const [showExpForm, setShowExpForm] = useState(false)

  async function load() {
    setLoading(true)
    const fromISO = `${from}T00:00:00`
    const toISO = `${to}T23:59:59`

    const { data: s } = await supabase.from('sales').select('*')
      .gte('created_at', fromISO).lte('created_at', toISO)
    setSales(s ?? [])

    const ids = (s ?? []).map(x => x.id)
    if (ids.length) {
      const { data: it } = await supabase.from('sale_items').select('*').in('sale_id', ids)
      setItems(it ?? [])
    } else setItems([])

    const { data: e } = await supabase.from('expenses').select('*')
      .gte('spent_at', from).lte('spent_at', to)
    setExpenses(e ?? [])

    const { data: p } = await supabase.from('purchases').select('*')
      .gte('purchase_date', from).lte('purchase_date', to)
    setPurchases(p ?? [])

    setLoading(false)
  }
  useEffect(() => { load() }, [from, to])

  // === P&L Calculations ===
  const revenue = sales.reduce((s, x) => s + Number(x.total), 0)
  const cogs = items.reduce((s, x) => s + Number(x.cost) * x.qty, 0)
  const grossProfit = revenue - cogs
  const gpMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

  const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const netProfit = grossProfit - expenseTotal
  const npMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const purchaseTotal = purchases.reduce((s, x) => s + Number(x.total), 0)
  const purchasePaid = purchases.reduce((s, x) => s + Number(x.paid), 0)
  const purchaseBalance = purchaseTotal - purchasePaid

  // Expenses by category
  const expByCat: Record<string, number> = {}
  expenses.forEach(e => {
    expByCat[e.category] = (expByCat[e.category] || 0) + Number(e.amount)
  })

  async function addExpense() {
    if (!expForm.amount) return alert('ပမာဏ ထည့်ပါ')
    const { error } = await supabase.from('expenses').insert(expForm)
    if (error) return alert(error.message)
    await supabase.from('cash_transactions').insert({
      type: 'out', amount: expForm.amount, ref_type: 'expense', note: expForm.note
    })
    setExpForm({ category: 'rent', amount: 0, note: '', spent_at: today })
    setShowExpForm(false)
    load()
  }

  async function exportPDF() {
    const doc = new jsPDF()
    doc.setFillColor(22, 163, 74)
    doc.rect(0, 0, 210, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text('Profit & Loss Statement', 14, 14)
    doc.setFontSize(10)
    doc.text(`${from} → ${to}`, 14, 21)

    doc.setTextColor(0, 0, 0)
    let y = 35
    doc.setFontSize(12)
    doc.text('Income Statement', 14, y); y += 6

    autoTable(doc, {
      startY: y,
      head: [['Item', 'Amount (Ks)']],
      body: [
        ['Revenue', revenue.toLocaleString()],
        ['Cost of Goods Sold (COGS)', `(${cogs.toLocaleString()})`],
        ['Gross Profit', grossProfit.toLocaleString()],
        [`GP Margin`, `${gpMargin.toFixed(2)}%`],
        ['Expenses', `(${expenseTotal.toLocaleString()})`],
        ['Net Profit', netProfit.toLocaleString()],
        [`NP Margin`, `${npMargin.toFixed(2)}%`]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 163, 74] }
    })

    y = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Expenses by Category', 14, y); y += 4
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount (Ks)']],
      body: Object.entries(expByCat).map(([k, v]) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.code === k)
        return [cat?.name || k, v.toLocaleString()]
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [220, 38, 38] }
    })

    y = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text('Purchases Summary', 14, y); y += 4
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Amount (Ks)']],
      body: [
        ['Total Purchases', purchaseTotal.toLocaleString()],
        ['Paid', purchasePaid.toLocaleString()],
        ['Balance (Payable)', purchaseBalance.toLocaleString()]
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save(`pnl-${from}-to-${to}.pdf`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Accounting</h1>
        <button onClick={exportPDF} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
          📄 PDF Export
        </button>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <label className="text-sm">မှ</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
        <label className="text-sm">ထိ</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />
        <button onClick={() => setShowExpForm(!showExpForm)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium ml-auto">
          + Expense ထည့်
        </button>
      </div>

      {showExpForm && (
        <div className="bg-white rounded shadow p-4 mb-4 grid grid-cols-4 gap-3">
          <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })} className="border p-2 rounded">
            {EXPENSE_CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <input type="number" placeholder="ပမာဏ" value={expForm.amount || ''} onChange={e => setExpForm({ ...expForm, amount: +e.target.value })} className="border p-2 rounded" />
          <input type="date" value={expForm.spent_at} onChange={e => setExpForm({ ...expForm, spent_at: e.target.value })} className="border p-2 rounded" />
          <input placeholder="မှတ်ချက်" value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })} className="border p-2 rounded" />
          <button onClick={addExpense} className="bg-red-600 text-white py-2 rounded col-span-4">သိမ်း</button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['summary', 'expenses', 'purchases'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded font-medium capitalize ${tab === t ? 'bg-green-600 text-white' : 'bg-white border'}`}>
            {t === 'summary' ? 'P&L Summary' : t === 'expenses' ? 'Expenses' : 'Purchases'}
          </button>
        ))}
      </div>

      {loading ? <p>စစ်နေတယ်...</p> : (
        <>
          {tab === 'summary' && (
            <>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
                  <div className="text-xs text-gray-600">Revenue (ဝင်ငွေ)</div>
                  <div className="text-2xl font-bold text-blue-700">{revenue.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded shadow p-4 border-l-4 border-orange-500">
                  <div className="text-xs text-gray-600">COGS</div>
                  <div className="text-2xl font-bold text-orange-700">{cogs.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded shadow p-4 border-l-4 border-green-500">
                  <div className="text-xs text-gray-600">Gross Profit (GP)</div>
                  <div className="text-2xl font-bold text-green-700">{grossProfit.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">Margin: {gpMargin.toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded shadow p-4 border-l-4 border-red-500">
                  <div className="text-xs text-gray-600">Expenses</div>
                  <div className="text-2xl font-bold text-red-700">{expenseTotal.toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-white rounded shadow p-6 mb-4 border-2 border-green-500">
                <div className="text-sm text-gray-600">Net Profit (NP)</div>
                <div className={`text-4xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {netProfit.toLocaleString()} Ks
                </div>
                <div className="text-sm text-gray-500 mt-1">Margin: {npMargin.toFixed(2)}%</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded shadow p-4">
                  <div className="text-xs text-gray-600">Total Purchases</div>
                  <div className="text-xl font-bold text-blue-700">{purchaseTotal.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded shadow p-4">
                  <div className="text-xs text-gray-600">Paid to Suppliers</div>
                  <div className="text-xl font-bold text-green-700">{purchasePaid.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded shadow p-4">
                  <div className="text-xs text-gray-600">Supplier Payable</div>
                  <div className="text-xl font-bold text-red-700">{purchaseBalance.toLocaleString()}</div>
                </div>
              </div>
            </>
          )}

          {tab === 'expenses' && (
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-red-50">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Note</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">Expense မရှိပါ</td></tr>
                  )}
                  {expenses.map(e => {
                    const cat = EXPENSE_CATEGORIES.find(c => c.code === e.category)
                    return (
                      <tr key={e.id} className="border-t">
                        <td className="p-3">{e.spent_at}</td>
                        <td className="p-3">{cat?.name || e.category}</td>
                        <td className="p-3 text-gray-600">{e.note || '-'}</td>
                        <td className="p-3 text-right text-red-700 font-bold">
                          {Number(e.amount).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'purchases' && (
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="p-3 text-left">PO No</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-center">Type</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Purchase မရှိပါ</td></tr>
                  )}
                  {purchases.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{p.purchase_no}</td>
                      <td className="p-3">{p.purchase_date}</td>
                      <td className="p-3 text-center capitalize">{p.purchase_type}</td>
                      <td className="p-3 text-right">{Number(p.total).toLocaleString()}</td>
                      <td className="p-3 text-right text-green-700">{Number(p.paid).toLocaleString()}</td>
                      <td className={`p-3 text-right font-bold ${Number(p.balance) > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                        {Number(p.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

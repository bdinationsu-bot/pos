'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  EXPENSE_CATEGORIES, EXPENSE_METHODS,
  getCategoryName, getMethodName
} from '@/lib/accounting'
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
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('summary')

  // Expense Form
  const [showExpForm, setShowExpForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedCode, setSelectedCode] = useState<string>('')
  const [expForm, setExpForm] = useState({
    expense_code: '',
    category: 'rent',
    amount: 0,
    note: '',
    spent_at: today,
    payment_method: 'cash',
    ref_no: ''
  })

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
      .order('spent_at', { ascending: false })
    setExpenses(e ?? [])

    const { data: p } = await supabase.from('purchases').select('*')
      .gte('purchase_date', from).lte('purchase_date', to)
    setPurchases(p ?? [])

    const { data: c } = await supabase.from('expense_codes')
      .select('*').eq('active', true).order('code')
    setCodes(c ?? [])

    setLoading(false)
  }
  useEffect(() => { load() }, [from, to])

  // === Calculations ===
  const revenue = sales.reduce((s, x) => s + Number(x.total), 0)
  const cogs = items.reduce((s, x) => s + Number(x.cost) * x.qty, 0)
  const focItems = items.filter(x => x.is_foc)
  const focCost = focItems.reduce((s, x) => s + Number(x.cost) * x.qty, 0)
  const focRetailValue = focItems.reduce((s, x) => s + Number(x.price) * x.qty, 0)
  const grossProfit = revenue - cogs
  const gpMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const netProfit = grossProfit - expenseTotal
  const npMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const purchaseTotal = purchases.reduce((s, x) => s + Number(x.total), 0)
  const purchasePaid = purchases.reduce((s, x) => s + Number(x.paid), 0)
  const purchaseBalance = purchaseTotal - purchasePaid

  const expByCat: Record<string, number> = {}
  expenses.forEach(e => {
    expByCat[e.category] = (expByCat[e.category] || 0) + Number(e.amount)
  })

  // === Code Selection ===
  function onCodeSelect(code: string) {
    setSelectedCode(code)
    if (!code) return
    const c = codes.find(x => x.code === code)
    if (!c) return
    setExpForm({
      ...expForm,
      expense_code: c.code,
      category: c.category,
      amount: Number(c.default_amount) || expForm.amount,
      note: c.note || expForm.note
    })
  }

  function resetForm() {
    setExpForm({
      expense_code: '',
      category: 'rent',
      amount: 0,
      note: '',
      spent_at: today,
      payment_method: 'cash',
      ref_no: ''
    })
    setEditId(null)
    setSelectedCode('')
  }

  function openEdit(exp: any) {
    setExpForm({
      expense_code: exp.expense_code || '',
      category: exp.category,
      amount: Number(exp.amount),
      note: exp.note || '',
      spent_at: exp.spent_at,
      payment_method: exp.payment_method || 'cash',
      ref_no: exp.ref_no || ''
    })
    setSelectedCode(exp.expense_code || '')
    setEditId(exp.id)
    setShowExpForm(true)
  }

  async function saveExpense() {
    if (!expForm.amount || expForm.amount <= 0) return alert('ပမာဏ ထည့်ပါ')

    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('expenses').update({
        expense_code: expForm.expense_code || null,
        category: expForm.category,
        amount: expForm.amount,
        note: expForm.note,
        spent_at: expForm.spent_at,
        payment_method: expForm.payment_method,
        ref_no: expForm.ref_no
      }).eq('id', editId)

      if (error) { setSaving(false); return alert(error.message) }
      alert('✅ ပြင်ပြီးပါပြီ')
    } else {
      const { error } = await supabase.from('expenses').insert({
        expense_code: expForm.expense_code || null,
        category: expForm.category,
        amount: expForm.amount,
        note: expForm.note,
        spent_at: expForm.spent_at,
        payment_method: expForm.payment_method,
        ref_no: expForm.ref_no
      })

      if (error) { setSaving(false); return alert(error.message) }

      await supabase.from('cash_transactions').insert({
        type: 'out',
        amount: expForm.amount,
        ref_type: 'expense',
        note: `${expForm.expense_code || expForm.category} — ${expForm.note}`
      })
      alert('✅ သိမ်းပြီးပါပြီ')
    }

    setSaving(false)
    setShowExpForm(false)
    resetForm()
    load()
  }

  async function deleteExpense(id: number) {
    if (!confirm('ဒီ expense ကို ဖျက်မှာ သေချာလား?')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  async function duplicateExpense(exp: any) {
    if (!confirm(`"${exp.note || exp.expense_code}" ကို ဒီနေ့ ပြန်ထည့်မှာ လား?`)) return
    const { error } = await supabase.from('expenses').insert({
      expense_code: exp.expense_code,
      category: exp.category,
      amount: exp.amount,
      note: exp.note,
      spent_at: today,
      payment_method: exp.payment_method,
      ref_no: exp.ref_no
    })
    if (error) return alert(error.message)
    await supabase.from('cash_transactions').insert({
      type: 'out',
      amount: exp.amount,
      ref_type: 'expense',
      note: `${exp.expense_code} — ${exp.note} (duplicate)`
    })
    alert('✅ ပြန်ထည့်ပြီးပါပြီ')
    load()
  }

  async function exportPDF() {
    const { data: shop } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
    const doc = new jsPDF()
    doc.setFillColor(22, 163, 74)
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(shop?.shop_name || 'POS', 14, 13)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Financial Report — GP & NP', 14, 22)
    doc.setFontSize(9)
    doc.text(`${from} → ${to}`, 195, 22, { align: 'right' })

    doc.setTextColor(0, 0, 0)
    let y = 42
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Profit & Loss Statement', 14, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Amount (Ks)']],
      body: [
        ['Revenue (Sales)', revenue.toLocaleString()],
        ['Cost of Goods Sold (COGS)', `(${cogs.toLocaleString()})`],
        ['', ''],
        ['GROSS PROFIT (GP)', grossProfit.toLocaleString()],
        [`GP Margin`, `${gpMargin.toFixed(2)}%`],
        ['', ''],
        ['Operating Expenses', `(${expenseTotal.toLocaleString()})`],
        ['', ''],
        ['NET PROFIT (NP)', netProfit.toLocaleString()],
        [`NP Margin`, `${npMargin.toFixed(2)}%`]
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
      didParseCell: (data) => {
        if (data.row.raw[0] === 'GROSS PROFIT (GP)' || data.row.raw[0] === 'NET PROFIT (NP)') {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [220, 252, 231]
          data.cell.styles.textColor = [22, 101, 52]
        }
      }
    })
    y = (doc as any).lastAutoTable.finalY + 10

    if (focItems.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('FOC (Free of Charge) Summary', 14, y)
      y += 4
      autoTable(doc, {
        startY: y,
        head: [['Item', 'Qty', 'Cost Value']],
        body: focItems.map(f => [f.name, f.qty, Number(f.cost).toLocaleString()]),
        foot: [['Total FOC Cost', '', focCost.toLocaleString()]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [234, 88, 12] }
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Expenses by Category', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount (Ks)']],
      body: Object.entries(expByCat).map(([k, v]) => [getCategoryName(k, 'en'), v.toLocaleString()]),
      foot: [['Total', expenseTotal.toLocaleString()]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] }
    })
    y = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Purchases Summary', 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Amount (Ks)']],
      body: [
        ['Total Purchases', purchaseTotal.toLocaleString()],
        ['Paid', purchasePaid.toLocaleString()],
        ['Balance (Payable)', purchaseBalance.toLocaleString()]
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    })
    doc.save(`financial-report-${from}-to-${to}.pdf`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Accounting</h1>
        <div className="flex gap-2">
          <a href="/expense-codes" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium">
            ⚙️ Expense Codes
          </a>
          <button onClick={() => { resetForm(); setShowExpForm(true) }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">
            + Expense ထည့်
          </button>
          <button onClick={exportPDF} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            📄 PDF
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <label className="text-sm">မှ</label>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border p-2 rounded" />
        <label className="text-sm">ထိ</label>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border p-2 rounded" />
      </div>

      {showExpForm && (
        <div className="bg-white rounded shadow p-4 mb-4 border-2 border-red-300">
          <h2 className="font-bold mb-3 text-red-700">
            {editId ? '✏️ Expense ပြင်' : '➕ Expense အသစ်'}
          </h2>

          {/* Quick Code Picker */}
          <div className="mb-3 p-3 bg-blue-50 border border-blue-300 rounded">
            <label className="block text-sm font-medium mb-1 text-blue-800">
              📋 Code ရွေး (Auto-fill)
            </label>
            <select
              value={selectedCode}
              onChange={e => onCodeSelect(e.target.value)}
              className="border p-2 rounded w-full"
            >
              <option value="">-- Code မရွေး (manual) --</option>
              {codes.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name_mm || c.name} {c.default_amount > 0 ? `(${Number(c.default_amount).toLocaleString()})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input value={expForm.expense_code}
                onChange={e => setExpForm({ ...expForm, expense_code: e.target.value })}
                placeholder="EXP-XXX-01"
                className="border p-2 rounded w-full font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">အမျိုးအစား</label>
              <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}
                className="border p-2 rounded w-full">
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.code} value={c.code}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ပမာဏ (Ks)</label>
              <input type="number" value={expForm.amount || ''}
                onChange={e => setExpForm({ ...expForm, amount: +e.target.value || 0 })}
                className="border p-2 rounded w-full text-lg font-bold" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ရက်စွဲ</label>
              <input type="date" value={expForm.spent_at}
                onChange={e => setExpForm({ ...expForm, spent_at: e.target.value })}
                className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ပေးချေနည်း</label>
              <select value={expForm.payment_method}
                onChange={e => setExpForm({ ...expForm, payment_method: e.target.value })}
                className="border p-2 rounded w-full">
                {EXPENSE_METHODS.map(m => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ref No</label>
              <input value={expForm.ref_no}
                onChange={e => setExpForm({ ...expForm, ref_no: e.target.value })}
                className="border p-2 rounded w-full" />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">မှတ်ချက်</label>
              <input value={expForm.note}
                onChange={e => setExpForm({ ...expForm, note: e.target.value })}
                className="border p-2 rounded w-full" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveExpense} disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50">
              {saving ? '...' : editId ? '💾 ပြင်' : '💾 သိမ်း'}
            </button>
            <button onClick={() => { setShowExpForm(false); resetForm() }}
              className="bg-gray-200 px-6 py-2 rounded font-medium">ပယ်ဖျက်</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['summary', 'expenses', 'foc', 'purchases'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded font-medium capitalize ${tab === t ? 'bg-green-600 text-white' : 'bg-white border'}`}>
            {t === 'summary' ? 'P&L Summary' : t === 'expenses' ? `Expenses (${expenses.length})` : t === 'foc' ? `FOC (${focItems.length})` : 'Purchases'}
          </button>
        ))}
      </div>

      {loading ? <p>စစ်နေတယ်...</p> : (
        <>
          {tab === 'summary' && (
            <>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
                  <div className="text-xs text-gray-600">Revenue</div>
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
                <div className="text-sm text-gray-600">Net Profit (NP) = GP - Expenses</div>
                <div className={`text-4xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {netProfit.toLocaleString()} Ks
                </div>
                <div className="text-sm text-gray-500 mt-1">Margin: {npMargin.toFixed(2)}%</div>
              </div>

              {focItems.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded p-4 mb-4">
                  <div className="font-bold text-orange-800 mb-2">🎁 FOC — COGS ထဲ ပါပြီ</div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><div className="text-gray-600 text-xs">Items</div><div className="font-bold">{focItems.length} မျိုး</div></div>
                    <div><div className="text-gray-600 text-xs">FOC Cost</div><div className="font-bold text-red-700">{focCost.toLocaleString()}</div></div>
                    <div><div className="text-gray-600 text-xs">Retail Value</div><div className="font-bold text-gray-500">{focRetailValue.toLocaleString()}</div></div>
                  </div>
                </div>
              )}

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
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">ရက်စွဲ</th>
                    <th className="p-3 text-left">အမျိုးအစား</th>
                    <th className="p-3 text-left">မှတ်ချက်</th>
                    <th className="p-3 text-right">ပမာဏ</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Expense မရှိပါ</td></tr>
                  )}
                  {expenses.map(e => (
                    <tr key={e.id} className="border-t hover:bg-red-50">
                      <td className="p-3 font-mono text-xs font-bold text-green-700">{e.expense_code || '-'}</td>
                      <td className="p-3">{e.spent_at}</td>
                      <td className="p-3">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                          {getCategoryName(e.category)}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">{e.note || '-'}</td>
                      <td className="p-3 text-right text-red-700 font-bold">{Number(e.amount).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => duplicateExpense(e)}
                            className="text-xs text-green-600 hover:underline" title="ဒီနေ့ ပြန်ထည့်">
                            📋 ပြန်ထည့်
                          </button>
                          <button onClick={() => openEdit(e)} className="text-xs text-blue-600 hover:underline">✏️</button>
                          <button onClick={() => deleteExpense(e.id)} className="text-xs text-red-600 hover:underline">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'foc' && (
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-left">အကြောင်းရင်း</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Retail</th>
                  </tr>
                </thead>
                <tbody>
                  {focItems.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">FOC item မရှိပါ</td></tr>
                  )}
                  {focItems.map(f => (
                    <tr key={f.id} className="border-t hover:bg-orange-50">
                      <td className="p-3">{f.name}</td>
                      <td className="p-3 text-center">{f.qty}</td>
                      <td className="p-3 text-xs">{f.foc_reason || '-'}</td>
                      <td className="p-3 text-right text-red-700">{Number(f.cost).toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-500 line-through">
                        {(Number(f.price) * f.qty).toLocaleString()}
                      </td>
                    </tr>
                  ))}
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

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DateRangeFilter, { type DateRange, getRangeFromPreset } from '@/components/DateRangeFilter'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type Tab = 'summary' | 'sales' | 'purchases' | 'expenses'

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>(() => {
    const r = getRangeFromPreset('month')
    return { ...r, preset: 'month' }
  })
  const [tab, setTab] = useState<Tab>('summary')
  const [loading, setLoading] = useState(true)

  const [sales, setSales] = useState<any[]>([])
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [purchaseItems, setPurchaseItems] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [shop, setShop] = useState<any>({})

  async function load() {
    setLoading(true)
    const fromISO = `${range.from}T00:00:00`
    const toISO = `${range.to}T23:59:59`

    // Sales
    const { data: s } = await supabase.from('sales').select('*')
      .gte('created_at', fromISO).lte('created_at', toISO)
      .order('created_at', { ascending: false })
    setSales(s ?? [])

    // Sale Items
    const saleIds = (s ?? []).map(x => x.id)
    if (saleIds.length) {
      const { data: si } = await supabase.from('sale_items').select('*').in('sale_id', saleIds)
      setSaleItems(si ?? [])
    } else setSaleItems([])

    // Purchases
    const { data: p } = await supabase.from('purchases').select('*, supplier:supplier_id(name)')
      .gte('purchase_date', range.from).lte('purchase_date', range.to)
      .order('purchase_date', { ascending: false })
    setPurchases(p ?? [])

    // Purchase Items
    const purchaseIds = (p ?? []).map(x => x.id)
    if (purchaseIds.length) {
      const { data: pi } = await supabase.from('purchase_items').select('*').in('purchase_id', purchaseIds)
      setPurchaseItems(pi ?? [])
    } else setPurchaseItems([])

    // Expenses
    const { data: e } = await supabase.from('expenses').select('*')
      .gte('spent_at', range.from).lte('spent_at', range.to)
      .order('spent_at', { ascending: false })
    setExpenses(e ?? [])

    // Shop
    const { data: sh } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
    setShop(sh || { shop_name: 'POS' })

    setLoading(false)
  }
  useEffect(() => { load() }, [range])

  // === Calculations ===
  const revenue = sales.filter(s => s.payment_status !== 'refunded').reduce((s, x) => s + Number(x.total), 0)
  const cogs = saleItems.reduce((s, x) => s + Number(x.cost) * x.qty, 0)
  const grossProfit = revenue - cogs
  const gpMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

  const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const netProfit = grossProfit - expenseTotal
  const npMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const purchaseTotal = purchases.reduce((s, x) => s + Number(x.total), 0)
  const purchasePaid = purchases.reduce((s, x) => s + Number(x.paid), 0)
  const purchaseBalance = purchaseTotal - purchasePaid

  const focItems = saleItems.filter(x => x.is_foc)
  const focCost = focItems.reduce((s, x) => s + Number(x.cost) * x.qty, 0)

  // Expenses by category
  const expByCat: Record<string, number> = {}
  expenses.forEach(e => {
    expByCat[e.category] = (expByCat[e.category] || 0) + Number(e.amount)
  })

  // ============ EXPORT PDF ============
  function exportPDF() {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(22, 163, 74)
    doc.rect(0, 0, 210, 32, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(shop.shop_name || 'POS', 14, 13)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Business Report', 14, 21)
    doc.setFontSize(9)
    doc.text(`${range.from} → ${range.to}`, 195, 21, { align: 'right' })
    doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 195, 27, { align: 'right' })

    doc.setTextColor(0, 0, 0)
    let y = 42

    // === SUMMARY ===
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('1. Summary', 14, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Value']],
      body: [
        ['Sales Count', `${sales.length}`],
        ['Revenue', `${revenue.toLocaleString()} Ks`],
        ['COGS', `${cogs.toLocaleString()} Ks`],
        ['GROSS PROFIT (GP)', `${grossProfit.toLocaleString()} Ks`],
        ['GP Margin', `${gpMargin.toFixed(2)}%`],
        ['', ''],
        ['Purchases', `${purchaseTotal.toLocaleString()} Ks`],
        ['Purchase Paid', `${purchasePaid.toLocaleString()} Ks`],
        ['Purchase Balance', `${purchaseBalance.toLocaleString()} Ks`],
        ['', ''],
        ['Expenses', `${expenseTotal.toLocaleString()} Ks`],
        ['NET PROFIT (NP)', `${netProfit.toLocaleString()} Ks`],
        ['NP Margin', `${npMargin.toFixed(2)}%`]
      ],
      styles: { fontSize: 10, cellPadding: 2.5 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
      didParseCell: (data: any) => {
        const raw = data.row.raw as any[]
        if (raw[0] === 'GROSS PROFIT (GP)' || raw[0] === 'NET PROFIT (NP)') {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [220, 252, 231]
          data.cell.styles.textColor = [22, 101, 52]
        }
      }
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // === SALES ===
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`2. Sales (${sales.length})`, 14, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['#', 'Invoice', 'Date', 'Subtotal', 'Discount', 'Total', 'Status']],
      body: sales.map((s, i) => [
        i + 1,
        s.invoice_no,
        new Date(s.created_at).toLocaleDateString(),
        Number(s.subtotal).toLocaleString(),
        Number(s.discount).toLocaleString(),
        Number(s.total).toLocaleString(),
        s.payment_status
      ]),
      foot: [['', '', '', '', 'Total:', revenue.toLocaleString(), '']],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74] },
      footStyles: { fillColor: [220, 252, 231], textColor: [22, 101, 52], fontStyle: 'bold' }
    })
    y = (doc as any).lastAutoTable.finalY + 10

    if (y > 250) { doc.addPage(); y = 20 }

    // === PURCHASES ===
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`3. Purchases (${purchases.length})`, 14, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['#', 'PO No', 'Date', 'Supplier', 'Total', 'Paid', 'Balance']],
      body: purchases.map((p, i) => [
        i + 1,
        p.purchase_no,
        p.purchase_date,
        p.supplier?.name || '-',
        Number(p.total).toLocaleString(),
        Number(p.paid).toLocaleString(),
        Number(p.balance).toLocaleString()
      ]),
      foot: [['', '', '', 'Total:', purchaseTotal.toLocaleString(), purchasePaid.toLocaleString(), purchaseBalance.toLocaleString()]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold' }
    })
    y = (doc as any).lastAutoTable.finalY + 10

    if (y > 250) { doc.addPage(); y = 20 }

    // === EXPENSES ===
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`4. Expenses (${expenses.length})`, 14, y)
    y += 3

    autoTable(doc, {
      startY: y,
      head: [['#', 'Date', 'Code', 'Category', 'Note', 'Amount']],
      body: expenses.map((e, i) => [
        i + 1,
        e.spent_at,
        e.expense_code || '-',
        e.category,
        (e.note || '-').substring(0, 30),
        Number(e.amount).toLocaleString()
      ]),
      foot: [['', '', '', '', 'Total:', expenseTotal.toLocaleString()]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [220, 38, 38] },
      footStyles: { fillColor: [254, 202, 202], textColor: [153, 27, 27], fontStyle: 'bold' }
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // === EXPENSES BY CATEGORY ===
    if (Object.keys(expByCat).length > 0) {
      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Expenses by Category', 14, y)
      y += 3

      autoTable(doc, {
        startY: y,
        head: [['Category', 'Amount (Ks)']],
        body: Object.entries(expByCat).map(([k, v]) => [k, v.toLocaleString()]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 38, 38] }
      })
    }

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${i} / ${pageCount}`, 105, 290, { align: 'center' })
    }

    doc.save(`report-${range.from}-to-${range.to}.pdf`)
  }

  // ============ EXPORT EXCEL ============
  function exportExcel() {
    const wb = XLSX.utils.book_new()

    // Sheet 1 — Summary
    const summaryData = [
      ['Business Report'],
      [`Period: ${range.from} → ${range.to}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Description', 'Value'],
      ['Sales Count', sales.length],
      ['Revenue', revenue],
      ['COGS', cogs],
      ['Gross Profit (GP)', grossProfit],
      ['GP Margin (%)', Number(gpMargin.toFixed(2))],
      ['Purchases', purchaseTotal],
      ['Purchase Paid', purchasePaid],
      ['Purchase Balance', purchaseBalance],
      ['Expenses', expenseTotal],
      ['Net Profit (NP)', netProfit],
      ['NP Margin (%)', Number(npMargin.toFixed(2))]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

    // Sheet 2 — Sales
    const salesData = sales.map((s, i) => ({
      '#': i + 1,
      'Invoice No': s.invoice_no,
      'Date': new Date(s.created_at).toLocaleString(),
      'Subtotal': Number(s.subtotal),
      'Discount': Number(s.discount),
      'Trade-in': Number(s.tradein_amount),
      'Total': Number(s.total),
      'Paid': Number(s.paid),
      'Status': s.payment_status
    }))
    const ws2 = XLSX.utils.json_to_sheet(salesData)
    ws2['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Sales')

    // Sheet 3 — Sale Items (detail)
    const saleItemsData = saleItems.map((it, i) => ({
      '#': i + 1,
      'Sale ID': it.sale_id,
      'Item': it.name,
      'IMEI': it.imei || '',
      'Qty': it.qty,
      'Price': Number(it.price),
      'Cost': Number(it.cost),
      'Total': Number(it.price) * it.qty,
      'FOC': it.is_foc ? 'YES' : 'NO'
    }))
    const ws3 = XLSX.utils.json_to_sheet(saleItemsData)
    ws3['!cols'] = [{ wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 6 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Sale Items')

    // Sheet 4 — Purchases
    const purchasesData = purchases.map((p, i) => ({
      '#': i + 1,
      'PO No': p.purchase_no,
      'Date': p.purchase_date,
      'Supplier': p.supplier?.name || '-',
      'Type': p.purchase_type,
      'Total': Number(p.total),
      'Paid': Number(p.paid),
      'Balance': Number(p.balance),
      'Status': p.status
    }))
    const ws4 = XLSX.utils.json_to_sheet(purchasesData)
    ws4['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Purchases')

    // Sheet 5 — Purchase Items
    const purchaseItemsData = purchaseItems.map((it, i) => ({
      '#': i + 1,
      'PO ID': it.purchase_id,
      'Item': it.name || it.model || '',
      'IMEI': it.imei || '',
      'Qty': it.qty,
      'Unit Cost': Number(it.unit_cost),
      'Total': Number(it.total_cost)
    }))
    const ws5 = XLSX.utils.json_to_sheet(purchaseItemsData)
    ws5['!cols'] = [{ wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 6 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws5, 'Purchase Items')

    // Sheet 6 — Expenses
    const expensesData = expenses.map((e, i) => ({
      '#': i + 1,
      'Date': e.spent_at,
      'Code': e.expense_code || '',
      'Category': e.category,
      'Note': e.note || '',
      'Method': e.payment_method || '',
      'Ref No': e.ref_no || '',
      'Amount': Number(e.amount)
    }))
    const ws6 = XLSX.utils.json_to_sheet(expensesData)
    ws6['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws6, 'Expenses')

    // Sheet 7 — Expense by Category
    const expCatData = Object.entries(expByCat).map(([k, v]) => ({
      'Category': k,
      'Amount': v
    }))
    if (expCatData.length > 0) {
      const ws7 = XLSX.utils.json_to_sheet(expCatData)
      ws7['!cols'] = [{ wch: 20 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws7, 'Expense by Category')
    }

    XLSX.writeFile(wb, `report-${range.from}-to-${range.to}.xlsx`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-800">📊 Reports</h1>
        <div className="flex gap-2">
          <button onClick={exportPDF} disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50">
            📄 PDF
          </button>
          <button onClick={exportExcel} disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50">
            📊 Excel
          </button>
        </div>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      {loading ? <p className="p-8 text-center text-gray-400">...</p> : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
              <div className="text-xs text-gray-600">Sales</div>
              <div className="text-2xl font-bold text-blue-700">{revenue.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">{sales.length} ခု</div>
            </div>
            <div className="bg-white rounded shadow p-4 border-l-4 border-green-500">
              <div className="text-xs text-gray-600">Gross Profit (GP)</div>
              <div className="text-2xl font-bold text-green-700">{grossProfit.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">Margin: {gpMargin.toFixed(2)}%</div>
            </div>
            <div className="bg-white rounded shadow p-4 border-l-4 border-purple-500">
              <div className="text-xs text-gray-600">Purchases</div>
              <div className="text-2xl font-bold text-purple-700">{purchaseTotal.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">{purchases.length} ခု</div>
            </div>
            <div className="bg-white rounded shadow p-4 border-l-4 border-red-500">
              <div className="text-xs text-gray-600">Expenses</div>
              <div className="text-2xl font-bold text-red-700">{expenseTotal.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">{expenses.length} ခု</div>
            </div>
          </div>

          {/* NP Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm opacity-90">NET PROFIT (NP) = GP - Expenses</div>
                <div className="text-4xl font-bold mt-1">{netProfit.toLocaleString()} Ks</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-90">NP Margin</div>
                <div className="text-2xl font-bold">{npMargin.toFixed(2)}%</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { code: 'summary', label: '📊 Summary' },
              { code: 'sales', label: `🧾 Sales (${sales.length})` },
              { code: 'purchases', label: `🛍️ Purchases (${purchases.length})` },
              { code: 'expenses', label: `💰 Expenses (${expenses.length})` }
            ].map(t => (
              <button key={t.code} onClick={() => setTab(t.code as Tab)}
                className={`px-4 py-2 rounded font-medium ${tab === t.code ? 'bg-green-600 text-white' : 'bg-white border hover:border-green-500'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Summary Tab */}
          {tab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded shadow p-4">
                <h3 className="font-bold text-green-800 mb-3">💰 Profit & Loss</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Revenue</td>
                      <td className="p-2 text-right font-medium">{revenue.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-gray-600">COGS</td>
                      <td className="p-2 text-right text-orange-700">({cogs.toLocaleString()})</td>
                    </tr>
                    <tr className="border-b bg-green-50">
                      <td className="p-2 font-bold">Gross Profit</td>
                      <td className="p-2 text-right font-bold text-green-700">{grossProfit.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-gray-600">Expenses</td>
                      <td className="p-2 text-right text-red-700">({expenseTotal.toLocaleString()})</td>
                    </tr>
                    <tr className="bg-green-100">
                      <td className="p-2 font-bold">Net Profit</td>
                      <td className={`p-2 text-right font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {netProfit.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded shadow p-4">
                <h3 className="font-bold text-purple-800 mb-3">🛍️ Purchases Summary</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Total Purchases</td>
                      <td className="p-2 text-right font-medium">{purchaseTotal.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 text-gray-600">Paid</td>
                      <td className="p-2 text-right text-green-700">{purchasePaid.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="p-2 font-bold">Balance</td>
                      <td className="p-2 text-right font-bold text-red-700">{purchaseBalance.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded shadow p-4 md:col-span-2">
                <h3 className="font-bold text-red-800 mb-3">💰 Expenses by Category</h3>
                {Object.keys(expByCat).length === 0 ? (
                  <p className="text-center text-gray-400 py-4">Expense မရှိ</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(expByCat).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b p-2 text-sm">
                        <span className="text-gray-600 capitalize">{k}</span>
                        <span className="font-bold text-red-700">{v.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {focItems.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-300 rounded shadow p-4 md:col-span-2">
                  <h3 className="font-bold text-orange-800 mb-3">🎁 FOC Summary</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-sm">
                      <span className="text-gray-600">Items</span>
                      <div className="font-bold">{focItems.length} မျိုး</div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">FOC Cost</span>
                      <div className="font-bold text-red-700">{focCost.toLocaleString()} Ks</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sales Tab */}
          {tab === 'sales' && (
            <div className="bg-white rounded shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-50">
                  <tr>
                    <th className="p-3 text-left">Invoice</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-right">Discount</th>
                    <th className="p-3 text-right">Trade-in</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">Sale မရှိပါ</td></tr>
                  )}
                  {sales.map(s => (
                    <tr key={s.id} className="border-t hover:bg-green-50">
                      <td className="p-3 font-mono text-xs">{s.invoice_no}</td>
                      <td className="p-3">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="p-3 text-right">{Number(s.subtotal).toLocaleString()}</td>
                      <td className="p-3 text-right text-orange-700">{Number(s.discount).toLocaleString()}</td>
                      <td className="p-3 text-right text-blue-700">{Number(s.tradein_amount).toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-green-700">{Number(s.total).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${s.payment_status === 'refunded' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {s.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {sales.length > 0 && (
                  <tfoot className="bg-green-100">
                    <tr>
                      <td colSpan={5} className="p-3 text-right font-bold">Total</td>
                      <td className="p-3 text-right font-bold text-green-800">{revenue.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Purchases Tab */}
          {tab === 'purchases' && (
            <div className="bg-white rounded shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="p-3 text-left">PO No</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Supplier</th>
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
                    <tr key={p.id} className="border-t hover:bg-purple-50">
                      <td className="p-3 font-mono text-xs">{p.purchase_no}</td>
                      <td className="p-3">{p.purchase_date}</td>
                      <td className="p-3">{p.supplier?.name || '-'}</td>
                      <td className="p-3 text-right">{Number(p.total).toLocaleString()}</td>
                      <td className="p-3 text-right text-green-700">{Number(p.paid).toLocaleString()}</td>
                      <td className={`p-3 text-right font-bold ${Number(p.balance) > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                        {Number(p.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {purchases.length > 0 && (
                  <tfoot className="bg-purple-100">
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-bold">Total</td>
                      <td className="p-3 text-right font-bold">{purchaseTotal.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-green-800">{purchasePaid.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-red-800">{purchaseBalance.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Expenses Tab */}
          {tab === 'expenses' && (
            <div className="bg-white rounded shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-red-50">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Category</th>
                    <th className="p-3 text-left">Note</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">Expense မရှိပါ</td></tr>
                  )}
                  {expenses.map(e => (
                    <tr key={e.id} className="border-t hover:bg-red-50">
                      <td className="p-3">{e.spent_at}</td>
                      <td className="p-3 font-mono text-xs">{e.expense_code || '-'}</td>
                      <td className="p-3">
                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs capitalize">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">{e.note || '-'}</td>
                      <td className="p-3 text-right font-bold text-red-700">{Number(e.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                {expenses.length > 0 && (
                  <tfoot className="bg-red-100">
                    <tr>
                      <td colSpan={4} className="p-3 text-right font-bold">Total</td>
                      <td className="p-3 text-right font-bold text-red-800">{expenseTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

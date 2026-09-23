'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/useRole'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function SaleDetail() {
  const { id } = useParams()
  const router = useRouter()
  const { canSeeProfit } = useRole()
  const [sale, setSale] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [shop, setShop] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    (async () => {
      const sid = id as string
      const { data: s } = await supabase.from('sales').select('*, staff:staff_id(name)').eq('id', sid).maybeSingle()
      setSale(s)
      if (s?.customer_id) {
        const { data: c } = await supabase.from('customers').select('*').eq('id', s.customer_id).maybeSingle()
        setCustomer(c)
      }
      const { data: it } = await supabase.from('sale_items').select('*').eq('sale_id', sid)
      setItems(it ?? [])
      const { data: p } = await supabase.from('payments').select('*').eq('sale_id', sid)
      setPayments(p ?? [])
      const { data: sh } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
      setShop(sh || { shop_name: 'POS' })
      setLoading(false)
    })()
  }, [id])

  async function deleteSale() {
    if (!confirm(`⚠️ ${sale.invoice_no} ကို ဖျက်မှာ သေချာလား?\n\nDevice status → in_stock ပြန်မယ်`)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။')) return
    setDeleting(true)
    const { error } = await supabase.rpc('delete_sale', { p_sale_id: Number(id) })
    setDeleting(false)
    if (error) return alert('❌ ' + error.message)
    alert('✅ ဖျက်ပြီးပါပြီ')
    router.push('/sales')
  }

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFillColor(22, 163, 74)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(shop.shop_name || 'POS', 15, 15)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (shop.shop_phone) doc.text(`Phone: ${shop.shop_phone}`, 15, 22)
    if (shop.shop_address) doc.text(shop.shop_address, 15, 28)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', 195, 18, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(sale.invoice_no, 195, 26, { align: 'right' })

    doc.setTextColor(0, 0, 0)
    let y = 50
    doc.setFillColor(240, 253, 244)
    doc.rect(15, y - 5, 90, 30, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 18, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(customer?.name || 'Walk-in Customer', 18, y + 7)
    if (customer?.phone) doc.text(customer.phone, 18, y + 13)
    if (customer?.address) doc.text(customer.address.substring(0, 40), 18, y + 19)

    doc.setFillColor(240, 253, 244)
    doc.rect(110, y - 5, 85, 30, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Invoice Details:', 113, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Invoice: ${sale.invoice_no}`, 113, y + 7)
    doc.text(`Date: ${new Date(sale.created_at).toLocaleDateString()}`, 113, y + 13)
    if (sale.staff?.name) doc.text(`Staff: ${sale.staff.name}`, 113, y + 25)

    y += 35

    // Items — Specs below name, no Grade column
    const body: any[] = []
    items.forEach((it, i) => {
      const specs: string[] = []
      if (it.battery_health) specs.push(`Battery ${it.battery_health}%`)
      if (it.storage) specs.push(it.storage)
      if (it.color) specs.push(it.color)
      if (it.region) specs.push(it.region)
      if (it.warranty_days) specs.push(`Warranty ${it.warranty_days}d`)

      body.push([
        { content: String(i + 1), styles: { valign: 'top' } },
        {
          content: `${it.name}\n${it.imei ? 'IMEI: ' + it.imei : ''}${specs.length ? '\n' + specs.join(' • ') : ''}`,
          styles: { valign: 'top', fontSize: 9 }
        },
        { content: String(it.qty), styles: { valign: 'top', halign: 'center' } },
        { content: Number(it.price).toLocaleString(), styles: { valign: 'top', halign: 'right' } },
        { content: (Number(it.price) * it.qty).toLocaleString(), styles: { valign: 'top', halign: 'right', fontStyle: 'bold' } }
      ])
    })

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item', 'Qty', 'Price', 'Amount']],
      body,
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 100 },
        2: { cellWidth: 15 },
        3: { cellWidth: 30 },
        4: { cellWidth: 32 }
      },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] }
    })

    y = (doc as any).lastAutoTable.finalY + 10
    const totalsX = 130
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', totalsX, y)
    doc.text(`${Number(sale.subtotal).toLocaleString()} Ks`, 195, y, { align: 'right' })
    y += 6
    if (Number(sale.discount) > 0) {
      doc.setTextColor(234, 88, 12)
      doc.text('Discount:', totalsX, y)
      doc.text(`-${Number(sale.discount).toLocaleString()} Ks`, 195, y, { align: 'right' })
      y += 6
      doc.setTextColor(0, 0, 0)
    }
    if (Number(sale.tradein_amount) > 0) {
      doc.setTextColor(37, 99, 235)
      doc.text('Trade-in:', totalsX, y)
      doc.text(`-${Number(sale.tradein_amount).toLocaleString()} Ks`, 195, y, { align: 'right' })
      y += 6
      doc.setTextColor(0, 0, 0)
    }
    doc.setDrawColor(22, 163, 74)
    doc.setLineWidth(0.5)
    doc.line(totalsX, y - 2, 195, y - 2)
    y += 4
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text('TOTAL:', totalsX, y)
    doc.text(`${Number(sale.total).toLocaleString()} Ks`, 195, y, { align: 'right' })

    y += 12
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Payment:', 15, y)
    doc.setFont('helvetica', 'normal')
    y += 6
    payments.forEach(p => {
      doc.text(`${p.method}: ${Number(p.amount).toLocaleString()} Ks`, 15, y)
      y += 5
    })

    // Invoice Note (custom)
    if (shop.invoice_note) {
      y += 10
      const noteLines = doc.splitTextToSize(shop.invoice_note, 180)
      doc.setFillColor(254, 252, 232)
      doc.rect(15, y - 4, 180, 8 + noteLines.length * 5, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(113, 63, 18)
      doc.text('Note:', 18, y + 2)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 80, 20)
      doc.setFontSize(8)
      doc.text(noteLines, 18, y + 8)
      y += 10 + noteLines.length * 5
    }

    // Warranty Policy (custom from settings)
    if (items.some(it => it.item_type === 'device') && shop.warranty_policy) {
      y += 10
      const policyLines = doc.splitTextToSize(shop.warranty_policy, 180)
      doc.setFillColor(240, 253, 244)
      doc.rect(15, y - 4, 180, 8 + policyLines.length * 5, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(21, 128, 61)
      doc.text('Warranty Policy:', 18, y + 2)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.text(policyLines, 18, y + 8)
      y += 10 + policyLines.length * 5
    }

    y += 10
    doc.setDrawColor(22, 163, 74)
    doc.line(15, y, 195, y)
    y += 8
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text('Customer Signature: ______________________', 15, y)
    doc.text('Authorized Signature: ______________________', 110, y)

    y += 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text('Thank You', 105, y, { align: 'center' })

    doc.save(`${sale.invoice_no}.pdf`)
  }

  if (loading) return <p className="p-6">...</p>
  if (!sale) return <p className="p-6">Sale မတွေ့ပါ</p>

  const isRefunded = sale.payment_status === 'refunded'
  const profit = items.reduce((s, it) => s + (Number(it.price) - Number(it.cost)) * it.qty, 0)

  const batteryColor = (h?: number | null) => {
    if (!h) return 'text-gray-400'
    if (h >= 90) return 'text-green-700 font-bold'
    if (h >= 80) return 'text-yellow-700 font-bold'
    return 'text-red-700 font-bold'
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Invoice {sale.invoice_no}</h1>
          <div className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">📄 PDF</button>
          <button onClick={() => window.open(`/print/invoice/${id}`, '_blank', 'width=900,height=1200')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">🖨️ Print</button>
          <button onClick={() => router.push('/sales')} className="bg-gray-200 px-4 py-2 rounded font-medium">← ပြန်</button>
        </div>
      </div>

      {isRefunded && (
        <div className="bg-red-50 border-2 border-red-400 text-red-800 p-4 rounded mb-4 font-bold">
          ⚠️ REFUND လုပ်ပြီးပါပြီ
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">👤 ဖောက်သည်</h2>
          <div className="text-sm space-y-1">
            <div><strong>နာမည်:</strong> {customer?.name || 'Walk-in Customer'}</div>
            {customer?.phone && <div><strong>ဖုန်း:</strong> {customer.phone}</div>}
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">📋 အချက်အလက်</h2>
          <div className="text-sm space-y-1">
            <div><strong>Invoice:</strong> {sale.invoice_no}</div>
            <div><strong>Staff:</strong> {sale.staff?.name || '-'}</div>
            <div><strong>Status:</strong>{' '}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${isRefunded ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {sale.payment_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-green-700">📱 Items ({items.length})</h2>
        <div className="space-y-3">
          {items.map((it, i) => {
            const itemProfit = (Number(it.price) - Number(it.cost)) * it.qty
            const specs: string[] = []
            if (it.battery_health) specs.push(`🔋 ${it.battery_health}%`)
            if (it.storage) specs.push(it.storage)
            if (it.color) specs.push(it.color)
            if (it.region) specs.push(it.region)
            if (it.warranty_days) specs.push(`🛡️ ${it.warranty_days} ရက်`)

            return (
              <div key={it.id} className="border rounded-lg p-3 bg-green-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{i + 1}</span>
                      <span className="font-bold text-green-800">{it.name}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                      {it.imei && <div className="font-mono">IMEI: {it.imei}</div>}
                      {specs.length > 0 && <div>• {specs.join(' • ')}</div>}
                    </div>
                    {canSeeProfit && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded border ${itemProfit >= 0 ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'}`}>
                          💰 Profit: {itemProfit.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xs text-gray-500">Qty: {it.qty}</div>
                    <div className="font-medium">{Number(it.price).toLocaleString()}</div>
                    <div className="font-bold text-green-700">{(Number(it.price) * it.qty).toLocaleString()} Ks</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-green-700">💰 ငွေစာရင်း</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{Number(sale.subtotal).toLocaleString()} Ks</span></div>
          {Number(sale.discount) > 0 && <div className="flex justify-between text-orange-600"><span>Discount</span><span>-{Number(sale.discount).toLocaleString()} Ks</span></div>}
          {Number(sale.tradein_amount) > 0 && <div className="flex justify-between text-blue-600"><span>Trade-in</span><span>-{Number(sale.tradein_amount).toLocaleString()} Ks</span></div>}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span><span className="text-green-700">{Number(sale.total).toLocaleString()} Ks</span>
          </div>
          {canSeeProfit && (
            <div className="flex justify-between text-sm border-t pt-2 mt-2 text-green-700 font-medium">
              <span>💰 အမြတ်</span><span>{profit.toLocaleString()} Ks</span>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t">
          <div className="text-sm font-medium mb-2">💳 Payment</div>
          {payments.map(p => (
            <div key={p.id} className="text-sm flex justify-between">
              <span className="capitalize">{p.method}</span>
              <span>{Number(p.amount).toLocaleString()} Ks</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {!isRefunded && (
          <>
            <button onClick={() => router.push(`/sales/returns/new?sale_id=${id}`)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-medium">
              ↩️ Return လုပ်
            </button>
            <button onClick={deleteSale} disabled={deleting}
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded font-medium disabled:opacity-50">
              {deleting ? '...' : '🗑️ ဖျက်'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

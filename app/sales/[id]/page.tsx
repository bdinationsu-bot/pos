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
  const { canSeeProfit, canSeeCost } = useRole()
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

  async function refundSale() {
    if (!confirm('Refund လုပ်မှာ သေချာလား?')) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။')) return
    const deviceIds = items.filter(i => i.item_type === 'device').map(i => i.item_id)
    if (deviceIds.length) {
      await supabase.from('devices').update({ status: 'in_stock' }).in('id', deviceIds)
    }
    await supabase.from('sales').update({ payment_status: 'refunded' }).eq('id', id)
    alert('✅ Refund ပြီးပါပြီ')
    router.push('/sales')
  }

  async function deleteSale() {
    if (!confirm(`⚠️ ${sale.invoice_no} ကို ဖျက်မှာ သေချာလား?\n\n• Device status → in_stock ပြန်\n• Cashbook entry ဖျက်\n• Payment records ဖျက်\n• ပြန်ယူလို့ မရပါ`)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။ DELETE ဖြစ်သွားရင် ပြန်မရနိုင်ပါ။')) return

    setDeleting(true)
    const { error } = await supabase.rpc('delete_sale', { p_sale_id: Number(id) })
    setDeleting(false)

    if (error) return alert('❌ Error: ' + error.message)
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
    doc.text(`Time: ${new Date(sale.created_at).toLocaleTimeString()}`, 113, y + 19)
    if (sale.staff?.name) doc.text(`Staff: ${sale.staff.name}`, 113, y + 25)

    y += 35

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item', 'IMEI', 'Specs', 'Qty', 'Price', 'Amount']],
      body: items.map((it, i) => {
        const specs: string[] = []
        if (it.battery_health) specs.push(`Battery ${it.battery_health}%`)
        if (it.grade) specs.push(`Grade ${it.grade}`)
        if (it.region) specs.push(it.region)
        if (it.warranty_days) specs.push(`Warranty ${it.warranty_days}d`)
        return [
          i + 1,
          it.name,
          it.imei || '-',
          specs.join(' • ') || '-',
          it.qty,
          Number(it.price).toLocaleString(),
          (Number(it.price) * it.qty).toLocaleString()
        ]
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 42 },
        2: { cellWidth: 32, font: 'courier', fontSize: 7 },
        3: { cellWidth: 38, fontSize: 7 },
        4: { cellWidth: 10, halign: 'center' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' }
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
      doc.text(`${p.method}: ${Number(p.amount).toLocaleString()} Ks${p.ref_no ? ` (${p.ref_no})` : ''}`, 15, y)
      y += 5
    })

    if (items.some(it => it.item_type === 'device')) {
      y += 8
      doc.setFillColor(240, 253, 244)
      doc.rect(15, y - 4, 180, 22, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(21, 128, 61)
      doc.text('Warranty Terms:', 18, y + 2)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      doc.text('- 7 days warranty for devices (unless otherwise specified)', 18, y + 8)
      doc.text('- Physical damage, water damage, or tampering is not covered', 18, y + 13)
      y += 28
    }

    y += 10
    doc.setDrawColor(22, 163, 74)
    doc.setLineWidth(0.5)
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

    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text(`Generated on ${new Date().toLocaleString('en-US')}`, 105, y, { align: 'center' })

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
          <button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">
            📄 PDF
          </button>
          <button onClick={() => window.open(`/print/invoice/${id}`, '_blank', 'width=900,height=1200')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            🖨️ Print
          </button>
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
            {customer?.address && <div><strong>လိပ်စာ:</strong> {customer.address}</div>}
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
            return (
              <div key={it.id} className="border rounded-lg p-3 bg-green-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{i + 1}</span>
                      <span className="font-bold text-green-800">{it.name}</span>
                    </div>
                    {it.imei && (
                      <div className="text-xs font-mono text-gray-600 mt-1">IMEI: {it.imei}</div>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap text-xs">
                      {it.battery_health != null && (
                        <span className="bg-white px-2 py-1 rounded border">
                          🔋 Battery: <span className={batteryColor(it.battery_health)}>{it.battery_health}%</span>
                        </span>
                      )}
                      {it.grade && (
                        <span className="bg-white px-2 py-1 rounded border">
                          Grade: <strong className="text-green-700">{it.grade}</strong>
                        </span>
                      )}
                      {it.region && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          📡 {it.region}
                        </span>
                      )}
                      {it.warranty_days > 0 && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          🛡️ အာမခံ {it.warranty_days} ရက်
                        </span>
                      )}
                    </div>

                    {/* Cost / Profit — Role-based */}
                    {canSeeCost && (
                      <div className="flex gap-2 mt-2 flex-wrap text-xs">
                        <span className="bg-orange-50 px-2 py-1 rounded border border-orange-200">
                          Cost: <strong className="text-orange-700">{Number(it.cost).toLocaleString()}</strong>
                        </span>
                        {canSeeProfit && (
                          <span className={`px-2 py-1 rounded border ${
                            itemProfit >= 0 ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'
                          }`}>
                            💰 Profit: <strong>{itemProfit.toLocaleString()}</strong>
                          </span>
                        )}
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

          {/* Profit — Only Owner + Accountant */}
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
              <span>{Number(p.amount).toLocaleString()} Ks {p.ref_no && <span className="text-xs text-gray-500">({p.ref_no})</span>}</span>
            </div>
          ))}
        </div>
      </div>

      {!isRefunded && (
        <div className="flex gap-2">
          <button onClick={refundSale} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded font-medium">
            ↩️ Refund
          </button>
          <button onClick={deleteSale} disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-medium disabled:opacity-50">
            {deleting ? 'ဖျက်နေတယ်...' : '🗑️ ဖျက်'}
          </button>
        </div>
      )}
    </div>
  )
}

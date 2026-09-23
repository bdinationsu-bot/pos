'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function PurchaseDetail() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [purchase, setPurchase] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [supplier, setSupplier] = useState<any>(null)
  const [shop, setShop] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('purchases').select('*').eq('id', id).maybeSingle()
      setPurchase(p)
      if (p?.supplier_id) {
        const { data: s } = await supabase.from('suppliers').select('*').eq('id', p.supplier_id).maybeSingle()
        setSupplier(s)
      }
      const { data: it } = await supabase.from('purchase_items').select('*').eq('purchase_id', id)
      setItems(it ?? [])
      const { data: sh } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
      setShop(sh || { shop_name: 'POS' })
      setLoading(false)
    })()
  }, [id])

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
    if (shop.shop_phone) doc.text('Phone: ' + shop.shop_phone, 15, 22)
    if (shop.shop_address) doc.text(shop.shop_address, 15, 28)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('PURCHASE ORDER', 195, 18, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(purchase.purchase_no, 195, 26, { align: 'right' })

    doc.setTextColor(0, 0, 0)
    let y = 50
    doc.setFillColor(240, 253, 244)
    doc.rect(15, y - 5, 90, 30, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Supplier:', 18, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(supplier?.name || '-', 18, y + 7)
    if (supplier?.company) doc.text(supplier.company, 18, y + 13)
    if (supplier?.phone) doc.text(supplier.phone, 18, y + 19)

    doc.setFillColor(240, 253, 244)
    doc.rect(110, y - 5, 85, 30, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Order Details:', 113, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('PO No: ' + purchase.purchase_no, 113, y + 7)
    doc.text('Date: ' + purchase.purchase_date, 113, y + 13)
    doc.text('Type: ' + purchase.purchase_type, 113, y + 19)

    y += 35

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item', 'Qty', 'Unit Cost', 'Amount']],
      body: items.map((it, i) => {
        const specs: string[] = []
        if (it.storage) specs.push(it.storage)
        if (it.color) specs.push(it.color)
        const name = it.name || it.model || ''
        return [
          i + 1,
          name + (it.imei ? '\nIMEI: ' + it.imei : '') + (specs.length ? '\n' + specs.join(' / ') : ''),
          it.qty,
          Number(it.unit_cost).toLocaleString(),
          Number(it.total_cost).toLocaleString()
        ]
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 100 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 32, halign: 'right' } },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] }
    })

    y = (doc as any).lastAutoTable.finalY + 10
    const tx = 130
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', tx, y)
    doc.text(Number(purchase.subtotal).toLocaleString() + ' Ks', 195, y, { align: 'right' })
    y += 6
    if (Number(purchase.discount) > 0) {
      doc.setTextColor(234, 88, 12)
      doc.text('Discount:', tx, y)
      doc.text('-' + Number(purchase.discount).toLocaleString() + ' Ks', 195, y, { align: 'right' })
      y += 6
      doc.setTextColor(0, 0, 0)
    }
    if (Number(purchase.tax) > 0) {
      doc.text('Tax:', tx, y)
      doc.text('+' + Number(purchase.tax).toLocaleString() + ' Ks', 195, y, { align: 'right' })
      y += 6
    }
    doc.setDrawColor(22, 163, 74)
    doc.setLineWidth(0.5)
    doc.line(tx, y - 2, 195, y - 2)
    y += 4
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text('TOTAL:', tx, y)
    doc.text(Number(purchase.total).toLocaleString() + ' Ks', 195, y, { align: 'right' })
    y += 8
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Paid:', tx, y)
    doc.text(Number(purchase.paid).toLocaleString() + ' Ks', 195, y, { align: 'right' })
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text('Balance:', tx, y)
    doc.text(Number(purchase.balance).toLocaleString() + ' Ks', 195, y, { align: 'right' })

    y += 20
    doc.setDrawColor(22, 163, 74)
    doc.line(15, y, 195, y)
    y += 8
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text('Buyer Signature: ______________________', 15, y)
    doc.text('Supplier Signature: ______________________', 110, y)

    y += 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 163, 74)
    doc.text('Thank You', 105, y, { align: 'center' })

    doc.save(purchase.purchase_no + '.pdf')
  }

  if (loading) return <p className="p-6">...</p>
  if (!purchase) return <p className="p-6">Purchase မတွေ့ပါ — ID: {id}</p>

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">PO {purchase.purchase_no}</h1>
          <div className="text-xs text-gray-500">{purchase.purchase_date} — {purchase.status}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">
            📄 PDF
          </button>
          <button onClick={() => window.open('/print/purchase/' + id, '_blank', 'width=900,height=1200')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            🖨️ Print
          </button>
          <button onClick={() => router.push('/purchases')} className="bg-gray-200 px-4 py-2 rounded font-medium">← ပြန်</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">Supplier</h2>
          <div className="text-sm space-y-1">
            <div><strong>နာမည်:</strong> {supplier?.name || '-'}</div>
            {supplier?.company && <div><strong>ကုမ္ပဏီ:</strong> {supplier.company}</div>}
            {supplier?.phone && <div><strong>ဖုန်း:</strong> {supplier.phone}</div>}
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">PO Info</h2>
          <div className="text-sm space-y-1">
            <div><strong>PO No:</strong> {purchase.purchase_no}</div>
            <div><strong>ရက်စွဲ:</strong> {purchase.purchase_date}</div>
            <div><strong>Type:</strong> {purchase.purchase_type}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-green-700">Items ({items.length})</h2>
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Unit Cost</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{it.name || it.model}</div>
                  {it.imei && <div className="text-xs font-mono text-gray-500">{it.imei}</div>}
                </td>
                <td className="p-2 text-center">{it.qty}</td>
                <td className="p-2 text-right">{Number(it.unit_cost).toLocaleString()}</td>
                <td className="p-2 text-right font-bold">{Number(it.total_cost).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-bold mb-2 text-green-700">ငွေစာရင်း</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{Number(purchase.subtotal).toLocaleString()} Ks</span></div>
          {Number(purchase.discount) > 0 && <div className="flex justify-between text-orange-600"><span>Discount</span><span>-{Number(purchase.discount).toLocaleString()} Ks</span></div>}
          {Number(purchase.tax) > 0 && <div className="flex justify-between"><span>Tax</span><span>+{Number(purchase.tax).toLocaleString()} Ks</span></div>}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span><span className="text-green-700">{Number(purchase.total).toLocaleString()} Ks</span>
          </div>
          <div className="flex justify-between"><span>Paid</span><span className="text-green-700">{Number(purchase.paid).toLocaleString()} Ks</span></div>
          <div className={`flex justify-between font-bold ${Number(purchase.balance) > 0 ? 'text-red-700' : 'text-gray-500'}`}>
            <span>Balance</span><span>{Number(purchase.balance).toLocaleString()} Ks</span>
          </div>
        </div>
      </div>
    </div>
  )
}

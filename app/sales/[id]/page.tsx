'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SaleDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [sale, setSale] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const sid = id as string
      const { data: s } = await supabase
        .from('sales')
        .select('*, staff:staff_id(name)')
        .eq('id', sid)
        .maybeSingle()
      setSale(s)

      if (s?.customer_id) {
        const { data: c } = await supabase.from('customers').select('*').eq('id', s.customer_id).maybeSingle()
        setCustomer(c)
      }

      const { data: it } = await supabase.from('sale_items').select('*').eq('sale_id', sid)
      setItems(it ?? [])

      const { data: p } = await supabase.from('payments').select('*').eq('sale_id', sid)
      setPayments(p ?? [])

      setLoading(false)
    })()
  }, [id])

  async function refundSale() {
    if (!confirm('ဒီ sale ကို refund လုပ်မှာ သေချာလား? စက်တွေ inventory ထဲ ပြန်ဝင်မယ်။')) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။ Refund လုပ်ပြီးရင် ပြန်ဖျက် မရပါ။')) return

    const deviceIds = items.filter(i => i.item_type === 'device').map(i => i.item_id)
    if (deviceIds.length) {
      await supabase.from('devices').update({ status: 'in_stock' }).in('id', deviceIds)
    }
    await supabase.from('sales').update({ payment_status: 'refunded' }).eq('id', id)
    alert('✅ Refund ပြီးပါပြီ')
    router.push('/sales')
  }

  function openPrint() {
    window.open(`/print/invoice/${id}`, '_blank', 'width=900,height=1200')
  }

  if (loading) return <p className="p-6">...</p>
  if (!sale) return <p className="p-6">Sale မတွေ့ပါ</p>

  const isRefunded = sale.payment_status === 'refunded'
  const profit = items.reduce((s, it) => {
    const cost = Number(it.cost) * it.qty
    const price = Number(it.price) * it.qty
    return s + (price - cost)
  }, 0)

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Invoice {sale.invoice_no}</h1>
          <div className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openPrint}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium"
          >
            🖨️ Print
          </button>
          <button onClick={() => router.push('/sales')} className="bg-gray-200 px-4 py-2 rounded font-medium">
            ← ပြန်
          </button>
        </div>
      </div>

      {isRefunded && (
        <div className="bg-red-50 border-2 border-red-400 text-red-800 p-4 rounded mb-4 font-bold">
          ⚠️ ဒီ sale ကို REFUND လုပ်ပြီးပါပြီ
        </div>
      )}

      {/* Customer + Staff */}
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
          <h2 className="font-bold mb-2 text-green-700">📋 အရောင်းအချက်အလက်</h2>
          <div className="text-sm space-y-1">
            <div><strong>Invoice:</strong> {sale.invoice_no}</div>
            <div><strong>Staff:</strong> {sale.staff?.name || '-'}</div>
            <div>
              <strong>Status:</strong>{' '}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                isRefunded ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {sale.payment_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-green-700">📱 Items ({items.length})</h2>
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-left">IMEI</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Cost</th>
              <th className="p-2 text-right">Profit</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const itemProfit = (Number(it.price) - Number(it.cost)) * it.qty
              return (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 font-mono text-xs">{it.imei || '-'}</td>
                  <td className="p-2 text-center">{it.qty}</td>
                  <td className="p-2 text-right">{Number(it.price).toLocaleString()}</td>
                  <td className="p-2 text-right text-orange-600">{Number(it.cost).toLocaleString()}</td>
                  <td className={`p-2 text-right font-medium ${itemProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {itemProfit.toLocaleString()}
                  </td>
                  <td className="p-2 text-right font-bold">{(Number(it.price) * it.qty).toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-green-700">💰 ငွေစာရင်း</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{Number(sale.subtotal).toLocaleString()} Ks</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Discount</span>
              <span>-{Number(sale.discount).toLocaleString()} Ks</span>
            </div>
          )}
          {Number(sale.tradein_amount) > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>Trade-in</span>
              <span>-{Number(sale.tradein_amount).toLocaleString()} Ks</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span className="text-green-700">{Number(sale.total).toLocaleString()} Ks</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2 mt-2 text-green-700 font-medium">
            <span>💰 အမြတ် (Profit)</span>
            <span>{profit.toLocaleString()} Ks</span>
          </div>
        </div>

        {/* Payments */}
        <div className="mt-3 pt-3 border-t">
          <div className="text-sm font-medium mb-2">💳 Payment</div>
          {payments.length === 0 ? (
            <div className="text-sm text-gray-400">-</div>
          ) : (
            payments.map(p => (
              <div key={p.id} className="text-sm flex justify-between">
                <span className="capitalize">{p.method}</span>
                <span>
                  {Number(p.amount).toLocaleString()} Ks
                  {p.ref_no && <span className="text-xs text-gray-500"> ({p.ref_no})</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      {!isRefunded && (
        <div className="flex gap-2">
          <button
            onClick={refundSale}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-medium"
          >
            ↩️ Refund
          </button>
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getShopInfo } from '@/lib/print'

export default function InvoicePrint() {
  const { id } = useParams()
  const [sale, setSale] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [shop, setShop] = useState<any>({})
  const [loading, setLoading] = useState(true)

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
      setShop(await getShopInfo())
      setLoading(false)
      setTimeout(() => window.print(), 1000)
    })()
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>...</div>
  if (!sale) return <div style={{ padding: 40, textAlign: 'center' }}>Sale မတွေ့ပါ</div>

  const green = '#16a34a'
  const greenLight = '#f0fdf4'
  const greenDark = '#15803d'

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '10mm', fontFamily: '-apple-system, "Padauk", "Myanmar Text", Arial, sans-serif', color: '#111' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { margin: 0; background: #fff; }
          .no-print { display: none !important; }
        }
        .no-print {
          position: fixed; top: 10px; right: 10px; z-index: 1000;
          background: ${green}; color: white; border: none; padding: 12px 20px;
          border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;
        }
      `}</style>

      <button className="no-print" onClick={() => window.print()}>🖨️ Print</button>

      <div style={{ background: green, color: 'white', padding: '20px 25px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="Logo" style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', background: 'white', padding: 4 }} />
          ) : (
            <div style={{ width: 70, height: 70, borderRadius: 10, background: 'white', color: green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold' }}>P</div>
          )}
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: 0.5 }}>{shop.shop_name || 'POS'}</div>
            {shop.shop_address && <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2 }}>{shop.shop_address}</div>}
            {shop.shop_phone && <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2 }}>📞 {shop.shop_phone}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 1 }}>INVOICE</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>အရောင်းငွေတောင်းခံလွှာ</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>ဖောက်သည် / Bill To</div>
          <div style={{ fontSize: 15, fontWeight: 'bold' }}>{customer?.name || sale.customer_name || 'Walk-in Customer'}</div>
          {customer?.phone && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>📞 {customer.phone}</div>}
          {customer?.address && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{customer.address}</div>}
        </div>
        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>ငွေတောင်းခံလွှာ အချက်အလက်</div>
          <table style={{ fontSize: 12, width: '100%' }}>
            <tbody>
              <tr><td style={{ color: '#666', paddingBottom: 3 }}>Invoice No:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{sale.invoice_no}</td></tr>
              <tr><td style={{ color: '#666', paddingBottom: 3 }}>Date:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{new Date(sale.created_at).toLocaleDateString()}</td></tr>
              <tr><td style={{ color: '#666', paddingBottom: 3 }}>Time:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{new Date(sale.created_at).toLocaleTimeString()}</td></tr>
              {sale.staff?.name && (<tr><td style={{ color: '#666' }}>Staff:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{sale.staff.name}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table with Device Specs */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr style={{ background: green, color: 'white' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 'bold' }}>#</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 'bold' }}>ပစ္စည်း / Item</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 'bold' }}>IMEI</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 'bold' }}>Specs</th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>Qty</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 'bold' }}>Price</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 'bold' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const specs: string[] = []
            if (it.battery_health) specs.push(`🔋 ${it.battery_health}%`)
            if (it.grade) specs.push(`Grade ${it.grade}`)
            if (it.region) specs.push(it.region)
            if (it.warranty_days) specs.push(`🛡️ ${it.warranty_days}d`)

            return (
              <tr key={it.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : greenLight }}>
                <td style={{ padding: '10px 12px', fontSize: 12, verticalAlign: 'top' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 500, verticalAlign: 'top' }}>{it.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 10, fontFamily: 'monospace', color: '#555', verticalAlign: 'top' }}>{it.imei || '-'}</td>
                <td style={{ padding: '10px 12px', fontSize: 10, color: '#444', verticalAlign: 'top' }}>
                  {specs.length ? specs.join(' • ') : '-'}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'center', verticalAlign: 'top' }}>{it.qty}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', verticalAlign: 'top' }}>{Number(it.price).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>
                  {(Number(it.price) * it.qty).toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
        <div>
          <div style={{ background: greenLight, border: `1px solid ${green}`, borderRadius: 6, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>ငွေပေးချေမှု / Payment</div>
            {payments.length === 0 ? <div style={{ fontSize: 12, color: '#666' }}>-</div> : (
              payments.map((p, i) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                  <div style={{ fontWeight: 'bold', color: greenDark }}>{p.method}</div>
                  {p.ref_no && <div style={{ fontSize: 11, color: '#666' }}>Ref: {p.ref_no}</div>}
                  <div style={{ fontSize: 13, fontWeight: 'bold', marginTop: 2 }}>{Number(p.amount).toLocaleString()} Ks</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: '6px 0', color: '#666' }}>Subtotal</td><td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>{Number(sale.subtotal).toLocaleString()} Ks</td></tr>
              {Number(sale.discount) > 0 && (<tr><td style={{ padding: '6px 0', color: '#666' }}>Discount</td><td style={{ padding: '6px 0', textAlign: 'right', color: '#ea580c' }}>-{Number(sale.discount).toLocaleString()} Ks</td></tr>)}
              {Number(sale.tradein_amount) > 0 && (<tr><td style={{ padding: '6px 0', color: '#666' }}>Trade-in</td><td style={{ padding: '6px 0', textAlign: 'right', color: '#2563eb' }}>-{Number(sale.tradein_amount).toLocaleString()} Ks</td></tr>)}
              <tr style={{ borderTop: `2px solid ${green}` }}>
                <td style={{ padding: '12px 0 6px', fontSize: 16, fontWeight: 'bold', color: greenDark }}>TOTAL</td>
                <td style={{ padding: '12px 0 6px', textAlign: 'right', fontSize: 18, fontWeight: 'bold', color: greenDark }}>{Number(sale.total).toLocaleString()} Ks</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {items.some(it => it.item_type === 'device') && (
        <div style={{ background: greenLight, border: `1px dashed ${green}`, borderRadius: 6, padding: '12px 16px', marginBottom: 20, fontSize: 11, color: '#555' }}>
          <div style={{ fontWeight: 'bold', color: greenDark, marginBottom: 4 }}>📋 အာမခံ အချက်အလက် / Warranty Terms</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>ရောင်းပြီး စက်များအတွက် အာမခံ ၇ ရက် (သို့) သတ်မှတ်ထားသည့် ကာလ</li>
            <li>လူကြောင့်ဖြစ်သော ပျက်စီးမှု၊ ရေစိုခြင်း၊ ဖောက်ထွင်းခြင်း အာမခံ မပါဝင်ပါ</li>
            <li>အာမခံ အသုံးပြုရန် ဒီ Invoice လက်မှတ် ယူလာပါ</li>
          </ul>
        </div>
      )}

      <div style={{ borderTop: `2px solid ${green}`, paddingTop: 15, marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, fontSize: 11, color: '#666' }}>
        <div>
          <div style={{ marginBottom: 40, fontSize: 12 }}>ဖောက်သည် လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', width: '70%', paddingTop: 4 }}>Customer Signature</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 40, fontSize: 12 }}>ရောင်းချသူ လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', width: '70%', marginLeft: 'auto', paddingTop: 4 }}>Authorized Signature</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 25, fontSize: 12, color: greenDark, fontWeight: 'bold' }}>
        🙏 ကျေးဇူးတင်ပါသည် / Thank You
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, color: '#999' }}>
        Generated on {new Date().toLocaleString()}
      </div>
    </div>
  )
}

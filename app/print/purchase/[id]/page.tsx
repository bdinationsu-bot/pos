'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getShopInfo } from '@/lib/print'

export default function PurchasePrint() {
  const { id } = useParams()
  const [purchase, setPurchase] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [supplier, setSupplier] = useState<any>(null)
  const [shop, setShop] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('purchases').select('*').eq('id', id as string).maybeSingle()
      setPurchase(p)
      if (p?.supplier_id) {
        const { data: s } = await supabase.from('suppliers').select('*').eq('id', p.supplier_id).maybeSingle()
        setSupplier(s)
      }
      const { data: it } = await supabase.from('purchase_items').select('*').eq('purchase_id', id as string)
      setItems(it ?? [])
      setShop(await getShopInfo())
      setLoading(false)
      setTimeout(() => window.print(), 1000)
    })()
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>...</div>
  if (!purchase) return <div style={{ padding: 40, textAlign: 'center' }}>Purchase မတွေ့ပါ</div>

  const green = '#16a34a'
  const greenLight = '#f0fdf4'
  const greenDark = '#15803d'

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: '10mm', fontFamily: '-apple-system, "Noto Sans Myanmar", Padauk, Arial, sans-serif', color: '#111' }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { margin: 0; background: #fff; }
          .no-print { display: none !important; }
        }
        .no-print {
          position: fixed; top: 10px; right: 10px; z-index: 1000;
          background: ${green}; color: white; border: none; padding: 12px 20px;
          border-radius: 8px; cursor: pointer; font-weight: bold;
        }
      `}</style>

      <button className="no-print" onClick={() => window.print()}>🖨️ Print</button>

      {/* HEADER */}
      <div style={{ background: green, color: 'white', padding: '20px 25px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="Logo" style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', background: 'white', padding: 4 }} />
          ) : (
            <div style={{ width: 70, height: 70, borderRadius: 10, background: 'white', color: green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold' }}>P</div>
          )}
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{shop.shop_name || 'POS'}</div>
            {shop.shop_address && <div style={{ fontSize: 12, opacity: 0.95 }}>{shop.shop_address}</div>}
            {shop.shop_phone && <div style={{ fontSize: 12, opacity: 0.95 }}>📞 {shop.shop_phone}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 30, fontWeight: 'bold' }}>PURCHASE ORDER</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>ဝယ်ယူမှု အော်ဒါ</div>
        </div>
      </div>

      {/* PO INFO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 6 }}>SUPPLIER</div>
          <div style={{ fontSize: 15, fontWeight: 'bold' }}>{supplier?.name || '-'}</div>
          {supplier?.company && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>🏢 {supplier.company}</div>}
          {supplier?.phone && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>📞 {supplier.phone}</div>}
          {supplier?.address && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{supplier.address}</div>}
        </div>

        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 6 }}>ORDER DETAILS</div>
          <table style={{ fontSize: 12, width: '100%' }}>
            <tbody>
              <tr><td style={{ color: '#666', paddingBottom: 4 }}>PO No:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{purchase.purchase_no}</td></tr>
              <tr><td style={{ color: '#666', paddingBottom: 4 }}>Date:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{purchase.purchase_date}</td></tr>
              <tr><td style={{ color: '#666', paddingBottom: 4 }}>Type:</td><td style={{ fontWeight: 'bold', textAlign: 'right', textTransform: 'capitalize' }}>{purchase.purchase_type}</td></tr>
              <tr><td style={{ color: '#666' }}>Status:</td><td style={{ fontWeight: 'bold', textAlign: 'right', textTransform: 'capitalize' }}>{purchase.status}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ITEMS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr style={{ background: green, color: 'white' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, width: 30 }}>#</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12 }}>Item</th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 60 }}>Qty</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, width: 100 }}>Unit Cost</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, width: 110 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const specs: string[] = []
            if (it.storage) specs.push(it.storage)
            if (it.color) specs.push(it.color)
            return (
              <tr key={it.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : greenLight }}>
                <td style={{ padding: '10px 12px', fontSize: 12, verticalAlign: 'top' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>{it.name || it.model}</div>
                  {it.imei && <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#555', marginTop: 2 }}>IMEI: {it.imei}</div>}
                  {specs.length > 0 && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>• {specs.join(' • ')}</div>}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'center', verticalAlign: 'top' }}>{it.qty}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', verticalAlign: 'top' }}>{Number(it.unit_cost).toLocaleString()}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>
                  {Number(it.total_cost).toLocaleString()}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* TOTALS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: greenLight, border: `1px solid ${green}`, borderRadius: 6, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 8 }}>PAYMENT</div>
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 'bold', color: greenDark, textTransform: 'capitalize' }}>{purchase.payment_method || '-'}</div>
            {purchase.payment_ref && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Ref: {purchase.payment_ref}</div>}
          </div>
        </div>
        <div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: '6px 0', color: '#666' }}>Subtotal</td><td style={{ padding: '6px 0', textAlign: 'right' }}>{Number(purchase.subtotal).toLocaleString()} Ks</td></tr>
              {Number(purchase.discount) > 0 && (<tr><td style={{ padding: '6px 0', color: '#666' }}>Discount</td><td style={{ padding: '6px 0', textAlign: 'right', color: '#ea580c' }}>-{Number(purchase.discount).toLocaleString()} Ks</td></tr>)}
              {Number(purchase.tax) > 0 && (<tr><td style={{ padding: '6px 0', color: '#666' }}>Tax</td><td style={{ padding: '6px 0', textAlign: 'right' }}>+{Number(purchase.tax).toLocaleString()} Ks</td></tr>)}
              <tr style={{ borderTop: `2px solid ${green}` }}>
                <td style={{ padding: '12px 0 6px', fontSize: 16, fontWeight: 'bold', color: greenDark }}>TOTAL</td>
                <td style={{ padding: '12px 0 6px', textAlign: 'right', fontSize: 18, fontWeight: 'bold', color: greenDark }}>{Number(purchase.total).toLocaleString()} Ks</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Paid</td>
                <td style={{ padding: '6px 0', textAlign: 'right', color: green }}>{Number(purchase.paid).toLocaleString()} Ks</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666', fontWeight: 'bold' }}>Balance</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold', color: Number(purchase.balance) > 0 ? '#dc2626' : '#16a34a' }}>
                  {Number(purchase.balance).toLocaleString()} Ks
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {purchase.note && (
        <div style={{ border: `1px dashed ${green}`, borderRadius: 6, padding: '12px 16px', marginBottom: 20, background: greenLight }}>
          <div style={{ fontWeight: 'bold', color: greenDark, marginBottom: 6, fontSize: 12 }}>📝 မှတ်ချက်</div>
          <div style={{ fontSize: 12, color: '#555', whiteSpace: 'pre-wrap' }}>{purchase.note}</div>
        </div>
      )}

      {/* SIGNATURES */}
      <div style={{ borderTop: `2px solid ${green}`, paddingTop: 20, marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, fontSize: 12, color: '#666' }}>
        <div>
          <div style={{ marginBottom: 60 }}>ဝယ်ယူသူ လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4, width: '80%' }}>Buyer Signature</div>
          <div style={{ fontSize: 10, marginTop: 4, color: '#999' }}>Date: ___________________</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 60 }}>Supplier လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4, width: '80%', marginLeft: 'auto' }}>Supplier Signature</div>
          <div style={{ fontSize: 10, marginTop: 4, color: '#999' }}>Date: ___________________</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30, paddingTop: 15, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 13, color: greenDark, fontWeight: 'bold' }}>
          {shop.footer_text || '🙏 ကျေးဇူးတင်ပါသည်'}
        </div>
        {shop.footer_text_2 && (
          <div style={{ fontSize: 10, color: '#888', marginTop: 6 }}>{shop.footer_text_2}</div>
        )}
      </div>
    </div>
  )
}

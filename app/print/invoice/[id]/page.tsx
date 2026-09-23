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
  const [installment, setInstallment] = useState<any>(null)
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
      // Fetch installment for this sale
      const { data: inst } = await supabase.from('installment_summary').select('*').eq('sale_id', Number(sid)).maybeSingle()
      if (inst) {
        const { data: instPayments } = await supabase.from('installment_payments').select('*').eq('installment_id', inst.id).order('paid_at')
        setInstallment({ ...inst, payments: instPayments ?? [] })
      }
      setShop(await getShopInfo())
      setLoading(false)
      setTimeout(() => window.print(), 1200)
    })()
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>...</div>
  if (!sale) return <div style={{ padding: 40, textAlign: 'center' }}>Sale မတွေ့ပါ</div>

  const green = '#16a34a'
  const greenLight = '#f0fdf4'
  const greenDark = '#15803d'
  const purple = '#9333ea'
  const purpleLight = '#faf5ff'

  const instMonthly = installment ? Number(installment.installment_amount) : 0
  const instBalance = installment ? Number(installment.balance) : 0
  const instFinanced = installment ? Number(installment.financed_amount) : 0
  const instDP = installment ? Number(installment.down_payment) : 0
  const instDeposit = installment ? Number(installment.deposit_amount) : 0
  const instPaid = installment ? Number(installment.total_paid) : 0

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
          <div style={{ fontSize: 32, fontWeight: 'bold' }}>INVOICE</div>
          {installment && (
            <div style={{ fontSize: 11, opacity: 0.95, marginTop: 4 }}>
              {installment.installment_type === 'rent2own' ? '🏠 RENT2OWN' : '🕌 MAHARBAWGA'}
            </div>
          )}
        </div>
      </div>

      {/* BILL TO + INVOICE INFO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 6 }}>BILL TO</div>
          <div style={{ fontSize: 15, fontWeight: 'bold' }}>{customer?.name || sale.customer_name || 'Walk-in Customer'}</div>
          {customer?.phone && <div style={{ fontSize: 12, color: '#555' }}>📞 {customer.phone}</div>}
        </div>
        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 6 }}>INVOICE DETAILS</div>
          <table style={{ fontSize: 12, width: '100%' }}>
            <tbody>
              <tr><td style={{ color: '#666' }}>Invoice:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{sale.invoice_no}</td></tr>
              <tr><td style={{ color: '#666' }}>Date:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{new Date(sale.created_at).toLocaleDateString()}</td></tr>
              {sale.staff?.name && (<tr><td style={{ color: '#666' }}>Staff:</td><td style={{ fontWeight: 'bold', textAlign: 'right' }}>{sale.staff.name}</td></tr>)}
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
            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, width: 50 }}>Qty</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, width: 100 }}>Price</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, width: 110 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const specs: string[] = []
            if (it.battery_health) specs.push(`Battery ${it.battery_health}%`)
            if (it.storage) specs.push(it.storage)
            if (it.color) specs.push(it.color)
            if (it.region) specs.push(it.region)
            if (it.warranty_days) specs.push(`Warranty ${it.warranty_days} days`)
            return (
              <tr key={it.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : greenLight }}>
                <td style={{ padding: '10px 12px', fontSize: 12, verticalAlign: 'top' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold' }}>{it.name}</div>
                  {it.imei && <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#555', marginTop: 2 }}>IMEI: {it.imei}</div>}
                  {specs.length > 0 && <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>• {specs.join(' • ')}</div>}
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

      {/* INSTALLMENT SUMMARY (Simple) */}
      {installment && (
        <div style={{ border: `2px solid ${purple}`, borderRadius: 8, padding: '14px 18px', marginBottom: 20, background: purpleLight }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: purple }}>
              {installment.installment_type === 'rent2own' ? '🏠 Rent2Own' : '🕌 Maharbawga'}
            </div>
            {installment.microfinance_name && (
              <div style={{ fontSize: 11, color: purple, fontWeight: 'bold' }}>
                💼 {installment.microfinance_name}
              </div>
            )}
          </div>

          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>စက် တန်ဖိုး (Total Value)</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold', fontSize: 15 }}>
                  {Number(installment.total_amount).toLocaleString()} Ks
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#666' }}>Deposit (Customer ပေးပြီး)</td>
                <td style={{ padding: '6px 0', textAlign: 'right', color: '#2563eb', fontWeight: 'bold' }}>
                  {Number(installment.down_payment).toLocaleString()} Ks
                </td>
              </tr>
              <tr style={{ borderTop: `1px dashed ${purple}` }}>
                <td style={{ padding: '8px 0 4px', fontWeight: 'bold', color: purple }}>ရရန်ကျန် (Financed)</td>
                <td style={{ padding: '8px 0 4px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626', fontSize: 16 }}>
                  {Number(installment.financed_amount).toLocaleString()} Ks
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENT + TOTALS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: greenLight, border: `1px solid ${green}`, borderRadius: 6, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 8 }}>PAYMENT</div>
          {payments.map((p, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
              <div style={{ fontWeight: 'bold', color: greenDark }}>{p.method}</div>
              {p.ref_no && <div style={{ fontSize: 11, color: '#666' }}>Ref: {p.ref_no}</div>}
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{Number(p.amount).toLocaleString()} Ks</div>
            </div>
          ))}
        </div>
        <div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: '6px 0', color: '#666' }}>Subtotal</td><td style={{ padding: '6px 0', textAlign: 'right' }}>{Number(sale.subtotal).toLocaleString()} Ks</td></tr>
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

      {/* INVOICE NOTE */}
      {shop.invoice_note && (
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: '#713f12', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          <strong>📌 Note:</strong>
          <div style={{ marginTop: 4 }}>{shop.invoice_note}</div>
        </div>
      )}

      {/* WARRANTY */}
      {items.some(it => it.item_type === 'device') && shop.warranty_policy && (
        <div style={{ background: greenLight, border: `1px dashed ${green}`, borderRadius: 6, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontWeight: 'bold', color: greenDark, marginBottom: 6, fontSize: 12 }}>🛡️ Warranty Policy / အာမခံ စည်းကမ်း</div>
          <div style={{ fontSize: 11, color: '#555', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{shop.warranty_policy}</div>
        </div>
      )}

      {/* SIGNATURES */}
      <div style={{ borderTop: `2px solid ${green}`, paddingTop: 15, marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, fontSize: 11, color: '#666' }}>
        <div>
          <div style={{ marginBottom: 40, fontSize: 12 }}>ဖောက်သည် လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', width: '70%', paddingTop: 4 }}>Customer Signature</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 40, fontSize: 12 }}>ရောင်းချသူ လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', width: '70%', marginLeft: 'auto', paddingTop: 4 }}>Authorized Signature</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <div style={{ fontSize: 14, color: greenDark, fontWeight: 'bold' }}>{shop.footer_text || '🙏 ကျေးဇူးတင်ပါသည် / Thank You'}</div>
        {shop.footer_text_2 && <div style={{ fontSize: 10, color: '#888', marginTop: 6 }}>{shop.footer_text_2}</div>}
      </div>
    </div>
  )
}

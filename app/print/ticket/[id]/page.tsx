'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getShopInfo } from '@/lib/print'

const STATUS_LABELS: Record<string, string> = {
  received: 'လက်ခံရရှိ',
  diagnosing: 'စစ်ဆေးနေ',
  waiting_parts: 'အပိုပစ္စည်း စောင့်',
  in_progress: 'ပြုပြင်နေ',
  completed: 'ပြီးစီး',
  delivered: 'ပေးအပ်',
  cancelled: 'ပယ်ဖျက်'
}

export default function TicketPrint() {
  const { id } = useParams()
  const [r, setR] = useState<any>(null)
  const [shop, setShop] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('repairs').select('*').eq('id', id as string).maybeSingle()
      setR(data)
      setShop(await getShopInfo())
      setLoading(false)
      setTimeout(() => window.print(), 1200)
    })()
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>...</div>
  if (!r) return <div style={{ padding: 40, textAlign: 'center' }}>Ticket မတွေ့ပါ</div>

  const green = '#16a34a'
  const greenLight = '#f0fdf4'
  const greenDark = '#15803d'

  const errors = [
    { label: 'LCD / Display', checked: r.error_lcd, icon: '📱' },
    { label: 'Battery', checked: r.error_battery, icon: '🔋' },
    { label: 'Body / Casing', checked: r.error_body, icon: '📦' },
    { label: 'Face ID / Touch ID', checked: r.error_faceid, icon: '👁️' },
    { label: 'Camera', checked: r.error_camera, icon: '📷' }
  ]

  const selectedErrors = errors.filter(e => e.checked)

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
          <div style={{ fontSize: 30, fontWeight: 'bold' }}>SERVICE TICKET</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>ပြုပြင်ရန် လက်ခံလွှာ</div>
        </div>
      </div>

      {/* TICKET INFO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 6 }}>TICKET NO</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', fontFamily: 'monospace' }}>{r.ticket_no}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            Status: <strong style={{ color: green }}>{STATUS_LABELS[r.status] || r.status}</strong>
          </div>
        </div>
        <div style={{ background: greenLight, borderLeft: `4px solid ${green}`, padding: '12px 16px', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: greenDark, fontWeight: 'bold', marginBottom: 6 }}>ရက်စွဲ / ကြားချိန်</div>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>{new Date(r.created_at).toLocaleDateString()}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{new Date(r.created_at).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* CUSTOMER + DEVICE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ border: `1px solid #e5e7eb`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: greenDark, fontWeight: 'bold', marginBottom: 8, borderBottom: `1px dashed ${green}`, paddingBottom: 4 }}>
            👤 ဖောက်သည် အချက်အလက်
          </div>
          <table style={{ width: '100%', fontSize: 12 }}>
            <tbody>
              <tr><td style={{ color: '#666', paddingBottom: 4, width: 100 }}>နာမည်</td><td style={{ fontWeight: 'bold' }}>{r.customer_name || '-'}</td></tr>
              <tr><td style={{ color: '#666', paddingBottom: 4 }}>ဖုန်း</td><td style={{ fontWeight: 'bold' }}>{r.customer_phone || '-'}</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ border: `1px solid #e5e7eb`, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: greenDark, fontWeight: 'bold', marginBottom: 8, borderBottom: `1px dashed ${green}`, paddingBottom: 4 }}>
            📱 စက် အချက်အလက်
          </div>
          <table style={{ width: '100%', fontSize: 12 }}>
            <tbody>
              <tr><td style={{ color: '#666', paddingBottom: 4, width: 100 }}>Model</td><td style={{ fontWeight: 'bold' }}>{r.model || '-'} {r.storage} {r.color}</td></tr>
              <tr><td style={{ color: '#666', paddingBottom: 4 }}>IMEI</td><td style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: 11 }}>{r.imei || '-'}</td></tr>
              {r.passcode && <tr><td style={{ color: '#666', paddingBottom: 4 }}>Passcode</td><td style={{ fontWeight: 'bold' }}>{r.passcode}</td></tr>}
              {r.accessories && <tr><td style={{ color: '#666', paddingBottom: 4 }}>ပါလာ</td><td>{r.accessories}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ERROR TYPES CHECKLIST */}
      <div style={{ border: `2px solid ${green}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: greenDark, fontWeight: 'bold', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          🔧 ချို့ယွင်းချက် အမျိုးအစား (Error Types)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {errors.map((e, i) => (
            <div key={i} style={{
              border: e.checked ? `2px solid ${green}` : '1px solid #d1d5db',
              background: e.checked ? greenLight : '#fff',
              borderRadius: 6,
              padding: '10px 8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{e.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 'bold', color: e.checked ? greenDark : '#666' }}>
                {e.label}
              </div>
              <div style={{ fontSize: 14, marginTop: 4, color: e.checked ? green : '#ccc', fontWeight: 'bold' }}>
                {e.checked ? '☑' : '☐'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ISSUE DESCRIPTION */}
      <div style={{ border: `1px solid #e5e7eb`, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 'bold', marginBottom: 8, borderBottom: `1px dashed #fca5a5`, paddingBottom: 4 }}>
          ⚠️ ပြဿနာ အသေးစိတ်
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 40 }}>
          {r.issue || '-'}
        </div>
      </div>

      {/* DIAGNOSIS (if any) */}
      {r.diagnosis && (
        <div style={{ border: `1px solid #e5e7eb`, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 'bold', marginBottom: 8, borderBottom: `1px dashed #93c5fd`, paddingBottom: 4 }}>
            🔬 စစ်ဆေးတွေ့ရှိချက်
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {r.diagnosis}
          </div>
        </div>
      )}

      {/* PRICE SUMMARY */}
      <div style={{ border: `2px solid ${green}`, borderRadius: 8, padding: '14px 16px', marginBottom: 20, background: greenLight }}>
        <div style={{ fontSize: 14, color: greenDark, fontWeight: 'bold', marginBottom: 12 }}>
          💰 ကုန်ကျစရိတ်
        </div>
        <table style={{ width: '100%', fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', color: '#666' }}>ခန့်မှန်း ကုန်ကျစရိတ်</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>
                {Number(r.estimated_cost || 0).toLocaleString()} Ks
              </td>
            </tr>
            {r.parts_cost > 0 && (
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>အပိုပစ္စည်း</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{Number(r.parts_cost).toLocaleString()} Ks</td>
              </tr>
            )}
            {r.labor_cost > 0 && (
              <tr>
                <td style={{ padding: '4px 0', color: '#666' }}>လုပ်ခလုပ်</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{Number(r.labor_cost).toLocaleString()} Ks</td>
              </tr>
            )}
            {r.total_cost > 0 && (
              <tr style={{ borderTop: `1px solid ${green}` }}>
                <td style={{ padding: '8px 0 4px', fontWeight: 'bold', color: greenDark, fontSize: 15 }}>စုစုပေါင်း</td>
                <td style={{ padding: '8px 0 4px', textAlign: 'right', fontWeight: 'bold', color: greenDark, fontSize: 16 }}>
                  {Number(r.total_cost).toLocaleString()} Ks
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TERMS */}
      <div style={{ border: '1px dashed #fbbf24', borderRadius: 8, padding: '12px 16px', marginBottom: 20, background: '#fffbeb' }}>
        <div style={{ fontSize: 12, fontWeight: 'bold', color: '#92400e', marginBottom: 6 }}>
          📋 စည်းကမ်းချက်များ
        </div>
        <ul style={{ fontSize: 11, color: '#78350f', lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
          <li>ပြုပြင်ရန် လက်ခံရရှိပြီး <strong>၃၀ ရက်</strong> အတွင်း လာရောက် မထုတ်ယူပါက ဆိုင်မှ တာဝန် မယူပါ</li>
          <li>ခန့်မှန်း ကုန်ကျစရိတ်သည် စစ်ဆေးပြီးမှ <strong>အပြောင်းအလဲ ရှိနိုင်ပါသည်</strong></li>
          <li>အခြား ပြုပြင်ရေး ဆိုင်များတွင် ပြုပြင်ထားသော စက်များ အတွက် အာမခံ မပါဝင်ပါ</li>
          <li>Data Loss အတွက် ဆိုင်မှ <strong>တာဝန် မယူပါ</strong> — Backup ကြိုတင် ယူထားပါ</li>
          <li>ဒီ Ticket လက်မှတ် ပါလာမှသာ စက် ပြန်ထုတ်ပေးပါမည်</li>
        </ul>
      </div>

      {/* SIGNATURES */}
      <div style={{ borderTop: `2px solid ${green}`, paddingTop: 20, marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, fontSize: 12, color: '#666' }}>
        <div>
          <div style={{ marginBottom: 60 }}>ဖောက်သည် လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4, width: '80%' }}>
            Customer Signature
          </div>
          <div style={{ fontSize: 10, marginTop: 4, color: '#999' }}>Date: ___________________</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 60 }}>လက်ခံ ဝန်ထမ်း လက်မှတ်:</div>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4, width: '80%', marginLeft: 'auto' }}>
            Authorized Signature
          </div>
          <div style={{ fontSize: 10, marginTop: 4, color: '#999' }}>Date: ___________________</div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: 'center', marginTop: 30, paddingTop: 15, borderTop: `1px solid #e5e7eb` }}>
        <div style={{ fontSize: 13, color: greenDark, fontWeight: 'bold' }}>
          {shop.footer_text || '🙏 ကျေးဇူးတင်ပါသည်'}
        </div>
        {shop.footer_text_2 && (
          <div style={{ fontSize: 10, color: '#888', marginTop: 6 }}>
            {shop.footer_text_2}
          </div>
        )}
      </div>
    </div>
  )
}

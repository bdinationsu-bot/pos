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
      setTimeout(() => window.print(), 800)
    })()
  }, [id])

  if (loading) return <p style={{ padding: 20 }}>...</p>
  if (!r) return <p style={{ padding: 20 }}>Ticket မတွေ့ပါ</p>

  return (
    <div style={{ width: '80mm', margin: '0 auto', padding: '4mm', fontFamily: 'monospace', fontSize: '11px' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        {shop.logo_url && <img src={shop.logo_url} style={{ width: 40, height: 40, objectFit: 'cover', margin: '0 auto 4px', display: 'block' }} />}
        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{shop.shop_name || 'POS'}</div>
        {shop.shop_phone && <div>{shop.shop_phone}</div>}
      </div>

      <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '6px 0', marginBottom: 8 }}>
        REPAIR TICKET
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{r.ticket_no}</div>
        <div>{new Date(r.created_at).toLocaleString()}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', paddingTop: 6, marginBottom: 6 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>ဖောက်သည်</div>
        <div>နာမည်: {r.customer_name || '-'}</div>
        <div>ဖုန်း: {r.customer_phone || '-'}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', paddingTop: 6, marginBottom: 6 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>စက်</div>
        <div>Model: {r.model} {r.storage} {r.color}</div>
        {r.imei && <div>IMEI: {r.imei}</div>}
        {r.passcode && <div>Passcode: {r.passcode}</div>}
        {r.accessories && <div>ပါလာ: {r.accessories}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #000', paddingTop: 6, marginBottom: 6 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>ပြဿနာ</div>
        <div style={{ fontSize: 10 }}>{r.issue}</div>
      </div>

      {r.diagnosis && (
        <div style={{ borderTop: '1px dashed #000', paddingTop: 6, marginBottom: 6 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>စစ်ဆေးချက်</div>
          <div style={{ fontSize: 10 }}>{r.diagnosis}</div>
        </div>
      )}

      <div style={{ borderTop: '1px dashed #000', paddingTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>ခန့်မှန်း ကုန်ကျစရိတ်</span>
          <span>{Number(r.estimated_cost || 0).toLocaleString()} Ks</span>
        </div>
        {r.total_cost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13 }}>
            <span>စုစုပေါင်း</span>
            <span>{Number(r.total_cost).toLocaleString()} Ks</span>
          </div>
        )}
        {r.warranty_days > 0 && (
          <div style={{ marginTop: 4 }}>အာမခံ: {r.warranty_days} ရက်</div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', marginTop: 8, paddingTop: 6, fontSize: 9 }}>
        <div>အခြေအနေ: {STATUS_LABELS[r.status]}</div>
        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <div>*** ကျေးဇူးတင်ပါသည် ***</div>
          <div style={{ marginTop: 20, borderTop: '1px solid #000', width: '60%', margin: '20px auto 0', paddingTop: 4 }}>
            လက်မှတ်
          </div>
        </div>
      </div>
    </div>
  )
}

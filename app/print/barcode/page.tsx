'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getShopInfo } from '@/lib/print'
import JsBarcode from 'jsbarcode'

function BarcodeContent() {
  const params = useSearchParams()
  const ids = (params.get('ids') || '').split(',').filter(Boolean)
  const [devices, setDevices] = useState<any[]>([])
  const [shop, setShop] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      if (!ids.length) { setLoading(false); return }
      const { data } = await supabase.from('devices').select('*').in('id', ids)
      const map: any = {}
      ;(data ?? []).forEach(d => map[d.id] = d)
      setDevices(ids.map(id => map[Number(id)]).filter(Boolean))
      setShop(await getShopInfo())
      setLoading(false)
    })()
  }, [params])

  useEffect(() => {
    if (loading) return
    devices.forEach(d => {
      const el = document.getElementById(`bc-${d.id}`)
      if (el && d.imei) {
        try {
          JsBarcode(el, d.imei, {
            format: 'CODE128',
            width: 1.4,
            height: 32,
            displayValue: false,
            margin: 0
          })
        } catch (e) { console.error(e) }
      }
    })
    setTimeout(() => window.print(), 1000)
  }, [loading, devices])

  if (loading) return <p style={{ padding: 20 }}>...</p>
  if (!devices.length) return <p style={{ padding: 20 }}>Device မတွေ့ပါ</p>

  return (
    <div>
      <style>{`
        @media print {
          /* Landscape: 50mm wide × 40mm tall */
          @page { size: 50mm 40mm landscape; margin: 0; }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .sticker {
            page-break-after: always;
            border: none !important;
            break-after: page;
          }
        }
        body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, 'Padauk', Arial, sans-serif; }
        .grid {
          display: flex;
          flex-wrap: wrap;
          gap: 3mm;
          padding: 3mm;
        }
        .sticker {
          /* Landscape: 50mm × 40mm */
          width: 50mm;
          height: 40mm;
          padding: 1.5mm;
          border: 1px dashed #ccc;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          gap: 2mm;
          background: white;
          overflow: hidden;
        }
        /* Left column - shop logo + model */
        .left-col {
          width: 16mm;
          display: flex;
          flex-direction: column;
          border-right: 0.3mm dashed #16a34a;
          padding-right: 1.5mm;
        }
        .shop-row {
          display: flex;
          align-items: center;
          gap: 1mm;
          margin-bottom: 0.5mm;
        }
        .shop-logo {
          width: 4mm;
          height: 4mm;
          border-radius: 0.8mm;
          object-fit: cover;
        }
        .shop-logo-fallback {
          width: 4mm;
          height: 4mm;
          border-radius: 0.8mm;
          background: #16a34a;
          color: white;
          font-size: 6px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .shop-name {
          font-size: 7px;
          font-weight: bold;
          color: #16a34a;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .model {
          font-size: 9px;
          font-weight: bold;
          line-height: 1.1;
          margin-top: 0.5mm;
          word-break: break-word;
        }
        .storage-color {
          font-size: 6.5px;
          color: #555;
          line-height: 1.1;
          margin-top: 0.3mm;
        }
        .specs-mini {
          margin-top: auto;
          display: flex;
          gap: 1mm;
          font-size: 6px;
        }
        .badge {
          padding: 0.3mm 0.8mm;
          border-radius: 0.5mm;
          font-weight: bold;
          font-size: 5.5px;
        }
        .badge-grade { background: #dcfce7; color: #166534; }
        .badge-battery-good { background: #dcfce7; color: #166534; }
        .badge-battery-mid { background: #fef3c7; color: #92400e; }
        .badge-battery-bad { background: #fee2e2; color: #991b1b; }

        /* Right column - specs + barcode + price */
        .right-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .specs-row {
          display: flex;
          justify-content: space-between;
          gap: 1mm;
          font-size: 6.5px;
          padding: 0.5mm 0;
        }
        .spec-item {
          text-align: center;
          flex: 1;
        }
        .spec-label {
          color: #888;
          font-size: 5px;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }
        .spec-value {
          font-weight: bold;
          color: #111;
          font-size: 7px;
        }
        .battery-good { color: #16a34a; }
        .battery-mid { color: #ca8a04; }
        .battery-bad { color: #dc2626; }
        .region-full {
          font-size: 6.5px;
          font-weight: bold;
          color: #1e40af;
        }
        .region-esim {
          color: #166534;
        }
        .barcode-wrap {
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0.3mm 0;
        }
        .imei-text {
          font-size: 6px;
          font-family: 'Courier New', monospace;
          text-align: center;
          color: #555;
          letter-spacing: 0.1px;
          margin-bottom: 0.2mm;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 0.2mm solid #e5e5e5;
          padding-top: 0.5mm;
        }
        .price-label {
          font-size: 5px;
          color: #888;
          text-transform: uppercase;
        }
        .price {
          font-size: 12px;
          font-weight: bold;
          color: #16a34a;
          line-height: 1;
        }
      `}</style>

      <div className="grid">
        {devices.map(d => {
          const battery = d.battery_health || 0
          const batteryClass = battery >= 90 ? 'battery-good'
            : battery >= 80 ? 'battery-mid'
            : 'battery-bad'
          const batteryBadgeClass = battery >= 90 ? 'badge-battery-good'
            : battery >= 80 ? 'badge-battery-mid'
            : 'badge-battery-bad'
          const regionVal = (d.region || 'Physical').trim()
          const isEsim = regionVal.toLowerCase().includes('esim')

          return (
            <div key={d.id} className="sticker">
              {/* LEFT COLUMN */}
              <div className="left-col">
                <div className="shop-row">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} className="shop-logo" alt="" />
                  ) : (
                    <div className="shop-logo-fallback">P</div>
                  )}
                  <div className="shop-name">{shop.shop_name || 'POS'}</div>
                </div>

                <div className="model">{d.model}</div>
                <div className="storage-color">
                  {d.storage} {d.color && `• ${d.color}`}
                </div>

                <div className="specs-mini">
                  <span className={`badge ${batteryBadgeClass}`}>{battery}%</span>
                  <span className="badge badge-grade">{d.grade || 'A'}</span>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="right-col">
                {/* Region full display */}
                <div className="specs-row">
                  <div className="spec-item">
                    <div className="spec-label">Region</div>
                    <div className={`region-full ${isEsim ? 'region-esim' : ''}`}>
                      {regionVal}
                    </div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Battery</div>
                    <div className={`spec-value ${batteryClass}`}>{battery}%</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Grade</div>
                    <div className="spec-value">{d.grade || 'A'}</div>
                  </div>
                </div>

                {/* Barcode */}
                <div>
                  <div className="imei-text">{d.imei}</div>
                  <div className="barcode-wrap">
                    <svg id={`bc-${d.id}`}></svg>
                  </div>
                </div>

                {/* Price */}
                <div className="price-row">
                  <div className="price-label">Price</div>
                  <div className="price">{Number(d.sale_price).toLocaleString()} Ks</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BarcodePrint() {
  return (
    <Suspense fallback={<p style={{ padding: 20 }}>...</p>}>
      <BarcodeContent />
    </Suspense>
  )
}

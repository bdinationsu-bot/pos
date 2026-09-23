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
  const [size, setSize] = useState('40x50')

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
            width: 1.2,
            height: 30,
            displayValue: false,
            margin: 0
          })
        } catch (e) { console.error(e) }
      }
    })
  }, [loading, devices, size])

  if (loading) return <p style={{ padding: 20 }}>...</p>
  if (!devices.length) return <p style={{ padding: 20 }}>Device မတွေ့ပါ</p>

  const isLandscape = size === '50x40'
  const pageSize = isLandscape ? '50mm 40mm' : '40mm 50mm'
  const stickerW = isLandscape ? '50mm' : '40mm'
  const stickerH = isLandscape ? '40mm' : '50mm'

  return (
    <div>
      <style>{`
        /* ═══ PRINT EXACT SIZE — No margins, no header/footer ═══ */
        @page {
          size: ${pageSize} !important;
          margin: 0 !important;
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${stickerW} !important;
            height: ${stickerH} !important;
            background: #fff !important;
            overflow: hidden !important;
          }
          .toolbar, .no-print {
            display: none !important;
          }
          .grid {
            display: block !important;
            padding: 0 !important;
            gap: 0 !important;
            margin: 0 !important;
          }
          .sticker {
            width: ${stickerW} !important;
            height: ${stickerH} !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            border: none !important;
            margin: 0 !important;
            padding: 1.5mm !important;
            box-shadow: none !important;
            display: flex !important;
            box-sizing: border-box !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, Padauk, Arial, sans-serif; }
        .toolbar { position: fixed; top: 10px; right: 10px; z-index: 100; background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: flex; gap: 8px; align-items: center; }
        .grid { display: flex; flex-wrap: wrap; gap: 3mm; padding: 3mm; }
        .sticker {
          width: ${stickerW};
          height: ${stickerH};
          padding: 1.5mm;
          border: 1px dashed #ccc;
          box-sizing: border-box;
          display: flex;
          flex-direction: ${isLandscape ? 'row' : 'column'};
          gap: 1.5mm;
          background: white;
          overflow: hidden;
        }
        .left-col { ${isLandscape ? 'width: 16mm; border-right: 0.3mm dashed #16a34a; padding-right: 1.5mm;' : ''} display: flex; flex-direction: column; }
        .shop-row { display: flex; align-items: center; gap: 1mm; margin-bottom: 0.5mm; border-bottom: 0.3mm solid #16a34a; padding-bottom: 1mm; }
        .shop-logo { width: 4mm; height: 4mm; border-radius: 0.8mm; object-fit: cover; }
        .shop-logo-fallback { width: 4mm; height: 4mm; border-radius: 0.8mm; background: #16a34a; color: white; font-size: 6px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
        .shop-name { font-size: 7px; font-weight: bold; color: #16a34a; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .model { font-size: ${isLandscape ? '9px' : '11px'}; font-weight: bold; line-height: 1.1; margin-top: 0.5mm; word-break: break-word; }
        .storage-color { font-size: 6.5px; color: #555; line-height: 1.1; margin-top: 0.3mm; }
        .specs-mini { margin-top: auto; display: flex; gap: 1mm; font-size: 6px; }
        .badge { padding: 0.3mm 0.8mm; border-radius: 0.5mm; font-weight: bold; font-size: 5.5px; }
        .badge-battery-good { background: #dcfce7; color: #166534; }
        .badge-battery-mid { background: #fef3c7; color: #92400e; }
        .badge-battery-bad { background: #fee2e2; color: #991b1b; }
        .right-col { ${isLandscape ? 'flex: 1;' : ''} display: flex; flex-direction: column; justify-content: space-between; }
        .specs-row { display: flex; justify-content: space-between; gap: 1mm; font-size: 6.5px; padding: 0.5mm 0; }
        .spec-item { text-align: center; flex: 1; }
        .spec-label { color: #888; font-size: 5px; text-transform: uppercase; }
        .spec-value { font-weight: bold; color: #111; font-size: 7px; }
        .battery-good { color: #16a34a; }
        .battery-mid { color: #ca8a04; }
        .battery-bad { color: #dc2626; }
        .region-full { font-size: 6.5px; font-weight: bold; color: #1e40af; }
        .region-esim { color: #166534; }
        .barcode-wrap { text-align: center; display: flex; justify-content: center; align-items: center; padding: 0.3mm 0; }
        .imei-text { font-size: 6px; font-family: 'Courier New', monospace; text-align: center; color: #555; margin-bottom: 0.2mm; }
        .price-row { display: flex; justify-content: space-between; align-items: center; border-top: 0.2mm solid #e5e5e5; padding-top: 0.5mm; }
        .price-label { font-size: 5px; color: #888; text-transform: uppercase; }
        .price { font-size: 12px; font-weight: bold; color: #16a34a; line-height: 1; }
      `}</style>

      <div className="toolbar no-print">
        <label className="text-xs font-medium">Size:</label>
        <select value={size} onChange={e => setSize(e.target.value)} className="border rounded p-1 text-sm">
          <option value="40x50">40 × 50 mm (Portrait)</option>
          <option value="50x40">50 × 40 mm (Landscape)</option>
        </select>
        <button onClick={() => window.print()} className="bg-green-600 text-white px-4 py-1 rounded text-sm font-medium">
          🖨️ Print
        </button>
      </div>

      <div className="grid">
        {devices.map(d => {
          const battery = d.battery_health || 0
          const batteryClass = battery >= 90 ? 'battery-good' : battery >= 80 ? 'battery-mid' : 'battery-bad'
          const batteryBadgeClass = battery >= 90 ? 'badge-battery-good' : battery >= 80 ? 'badge-battery-mid' : 'badge-battery-bad'
          const regionVal = (d.region || 'Physical').trim()
          const isEsim = regionVal.toLowerCase().includes('esim')

          return (
            <div key={d.id} className="sticker">
              <div className="left-col">
                <div className="shop-row">
                  {shop.logo_url ? <img src={shop.logo_url} className="shop-logo" alt="" /> : <div className="shop-logo-fallback">P</div>}
                  <div className="shop-name">{shop.shop_name || 'POS'}</div>
                </div>
                <div className="model">{d.model}</div>
                <div className="storage-color">{d.storage} {d.color && `• ${d.color}`}</div>
                <div className="specs-mini">
                  <span className={`badge ${batteryBadgeClass}`}>{battery}%</span>
                </div>
              </div>
              <div className="right-col">
                <div className="specs-row">
                  <div className="spec-item">
                    <div className="spec-label">Region</div>
                    <div className={`region-full ${isEsim ? 'region-esim' : ''}`}>{regionVal}</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Battery</div>
                    <div className={`spec-value ${batteryClass}`}>{battery}%</div>
                  </div>
                </div>
                <div>
                  <div className="imei-text">{d.imei}</div>
                  <div className="barcode-wrap"><svg id={`bc-${d.id}`}></svg></div>
                </div>
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

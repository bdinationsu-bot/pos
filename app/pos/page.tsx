'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'
import { PAYMENT_CATEGORIES, getMethodLabel, type PaymentCategory } from './payment-options'
import { FOC_REASONS } from '@/lib/accounting'

type CartItem = {
  item_type: 'device' | 'accessory'
  item_id: number
  name: string
  imei?: string
  qty: number
  price: number
  cost: number
  battery_health?: number | null
  grade?: string | null
  region?: string | null
  storage?: string | null
  color?: string | null
  warranty_days?: number
  is_foc?: boolean
  foc_reason?: string
}

export default function POSPage() {
  const { t } = useLang()
  const [imei, setImei] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [tradein, setTradein] = useState(0)
  const [loading, setLoading] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffId, setStaffId] = useState<number | null>(null)
  const [payModal, setPayModal] = useState<PaymentCategory | null>(null)
  const [payRef, setPayRef] = useState('')

  // Accessories picker
  const [showAccModal, setShowAccModal] = useState(false)
  const [accList, setAccList] = useState<any[]>([])
  const [accSearch, setAccSearch] = useState('')

  // FOC modal
  const [focModal, setFocModal] = useState<CartItem | null>(null)
  const [focReason, setFocReason] = useState('gift')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('staff').select('*').eq('active', true).order('name')
      setStaffList(data ?? [])
      const { data: acc } = await supabase.from('accessories').select('*').gt('qty', 0).order('name')
      setAccList(acc ?? [])
    })()
  }, [])

  async function scanImei() {
    const q = imei.trim()
    if (!q) return
    setLoading(true)
    const { data, error } = await supabase
      .from('devices').select('*').eq('imei', q).eq('status', 'in_stock').maybeSingle()
    setLoading(false)
    if (error) return alert('Error: ' + error.message)
    if (!data) return alert(t('pos.no_imei'))
    if (cart.some(c => c.item_id === data.id && c.item_type === 'device')) {
      return alert(t('pos.already_in_cart'))
    }
    setCart([...cart, {
      item_type: 'device',
      item_id: data.id,
      name: `${data.model} ${data.storage ?? ''} ${data.color ?? ''}`.trim(),
      imei: data.imei ?? undefined,
      qty: 1,
      price: Number(data.sale_price),
      cost: Number(data.cost_price),
      battery_health: data.battery_health ?? null,
      grade: data.grade ?? null,
      region: data.region ?? null,
      storage: data.storage ?? null,
      color: data.color ?? null,
      warranty_days: data.warranty_days ?? 0,
      is_foc: false
    }])
    setImei('')
  }

  function addAccessory(a: any, isFoc: boolean, reason?: string) {
    const existingIdx = cart.findIndex(c => c.item_type === 'accessory' && c.item_id === a.id && c.is_foc === isFoc)

    if (existingIdx >= 0 && !isFoc) {
      const next = [...cart]
      next[existingIdx].qty += 1
      setCart(next)
    } else {
      setCart([...cart, {
        item_type: 'accessory',
        item_id: a.id,
        name: a.name,
        qty: 1,
        price: isFoc ? 0 : Number(a.price),
        cost: Number(a.cost),
        is_foc: isFoc,
        foc_reason: isFoc ? reason : undefined
      }])
    }
    setShowAccModal(false)
    setAccSearch('')
  }

  function removeItem(i: number) {
    setCart(cart.filter((_, x) => x !== i))
  }

  function updateQty(i: number, qty: number) {
    const next = [...cart]
    next[i].qty = Math.max(1, qty)
    setCart(next)
  }

  function toggleFoc(i: number) {
    const item = cart[i]
    if (item.item_type !== 'accessory') return
    if (item.is_foc) {
      // FOC ဖျက်
      const next = [...cart]
      next[i].is_foc = false
      next[i].foc_reason = undefined
      const acc = accList.find(a => a.id === item.item_id)
      if (acc) next[i].price = Number(acc.price)
      setCart(next)
    } else {
      // FOC modal ဖွင့်
      setFocModal(item)
      setFocReason('gift')
    }
  }

  function confirmFoc() {
    if (!focModal) return
    const idx = cart.findIndex(c => c.item_id === focModal.item_id && c.item_type === 'accessory' && !c.is_foc)
    if (idx < 0) return
    const next = [...cart]
    next[idx].is_foc = true
    next[idx].foc_reason = focReason
    next[idx].price = 0
    setCart(next)
    setFocModal(null)
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const total = subtotal - discount - tradein
  const focTotal = cart.filter(c => c.is_foc).reduce((s, c) => s + c.cost * c.qty, 0)

  function openPayment(cat: PaymentCategory) {
    if (cart.length === 0) return alert(t('pos.cart_empty'))
    if (total < 0) return alert('Total < 0')
    setPayRef('')
    if (cat.providers.length === 0) doCheckout(cat.code, undefined)
    else setPayModal(cat)
  }

  async function doCheckout(categoryCode: string, providerCode?: string) {
    setLoading(true)
    const method = getMethodLabel(categoryCode, providerCode)
    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: null,
      p_subtotal: subtotal, p_discount: discount, p_tradein: tradein,
      p_total: total, p_items: cart, p_method: method,
      p_staff_id: staffId, p_payment_ref: payRef || null
    })
    setLoading(false)
    if (error) return alert('Error: ' + error.message)
    alert(`${t('pos.sold_success')} ${data}`)
    window.open(`/print/invoice/${data}`, '_blank', 'width=900,height=1200')
    setCart([]); setDiscount(0); setTradein(0); setPayModal(null); setPayRef('')
  }

  const batteryColor = (h?: number | null) => {
    if (!h) return 'text-gray-400'
    if (h >= 90) return 'text-green-600 font-bold'
    if (h >= 80) return 'text-yellow-600 font-bold'
    return 'text-red-600 font-bold'
  }

  const filteredAcc = accList.filter(a =>
    !accSearch || a.name.toLowerCase().includes(accSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-green-800">{t('pos.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <div className="flex gap-2 mb-4">
            <input
              value={imei}
              onChange={e => setImei(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && scanImei()}
              placeholder={t('pos.scan_placeholder')}
              className="border p-3 flex-1 rounded text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button onClick={scanImei} disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 rounded disabled:opacity-50">
              {loading ? '...' : t('common.add')}
            </button>
            <button onClick={() => setShowAccModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded font-medium">
              📦 Accessory
            </button>
          </div>

          <div className="space-y-2">
            {cart.length === 0 && (
              <div className="p-8 text-center text-gray-400">{t('pos.cart_empty')}</div>
            )}
            {cart.map((c, i) => (
              <div key={i} className={`border rounded-lg p-3 ${c.is_foc ? 'bg-orange-50 border-orange-300' : 'bg-green-50'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {c.is_foc && <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold">🎁 FOC</span>}
                      <span className="font-bold text-green-800">{c.name}</span>
                    </div>
                    {c.imei && <div className="text-xs font-mono text-gray-600 mt-1">IMEI: {c.imei}</div>}

                    {c.item_type === 'device' && (
                      <div className="flex gap-2 mt-2 text-xs flex-wrap">
                        {c.battery_health != null && (
                          <span className="bg-white px-2 py-0.5 rounded border">
                            🔋 <span className={batteryColor(c.battery_health)}>{c.battery_health}%</span>
                          </span>
                        )}
                        {c.grade && <span className="bg-white px-2 py-0.5 rounded border">Grade <strong className="text-green-700">{c.grade}</strong></span>}
                        {c.region && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{c.region}</span>}
                        {(c.warranty_days || 0) > 0 && <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">🛡️ {c.warranty_days} ရက်</span>}
                      </div>
                    )}

                    {c.item_type === 'accessory' && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-gray-600">Qty:</label>
                        <input type="number" value={c.qty} min={1}
                          onChange={e => updateQty(i, +e.target.value)}
                          className="border rounded px-2 py-0.5 w-16 text-sm" />
                        <button onClick={() => toggleFoc(i)}
                          className={`text-xs px-2 py-1 rounded border ${c.is_foc ? 'bg-orange-200 border-orange-400' : 'bg-white border-gray-300 hover:border-orange-400'}`}>
                          {c.is_foc ? '🎁 FOC ဖျက်' : '🎁 FOC လုပ်'}
                        </button>
                        {c.is_foc && c.foc_reason && (
                          <span className="text-xs text-orange-700">({c.foc_reason})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {c.is_foc ? (
                      <>
                        <div className="font-bold text-orange-700 line-through">{Number(c.cost).toLocaleString()}</div>
                        <div className="text-xs text-orange-700 font-bold">FOC (0)</div>
                      </>
                    ) : (
                      <div className="font-bold text-green-700">{c.price.toLocaleString()}</div>
                    )}
                    <button onClick={() => removeItem(i)} className="text-red-600 text-xs mt-1">
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span>{t('pos.staff_select')}</span>
            <select value={staffId ?? ''} onChange={e => setStaffId(e.target.value ? +e.target.value : null)}
              className="border p-1 rounded w-32">
              <option value="">--</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex justify-between">
            <span>{t('pos.subtotal')}</span>
            <span className="font-bold">{subtotal.toLocaleString()} Ks</span>
          </div>

          {focTotal > 0 && (
            <div className="flex justify-between text-orange-700 text-sm bg-orange-50 p-2 rounded">
              <span>🎁 FOC Cost</span>
              <span className="font-bold">{focTotal.toLocaleString()} Ks</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span>{t('pos.discount')}</span>
            <input type="number" value={discount || ''} onChange={e => setDiscount(+e.target.value || 0)}
              className="border p-1 w-32 text-right rounded" placeholder="0" />
          </div>
          <div className="flex justify-between items-center">
            <span>{t('pos.tradein_amount')}</span>
            <input type="number" value={tradein || ''} onChange={e => setTradein(+e.target.value || 0)}
              className="border p-1 w-32 text-right rounded" placeholder="0" />
          </div>
          <hr />
          <div className="flex justify-between text-lg font-bold">
            <span>{t('common.total')}</span>
            <span className="text-green-700">{total.toLocaleString()} Ks</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {PAYMENT_CATEGORIES.map(cat => (
              <button key={cat.code} onClick={() => openPayment(cat)}
                disabled={loading || cart.length === 0}
                className={`${cat.color} hover:opacity-90 text-white py-3 rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2`}>
                <span>{cat.icon}</span>
                <span className="text-sm">{t('payment.' + cat.code)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accessory Modal */}
      {showAccModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">📦 Accessory ရွေး</h2>
              <button onClick={() => setShowAccModal(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <input value={accSearch} onChange={e => setAccSearch(e.target.value)}
              placeholder="🔍 ရှာ"
              className="border p-2 rounded mb-3" />
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredAcc.length === 0 && <p className="text-center text-gray-400 py-4">Accessory မရှိပါ</p>}
              {filteredAcc.map(a => (
                <div key={a.id} className="border rounded p-3 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-500">
                      Stock: {a.qty} • Cost: {Number(a.cost).toLocaleString()} • Price: {Number(a.price).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addAccessory(a, false)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                      💰 ရောင်း
                    </button>
                    <button onClick={() => { addAccessory(a, true, 'gift'); }}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm">
                      🎁 FOC
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOC Reason Modal */}
      {focModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <h2 className="text-lg font-bold mb-3">🎁 FOC အကြောင်းရင်း</h2>
            <div className="mb-3 p-3 bg-orange-50 rounded">
              <div className="font-medium">{focModal.name}</div>
              <div className="text-xs text-gray-600">
                Cost: {Number(focModal.cost).toLocaleString()} Ks (GP ထဲ ထည့်တွက်မယ်)
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {FOC_REASONS.map(r => (
                <label key={r.code} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input type="radio" checked={focReason === r.code} onChange={() => setFocReason(r.code)} />
                  <span>{r.name} ({r.nameEn})</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={confirmFoc} className="bg-orange-500 hover:bg-orange-600 text-white flex-1 py-2 rounded font-medium">
                ✅ FOC လုပ်
              </button>
              <button onClick={() => setFocModal(null)} className="bg-gray-200 px-4 py-2 rounded">ပယ်ဖျက်</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>{payModal.icon}</span><span>{payModal.name}</span>
              </h2>
              <button onClick={() => setPayModal(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-1">{t('common.amount')}</div>
              <div className="text-2xl font-bold text-green-700">{total.toLocaleString()} Ks</div>
            </div>
            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
              {payModal.providers.map(p => (
                <button key={p.code} onClick={() => doCheckout(payModal.code, p.code)} disabled={loading}
                  className="w-full text-left border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 px-4 py-3 rounded-lg font-medium disabled:opacity-50">
                  {p.name}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Ref No {t('common.optional')}</label>
              <input value={payRef} onChange={e => setPayRef(e.target.value)} className="border p-2 rounded w-full" />
            </div>
            <button onClick={() => setPayModal(null)} className="w-full bg-gray-200 hover:bg-gray-300 py-2 rounded">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

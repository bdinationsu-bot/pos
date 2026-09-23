'use client'
import { useState, useEffect, useRef } from 'react'
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

type Suggest = {
  id: number
  imei: string
  model: string
  storage: string | null
  color: string | null
  sale_price: number
  battery_health: number | null
  grade: string | null
  region: string | null
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

  // IMEI Suggestions
  const [suggestions, setSuggestions] = useState<Suggest[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const suggestRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('staff').select('*').eq('active', true).order('name')
      setStaffList(data ?? [])
      const { data: acc } = await supabase.from('accessories').select('*').gt('qty', 0).order('name')
      setAccList(acc ?? [])
    })()
  }, [])

  // IMEI Suggest — debounced
  useEffect(() => {
    const q = imei.trim()
    if (q.length < 2) {
      setSuggestions([])
      setShowSuggest(false)
      return
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('devices')
        .select('id, imei, model, storage, color, sale_price, battery_health, grade, region')
        .eq('status', 'in_stock')
        .ilike('imei', `%${q}%`)
        .order('id', { ascending: false })
        .limit(10)
      setSuggestions(data ?? [])
      setShowSuggest(true)
      setHighlightIdx(0)
    }, 200)

    return () => clearTimeout(timer)
  }, [imei])

  // Click outside to close suggestions
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addDeviceToCart(d: any) {
    if (cart.some(c => c.item_id === d.id && c.item_type === 'device')) {
      alert('ဒီ device ကို cart ထဲ ထည့်ပြီးသား')
      return
    }
    setCart([...cart, {
      item_type: 'device',
      item_id: d.id,
      name: `${d.model} ${d.storage ?? ''} ${d.color ?? ''}`.trim(),
      imei: d.imei ?? undefined,
      qty: 1,
      price: Number(d.sale_price),
      cost: Number(d.cost_price || 0),
      battery_health: d.battery_health ?? null,
      grade: d.grade ?? null,
      region: d.region ?? null,
      storage: d.storage ?? null,
      color: d.color ?? null,
      warranty_days: d.warranty_days ?? 0,
      is_foc: false
    }])
    setImei('')
    setSuggestions([])
    setShowSuggest(false)
    inputRef.current?.focus()
  }

  async function scanImei() {
    const q = imei.trim()
    if (!q) return

    // If suggestion exists, pick first one
    if (suggestions.length > 0 && showSuggest) {
      const pick = suggestions[highlightIdx] || suggestions[0]
      // Fetch full device
      setLoading(true)
      const { data } = await supabase.from('devices').select('*').eq('id', pick.id).maybeSingle()
      setLoading(false)
      if (data) addDeviceToCart(data)
      return
    }

    // Exact search
    setLoading(true)
    const { data, error } = await supabase
      .from('devices').select('*').eq('imei', q).eq('status', 'in_stock').maybeSingle()
    setLoading(false)

    if (error) return alert('Error: ' + error.message)
    if (!data) return alert(t('pos.no_imei'))
    addDeviceToCart(data)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggest || suggestions.length === 0) {
      if (e.key === 'Enter') scanImei()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = suggestions[highlightIdx]
      if (pick) {
        // Add full device data
        supabase.from('devices').select('*').eq('id', pick.id).maybeSingle().then(({ data }) => {
          if (data) addDeviceToCart(data)
        })
      }
    } else if (e.key === 'Escape') {
      setShowSuggest(false)
    }
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
      const next = [...cart]
      next[i].is_foc = false
      next[i].foc_reason = undefined
      const acc = accList.find(a => a.id === item.item_id)
      if (acc) next[i].price = Number(acc.price)
      setCart(next)
    } else {
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

  function highlightText(text: string, q: string) {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx < 0) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 font-bold">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-green-800">{t('pos.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          {/* IMEI Input with Suggest */}
          <div className="relative mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  value={imei}
                  onChange={e => setImei(e.target.value)}
                  onKeyDown={onKeyDown}
                  onFocus={() => imei.length >= 2 && suggestions.length > 0 && setShowSuggest(true)}
                  placeholder={t('pos.scan_placeholder')}
                  className="border-2 border-green-500 p-3 rounded text-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                  autoFocus
                  autoComplete="off"
                />
                {imei && (
                  <button
                    onClick={() => { setImei(''); setSuggestions([]); setShowSuggest(false); inputRef.current?.focus() }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                )}

                {/* Suggestions Dropdown */}
                {showSuggest && suggestions.length > 0 && (
                  <div
                    ref={suggestRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-500 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto"
                  >
                    <div className="p-2 bg-green-50 text-xs text-green-800 font-medium border-b sticky top-0">
                      🔍 {suggestions.length} လုံး တွေ့ — ↑↓ ရွေး / Enter နှိပ်
                    </div>
                    {suggestions.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          supabase.from('devices').select('*').eq('id', s.id).maybeSingle().then(({ data }) => {
                            if (data) addDeviceToCart(data)
                          })
                        }}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={`w-full text-left p-3 border-b hover:bg-green-50 transition ${
                          idx === highlightIdx ? 'bg-green-100 border-l-4 border-l-green-600' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-green-800">
                              {s.model} {s.storage} {s.color && `• ${s.color}`}
                            </div>
                            <div className="text-xs font-mono text-gray-600 mt-0.5">
                              IMEI: {highlightText(s.imei, imei.trim())}
                            </div>
                            <div className="flex gap-2 mt-1 text-xs flex-wrap">
                              {s.battery_health != null && (
                                <span className={`bg-white px-1.5 py-0.5 rounded border ${batteryColor(s.battery_health)}`}>
                                  🔋 {s.battery_health}%
                                </span>
                              )}
                              {s.grade && (
                                <span className="bg-white px-1.5 py-0.5 rounded border">
                                  Grade <strong className="text-green-700">{s.grade}</strong>
                                </span>
                              )}
                              {s.region && (
                                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  {s.region}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-green-700 text-sm">
                              {Number(s.sale_price).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Ks</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showSuggest && suggestions.length === 0 && imei.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm z-50">
                    IMEI "{imei}" နဲ့ ကိုက်တာ မတွေ့ပါ
                  </div>
                )}
              </div>

              <button
                onClick={scanImei}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 rounded disabled:opacity-50 font-medium"
              >
                {loading ? '...' : t('common.add')}
              </button>

              <button
                onClick={() => setShowAccModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded font-medium"
              >
                📦 Accessory
              </button>
            </div>
          </div>

          {/* Cart Items */}
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
                        {(c.warranty_days || 0) > 0 && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">🛡️ {c.warranty_days} ရက်</span>
                        )}
                      </div>
                    )}

                    {c.item_type === 'accessory' && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <label className="text-xs text-gray-600">Qty:</label>
                        <input
                          type="number" value={c.qty} min={1}
                          onChange={e => updateQty(i, +e.target.value)}
                          className="border rounded px-2 py-0.5 w-16 text-sm"
                        />
                        <button
                          onClick={() => toggleFoc(i)}
                          className={`text-xs px-2 py-1 rounded border ${c.is_foc ? 'bg-orange-200 border-orange-400' : 'bg-white border-gray-300 hover:border-orange-400'}`}
                        >
                          {c.is_foc ? '🎁 FOC ဖျက်' : '🎁 FOC လုပ်'}
                        </button>
                        {c.is_foc && c.foc_reason && (
                          <span className="text-xs text-orange-700">({c.foc_reason})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
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
              placeholder="🔍 ရှာ" className="border p-2 rounded mb-3" />
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

      {/* FOC Modal */}
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

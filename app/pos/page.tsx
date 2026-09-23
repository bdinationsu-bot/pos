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

export default function POSPage() {
  const { t } = useLang()
  const [imei, setImei] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [tradein, setTradein] = useState(0)
  const [loading, setLoading] = useState(false)

  // Staff
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffId, setStaffId] = useState<number | null>(null)

  // Customer
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const [payModal, setPayModal] = useState<PaymentCategory | null>(null)
  const [payRef, setPayRef] = useState('')

  // Accessories
  const [showAccModal, setShowAccModal] = useState(false)
  const [accList, setAccList] = useState<any[]>([])
  const [accSearch, setAccSearch] = useState('')

  // FOC
  const [focModal, setFocModal] = useState<CartItem | null>(null)
  const [focReason, setFocReason] = useState('gift')

  // IMEI Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const suggestRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Installment Modal
  const [showInstModal, setShowInstModal] = useState(false)
  const [instType, setInstType] = useState<'rent2own' | 'maharbawga'>('rent2own')
  const [instCount, setInstCount] = useState(6)
  const [instDP, setInstDP] = useState(0)
  const [instDeposit, setInstDeposit] = useState(0)
  const [instMicrofinance, setInstMicrofinance] = useState('')
  const [instStartDate, setInstStartDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('staff').select('*').eq('active', true).order('name')
      setStaffList(data ?? [])
      const { data: acc } = await supabase.from('accessories').select('*').gt('qty', 0).order('name')
      setAccList(acc ?? [])
    })()
  }, [])

  // IMEI Suggest
  useEffect(() => {
    const q = imei.trim()
    if (q.length < 2) { setSuggestions([]); setShowSuggest(false); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('devices')
        .select('id, imei, model, storage, color, sale_price, battery_health, region')
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
      alert('ဒီ device ကို cart ထဲ ထည့်ပြီးသား'); return
    }
    setCart([...cart, {
      item_type: 'device', item_id: d.id,
      name: `${d.model} ${d.storage ?? ''} ${d.color ?? ''}`.trim(),
      imei: d.imei ?? undefined, qty: 1,
      price: Number(d.sale_price), cost: Number(d.cost_price || 0),
      battery_health: d.battery_health ?? null,
      grade: d.grade ?? null, region: d.region ?? null,
      storage: d.storage ?? null, color: d.color ?? null,
      warranty_days: d.warranty_days ?? 0, is_foc: false
    }])
    setImei('')
    setSuggestions([])
    setShowSuggest(false)
    inputRef.current?.focus()
  }

  async function scanImei() {
    const q = imei.trim()
    if (!q) return
    if (suggestions.length > 0 && showSuggest) {
      const pick = suggestions[highlightIdx] || suggestions[0]
      setLoading(true)
      const { data } = await supabase.from('devices').select('*').eq('id', pick.id).maybeSingle()
      setLoading(false)
      if (data) addDeviceToCart(data)
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('devices').select('*').eq('imei', q).eq('status', 'in_stock').maybeSingle()
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
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = suggestions[highlightIdx]
      if (pick) supabase.from('devices').select('*').eq('id', pick.id).maybeSingle().then(({ data }) => { if (data) addDeviceToCart(data) })
    } else if (e.key === 'Escape') setShowSuggest(false)
  }

  function addAccessory(a: any, isFoc: boolean, reason?: string) {
    const existingIdx = cart.findIndex(c => c.item_type === 'accessory' && c.item_id === a.id && c.is_foc === isFoc)
    if (existingIdx >= 0 && !isFoc) {
      const next = [...cart]; next[existingIdx].qty += 1; setCart(next)
    } else {
      setCart([...cart, {
        item_type: 'accessory', item_id: a.id, name: a.name, qty: 1,
        price: isFoc ? 0 : Number(a.price), cost: Number(a.cost),
        is_foc: isFoc, foc_reason: isFoc ? reason : undefined
      }])
    }
    setShowAccModal(false); setAccSearch('')
  }

  function removeItem(i: number) { setCart(cart.filter((_, x) => x !== i)) }
  function updateQty(i: number, qty: number) {
    const next = [...cart]; next[i].qty = Math.max(1, qty); setCart(next)
  }
  function toggleFoc(i: number) {
    const item = cart[i]
    if (item.item_type !== 'accessory') return
    if (item.is_foc) {
      const next = [...cart]
      next[i].is_foc = false; next[i].foc_reason = undefined
      const acc = accList.find(a => a.id === item.item_id)
      if (acc) next[i].price = Number(acc.price)
      setCart(next)
    } else { setFocModal(item); setFocReason('gift') }
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

  // === Validation ===
  function validateCheckout() {
    if (!staffId) { alert('⚠️ Sales Person ရွေးပါ'); return false }
    if (!customerName.trim()) { alert('⚠️ Customer နာမည် ထည့်ပါ'); return false }
    if (!customerPhone.trim()) { alert('⚠️ Customer ဖုန်း နံပါတ် ထည့်ပါ'); return false }
    if (cart.length === 0) { alert(t('pos.cart_empty')); return false }
    if (total < 0) { alert('Total < 0'); return false }
    return true
  }

  async function getOrCreateCustomer(): Promise<number | null> {
    const phone = customerPhone.trim()
    const name = customerName.trim()
    if (!phone) return null
    const { data: existing } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
    if (existing) {
      // Update name if changed
      await supabase.from('customers').update({ name }).eq('id', existing.id)
      return existing.id
    }
    const { data: created } = await supabase.from('customers')
      .insert({ name, phone }).select().single()
    return created?.id ?? null
  }

  function openPayment(cat: PaymentCategory) {
    if (!validateCheckout()) return
    setPayRef('')
    if (cat.code === 'installment') {
      setInstDP(0); setInstCount(6); setInstDeposit(0); setInstMicrofinance(''); setInstType('rent2own')
      setInstStartDate(new Date().toISOString().slice(0, 10))
      setShowInstModal(true)
      return
    }
    if (cat.providers.length === 0) doCheckout(cat.code, undefined)
    else setPayModal(cat)
  }

  async function doCheckout(categoryCode: string, providerCode?: string, instData?: any) {
    setLoading(true)

    // 1) Customer
    const customerId = await getOrCreateCustomer()

    // 2) Sale
    const method = getMethodLabel(categoryCode, providerCode)
    const { data: saleId, error } = await supabase.rpc('create_sale', {
      p_customer_id: customerId,
      p_subtotal: subtotal,
      p_discount: discount,
      p_tradein: tradein,
      p_total: total,
      p_items: cart,
      p_method: method,
      p_staff_id: staffId,
      p_payment_ref: payRef || null
    })

    if (error) { setLoading(false); return alert('Error: ' + error.message) }

    // 3) Installment record
    if (instData && saleId) {
      const { error: instErr } = await supabase.rpc('create_installment', {
        p_sale_id: saleId,
        p_customer_id: customerId,
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim(),
        p_type: instData.type,
        p_total_amount: total,
        p_down_payment: instData.dp,
        p_deposit_amount: instData.deposit || 0,
        p_count: instData.count,
        p_start_date: instData.startDate,
        p_note: instData.type === 'rent2own' ? 'Rent2Own' : 'Maharbawga',
        p_microfinance: instData.microfinance || null
      })
      if (instErr) {
        setLoading(false)
        alert('⚠️ Sale ရောင်းပြီး၊ Installment record မဖန်တီးနိုင်ဘူး: ' + instErr.message)
        return
      }
    }

    setLoading(false)
    alert(`✅ ရောင်းပြီးပါပြီ! Sale ID: ${saleId}${instData ? `\n📝 ${instData.type === 'rent2own' ? '🏠 Rent2Own' : '🕌 Maharbawga'} — ${instData.count} ကြိမ်` : ''}`)
    window.open(`/print/invoice/${saleId}`, '_blank', 'width=900,height=1200')

    // Reset
    setCart([]); setDiscount(0); setTradein(0)
    setPayModal(null); setPayRef('')
    setShowInstModal(false)
    setCustomerName(''); setCustomerPhone('')
    setInstDP(0); setInstCount(6)
  }

  async function confirmInstallment() {
    if (!instCount || instCount < 1) return alert('အရေအတွက် ထည့်ပါ')
    if (instDP < 0 || instDP >= total) return alert('Down Payment မှားနေတယ်')

    await doCheckout('installment', undefined, {
      type: instType,
      count: instCount,
      dp: instDP,
      deposit: instDeposit,
      microfinance: instMicrofinance,
      startDate: instStartDate
    })
  }

  const batteryColor = (h?: number | null) => {
    if (!h) return 'text-gray-400'
    if (h >= 90) return 'text-green-600 font-bold'
    if (h >= 80) return 'text-yellow-600 font-bold'
    return 'text-red-600 font-bold'
  }

  const filteredAcc = accList.filter(a => !accSearch || a.name.toLowerCase().includes(accSearch.toLowerCase()))

  function highlightText(text: string, q: string) {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx < 0) return text
    return (<>{text.slice(0, idx)}<mark className="bg-yellow-200 font-bold">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>)
  }

  // Validation state for UI
  const staffOk = !!staffId
  const nameOk = !!customerName.trim()
  const phoneOk = !!customerPhone.trim()
  const customerOk = staffOk && nameOk && phoneOk
  const cartOk = cart.length > 0
  const canCheckout = customerOk && cartOk

  const instMonthly = instCount > 0 ? Math.round((total - instDP) / instCount) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-green-800">{t('pos.title')}</h1>

      {/* Customer Info Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 border-l-4 border-blue-500">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={`block text-sm font-medium mb-1 ${staffOk ? 'text-gray-700' : 'text-red-600'}`}>
              👤 Sales Person {!staffOk && '*'}
            </label>
            <select
              value={staffId ?? ''}
              onChange={e => setStaffId(e.target.value ? +e.target.value : null)}
              className={`border-2 p-2 rounded w-full ${staffOk ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
            >
              <option value="">-- ရွေးပါ --</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${nameOk ? 'text-gray-700' : 'text-red-600'}`}>
              🧑 Customer Name {!nameOk && '*'}
            </label>
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="ဥပမာ — Aung Aung"
              className={`border-2 p-2 rounded w-full ${nameOk ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${phoneOk ? 'text-gray-700' : 'text-red-600'}`}>
              📞 Phone {!phoneOk && '*'}
            </label>
            <input
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="09xxxxxxxxx"
              className={`border-2 p-2 rounded w-full font-mono ${phoneOk ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
            />
          </div>
        </div>
        {!customerOk && (
          <div className="mt-2 text-xs text-red-600 font-medium">
            ⚠️ Sales Person + Customer Name + Phone အားလုံး ဖြည့်မှသာ Checkout လုပ်နိုင်မယ်
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          {/* IMEI Input */}
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
                  autoComplete="off"
                />
                {showSuggest && suggestions.length > 0 && (
                  <div ref={suggestRef} className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-500 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                    <div className="p-2 bg-green-50 text-xs text-green-800 font-medium border-b sticky top-0">
                      🔍 {suggestions.length} လုံး — ↑↓ ရွေး / Enter
                    </div>
                    {suggestions.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => supabase.from('devices').select('*').eq('id', s.id).maybeSingle().then(({ data }) => { if (data) addDeviceToCart(data) })}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={`w-full text-left p-3 border-b hover:bg-green-50 ${idx === highlightIdx ? 'bg-green-100 border-l-4 border-l-green-600' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-green-800">{s.model} {s.storage} {s.color && `• ${s.color}`}</div>
                            <div className="text-xs font-mono text-gray-600 mt-0.5">IMEI: {highlightText(s.imei, imei.trim())}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-green-700 text-sm">{Number(s.sale_price).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Ks</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={scanImei} disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 rounded disabled:opacity-50 font-medium">
                {loading ? '...' : t('common.add')}
              </button>
              <button onClick={() => setShowAccModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded font-medium">
                📦 Accessory
              </button>
            </div>
          </div>

          {/* Cart */}
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
                        {c.battery_health != null && (<span className="bg-white px-2 py-0.5 rounded border">🔋 <span className={batteryColor(c.battery_health)}>{c.battery_health}%</span></span>)}
                        {c.region && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{c.region}</span>}
                        {(c.warranty_days || 0) > 0 && (<span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">🛡️ {c.warranty_days} ရက်</span>)}
                      </div>
                    )}
                    {c.item_type === 'accessory' && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <label className="text-xs text-gray-600">Qty:</label>
                        <input type="number" value={c.qty} min={1} onChange={e => updateQty(i, +e.target.value)}
                          className="border rounded px-2 py-0.5 w-16 text-sm" />
                        <button onClick={() => toggleFoc(i)}
                          className={`text-xs px-2 py-1 rounded border ${c.is_foc ? 'bg-orange-200 border-orange-400' : 'bg-white border-gray-300 hover:border-orange-400'}`}>
                          {c.is_foc ? '🎁 FOC ဖျက်' : '🎁 FOC လုပ်'}
                        </button>
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
                    <button onClick={() => removeItem(i)} className="text-red-600 text-xs mt-1">{t('common.delete')}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex justify-between">
            <span>{t('pos.subtotal')}</span>
            <span className="font-bold">{subtotal.toLocaleString()} Ks</span>
          </div>
          {focTotal > 0 && (
            <div className="flex justify-between text-orange-700 text-sm bg-orange-50 p-2 rounded">
              <span>🎁 FOC Cost</span><span className="font-bold">{focTotal.toLocaleString()} Ks</span>
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

          {!canCheckout && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 text-xs p-2 rounded">
              {!staffOk && <div>⚠️ Sales Person ရွေးပါ</div>}
              {!nameOk && <div>⚠️ Customer နာမည် ထည့်ပါ</div>}
              {!phoneOk && <div>⚠️ Customer ဖုန်း ထည့်ပါ</div>}
              {!cartOk && <div>⚠️ Cart ထဲ ပစ္စည်း ထည့်ပါ</div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            {PAYMENT_CATEGORIES.map(cat => (
              <button key={cat.code} onClick={() => openPayment(cat)}
                disabled={loading || !canCheckout}
                className={`${cat.color} hover:opacity-90 text-white py-3 rounded font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
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
            <input value={accSearch} onChange={e => setAccSearch(e.target.value)} placeholder="🔍 ရှာ"
              className="border p-2 rounded mb-3" />
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredAcc.length === 0 && <p className="text-center text-gray-400 py-4">Accessory မရှိပါ</p>}
              {filteredAcc.map(a => (
                <div key={a.id} className="border rounded p-3 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-500">Stock: {a.qty} • Cost: {Number(a.cost).toLocaleString()} • Price: {Number(a.price).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addAccessory(a, false)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">💰 ရောင်း</button>
                    <button onClick={() => addAccessory(a, true, 'gift')} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm">🎁 FOC</button>
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
              <div className="text-xs text-gray-600">Cost: {Number(focModal.cost).toLocaleString()} Ks</div>
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
              <button onClick={confirmFoc} className="bg-orange-500 hover:bg-orange-600 text-white flex-1 py-2 rounded font-medium">✅ FOC လုပ်</button>
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

      {/* Installment Modal */}
      {showInstModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-green-800">💳 အရစ်ကျ ရွေးချယ်ပါ</h2>
              <button onClick={() => setShowInstModal(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            {/* Type Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">အရစ်ကျ အမျိုးအစား *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInstType('rent2own')}
                  className={`p-4 rounded-lg border-2 font-medium transition ${
                    instType === 'rent2own'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300'
                  }`}
                >
                  <div className="text-3xl mb-1">🏠</div>
                  <div className="text-sm font-bold">Rent2Own</div>
                  <div className="text-xs opacity-75 mt-1">ငှားရမ်းပြီး ပိုင်ဆိုင်</div>
                </button>
                <button
                  type="button"
                  onClick={() => setInstType('maharbawga')}
                  className={`p-4 rounded-lg border-2 font-medium transition ${
                    instType === 'maharbawga'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-purple-300'
                  }`}
                >
                  <div className="text-3xl mb-1">🕌</div>
                  <div className="text-sm font-bold">Maharbawga</div>
                  <div className="text-xs opacity-75 mt-1">မဟာဗောဂ</div>
                </button>
              </div>
            </div>

            
            {/* Deposit */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Deposit (Ks)</label>
              <input type="number" value={instDeposit || ''} onChange={e => setInstDeposit(+e.target.value || 0)}
                className="border p-2 rounded w-full text-lg font-bold text-purple-700" placeholder="0" />
              <div className="text-xs text-gray-500 mt-1">
                Deposit က အာမခံ ငွေ — Customer ဆပ်ပြီးရင် ပြန်အမ်းနိုင်တယ်
              </div>
            </div>

            {/* Down Payment */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Down Payment (Ks)</label>
              <input type="number" value={instDP || ''} onChange={e => setInstDP(+e.target.value || 0)}
                className="border p-2 rounded w-full text-lg font-bold" placeholder="0" />
              <div className="text-xs text-gray-500 mt-1">
                ကျန်: <strong className="text-red-700">{(total - instDP).toLocaleString()} Ks</strong>
              </div>
            </div>

            {/* Count */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">အရစ် အရေအတွက် (လ)</label>
              <div className="grid grid-cols-6 gap-1 mb-2">
                {[3, 4, 6, 9, 12, 18].map(n => (
                  <button key={n} type="button" onClick={() => setInstCount(n)}
                    className={`py-2 rounded border-2 text-sm font-medium ${
                      instCount === n ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:border-green-400'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
              <input type="number" value={instCount} onChange={e => setInstCount(+e.target.value || 0)}
                className="border p-2 rounded w-full" />
            </div>

            {/* Start Date */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">စတင် ရက်စွဲ</label>
              <input type="date" value={instStartDate} onChange={e => setInstStartDate(e.target.value)}
                className="border p-2 rounded w-full" />
            </div>

            {/* Summary */}
            <div className="bg-green-50 border-2 border-green-400 rounded p-3 mb-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-600">Total</div>
                  <div className="font-bold">{total.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">DP</div>
                  <div className="font-bold text-blue-700">{instDP.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">လစဉ်</div>
                  <div className="font-bold text-green-700">{instMonthly.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={confirmInstallment} disabled={loading}
                className={`flex-1 py-3 rounded font-bold text-white disabled:opacity-50 ${
                  instType === 'rent2own' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}>
                {loading ? '...' : `✅ ${instType === 'rent2own' ? '🏠 Rent2Own' : '🕌 Maharbawga'} ဖွင့်`}
              </button>
              <button onClick={() => setShowInstModal(false)} className="bg-gray-200 px-6 py-3 rounded font-medium">ပယ်ဖျက်</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

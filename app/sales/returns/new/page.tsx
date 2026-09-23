'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const REASONS = [
  { code: 'defective', name: 'ချို့ယွင်း' },
  { code: 'wrong_item', name: 'မှားရောင်း' },
  { code: 'not_satisfied', name: 'သဘောမကျ' },
  { code: 'warranty', name: 'အာမခံ' },
  { code: 'damaged', name: 'ပျက်စီး' },
  { code: 'upgrade', name: 'အဆင့်မြှင့်' },
  { code: 'other', name: 'အခြား' }
]

function NewReturnContent() {
  const router = useRouter()
  const params = useSearchParams()
  const saleId = params.get('sale_id')

  const [sale, setSale] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [returnType, setReturnType] = useState('refund')
  const [reason, setReason] = useState('defective')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [payMethod, setPayMethod] = useState('cash')
  const [payRef, setPayRef] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Exchange
  const [exchangeDevices, setExchangeDevices] = useState<any[]>([])
  const [exchangeDeviceId, setExchangeDeviceId] = useState<number | null>(null)
  const [exchangePrice, setExchangePrice] = useState(0)
  const [exchangeSearch, setExchangeSearch] = useState('')

  useEffect(() => {
    (async () => {
      if (!saleId) { setLoading(false); return }
      const { data: s } = await supabase.from('sales').select('*, staff:staff_id(name)').eq('id', saleId).maybeSingle()
      setSale(s)
      if (s?.customer_id) {
        const { data: c } = await supabase.from('customers').select('*').eq('id', s.customer_id).maybeSingle()
        setCustomer(c)
      }
      const { data: it } = await supabase.from('sale_items').select('*').eq('sale_id', saleId)
      setItems((it ?? []).map((x: any) => ({
        item_type: x.item_type,
        item_id: x.item_id,
        name: x.name,
        imei: x.imei,
        qty: 1,
        max_qty: x.qty,
        unit_price: Number(x.price),
        unit_cost: Number(x.cost),
        total_price: Number(x.price),
        is_foc: x.is_foc || false,
        condition_note: '',
        device_status_after: 'in_stock',
        selected: true
      })))
      setLoading(false)
    })()
  }, [saleId])

  // Load exchange devices (in_stock only, exclude returned ones)
  useEffect(() => {
    if (returnType !== 'exchange') return
    (async () => {
      const { data } = await supabase
        .from('devices')
        .select('*')
        .eq('status', 'in_stock')
        .order('model')
        .limit(200)
      setExchangeDevices(data ?? [])
    })()
  }, [returnType])

  function toggleItem(i: number) {
    const next = [...items]
    next[i].selected = !next[i].selected
    setItems(next)
  }

  function updateItem(i: number, patch: any) {
    const next = [...items]
    next[i] = { ...next[i], ...patch }
    next[i].total_price = next[i].qty * next[i].unit_price
    setItems(next)
  }

  const selectedItems = items.filter(x => x.selected)
  const returnTotal = selectedItems.reduce((s, x) => s + x.total_price, 0)
  const refundAmount = returnType === 'refund' ? returnTotal : 0
  const creditAmount = returnType === 'credit' ? returnTotal : 0

  // Exchange calc
  const priceDiff = exchangePrice - returnTotal
  const exchangeDevice = exchangeDevices.find(d => d.id === exchangeDeviceId)

  const filteredExchangeDevices = exchangeDevices.filter(d =>
    !exchangeSearch || 
    d.model?.toLowerCase().includes(exchangeSearch.toLowerCase()) ||
    d.imei?.includes(exchangeSearch)
  )

  function pickExchangeDevice(d: any) {
    setExchangeDeviceId(d.id)
    setExchangePrice(Number(d.sale_price))
  }

  async function save() {
    if (!saleId) return alert('Sale မရှိ')
    if (selectedItems.length === 0) return alert('Return လုပ်မည့် item ရွေးပါ')

    if (returnType === 'exchange') {
      if (!exchangeDeviceId) return alert('လဲပေးမည့် Device ရွေးပါ')
      if (priceDiff > 0 && !payMethod) return alert('ငွေလက်ခံနည်း ရွေးပါ')
    }

    setSaving(true)
    const reasonText = REASONS.find(r => r.code === reason)?.name || reason

    const { data, error } = await supabase.rpc('create_sales_return', {
      p_sale_id: Number(saleId),
      p_customer_id: sale?.customer_id || null,
      p_customer_name: customer?.name || sale?.customer_name || 'Walk-in',
      p_customer_phone: customer?.phone || null,
      p_return_type: returnType,
      p_subtotal: returnTotal,
      p_total: returnTotal,
      p_refund_amount: refundAmount,
      p_credit_amount: creditAmount,
      p_payment_method: payMethod,
      p_payment_ref: payRef,
      p_reason: reasonText,
      p_note: note,
      p_items: selectedItems,
      p_exchange_device_id: returnType === 'exchange' ? exchangeDeviceId : null,
      p_exchange_price: returnType === 'exchange' ? exchangePrice : 0,
      p_staff_id: null
    })

    setSaving(false)
    if (error) return alert('Error: ' + error.message)

    const res = data as any
    if (returnType === 'exchange' && res?.new_invoice_no) {
      alert(`✅ Exchange ပြီးပါပြီ!\n\nReturn No: ${res.return_no}\nNew Invoice: ${res.new_invoice_no}\n${res.price_diff > 0 ? `Customer pays: ${Number(res.price_diff).toLocaleString()} Ks` : res.price_diff < 0 ? `Refund customer: ${Math.abs(Number(res.price_diff)).toLocaleString()} Ks` : 'No difference'}`)
      window.open(`/print/invoice/${res.new_sale_id}`, '_blank', 'width=900,height=1200')
    } else {
      alert(`✅ Return ပြီးပါပြီ\nReturn No: ${res?.return_no || ''}`)
    }
    router.push('/sales/returns')
  }

  if (loading) return <p className="p-6">...</p>
  if (!sale) return <p className="p-6">Sale မတွေ့ပါ</p>

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-red-800">↩️ Sales Return</h1>
          <div className="text-xs text-gray-500">Invoice: {sale.invoice_no}</div>
        </div>
        <button onClick={() => router.push('/sales')} className="bg-gray-200 px-4 py-2 rounded font-medium">← ပြန်</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">👤 ဖောက်သည်</h2>
          <div className="text-sm">
            <div><strong>နာမည်:</strong> {customer?.name || 'Walk-in'}</div>
            <div><strong>ဖုန်း:</strong> {customer?.phone || '-'}</div>
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">📋 အချက်အလက်</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">ရက်စွဲ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">အကြောင်းရင်း</label>
              <select value={reason} onChange={e => setReason(e.target.value)} className="border p-2 rounded w-full">
                {REASONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items to Return */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-red-700">📦 Return လုပ်မည့် Items ({selectedItems.length}/{items.length})</h2>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className={`border-2 rounded-lg p-3 ${it.selected ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={it.selected} onChange={() => toggleItem(i)} className="w-5 h-5 mt-1" />
                <div className="flex-1">
                  <div className="font-bold">{it.name}</div>
                  {it.imei && <div className="text-xs font-mono text-gray-600 mt-1">IMEI: {it.imei}</div>}

                  {it.selected && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Qty (max {it.max_qty})</label>
                        <input type="number" min={1} max={it.max_qty} value={it.qty}
                          onChange={e => updateItem(i, { qty: Math.min(+e.target.value || 1, it.max_qty) })}
                          className="border p-1.5 rounded w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">ပြန်အမ်းဈေး</label>
                        <input type="number" value={it.unit_price || ''}
                          onChange={e => updateItem(i, { unit_price: +e.target.value || 0 })}
                          className="border p-1.5 rounded w-full text-sm" />
                      </div>
                      {it.item_type === 'device' && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Status</label>
                          <select value={it.device_status_after}
                            onChange={e => updateItem(i, { device_status_after: e.target.value })}
                            className="border p-1.5 rounded w-full text-sm">
                            <option value="in_stock">✅ In Stock</option>
                            <option value="defective">❌ Defective</option>
                            <option value="repair">🔧 Repair</option>
                            <option value="parts">🔩 Parts</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm font-bold shrink-0">
                  {it.selected ? `${it.total_price.toLocaleString()} Ks` : '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Return Type */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-red-700">💰 ပြန်အမ်းပုံစံ</h2>
        <div className="grid grid-cols-3 gap-3">
          <label className={`flex flex-col items-center gap-2 p-4 rounded border-2 cursor-pointer transition ${returnType === 'refund' ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-300'}`}>
            <input type="radio" checked={returnType === 'refund'} onChange={() => setReturnType('refund')} className="hidden" />
            <span className="text-2xl">💵</span>
            <span className="font-bold">Refund</span>
            <span className="text-xs text-gray-500">ငွေပြန်ပေး</span>
          </label>
          <label className={`flex flex-col items-center gap-2 p-4 rounded border-2 cursor-pointer transition ${returnType === 'credit' ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-orange-300'}`}>
            <input type="radio" checked={returnType === 'credit'} onChange={() => setReturnType('credit')} className="hidden" />
            <span className="text-2xl">📝</span>
            <span className="font-bold">Credit</span>
            <span className="text-xs text-gray-500">နောက်ဝယ်တဲ့အခါ နုတ်</span>
          </label>
          <label className={`flex flex-col items-center gap-2 p-4 rounded border-2 cursor-pointer transition ${returnType === 'exchange' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-300'}`}>
            <input type="radio" checked={returnType === 'exchange'} onChange={() => setReturnType('exchange')} className="hidden" />
            <span className="text-2xl">🔄</span>
            <span className="font-bold">Exchange</span>
            <span className="text-xs text-gray-500">Device အသစ် လဲ</span>
          </label>
        </div>
      </div>

      {/* Exchange Device Picker */}
      {returnType === 'exchange' && (
        <div className="bg-white rounded shadow p-4 mb-4 border-2 border-blue-400">
          <h2 className="font-bold mb-3 text-blue-700">🔄 လဲပေးမည့် Device အသစ်</h2>

          {!exchangeDeviceId ? (
            <>
              <input
                value={exchangeSearch}
                onChange={e => setExchangeSearch(e.target.value)}
                placeholder="🔍 Model / IMEI ရှာ"
                className="border p-2 rounded w-full mb-3"
              />
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredExchangeDevices.length === 0 && (
                  <p className="text-center text-gray-400 py-4">Device မတွေ့ပါ</p>
                )}
                {filteredExchangeDevices.map(d => (
                  <button
                    key={d.id}
                    onClick={() => pickExchangeDevice(d)}
                    className="w-full text-left border rounded p-3 hover:bg-blue-50 hover:border-blue-400 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold">{d.model} {d.storage} {d.color && `• ${d.color}`}</div>
                      <div className="text-xs font-mono text-gray-500 mt-0.5">IMEI: {d.imei}</div>
                      <div className="flex gap-2 mt-1 text-xs">
                        {d.battery_health != null && (
                          <span className={`px-1.5 py-0.5 rounded border ${
                            d.battery_health >= 90 ? 'text-green-700 bg-green-50' :
                            d.battery_health >= 80 ? 'text-yellow-700 bg-yellow-50' :
                            'text-red-700 bg-red-50'
                          }`}>🔋 {d.battery_health}%</span>
                        )}
                        {d.region && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{d.region}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">{Number(d.sale_price).toLocaleString()} Ks</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : exchangeDevice ? (
            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-blue-800 text-lg">{exchangeDevice.model} {exchangeDevice.storage}</div>
                  <div className="text-sm font-mono text-gray-600 mt-1">IMEI: {exchangeDevice.imei}</div>
                  <div className="flex gap-2 mt-2 text-xs">
                    {exchangeDevice.battery_health != null && (
                      <span className="bg-white px-2 py-0.5 rounded border">🔋 {exchangeDevice.battery_health}%</span>
                    )}
                    {exchangeDevice.region && (
                      <span className="bg-white px-2 py-0.5 rounded border">📡 {exchangeDevice.region}</span>
                    )}
                    {exchangeDevice.color && (
                      <span className="bg-white px-2 py-0.5 rounded border">🎨 {exchangeDevice.color}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setExchangeDeviceId(null); setExchangePrice(0) }}
                  className="text-red-600 text-sm hover:underline">ပြန် ရွေး</button>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">ရောင်းဈေး (Ks)</label>
                <input type="number" value={exchangePrice || ''}
                  onChange={e => setExchangePrice(+e.target.value || 0)}
                  className="border p-2 rounded w-full text-2xl font-bold text-blue-700" />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Payment / Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left — Payment method for refund or exchange */}
        {returnType === 'refund' && (
          <div className="bg-white rounded shadow p-4">
            <h2 className="font-bold mb-3 text-red-700">💵 ငွေပြန်ပေးနည်း</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">နည်းလမ်း</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="border p-2 rounded w-full">
                  <option value="cash">Cash</option>
                  <option value="kbzpay">KBZPay</option>
                  <option value="wavepay">WavePay</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ref No</label>
                <input value={payRef} onChange={e => setPayRef(e.target.value)} className="border p-2 rounded w-full" />
              </div>
            </div>
          </div>
        )}

        {returnType === 'exchange' && priceDiff !== 0 && (
          <div className={`bg-white rounded shadow p-4 border-2 ${priceDiff > 0 ? 'border-green-400' : 'border-orange-400'}`}>
            <h2 className={`font-bold mb-3 ${priceDiff > 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {priceDiff > 0 ? '💰 ဖောက်သည် ပေးရမည်' : '💸 ဖောက်သည် ပြန်ရမည်'}
            </h2>
            <div className={`text-4xl font-bold ${priceDiff > 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {Math.abs(priceDiff).toLocaleString()} Ks
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">နည်းလမ်း</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="border p-2 rounded w-full">
                  <option value="cash">Cash</option>
                  <option value="kbzpay">KBZPay</option>
                  <option value="wavepay">WavePay</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ref No</label>
                <input value={payRef} onChange={e => setPayRef(e.target.value)} className="border p-2 rounded w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Right — Summary */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-3 text-red-700">📊 Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Return Total:</span>
              <strong className="text-lg">{returnTotal.toLocaleString()} Ks</strong>
            </div>
            {returnType === 'refund' && (
              <div className="flex justify-between bg-red-50 p-2 rounded">
                <span>💵 Refund:</span>
                <strong className="text-red-700">{refundAmount.toLocaleString()} Ks</strong>
              </div>
            )}
            {returnType === 'credit' && (
              <div className="flex justify-between bg-orange-50 p-2 rounded">
                <span>📝 Credit:</span>
                <strong className="text-orange-700">{creditAmount.toLocaleString()} Ks</strong>
              </div>
            )}
            {returnType === 'exchange' && exchangeDeviceId && (
              <>
                <div className="flex justify-between border-t pt-2">
                  <span>New Device Price:</span>
                  <strong>{exchangePrice.toLocaleString()} Ks</strong>
                </div>
                <div className={`flex justify-between p-2 rounded ${priceDiff > 0 ? 'bg-green-50' : priceDiff < 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  <span>{priceDiff > 0 ? 'Customer pays:' : priceDiff < 0 ? 'Refund:' : 'Even exchange'}</span>
                  <strong className={priceDiff > 0 ? 'text-green-700' : priceDiff < 0 ? 'text-orange-700' : 'text-gray-500'}>
                    {Math.abs(priceDiff).toLocaleString()} Ks
                  </strong>
                </div>
              </>
            )}
            <div className="pt-3 border-t">
              <label className="block text-sm font-medium mb-1">မှတ်ချက်</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} className="border p-2 rounded w-full" rows={2} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className={`${returnType === 'exchange' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white px-8 py-3 rounded font-medium disabled:opacity-50`}>
          {saving ? 'သိမ်းနေတယ်...' : returnType === 'exchange' ? '🔄 Exchange လုပ် + New INV' : '💾 Return သိမ်း'}
        </button>
        <button onClick={() => router.push('/sales')} className="bg-gray-200 px-8 py-3 rounded font-medium">ပယ်ဖျက်</button>
      </div>
    </div>
  )
}

export default function NewSalesReturn() {
  return (
    <Suspense fallback={<p className="p-6">...</p>}>
      <NewReturnContent />
    </Suspense>
  )
}

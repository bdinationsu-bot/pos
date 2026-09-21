'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Item = {
  item_type: 'device' | 'accessory'
  item_id: number | null
  name: string
  imei?: string
  model?: string
  storage?: string
  color?: string
  sale_price?: number
  qty: number
  unit_cost: number
  total_cost: number
}

export default function NewPurchase() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [accessories, setAccessories] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [paid, setPaid] = useState(0)
  const [payMethod, setPayMethod] = useState('cash')
  const [payRef, setPayRef] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: sup } = await supabase.from('suppliers').select('*').order('name')
      setSuppliers(sup ?? [])
      const { data: acc } = await supabase.from('accessories').select('*').order('name')
      setAccessories(acc ?? [])
    })()
  }, [])

  function addDevice() {
    setItems([...items, {
      item_type: 'device', item_id: null,
      name: '', imei: '', model: '', storage: '', color: '',
      sale_price: 0, qty: 1, unit_cost: 0, total_cost: 0
    }])
  }

  function addAccessory() {
    setItems([...items, {
      item_type: 'accessory', item_id: null,
      name: '', qty: 1, unit_cost: 0, total_cost: 0
    }])
  }

  function updateItem(i: number, patch: Partial<Item>) {
    const next = [...items]
    next[i] = { ...next[i], ...patch }
    next[i].total_cost = next[i].qty * next[i].unit_cost
    setItems(next)
  }

  function removeItem(i: number) {
    setItems(items.filter((_, x) => x !== i))
  }

  function pickAccessory(i: number, accId: number) {
    const a = accessories.find(x => x.id === accId)
    if (!a) return
    updateItem(i, { item_id: a.id, name: a.name, unit_cost: Number(a.cost) || 0 })
  }

  const subtotal = items.reduce((s, x) => s + x.total_cost, 0)
  const total = subtotal - discount + tax
  const balance = total - paid

  async function save() {
    if (!supplierId) return alert('Supplier ရွေးပါ')
    if (!items.length) return alert('အနည်းဆုံး item တစ်ခု ထည့်ပါ')
    for (const it of items) {
      if (it.item_type === 'device' && (!it.model || !it.imei)) {
        return alert('Device တစ်ခုချင်း Model နဲ့ IMEI ဖြည့်ပါ')
      }
      if (it.item_type === 'accessory' && !it.item_id) {
        return alert('Accessory ရွေးပါ')
      }
    }

    setSaving(true)
    const purchaseType = items.every(x => x.item_type === 'device')
      ? 'device'
      : items.every(x => x.item_type === 'accessory')
      ? 'accessory'
      : 'mixed'

    const { error, data } = await supabase.rpc('create_purchase', {
      p_supplier_id: supplierId,
      p_purchase_type: purchaseType,
      p_subtotal: subtotal,
      p_discount: discount,
      p_tax: tax,
      p_total: total,
      p_paid: paid,
      p_payment_method: payMethod,
      p_payment_ref: payRef,
      p_note: note,
      p_items: items
    })

    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    alert(`✅ Purchase သိမ်းပြီးပါပြီ\nPO ID: ${data}`)
    router.push('/purchases')
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Purchase အသစ်</h1>
        <div className="flex gap-2">
          <button onClick={addDevice} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium">
            + Device ဝယ်
          </button>
          <button onClick={addAccessory} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium">
            + Accessory ဝယ်
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4 grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">Supplier *</label>
          <select
            value={supplierId ?? ''}
            onChange={e => setSupplierId(e.target.value ? +e.target.value : null)}
            className="border p-2 rounded w-full"
          >
            <option value="">-- ရွေး --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">ရက်စွဲ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">မှတ်ချက်</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="border p-2 rounded w-full" />
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3">Items ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-center text-gray-400 py-6">Device (သို့) Accessory ထည့်ပါ</p>
        ) : (
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className={`border-2 rounded-lg p-3 ${it.item_type === 'device' ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold text-sm ${it.item_type === 'device' ? 'text-blue-700' : 'text-purple-700'}`}>
                    {it.item_type === 'device' ? '📱 Device' : '📦 Accessory'} #{i + 1}
                  </span>
                  <button onClick={() => removeItem(i)} className="text-red-600 text-sm">ဖျက်</button>
                </div>

                {it.item_type === 'device' ? (
                  <div className="grid grid-cols-6 gap-2">
                    <input placeholder="IMEI *" value={it.imei || ''} onChange={e => updateItem(i, { imei: e.target.value })} className="border p-2 rounded" />
                    <input placeholder="Model *" value={it.model || ''} onChange={e => updateItem(i, { model: e.target.value, name: e.target.value })} className="border p-2 rounded" />
                    <input placeholder="Storage" value={it.storage || ''} onChange={e => updateItem(i, { storage: e.target.value })} className="border p-2 rounded" />
                    <input placeholder="Color" value={it.color || ''} onChange={e => updateItem(i, { color: e.target.value })} className="border p-2 rounded" />
                    <input type="number" placeholder="ဝယ်ဈေး *" value={it.unit_cost || ''} onChange={e => updateItem(i, { unit_cost: +e.target.value })} className="border p-2 rounded" />
                    <input type="number" placeholder="ရောင်းဈေး" value={it.sale_price || ''} onChange={e => updateItem(i, { sale_price: +e.target.value })} className="border p-2 rounded" />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      value={it.item_id ?? ''}
                      onChange={e => pickAccessory(i, +e.target.value)}
                      className="border p-2 rounded col-span-2"
                    >
                      <option value="">-- Accessory ရွေး --</option>
                      {accessories.map(a => (
                        <option key={a.id} value={a.id}>{a.name} (stock: {a.qty})</option>
                      ))}
                    </select>
                    <input type="number" placeholder="Qty" value={it.qty || 1} onChange={e => updateItem(i, { qty: +e.target.value })} className="border p-2 rounded" />
                    <input type="number" placeholder="ဝယ်ဈေး *" value={it.unit_cost || ''} onChange={e => updateItem(i, { unit_cost: +e.target.value })} className="border p-2 rounded" />
                  </div>
                )}

                <div className="text-right text-sm mt-2">
                  စုစုပေါင်း: <strong>{it.total_cost.toLocaleString()} Ks</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded shadow p-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold">{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Discount</span>
            <input type="number" value={discount || ''} onChange={e => setDiscount(+e.target.value || 0)} className="border p-1 w-32 text-right rounded" placeholder="0" />
          </div>
          <div className="flex justify-between items-center">
            <span>Tax</span>
            <input type="number" value={tax || ''} onChange={e => setTax(+e.target.value || 0)} className="border p-1 w-32 text-right rounded" placeholder="0" />
          </div>
          <hr />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-green-700">{total.toLocaleString()} Ks</span>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span>ပေးချေငွေ</span>
            <input type="number" value={paid || ''} onChange={e => setPaid(+e.target.value || 0)} className="border p-1 w-32 text-right rounded" placeholder="0" />
          </div>
          <div className="flex justify-between items-center">
            <span>နည်းလမ်း</span>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="border p-1 rounded w-32">
              <option value="cash">Cash</option>
              <option value="kbzpay">KBZPay</option>
              <option value="wavepay">WavePay</option>
              <option value="bank">Bank</option>
              <option value="credit">အကြွေး</option>
            </select>
          </div>
          <div className="flex justify-between items-center">
            <span>Ref No</span>
            <input value={payRef} onChange={e => setPayRef(e.target.value)} className="border p-1 rounded w-32" />
          </div>
          <hr />
          <div className={`flex justify-between text-lg font-bold ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
            <span>ကျန်ငွေ</span>
            <span>{balance.toLocaleString()} Ks</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-medium disabled:opacity-50">
          {saving ? 'သိမ်းနေတယ်...' : '💾 သိမ်း'}
        </button>
        <button onClick={() => router.push('/purchases')} className="bg-gray-200 px-8 py-3 rounded font-medium">
          ပယ်ဖျက်
        </button>
      </div>
    </div>
  )
}

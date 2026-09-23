'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/useRole'

const STATUS_LABELS: Record<string, string> = {
  received: 'လက်ခံရရှိ',
  diagnosing: 'စစ်ဆေးနေ',
  waiting_parts: 'အပိုပစ္စည်း စောင့်',
  in_progress: 'ပြုပြင်နေ',
  completed: 'ပြီးစီး',
  delivered: 'ပေးအပ်',
  cancelled: 'ပယ်ဖျက်'
}

const STATUS_FLOW = ['received', 'diagnosing', 'waiting_parts', 'in_progress', 'completed', 'delivered']

const ERROR_LABELS = [
  { key: 'error_lcd', label: 'LCD', icon: '📱' },
  { key: 'error_battery', label: 'Battery', icon: '🔋' },
  { key: 'error_camera', label: 'Camera', icon: '📷' },
  { key: 'error_body', label: 'Body', icon: '📦' },
  { key: 'error_back_glass', label: 'Back Glass', icon: '🔙' },
  { key: 'error_glass', label: 'Glass', icon: '🔷' }
]

export default function RepairDetail() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { isOwner } = useRole()

  const [r, setR] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const [newItem, setNewItem] = useState({ name: '', qty: 1, unit_cost: 0 })
  const [diag, setDiag] = useState('')
  const [laborCost, setLaborCost] = useState(0)
  const [paidAmt, setPaidAmt] = useState(0)
  const [warrantyDays, setWarrantyDays] = useState(0)

  async function load() {
    setLoading(true)
    const { data: rep } = await supabase.from('repairs').select('*').eq('id', id).maybeSingle()
    if (!rep) { setLoading(false); return }
    setR(rep)
    setDiag(rep.diagnosis || '')
    setLaborCost(Number(rep.labor_cost) || 0)
    setWarrantyDays(rep.warranty_days || 0)

    const { data: it } = await supabase.from('repair_items').select('*').eq('repair_id', id).order('id')
    setItems(it ?? [])

    const { data: lg } = await supabase.from('repair_logs').select('*').eq('repair_id', id).order('id', { ascending: false })
    setLogs(lg ?? [])

    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function updateField(patch: any) {
    const { error } = await supabase.from('repairs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function changeStatus(newStatus: string) {
    const note = prompt(`"${STATUS_LABELS[newStatus]}" အဖြစ် ပြောင်းလဲရန် မှတ်ချက် (optional)`) || null
    const { error } = await supabase.rpc('update_repair_status', {
      p_repair_id: +id,
      p_new_status: newStatus,
      p_note: note
    })
    if (error) return alert(error.message)
    if (newStatus === 'delivered') {
      await supabase.from('repairs').update({ delivered_at: new Date().toISOString() }).eq('id', id)
    }
    load()
  }

  async function addItem() {
    if (!newItem.name) return alert('အမည် ထည့်ပါ')
    const total = newItem.qty * newItem.unit_cost
    const { error } = await supabase.from('repair_items').insert({
      repair_id: +id, ...newItem, total_cost: total
    })
    if (error) return alert(error.message)
    setNewItem({ name: '', qty: 1, unit_cost: 0 })
    load()
  }

  async function removeItem(itemId: number) {
    if (!confirm('ဖျက်မှာ သေချာလား?')) return
    await supabase.from('repair_items').delete().eq('id', itemId)
    load()
  }

  async function saveDiagnosis() {
    await updateField({ diagnosis: diag })
    alert('သိမ်းပြီး')
  }

  async function saveCosts() {
    const partsCost = items.reduce((s, x) => s + Number(x.total_cost), 0)
    const total = partsCost + laborCost
    await updateField({ parts_cost: partsCost, labor_cost: laborCost, total_cost: total })
    alert('သိမ်းပြီး')
  }

  async function recordPayment() {
    if (!paidAmt) return alert('ပမာဏ ထည့်ပါ')
    const newPaid = Number(r.paid) + paidAmt
    await updateField({ paid: newPaid })
    await supabase.from('cash_transactions').insert({
      type: 'in', amount: paidAmt, ref_type: 'repair', ref_id: +id,
      note: `Service ${r.ticket_no}`
    })
    setPaidAmt(0)
    alert('ငွေလက်ခံပြီး')
  }

  async function saveWarranty() {
    await updateField({ warranty_days: warrantyDays })
    alert('သိမ်းပြီး')
  }

  async function deleteTicket() {
    if (!isOwner) return alert('⛔ Owner ပဲ ဖျက်လို့ ရပါတယ်')
    if (!confirm(`⚠️ ${r.ticket_no} ကို ဖျက်မှာ သေချာလား?\n\n• Repair logs ဖျက်\n• Repair items ဖျက်\n• Ticket ဖျက်\n\nပြန်ယူလို့ မရပါ`)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။ DELETE ဖြစ်သွားရင် ပြန်မရနိုင်ပါ။')) return

    setDeleting(true)
    const { error } = await supabase.rpc('delete_repair', { p_repair_id: +id })
    setDeleting(false)
    if (error) return alert('❌ ' + error.message)
    alert('✅ ဖျက်ပြီးပါပြီ')
    router.push('/repairs')
  }

  if (loading) return <p className="p-6">...</p>
  if (!r) return <p className="p-6">Ticket မတွေ့ပါ</p>

  const partsCost = items.reduce((s, x) => s + Number(x.total_cost), 0)
  const totalCost = partsCost + Number(r.labor_cost || 0)
  const balance = totalCost - Number(r.paid || 0)
  const currentIdx = STATUS_FLOW.indexOf(r.status)

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Ticket {r.ticket_no}</h1>
          <div className="text-xs text-gray-500">
            ဖွင့်ချိန် — {new Date(r.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open(`/print/ticket/${id}`, '_blank', 'width=900,height=1200')}
            className="bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded font-medium"
          >
            🖨️ Print
          </button>
          {isOwner && (
            <button
              onClick={deleteTicket}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
            >
              {deleting ? '...' : '🗑️ ဖျက်'}
            </button>
          )}
          <button onClick={() => router.push('/repairs')} className="bg-gray-200 px-4 py-2 rounded font-medium">
            ← ပြန်
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-green-700">Status</h2>
          <span className="text-sm font-medium">{STATUS_LABELS[r.status]}</span>
        </div>
        <div className="flex gap-1 mb-3">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className={`flex-1 h-2 rounded ${i <= currentIdx ? 'bg-green-500' : 'bg-gray-200'}`} title={STATUS_LABELS[s]} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={r.status === s}
              className={`px-3 py-1 rounded text-sm border ${r.status === s ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-300 hover:border-green-500'}`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          <button
            onClick={() => changeStatus('cancelled')}
            className="px-3 py-1 rounded text-sm border border-red-300 text-red-700 hover:bg-red-50"
          >
            {STATUS_LABELS.cancelled}
          </button>
        </div>
      </div>

      {/* Error Types */}
      {(r.error_lcd || r.error_battery || r.error_camera || r.error_body || r.error_back_glass || r.error_glass || r.error_other) && (
        <div className="bg-white rounded shadow p-4 mb-4 border-2 border-orange-200">
          <h2 className="font-bold mb-3 text-orange-700">🔧 ချို့ယွင်းချက်</h2>
          <div className="flex flex-wrap gap-2">
            {ERROR_LABELS.map(e => r[e.key] && (
              <span key={e.key} className="bg-orange-50 border border-orange-300 text-orange-800 px-3 py-1 rounded text-sm font-medium">
                {e.icon} {e.label}
              </span>
            ))}
          </div>
          {r.error_other && (
            <div className="mt-2 text-sm text-gray-600">
              <strong>အခြား:</strong> {r.error_other}
            </div>
          )}
        </div>
      )}

      {/* Customer + Device */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">👤 ဖောက်သည်</h2>
          <div className="text-sm space-y-1">
            <div><strong>နာမည်:</strong> {r.customer_name || '-'}</div>
            <div><strong>ဖုန်း:</strong> {r.customer_phone || '-'}</div>
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-2 text-green-700">📱 စက်</h2>
          <div className="text-sm space-y-1">
            <div><strong>Model:</strong> {r.model} {r.storage} {r.color}</div>
            {r.imei && <div><strong>IMEI:</strong> <span className="font-mono text-xs">{r.imei}</span></div>}
            {r.serial && <div><strong>Serial:</strong> <span className="font-mono text-xs">{r.serial}</span></div>}
            <div><strong>Passcode:</strong> {r.passcode || '-'}</div>
            <div><strong>ပါလာ:</strong> {r.accessories || '-'}</div>
          </div>
        </div>
      </div>

      {/* Issue */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-red-700">⚠️ ပြဿနာ</h2>
        <p className="text-sm whitespace-pre-wrap">{r.issue}</p>
      </div>

      {/* Diagnosis */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-blue-700">🔬 စစ်ဆေးတွေ့ရှိချက်</h2>
        <textarea
          value={diag}
          onChange={e => setDiag(e.target.value)}
          className="border p-3 rounded w-full"
          rows={3}
          placeholder="Technician ရဲ့ စစ်ဆေးချက်..."
        />
        <button onClick={saveDiagnosis} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
          သိမ်း
        </button>
      </div>

      {/* Parts */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-orange-700">🔧 အပိုပစ္စည်း / ဝန်ဆောင်မှု</h2>

        <div className="grid grid-cols-12 gap-2 mb-3">
          <input placeholder="အမည်" value={newItem.name}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            className="border p-2 rounded col-span-6" />
          <input type="number" placeholder="Qty" value={newItem.qty || 1}
            onChange={e => setNewItem({ ...newItem, qty: +e.target.value })}
            className="border p-2 rounded col-span-2" />
          <input type="number" placeholder="တစ်ခုဈေး" value={newItem.unit_cost || ''}
            onChange={e => setNewItem({ ...newItem, unit_cost: +e.target.value })}
            className="border p-2 rounded col-span-3" />
          <button onClick={addItem} className="bg-green-600 text-white rounded col-span-1">+</button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">အမည်</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">တစ်ခုဈေး</th>
              <th className="p-2 text-right">စုစုပေါင်း</th>
              <th className="p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">အပိုပစ္စည်း မရှိသေး</td></tr>
            )}
            {items.map(it => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.name}</td>
                <td className="p-2 text-center">{it.qty}</td>
                <td className="p-2 text-right">{Number(it.unit_cost).toLocaleString()}</td>
                <td className="p-2 text-right font-bold">{Number(it.total_cost).toLocaleString()}</td>
                <td className="p-2 text-center">
                  <button onClick={() => removeItem(it.id)} className="text-red-600 text-xs">ဖျက်</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 text-right text-sm">
          Parts Total: <strong>{partsCost.toLocaleString()} Ks</strong>
        </div>
      </div>

      {/* Costs */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">💰 ကုန်ကျစရိတ်</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">လုပ်ခလုပ် (Labor)</label>
            <input type="number" value={laborCost || ''}
              onChange={e => setLaborCost(+e.target.value || 0)}
              className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">ရက်စွဲ</label>
            <div className="border p-2 rounded bg-gray-50 text-sm">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        <button onClick={saveCosts} className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
          ကုန်ကျစရိတ် သိမ်း
        </button>

        <div className="mt-4 grid grid-cols-4 gap-3 bg-gray-50 p-3 rounded">
          <div>
            <div className="text-xs text-gray-500">Parts</div>
            <div className="font-bold">{partsCost.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Labor</div>
            <div className="font-bold">{Number(r.labor_cost || 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="font-bold text-green-700">{totalCost.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Balance</div>
            <div className={`font-bold ${balance > 0 ? 'text-red-700' : 'text-gray-500'}`}>
              {balance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">💵 ငွေလက်ခံ</h2>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm mb-1">လက်ခံငွေ</label>
            <input type="number" value={paidAmt || ''}
              onChange={e => setPaidAmt(+e.target.value || 0)}
              className="border p-2 rounded w-full" placeholder="0" />
          </div>
          <button onClick={recordPayment} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded">
            လက်ခံ
          </button>
          <div className="text-sm">
            <div className="text-gray-500">ပေးပြီး — {Number(r.paid || 0).toLocaleString()} Ks</div>
            <div className={`font-bold ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
              ကျန် — {balance.toLocaleString()} Ks
            </div>
          </div>
        </div>
      </div>

      {/* Warranty */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-blue-700">🛡️ အာမခံ</h2>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm mb-1">ရက် (days)</label>
            <input type="number" value={warrantyDays || ''}
              onChange={e => setWarrantyDays(+e.target.value || 0)}
              className="border p-2 rounded w-full" placeholder="90" />
          </div>
          <button onClick={saveWarranty} className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
            သိမ်း
          </button>
          <div className="text-sm text-gray-600">
            {r.warranty_days > 0 && r.delivered_at && (
              <>
                သက်တမ်း — {new Date(new Date(r.delivered_at).getTime() + r.warranty_days * 86400000).toLocaleDateString()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="font-bold mb-3 text-gray-700">📋 မှတ်တမ်း</h2>
        <div className="space-y-2">
          {logs.length === 0 && <p className="text-gray-400 text-sm">မှတ်တမ်း မရှိ</p>}
          {logs.map(l => (
            <div key={l.id} className="text-sm border-l-2 border-green-500 pl-3">
              <div className="text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</div>
              <div>
                {l.from_status ? `${STATUS_LABELS[l.from_status] || l.from_status} → ` : ''}
                <strong>{STATUS_LABELS[l.to_status] || l.to_status}</strong>
              </div>
              {l.note && <div className="text-gray-600 text-xs italic">{l.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

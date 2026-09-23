'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/useRole'

export default function InstallmentDetail() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { isOwner } = useRole()
  const [inst, setInst] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPay, setShowPay] = useState(false)
  const [showMFPay, setShowMFPay] = useState(false)
  const [payForm, setPayForm] = useState({
    amount: 0, payment_method: 'cash', ref_no: '', note: '',
    paid_at: new Date().toISOString().slice(0,10)
  })
  const [mfForm, setMfForm] = useState({
    amount: 0, payment_method: 'bank', ref_no: '', note: '',
    paid_at: new Date().toISOString().slice(0,10)
  })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: i } = await supabase.from('installment_summary').select('*').eq('id', id).maybeSingle()
    setInst(i)
    const { data: p } = await supabase.from('installment_payments').select('*').eq('installment_id', id).order('paid_at')
    setPayments(p ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (inst) {
      const monthly = Number(inst.installment_amount)
      const cBal = Number(inst.financed_amount) - Number(inst.customer_paid || 0) - Number(inst.down_payment)
      setPayForm(prev => ({ ...prev, amount: Math.min(monthly, Math.max(0, cBal)) }))
      setMfForm(prev => ({ ...prev, amount: Number(inst.microfinance_balance || 0) }))
    }
  }, [inst])

  async function saveCustomerPayment() {
    if (!payForm.amount || payForm.amount <= 0) return alert('ပမာဏ ထည့်ပါ')
    setSaving(true)
    const { error } = await supabase.rpc('pay_installment', {
      p_installment_id: Number(id),
      p_amount: payForm.amount,
      p_method: payForm.payment_method,
      p_ref_no: payForm.ref_no,
      p_note: payForm.note || 'Installment',
      p_paid_at: payForm.paid_at
    })
    setSaving(false)
    if (error) return alert(error.message)
    setShowPay(false)
    setPayForm({ amount: 0, payment_method: 'cash', ref_no: '', note: '', paid_at: new Date().toISOString().slice(0,10) })
    alert('✅ Customer ဆီက လက်ခံပြီးပါပြီ')
    load()
  }

  async function saveMFPayment() {
    if (!mfForm.amount || mfForm.amount <= 0) return alert('ပမာဏ ထည့်ပါ')
    setSaving(true)
    const { error } = await supabase.rpc('pay_microfinance', {
      p_installment_id: Number(id),
      p_amount: mfForm.amount,
      p_method: mfForm.payment_method,
      p_ref_no: mfForm.ref_no,
      p_note: mfForm.note || 'Microfinance payment',
      p_paid_at: mfForm.paid_at
    })
    setSaving(false)
    if (error) return alert(error.message)
    setShowMFPay(false)
    setMfForm({ amount: 0, payment_method: 'bank', ref_no: '', note: '', paid_at: new Date().toISOString().slice(0,10) })
    alert('✅ Microfinance ဆီက လက်ခံပြီးပါပြီ')
    load()
  }

  async function deleteInst() {
    if (!isOwner) return alert('⛔ Owner ပဲ ဖျက်လို့ ရပါတယ်')
    if (!confirm(`⚠️ ${inst.installment_no} ကို ဖျက်မှာ သေချာလား?\n\nSale + Device + Payment အားလုံး ဖျက်မယ်`)) return
    if (!confirm('နောက်ဆုံး အတည်ပြုပါ။')) return
    setSaving(true)
    const { error } = await supabase.rpc('delete_installment', { p_installment_id: Number(id) })
    setSaving(false)
    if (error) return alert('❌ ' + error.message)
    alert('✅ ဖျက်ပြီးပါပြီ')
    router.push('/installments')
  }

  if (loading) return <p className="p-6">...</p>
  if (!inst) return <p className="p-6">Installment မတွေ့ပါ</p>

  const total = Number(inst.total_amount)
  const dp = Number(inst.down_payment)
  const deposit = Number(inst.deposit_amount || 0)
  const financed = Number(inst.financed_amount)
  const mfPaid = Number(inst.microfinance_paid || 0)
  const mfBalance = Number(inst.microfinance_balance || 0)
  const custPaid = Number(inst.customer_paid || 0)
  const custRemaining = financed - custPaid

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">{inst.installment_no}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              inst.installment_type === 'rent2own' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {inst.installment_type === 'rent2own' ? '🏠 Rent2Own' : '🕌 Maharbawga'}
            </span>
            {inst.microfinance_name && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                💼 {inst.microfinance_name}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              inst.status === 'active' ? 'bg-green-100 text-green-800' :
              inst.status === 'completed' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-800'
            }`}>{inst.status}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowMFPay(true)} disabled={mfBalance <= 0}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-medium disabled:opacity-40">
            🏦 MF ဆီက လက်ခံ
          </button>
          <button onClick={() => setShowPay(true)} disabled={custRemaining <= 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium disabled:opacity-40">
            💵 Customer ဆီက လက်ခံ
          </button>
          {isOwner && (
            <button onClick={deleteInst} disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50">
              {saving ? '...' : '🗑️ ဖျက်'}
            </button>
          )}
          <button onClick={() => router.push('/installments')} className="bg-gray-200 px-4 py-2 rounded font-medium">← ပြန်</button>
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-2 text-green-700">👤 Customer</h2>
        <div className="text-sm">
          <div><strong>နာမည်:</strong> {inst.customer_name || '-'}</div>
          <div><strong>ဖုန်း:</strong> {inst.customer_phone || '-'}</div>
        </div>
      </div>

      {/* === MAIN SUMMARY === */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-5 mb-4">
        <div className="text-sm opacity-90 mb-1">📱 ဖုန်း တန်ဖိုး (Total Value)</div>
        <div className="text-4xl font-bold">{total.toLocaleString()} Ks</div>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/30">
          <div>
            <div className="text-xs opacity-80">💰 Deposit (Customer ပေးပြီး)</div>
            <div className="text-2xl font-bold mt-1">{dp.toLocaleString()} Ks</div>
          </div>
          <div>
            <div className="text-xs opacity-80">🏦 Microfinance ရရန်ကျန်</div>
            <div className="text-2xl font-bold mt-1 text-yellow-300">{mfBalance.toLocaleString()} Ks</div>
          </div>
        </div>
      </div>

      {/* MF Summary */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded shadow p-4 mb-4">
        <h3 className="font-bold text-orange-800 mb-3">🏦 Microfinance Summary</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-600 text-xs">Financed Amount</div>
            <div className="font-bold text-lg">{financed.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Microfinance က ပေးရမည်</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs">MF Paid (ရပြီး)</div>
            <div className="font-bold text-lg text-green-700">{mfPaid.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs">MF Balance (ရရန်ကျန်)</div>
            <div className={`font-bold text-lg ${mfBalance > 0 ? 'text-red-700' : 'text-gray-400'}`}>
              {mfBalance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Installment Progress */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h3 className="font-bold text-green-700 mb-3">👤 Customer Installment (MF ထံ ဆပ်ရန်)</h3>
        <div className="grid grid-cols-3 gap-3 text-sm mb-3">
          <div>
            <div className="text-gray-600 text-xs">Customer ဆပ်ပြီး</div>
            <div className="font-bold text-lg text-green-700">{custPaid.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs">Customer ကျန်</div>
            <div className={`font-bold text-lg ${custRemaining > 0 ? 'text-red-700' : 'text-gray-400'}`}>
              {custRemaining.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-gray-600 text-xs">လစဉ်</div>
            <div className="font-bold text-lg">{Number(inst.installment_amount).toLocaleString()}</div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-green-500 h-3 rounded-full" style={{ width: (financed > 0 ? Math.min(100, (custPaid / financed) * 100) : 0) + '%' }} />
        </div>
        <div className="text-xs text-gray-500 mt-1 text-right">{inst.paid_count}/{inst.installments_count} ကြိမ်</div>
      </div>

      {/* Deposit Info */}
      {deposit > 0 && (
        <div className="bg-purple-50 border border-purple-300 rounded p-3 mb-4 text-sm">
          <div className="flex justify-between items-center">
            <div>
              <strong className="text-purple-800">💼 Deposit (အာမခံ):</strong> {deposit.toLocaleString()} Ks
              <div className="text-xs text-gray-600 mt-1">Customer ဆပ်ပြီးရင် ပြန်အမ်းရမည်</div>
            </div>
            {inst.deposit_returned ? (
              <span className="text-green-700 font-bold text-sm">✅ ပြန်အမ်းပြီး</span>
            ) : (
              <span className="text-orange-700 font-bold text-sm">⏳ ပြန်အမ်းရန်</span>
            )}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="bg-blue-50 p-3 border-b">
          <h2 className="font-bold text-blue-800">📜 မှတ်တမ်း</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">ရက်စွဲ</th>
              <th className="p-3 text-left">အမျိုးအစား</th>
              <th className="p-3 text-right">ပမာဏ</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-gray-400">မှတ်တမ်း မရှိ</td></tr>
            )}
            {payments.map(p => (
              <tr key={p.id} className={`border-t ${p.note === 'Deposit' ? 'bg-purple-50' : ''}`}>
                <td className="p-3">{p.paid_at}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    p.note === 'Deposit' ? 'bg-purple-100 text-purple-800' :
                    p.note === 'Down payment' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>{p.note || 'Installment'}</span>
                </td>
                <td className="p-3 text-right font-bold">{Number(p.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Payment Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <h2 className="text-lg font-bold mb-3 text-green-800">💵 Customer ဆီက လက်ခံ</h2>
            <div className="bg-green-50 rounded p-3 mb-3 text-sm">
              <div className="flex justify-between"><span>Customer ကျန်:</span><strong className="text-red-700">{custRemaining.toLocaleString()} Ks</strong></div>
              <div className="flex justify-between mt-1"><span>လစဉ်:</span><strong>{Number(inst.installment_amount).toLocaleString()} Ks</strong></div>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">ပမာဏ (Ks)</label>
                <input type="number" value={payForm.amount || ''} onChange={e => setPayForm({ ...payForm, amount: +e.target.value || 0 })}
                  className="border p-2 rounded w-full text-lg font-bold" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ရက်စွဲ</label>
                <input type="date" value={payForm.paid_at} onChange={e => setPayForm({ ...payForm, paid_at: e.target.value })} className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">နည်းလမ်း</label>
                <select value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })} className="border p-2 rounded w-full">
                  <option value="cash">Cash</option>
                  <option value="kbzpay">KBZPay</option>
                  <option value="wavepay">WavePay</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveCustomerPayment} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white flex-1 py-2 rounded font-medium disabled:opacity-50">
                {saving ? '...' : '✅ လက်ခံ'}
              </button>
              <button onClick={() => setShowPay(false)} className="bg-gray-200 px-4 py-2 rounded">ပယ်ဖျက်</button>
            </div>
          </div>
        </div>
      )}

      {/* MF Payment Modal */}
      {showMFPay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
              <h2 className="text-lg font-bold mb-3 text-orange-800">🏦 Microfinance ဆီက လက်ခံ</h2>
              <div className="bg-orange-50 rounded p-3 mb-3 text-sm">
                <div className="flex justify-between"><span>MF Balance:</span><strong className="text-red-700">{mfBalance.toLocaleString()} Ks</strong></div>
                <div className="text-xs text-gray-600 mt-1">{inst.microfinance_name || 'Microfinance'}</div>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ပမာဏ (Ks)</label>
                  <input type="number" value={mfForm.amount || ''} onChange={e => setMfForm({ ...mfForm, amount: +e.target.value || 0 })}
                    className="border p-2 rounded w-full text-lg font-bold" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ရက်စွဲ</label>
                  <input type="date" value={mfForm.paid_at} onChange={e => setMfForm({ ...mfForm, paid_at: e.target.value })} className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">နည်းလမ်း</label>
                  <select value={mfForm.payment_method} onChange={e => setMfForm({ ...mfForm, payment_method: e.target.value })} className="border p-2 rounded w-full">
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="kbzpay">KBZPay</option>
                    <option value="wavepay">WavePay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ref No</label>
                  <input value={mfForm.ref_no} onChange={e => setMfForm({ ...mfForm, ref_no: e.target.value })} className="border p-2 rounded w-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveMFPayment} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white flex-1 py-2 rounded font-medium disabled:opacity-50">
                  {saving ? '...' : '✅ လက်ခံ'}
                </button>
                <button onClick={() => setShowMFPay(false)} className="bg-gray-200 px-4 py-2 rounded">ပယ်ဖျက်</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

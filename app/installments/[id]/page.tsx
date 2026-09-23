'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function InstallmentDetail() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [inst, setInst] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPay, setShowPay] = useState(false)
  const [payForm, setPayForm] = useState({
    amount: 0, payment_method: 'cash', ref_no: '', note: '',
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

  // Auto-fill next installment amount
  useEffect(() => {
    if (inst && inst.balance > 0) {
      const monthly = Number(inst.installment_amount)
      const bal = Number(inst.balance)
      setPayForm(prev => ({ ...prev, amount: Math.min(monthly, bal) }))
    }
  }, [inst])

  async function savePayment() {
    if (!payForm.amount || payForm.amount <= 0) return alert('ပမာဏ ထည့်ပါ')
    setSaving(true)
    const { error } = await supabase.rpc('pay_installment', {
      p_installment_id: Number(id),
      p_amount: payForm.amount,
      p_method: payForm.payment_method,
      p_ref_no: payForm.ref_no,
      p_note: payForm.note,
      p_paid_at: payForm.paid_at
    })
    setSaving(false)
    if (error) return alert(error.message)
    setShowPay(false)
    setPayForm({ amount: 0, payment_method: 'cash', ref_no: '', note: '', paid_at: new Date().toISOString().slice(0,10) })
    alert('✅ ငွေလက်ခံပြီးပါပြီ')
    load()
  }

  if (loading) return <p className="p-6">...</p>
  if (!inst) return <p className="p-6">Installment မတွေ့ပါ</p>

  const progress = Number(inst.financed_amount) > 0
    ? Math.min(100, (Number(inst.total_paid) - Number(inst.down_payment)) / Number(inst.financed_amount) * 100)
    : 0

  // Build schedule
  const schedule: any[] = []
  let runningBalance = Number(inst.financed_amount)
  const startDate = new Date(inst.start_date)
  for (let i = 0; i < Number(inst.installments_count); i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i + 1)
    runningBalance -= Number(inst.installment_amount)
    schedule.push({
      no: i + 1,
      due: dueDate.toISOString().slice(0,10),
      amount: Number(inst.installment_amount),
      balance: Math.max(0, runningBalance)
    })
  }

  // Mark paid schedule by matching payments (excluding DP)
  const nonDpPayments = payments.filter(p => p.note !== 'Down payment')
  const scheduleWithPaid = schedule.map((s, i) => ({
    ...s,
    paid: i < nonDpPayments.length,
    paidDate: nonDpPayments[i]?.paid_at
  }))

  const isCompleted = inst.status === 'completed'

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">{inst.installment_no}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              inst.installment_type === 'rent2own'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-purple-100 text-purple-800'
            }`}>
              {inst.installment_type === 'rent2own' ? '🏠 Rent2Own' : '🕌 Maharbawga'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              inst.status === 'active' ? 'bg-green-100 text-green-800' :
              inst.status === 'completed' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-800'
            }`}>{inst.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!isCompleted && (
            <button onClick={() => setShowPay(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
              💵 ငွေလက်ခံ
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

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
          <div className="text-xs text-gray-600">Total Amount</div>
          <div className="text-xl font-bold text-blue-700">{Number(inst.total_amount).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-purple-500">
          <div className="text-xs text-gray-600">Down Payment</div>
          <div className="text-xl font-bold text-purple-700">{Number(inst.down_payment).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-purple-500">
          <div className="text-xs text-gray-600">Deposit (အာမခံ)</div>
          <div className="text-xl font-bold text-purple-700">{Number(inst.deposit_amount || 0).toLocaleString()}</div>
          {Number(inst.deposit_collected || 0) > 0 && (
            <div className="text-xs text-green-700 mt-1">✅ ရပြီး: {Number(inst.deposit_collected).toLocaleString()}</div>
          )}
        </div>

        <div className="bg-white rounded shadow p-4 border-l-4 border-green-500">
          <div className="text-xs text-gray-600">ပေးပြီး</div>
          <div className="text-xl font-bold text-green-700">{Number(inst.total_paid).toLocaleString()}</div>
        </div>
        <div className={`bg-white rounded shadow p-4 border-l-4 ${Number(inst.balance) > 0 ? 'border-red-500' : 'border-gray-300'}`}>
          <div className="text-xs text-gray-600">လက်ကျန်</div>
          <div className={`text-xl font-bold ${Number(inst.balance) > 0 ? 'text-red-700' : 'text-gray-400'}`}>
            {Number(inst.balance).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold text-green-700">📊 ပေးချေမှု အခြေအနေ</div>
          <div className="text-sm">{progress.toFixed(1)}%</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all" style={{ width: progress + '%' }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{inst.paid_count}/{inst.installments_count} ကြိမ်</span>
          <span>လစဉ် {Number(inst.installment_amount).toLocaleString()} Ks</span>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded shadow overflow-hidden mb-4">
        <div className="bg-green-50 p-3 border-b">
          <h2 className="font-bold text-green-800">📅 ပေးရမည့် အစီအစဉ်</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-center">#</th>
              <th className="p-3 text-left">ရက်စွဲ</th>
              <th className="p-3 text-right">ပမာဏ</th>
              <th className="p-3 text-right">ကျန်ငွေ</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {scheduleWithPaid.map(s => (
              <tr key={s.no} className={`border-t ${s.paid ? 'bg-green-50' : ''}`}>
                <td className="p-3 text-center">{s.no}</td>
                <td className="p-3">{s.due}</td>
                <td className="p-3 text-right font-bold">{s.amount.toLocaleString()}</td>
                <td className="p-3 text-right text-gray-600">{s.balance.toLocaleString()}</td>
                <td className="p-3 text-center">
                  {s.paid ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                      ✅ {s.paidDate}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">⏳</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="bg-blue-50 p-3 border-b">
          <h2 className="font-bold text-blue-800">📜 ပေးချေမှု မှတ်တမ်း</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">ရက်စွဲ</th>
              <th className="p-3 text-left">နည်းလမ်း</th>
              <th className="p-3 text-left">မှတ်ချက်</th>
              <th className="p-3 text-right">ပမာဏ</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-400">မှတ်တမ်း မရှိ</td></tr>
            )}
            {payments.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.paid_at}</td>
                <td className="p-3 capitalize">{p.payment_method}</td>
                <td className="p-3 text-gray-600">{p.note || '-'}</td>
                <td className="p-3 text-right font-bold text-green-700">{Number(p.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
            <h2 className="text-lg font-bold mb-3 text-green-800">💵 ငွေလက်ခံ</h2>
            <div className="bg-green-50 rounded p-3 mb-3 text-sm">
              <div className="flex justify-between">
                <span>လက်ကျန်:</span>
                <strong className="text-red-700">{Number(inst.balance).toLocaleString()} Ks</strong>
              </div>
              <div className="flex justify-between mt-1">
                <span>လစဉ်:</span>
                <strong>{Number(inst.installment_amount).toLocaleString()} Ks</strong>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">ပမာဏ (Ks)</label>
                <input type="number" value={payForm.amount || ''} onChange={e => setPayForm({ ...payForm, amount: +e.target.value || 0 })}
                  className="border p-2 rounded w-full text-lg font-bold" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ရက်စွဲ</label>
                <input type="date" value={payForm.paid_at} onChange={e => setPayForm({ ...payForm, paid_at: e.target.value })}
                  className="border p-2 rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">နည်းလမ်း</label>
                <select value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="border p-2 rounded w-full">
                  <option value="cash">Cash</option>
                  <option value="kbzpay">KBZPay</option>
                  <option value="wavepay">WavePay</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ref No</label>
                <input value={payForm.ref_no} onChange={e => setPayForm({ ...payForm, ref_no: e.target.value })}
                  className="border p-2 rounded w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={savePayment} disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white flex-1 py-2 rounded font-medium disabled:opacity-50">
                {saving ? '...' : '✅ လက်ခံ'}
              </button>
              <button onClick={() => setShowPay(false)} className="bg-gray-200 px-4 py-2 rounded">ပယ်ဖျက်</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

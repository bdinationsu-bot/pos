'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function FinancePage() {
  const [cash, setCash] = useState<any[]>([])
  const [exp, setExp] = useState({ category: 'rent', amount: 0, note: '' })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cash_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setCash(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addExpense() {
    if (!exp.amount) return alert('ပမာဏ ထည့်ပါ')
    const { error } = await supabase.from('expenses').insert(exp)
    if (error) return alert('Error: ' + error.message)
    await supabase.from('cash_transactions').insert({
      type: 'out',
      amount: exp.amount,
      ref_type: 'expense',
      note: exp.note
    })
    setExp({ category: 'rent', amount: 0, note: '' })
    load()
  }

  const totalIn = cash.filter(c => c.type === 'in').reduce((s, c) => s + Number(c.amount), 0)
  const totalOut = cash.filter(c => c.type === 'out').reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Finance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <div className="text-sm text-gray-600">Cash In</div>
          <div className="text-2xl font-bold text-green-700">{totalIn.toLocaleString()} Ks</div>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <div className="text-sm text-gray-600">Cash Out</div>
          <div className="text-2xl font-bold text-red-700">{totalOut.toLocaleString()} Ks</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <div className="text-sm text-gray-600">Balance</div>
          <div className="text-2xl font-bold text-blue-700">{(totalIn - totalOut).toLocaleString()} Ks</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded shadow p-4">
          <h2 className="font-bold mb-3">ငွေစာရင်း (နောက်ဆုံး ၁၀၀)</h2>
          {loading ? (
            <p>စစ်နေတယ်...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-center">Type</th>
                  <th className="p-2 text-left">Ref</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {cash.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-400">မှတ်တမ်း မရှိပါ</td></tr>
                )}
                {cash.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{new Date(c.created_at).toLocaleString()}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        c.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{c.type === 'in' ? 'ဝင်' : 'ထွက်'}</span>
                    </td>
                    <td className="p-2 text-gray-600">{c.ref_type || '-'}</td>
                    <td className={`p-2 text-right font-bold ${
                      c.type === 'in' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {c.type === 'in' ? '+' : '-'}{Number(c.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="font-bold mb-3">အသုံးစရိတ် ထည့်</h2>
          <div className="space-y-3">
            <select
              value={exp.category}
              onChange={e => setExp({ ...exp, category: e.target.value })}
              className="border p-2 rounded w-full"
            >
              <option value="rent">ဆိုင်ခ</option>
              <option value="salary">လစာ</option>
              <option value="internet">Internet</option>
              <option value="parts">အပိုပစ္စည်း</option>
              <option value="transport">သွားလာ</option>
              <option value="marketing">ကြော်ငြာ</option>
              <option value="other">အခြား</option>
            </select>
            <input
              type="number"
              placeholder="ပမာဏ (Ks)"
              value={exp.amount || ''}
              onChange={e => setExp({ ...exp, amount: +e.target.value })}
              className="border p-2 rounded w-full"
            />
            <input
              placeholder="မှတ်ချက်"
              value={exp.note}
              onChange={e => setExp({ ...exp, note: e.target.value })}
              className="border p-2 rounded w-full"
            />
            <button
              onClick={addExpense}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded w-full"
            >
              ထည့်
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EXPENSE_CATEGORIES } from '@/lib/accounting'

export default function ExpenseCodesPage() {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    code: '', category: 'other', name: '', name_mm: '',
    default_amount: 0, note: '', active: true
  })

  async function load() {
    setLoading(true)
    let query = supabase.from('expense_codes').select('*').order('code')
    if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,name_mm.ilike.%${q}%`)
    if (filter !== 'all') query = query.eq('category', filter)
    const { data } = await query
    setCodes(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [q, filter])

  function resetForm() {
    setF({ code: '', category: 'other', name: '', name_mm: '', default_amount: 0, note: '', active: true })
    setEditId(null)
  }

  function openEdit(c: any) {
    setF({
      code: c.code, category: c.category, name: c.name,
      name_mm: c.name_mm || '', default_amount: Number(c.default_amount) || 0,
      note: c.note || '', active: c.active
    })
    setEditId(c.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save() {
    if (!f.code) return alert('Code ထည့်ပါ')
    if (!f.name) return alert('Name ထည့်ပါ')

    setSaving(true)

    if (editId) {
      const { error } = await supabase.from('expense_codes').update({
        code: f.code.toUpperCase(),
        category: f.category,
        name: f.name,
        name_mm: f.name_mm,
        default_amount: f.default_amount,
        note: f.note,
        active: f.active
      }).eq('id', editId)

      setSaving(false)
      if (error) return alert('❌ ' + error.message)
      alert('✅ ပြင်ပြီးပါပြီ')
    } else {
      const { error } = await supabase.from('expense_codes').insert({
        code: f.code.toUpperCase(),
        category: f.category,
        name: f.name,
        name_mm: f.name_mm,
        default_amount: f.default_amount,
        note: f.note,
        active: f.active
      })

      setSaving(false)
      if (error) {
        if (error.message.includes('duplicate')) return alert('❌ ဒီ Code ရှိပြီးသား')
        return alert('❌ ' + error.message)
      }
      alert('✅ ထည့်ပြီးပါပြီ')
    }

    setShowForm(false)
    resetForm()
    load()
  }

  async function toggleActive(id: number, active: boolean) {
    await supabase.from('expense_codes').update({ active: !active }).eq('id', id)
    load()
  }

  async function deleteCode(id: number, code: string) {
    if (!confirm(`⚠️ ${code} ကို ဖျက်မှာ သေချာလား?`)) return
    await supabase.from('expense_codes').delete().eq('id', id)
    load()
  }

  function generateCode(category: string) {
    const prefix = 'EXP-' + category.substring(0, 3).toUpperCase()
    const existing = codes.filter(c => c.code.startsWith(prefix))
    let maxNum = 0
    existing.forEach(c => {
      const parts = c.code.split('-')
      const n = parseInt(parts[parts.length - 1])
      if (!isNaN(n) && n > maxNum) maxNum = n
    })
    return `${prefix}-${String(maxNum + 1).padStart(2, '0')}`
  }

  const categoryColors: any = {
    rent: 'bg-purple-100 text-purple-800',
    salary: 'bg-blue-100 text-blue-800',
    internet: 'bg-cyan-100 text-cyan-800',
    electricity: 'bg-yellow-100 text-yellow-800',
    water: 'bg-sky-100 text-sky-800',
    parts: 'bg-orange-100 text-orange-800',
    transport: 'bg-indigo-100 text-indigo-800',
    marketing: 'bg-pink-100 text-pink-800',
    tax: 'bg-red-100 text-red-800',
    repair: 'bg-amber-100 text-amber-800',
    supplies: 'bg-gray-100 text-gray-700',
    entertainment: 'bg-rose-100 text-rose-800',
    bank_fee: 'bg-teal-100 text-teal-800',
    loss: 'bg-red-200 text-red-900',
    other: 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">🏷️ Expense Codes</h1>
          <p className="text-xs text-gray-500 mt-1">
            အသုံးစရိတ် ကုဒ် {codes.length} ခု — ဒီကနေ ကုဒ်တွေ ထည့်/ပြင်/ဖျက် လုပ်ပါ
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium"
        >
          + Code အသစ် ဆောက်
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded shadow p-5 mb-4 border-2 border-green-400">
          <h2 className="font-bold mb-4 text-green-700 text-lg">
            {editId ? '✏️ Expense Code ပြင်' : '➕ Expense Code အသစ် ဆောက်'}
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={f.code}
                  onChange={e => setF({ ...f, code: e.target.value.toUpperCase() })}
                  placeholder="EXP-RENT-01"
                  className="border p-2 rounded flex-1 font-mono"
                  disabled={!!editId}
                />
                {!editId && (
                  <button
                    type="button"
                    onClick={() => setF({ ...f, code: generateCode(f.category) })}
                    className="bg-gray-200 hover:bg-gray-300 px-3 rounded text-sm font-medium"
                    title="Auto generate"
                  >
                    🎲 Auto
                  </button>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={f.category}
                onChange={e => {
                  setF({ ...f, category: e.target.value })
                  if (!editId && !f.code) {
                    setF(prev => ({ ...prev, category: e.target.value, code: generateCode(e.target.value) }))
                  }
                }}
                className="border p-2 rounded w-full"
              >
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.icon} {c.name} ({c.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Name EN */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Name (English) <span className="text-red-500">*</span>
              </label>
              <input
                value={f.name}
                onChange={e => setF({ ...f, name: e.target.value })}
                placeholder="Shop Rent"
                className="border p-2 rounded w-full"
              />
            </div>

            {/* Name MM */}
            <div>
              <label className="block text-sm font-medium mb-1">
                နာမည် (မြန်မာ)
              </label>
              <input
                value={f.name_mm}
                onChange={e => setF({ ...f, name_mm: e.target.value })}
                placeholder="ဆိုင်ခ"
                className="border p-2 rounded w-full"
              />
            </div>

            {/* Default Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Amount (Ks)
              </label>
              <input
                type="number"
                value={f.default_amount || ''}
                onChange={e => setF({ ...f, default_amount: +e.target.value || 0 })}
                placeholder="0"
                className="border p-2 rounded w-full text-lg font-bold"
              />
              <p className="text-xs text-gray-500 mt-1">
                Expense ထည့်တဲ့အခါ auto-fill ဖြစ်မယ်
              </p>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-1">မှတ်ချက်</label>
              <input
                value={f.note}
                onChange={e => setF({ ...f, note: e.target.value })}
                placeholder="Monthly / လစဉ်"
                className="border p-2 rounded w-full"
              />
            </div>

            {/* Active */}
            <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={f.active}
                onChange={e => setF({ ...f, active: e.target.checked })}
                className="w-5 h-5"
              />
              <div>
                <label className="text-sm font-medium">Active</label>
                <p className="text-xs text-gray-500">
                  Active ဖြစ်မှ Accounting မှာ code dropdown မှာ ပေါ်မယ်
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          {f.code && f.name && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3 text-sm">
              <div className="font-medium text-blue-800 mb-1">📋 Preview:</div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-green-700">{f.code}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[f.category] || 'bg-gray-100'}`}>
                  {f.category}
                </span>
                <span>{f.name}</span>
                {f.name_mm && <span className="text-gray-500">({f.name_mm})</span>}
                {f.default_amount > 0 && (
                  <span className="text-gray-600 ml-auto">{f.default_amount.toLocaleString()} Ks</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded font-medium disabled:opacity-50"
            >
              {saving ? '...' : editId ? '💾 ပြင်' : '💾 သိမ်း'}
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded font-medium"
            >
              ပယ်ဖျက်
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Code / Name ရှာ"
          className="border p-3 rounded flex-1 max-w-md"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border p-3 rounded"
        >
          <option value="all">Category အားလုံး</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-400">...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Name (EN)</th>
                <th className="p-3 text-left">နာမည် (MM)</th>
                <th className="p-3 text-right">Default</th>
                <th className="p-3 text-left">Note</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    Code မရှိပါ — "+ Code အသစ် ဆောက်" ကို နှိပ်ပါ
                  </td>
                </tr>
              )}
              {codes.map(c => (
                <tr key={c.id} className="border-t hover:bg-green-50">
                  <td className="p-3 font-mono text-xs font-bold text-green-700">{c.code}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[c.category] || 'bg-gray-100'}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-gray-600">{c.name_mm || '-'}</td>
                  <td className="p-3 text-right">
                    {Number(c.default_amount) > 0 ? Number(c.default_amount).toLocaleString() : '-'}
                  </td>
                  <td className="p-3 text-xs text-gray-500">{c.note || '-'}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleActive(c.id, c.active)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        c.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {c.active ? '✅ Active' : '⏸ Off'}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ✏️ ပြင်
                      </button>
                      <button
                        onClick={() => deleteCode(c.id, c.code)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        🗑️ ဖျက်
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
        <strong className="text-blue-800">💡 အသုံးပြုနည်း:</strong>
        <ul className="ml-4 mt-2 space-y-1 text-gray-700 text-xs">
          <li><strong>🎲 Auto</strong> — Category အလိုက် Code auto generate (EXP-RENT-01, 02...)</li>
          <li><strong>Default Amount</strong> — Accounting မှာ Code ရွေးရင် ဒီပမာဏ auto-fill ဖြစ်မယ်</li>
          <li><strong>Active</strong> — Off လုပ်ထားရင် Accounting dropdown မှာ မပေါ်ဘူး</li>
          <li><strong>Accounting → + Expense ထည့်</strong> မှာ Code ရွေးပြီး သုံးလို့ ရမယ်</li>
        </ul>
      </div>
    </div>
  )
}

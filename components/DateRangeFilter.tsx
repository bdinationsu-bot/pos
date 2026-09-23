'use client'
import { useState } from 'react'

export type DateRange = {
  from: string
  to: string
  preset: string
}

const PRESETS = [
  { code: 'today', label: '📅 ဒီနေ့' },
  { code: 'yesterday', label: '📅 မနေ့' },
  { code: 'week', label: '📅 ဒီအပတ်' },
  { code: 'month', label: '📅 ဒီလ' },
  { code: 'last_month', label: '📅 ပြီးခဲ့တဲ့လ' },
  { code: 'year', label: '📅 ဒီနှစ်' },
  { code: 'all', label: '📅 အားလုံး' },
  { code: 'custom', label: '🔧 Custom' }
]

export function getRangeFromPreset(preset: string): { from: string, to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const todayStr = fmt(today)

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { from: fmt(y), to: fmt(y) }
    }
    case 'week': {
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(today)
      monday.setDate(diff)
      return { from: fmt(monday), to: todayStr }
    }
    case 'month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(first), to: todayStr }
    }
    case 'last_month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: fmt(first), to: fmt(last) }
    }
    case 'year': {
      const first = new Date(today.getFullYear(), 0, 1)
      return { from: fmt(first), to: todayStr }
    }
    case 'all':
      return { from: '2000-01-01', to: '2099-12-31' }
    default:
      return { from: todayStr, to: todayStr }
  }
}

type Props = {
  value: DateRange
  onChange: (r: DateRange) => void
}

export default function DateRangeFilter({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false)

  function pick(preset: string) {
    if (preset === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    const { from, to } = getRangeFromPreset(preset)
    onChange({ from, to, preset })
  }

  return (
    <div className="bg-white rounded shadow p-3 mb-4">
      <div className="flex gap-2 flex-wrap items-center">
        {PRESETS.map(p => (
          <button
            key={p.code}
            onClick={() => pick(p.code)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              value.preset === p.code
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}

        <div className="ml-auto text-sm text-gray-600 flex items-center gap-2">
          <span>📆</span>
          <span className="font-medium">{value.from}</span>
          <span>→</span>
          <span className="font-medium">{value.to}</span>
        </div>
      </div>

      {(showCustom || value.preset === 'custom') && (
        <div className="mt-3 pt-3 border-t flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm">မှ</label>
            <input
              type="date"
              value={value.from}
              onChange={e => onChange({ ...value, from: e.target.value, preset: 'custom' })}
              className="border p-2 rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">ထိ</label>
            <input
              type="date"
              value={value.to}
              onChange={e => onChange({ ...value, to: e.target.value, preset: 'custom' })}
              className="border p-2 rounded"
            />
          </div>
        </div>
      )}
    </div>
  )
}

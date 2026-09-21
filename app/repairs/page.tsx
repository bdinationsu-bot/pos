'use client'
import { useLang } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  received: 'လက်ခံရရှိ',
  diagnosing: 'စစ်ဆေးနေ',
  waiting_parts: 'အပိုပစ္စည်း စောင့်',
  in_progress: 'ပြုပြင်နေ',
  completed: 'ပြီးစီး',
  delivered: 'ပေးအပ်',
  cancelled: 'ပယ်ဖျက်'
}

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  diagnosing: 'bg-yellow-100 text-yellow-800',
  waiting_parts: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-800'
}

export default function RepairsPage() {
const { t } = useLang()
  const [list, setList] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('active')

  async function load() {
    let query = supabase.from('repairs').select('*').order('id', { ascending: false })
    if (q) query = query.or(`ticket_no.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,imei.ilike.%${q}%,model.ilike.%${q}%`)
    if (filter === 'active') query = query.not('status', 'in', '(delivered,cancelled)')
    else if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setList(data ?? [])
  }
  useEffect(() => { load() }, [q, filter])

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Repair Desk</h1>
        <Link href="/repairs/new" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
          + Ticket အသစ်
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Ticket / နာမည် / ဖုန်း / IMEI ရှာ"
          className="border p-3 rounded flex-1 max-w-md"
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border p-3 rounded">
          <option value="active">လုပ်ဆောင်နေ</option>
          <option value="all">အားလုံး</option>
          <option value="received">လက်ခံရရှိ</option>
          <option value="diagnosing">စစ်ဆေးနေ</option>
          <option value="waiting_parts">အပိုပစ္စည်း စောင့်</option>
          <option value="in_progress">ပြုပြင်နေ</option>
          <option value="completed">ပြီးစီး</option>
          <option value="delivered">ပေးအပ်</option>
        </select>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="p-3 text-left">Ticket</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Device</th>
              <th className="p-3 text-left">Issue</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Ticket မရှိပါ</td></tr>
            )}
            {list.map(r => (
              <tr key={r.id} className="border-t hover:bg-green-50 cursor-pointer">
                <td className="p-3">
                  <Link href={`/repairs/${r.id}`} className="font-mono text-green-700 font-medium hover:underline">
                    {r.ticket_no}
                  </Link>
                </td>
                <td className="p-3">
                  <div className="font-medium">{r.customer_name || '-'}</div>
                  <div className="text-xs text-gray-500">{r.customer_phone}</div>
                </td>
                <td className="p-3">
                  <div className="font-medium">{r.model || '-'}</div>
                  <div className="text-xs text-gray-500 font-mono">{r.imei}</div>
                </td>
                <td className="p-3 text-xs text-gray-600 max-w-xs truncate">{r.issue}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td className="p-3 text-right font-bold">
                  {Number(r.total_cost || r.estimated_cost).toLocaleString()}
                </td>
                <td className="p-3 text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

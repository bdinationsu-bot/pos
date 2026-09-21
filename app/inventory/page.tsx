'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  exportDevicesToExcel,
  importDevicesFromExcel,
  downloadTemplate
} from './excel'

export default function InventoryPage() {
  const [list, setList] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [filter, setFilter] = useState('all')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    let query = supabase.from('devices').select('*').order('id', { ascending: false })
    if (q) {
      query = query.or(`imei.ilike.%${q}%,model.ilike.%${q}%,serial.ilike.%${q}%`)
    }
    if (filter !== 'all') {
      query = query.eq('status', filter)
    }
    const { data } = await query
    setList(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [q, filter])

  async function handleImport(file: File) {
    setImporting(true)
    try {
      const count = await importDevicesFromExcel(file)
      alert(`✅ ${count} device အောင်မြင်စွာ import ပြီးပါပြီ`)
      load()
    } catch (err: any) {
      alert('❌ Error: ' + err.message)
    }
    setImporting(false)
  }

  async function handleExport() {
    try {
      await exportDevicesToExcel()
    } catch (err: any) {
      alert('Export Error: ' + err.message)
    }
  }

  const statusColors: any = {
    in_stock: 'bg-green-100 text-green-800',
    sold: 'bg-gray-200 text-gray-700',
    reserved: 'bg-yellow-100 text-yellow-800',
    trade_in: 'bg-blue-100 text-blue-800',
    repair: 'bg-orange-100 text-orange-800',
    returned: 'bg-purple-100 text-purple-800',
    defective: 'bg-red-100 text-red-800',
    parts: 'bg-gray-300 text-gray-800'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Inventory</h1>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50 text-sm"
            title="Excel template download"
          >
            📋 Template
          </button>

          <button
            onClick={handleExport}
            className="bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded hover:bg-green-50 font-medium"
          >
            ⬇ Excel Export
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded hover:bg-green-50 font-medium disabled:opacity-50"
          >
            {importing ? '⏳ Import...' : '⬆ Excel Import'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              e.target.value = ''
            }}
          />

          <Link
            href="/inventory/new"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium"
          >
            + Device အသစ်
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 IMEI / Model / Serial ရှာ"
          className="border p-3 rounded flex-1 max-w-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">အားလုံး</option>
          <option value="in_stock">In Stock</option>
          <option value="sold">Sold</option>
          <option value="reserved">Reserved</option>
          <option value="repair">Repair</option>
          <option value="trade_in">Trade-in</option>
          <option value="defective">Defective</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-400">စစ်နေတယ်...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 text-left">Model</th>
                <th className="p-3 text-left">IMEI</th>
                <th className="p-3 text-center">Battery</th>
                <th className="p-3 text-center">Grade</th>
                <th className="p-3 text-right">Cost</th>
                <th className="p-3 text-right">Sale</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Device မရှိပါ
                  </td>
                </tr>
              )}
              {list.map(d => (
                <tr key={d.id} className="border-t hover:bg-green-50">
                  <td className="p-3">
                    <div className="font-medium">{d.model} {d.storage}</div>
                    <div className="text-xs text-gray-500">{d.color}</div>
                  </td>
                  <td className="p-3 font-mono text-xs">{d.imei}</td>
                  <td className="p-3 text-center">{d.battery_health ?? '-'}%</td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-green-700">{d.grade ?? '-'}</span>
                  </td>
                  <td className="p-3 text-right">{Number(d.cost_price).toLocaleString()}</td>
                  <td className="p-3 text-right font-medium">
                    {Number(d.sale_price).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      statusColors[d.status] || 'bg-gray-100'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && (
        <div className="mt-3 text-sm text-gray-500">
          စုစုပေါင်း: <strong className="text-green-700">{list.length}</strong> device
        </div>
      )}
    </div>
  )
}
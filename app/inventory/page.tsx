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
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    let query = supabase
      .from('devices')
      .select('*, supplier:supplier_id(name)')
      .order('id', { ascending: false })
    if (q) query = query.or(`imei.ilike.%${q}%,model.ilike.%${q}%`)
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setList(data ?? [])
    setSelected(new Set())
    setLoading(false)
  }

  useEffect(() => { load() }, [q, filter])

  function toggle(id: number) {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelected(s)
  }

  function toggleAll() {
    if (selected.size === list.length) setSelected(new Set())
    else setSelected(new Set(list.map(d => d.id)))
  }

  async function batchDelete() {
    if (selected.size === 0) return alert('Device ရွေးပါ')
    if (!confirm(`Device ${selected.size} လုံး ဖျက်မှာ သေချာလား?`)) return
    const ids = Array.from(selected)
    const { error } = await supabase.from('devices').delete().in('id', ids)
    if (error) return alert('Error: ' + error.message)
    alert(`✅ ${ids.length} လုံး ဖျက်ပြီးပါပြီ`)
    load()
  }

  function printBarcodes() {
    if (selected.size === 0) return alert('Device ရွေးပါ')
    const ids = Array.from(selected).join(',')
    window.open(`/print/barcode?ids=${ids}`, '_blank', 'width=500,height=700')
  }

  async function handleImport(file: File) {
    setImporting(true)
    try {
      const count = await importDevicesFromExcel(file)
      alert(`✅ ${count} device import ပြီးပါပြီ`)
      load()
    } catch (err: any) {
      alert('❌ Error: ' + err.message)
    }
    setImporting(false)
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

  const batteryColor = (h: number) => {
    if (!h) return 'text-gray-400'
    if (h >= 90) return 'text-green-700 font-bold'
    if (h >= 80) return 'text-yellow-700 font-bold'
    return 'text-red-700 font-bold'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-800">Inventory</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate} className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50 text-sm">
            📋 Template
          </button>
          <button onClick={() => exportDevicesToExcel()} className="bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded hover:bg-green-50 font-medium">
            ⬇ Excel Export
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded hover:bg-green-50 font-medium disabled:opacity-50">
            {importing ? '⏳ ...' : '⬆ Excel Import'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = '' }} />
          <Link href="/inventory/new" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            + Device အသစ်
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 IMEI / Model ရှာ"
          className="border p-3 rounded flex-1 max-w-md focus:outline-none focus:ring-2 focus:ring-green-500" />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border p-3 rounded">
          <option value="all">အားလုံး</option>
          <option value="in_stock">In Stock</option>
          <option value="sold">Sold</option>
          <option value="reserved">Reserved</option>
          <option value="repair">Repair</option>
          <option value="trade_in">Trade-in</option>
          <option value="defective">Defective</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-3 mb-4 flex justify-between items-center">
          <div className="text-sm font-medium text-yellow-800">
            ✅ Device {selected.size} လုံး ရွေးထားပြီ
          </div>
          <div className="flex gap-2">
            <button onClick={printBarcodes} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm">
              🖨️ Barcode Print
            </button>
            <button onClick={batchDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium text-sm">
              🗑️ ဖျက် ({selected.size})
            </button>
            <button onClick={() => setSelected(new Set())} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-medium text-sm">
              ပယ်ဖျက်
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? <p className="p-8 text-center text-gray-400">စစ်နေတယ်...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 w-10">
                  <input type="checkbox" checked={selected.size === list.length && list.length > 0} onChange={toggleAll} />
                </th>
                <th className="p-3 text-left">Model</th>
                <th className="p-3 text-left">IMEI</th>
                <th className="p-3 text-center">Region</th>
                <th className="p-3 text-center">Battery</th>
                <th className="p-3 text-right">Cost</th>
                <th className="p-3 text-right">Sale</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Purchase Date</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr><td colSpan={11} className="p-8 text-center text-gray-400">Device မရှိပါ</td></tr>
              )}
              {list.map(d => (
                <tr key={d.id} className={`border-t hover:bg-green-50 ${selected.has(d.id) ? 'bg-yellow-50' : ''}`}>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{d.model} {d.storage}</div>
                    <div className="text-xs text-gray-500">{d.color}</div>
                  </td>
                  <td className="p-3 font-mono text-xs">{d.imei}</td>
                  <td className="p-3 text-center text-xs">
                    {d.region ? (
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{d.region}</span>
                    ) : '-'}
                  </td>
                  <td className={`p-3 text-center ${batteryColor(d.battery_health)}`}>
                    {d.battery_health ?? '-'}%
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-green-700">{d.grade ?? '-'}</span>
                  </td>
                  <td className="p-3 text-right">{Number(d.cost_price).toLocaleString()}</td>
                  <td className="p-3 text-right font-medium">{Number(d.sale_price).toLocaleString()}</td>
                  <td className="p-3 text-xs">
                    {d.supplier?.name || '-'}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {d.purchase_date ? new Date(d.purchase_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[d.status] || 'bg-gray-100'}`}>
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
        <div className="mt-3 text-sm text-gray-500 flex justify-between">
          <div>စုစုပေါင်း: <strong className="text-green-700">{list.length}</strong> device</div>
          {selected.size > 0 && <div>ရွေးထား: <strong className="text-yellow-700">{selected.size}</strong></div>}
        </div>
      )}
    </div>
  )
}

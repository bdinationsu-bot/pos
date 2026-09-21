import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

export async function exportDevicesToExcel() {
  const { data, error } = await supabase.from('devices').select('*').order('id')
  if (error) throw error

  const rows = (data ?? []).map(d => ({
    IMEI: d.imei ?? '',
    Serial: d.serial ?? '',
    Model: d.model ?? '',
    Storage: d.storage ?? '',
    Color: d.color ?? '',
    Battery: d.battery_health ?? '',
    Cycle: d.cycle_count ?? '',
    Grade: d.grade ?? '',
    Cost: d.cost_price ?? 0,
    Sale: d.sale_price ?? 0,
    Status: d.status ?? '',
    Created: d.created_at ? new Date(d.created_at).toLocaleDateString() : ''
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Devices')
  XLSX.writeFile(wb, `devices-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function importDevicesFromExcel(file: File) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  if (!rows.length) throw new Error('Excel ထဲမှာ data မတွေ့ပါ')

  const validGrades = ['A', 'B', 'C', 'D']
  const validStatus = ['in_stock', 'reserved', 'sold', 'trade_in', 'repair', 'returned', 'defective', 'parts']

  const devices = rows.map(r => {
    const grade = String(r.Grade || r.grade || 'A').trim().toUpperCase()
    const status = String(r.Status || r.status || 'in_stock').trim().toLowerCase()
    return {
      imei: String(r.IMEI || r.imei || '').trim() || null,
      serial: String(r.Serial || r.serial || '').trim() || null,
      model: String(r.Model || r.model || '').trim(),
      storage: String(r.Storage || r.storage || '').trim() || null,
      color: String(r.Color || r.color || '').trim() || null,
      battery_health: Number(r.Battery || r.battery_health) || null,
      cycle_count: Number(r.Cycle || r.cycle_count) || null,
      grade: (validGrades.includes(grade) ? grade : 'A') as any,
      cost_price: Number(r.Cost || r.cost_price) || 0,
      sale_price: Number(r.Sale || r.sale_price) || 0,
      status: (validStatus.includes(status) ? status : 'in_stock') as any
    }
  }).filter(d => d.model)

  if (!devices.length) throw new Error('Model column ဗလာ ဖြစ်နေတယ်')

  const { error } = await supabase.from('devices').insert(devices)
  if (error) throw error
  return devices.length
}

export function downloadTemplate() {
  const rows = [{
    IMEI: '356789012345678',
    Serial: 'F17X001',
    Model: 'iPhone 13 Pro',
    Storage: '128GB',
    Color: 'Sierra Blue',
    Battery: 92,
    Cycle: 245,
    Grade: 'A',
    Cost: 900000,
    Sale: 1150000,
    Status: 'in_stock'
  }]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, 'device-import-template.xlsx')
}

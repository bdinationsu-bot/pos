import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

// Helper: safely parse integer
// Excel က 100% ကို 1 အဖြစ် သိမ်းထားတယ်
// 1 → 100, 0.92 → 92, 92 → 92, "92%" → 92
function toInt(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const s = String(v).replace('%', '').trim()
  const n = Number(s)
  if (isNaN(n)) return null
  // 0 < n <= 1 → decimal (Excel %) → × 100
  if (n > 0 && n <= 1) return Math.round(n * 100)
  return Math.round(n)
}

export async function exportDevicesToExcel() {
  const { data, error } = await supabase
    .from('devices')
    .select('*, supplier:supplier_id(name)')
    .order('id')
  if (error) throw error

  const rows = (data ?? []).map(d => ({
    IMEI: d.imei ?? '',
    Model: d.model ?? '',
    Storage: d.storage ?? '',
    Color: d.color ?? '',
    Region: d.region ?? '',
    Battery: d.battery_health ?? '',
    Cycle: d.cycle_count ?? '',
    Grade: d.grade ?? '',
    Cost: d.cost_price ?? 0,
    Sale: d.sale_price ?? 0,
    Status: d.status ?? '',
    Supplier: d.supplier?.name ?? '',
    PurchaseDate: d.purchase_date ?? '',
    Warranty: d.warranty_days ?? 0
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 14 },
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    { wch: 12 }, { wch: 10 }
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

  const { data: suppliers } = await supabase.from('suppliers').select('id, name')
  const supplierMap = new Map<string, number>()
  ;(suppliers ?? []).forEach(s => supplierMap.set(s.name.toLowerCase(), s.id))

  const devices = rows.map(r => {
    const grade = String(r.Grade || r.grade || 'A').trim().toUpperCase()
    const status = String(r.Status || r.status || 'in_stock').trim().toLowerCase()
    const supplierName = String(r.Supplier || r.supplier || '').trim()
    const purchaseDate = String(r.PurchaseDate || r.purchase_date || '').trim() || null

    return {
      imei: String(r.IMEI || r.imei || '').trim(),
      model: String(r.Model || r.model || '').trim(),
      storage: String(r.Storage || r.storage || '').trim() || null,
      color: String(r.Color || r.color || '').trim() || null,
      region: String(r.Region || r.region || '').trim() || null,
      battery_health: toInt(r.Battery || r.battery_health),
      cycle_count: toInt(r.Cycle || r.cycle_count),
      grade: (validGrades.includes(grade) ? grade : 'A') as any,
      cost_price: Math.round(Number(r.Cost || r.cost_price) || 0),
      sale_price: Math.round(Number(r.Sale || r.sale_price) || 0),
      status: (validStatus.includes(status) ? status : 'in_stock') as any,
      supplier_id: supplierName ? (supplierMap.get(supplierName.toLowerCase()) || null) : null,
      purchase_date: purchaseDate && /^\d{4}-\d{2}-\d{2}/.test(purchaseDate) ? purchaseDate : null,
      warranty_days: toInt(r.Warranty || r.warranty_days) || 0
    }
  }).filter(d => d.model && d.imei)

  if (!devices.length) throw new Error('Model + IMEI မဖြစ်မနေ ထည့်ပါ')

  const { error } = await supabase.from('devices').insert(devices)
  if (error) throw error
  return devices.length
}

export function downloadTemplate() {
  const rows = [{
    IMEI: '356789012345678',
    Model: 'iPhone 13 Pro',
    Storage: '128GB',
    Color: 'Sierra Blue',
    Region: 'LL/A',
    Battery: 92,
    Cycle: 245,
    Grade: 'A',
    Cost: 900000,
    Sale: 1150000,
    Status: 'in_stock',
    Supplier: '',
    PurchaseDate: '2026-09-21',
    Warranty: 90
  }]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template')
  XLSX.writeFile(wb, 'device-import-template.xlsx')
}

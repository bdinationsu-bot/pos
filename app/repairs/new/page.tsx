'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ERROR_TYPES = [
  { key: 'error_lcd', label: 'LCD / Display', icon: '📱' },
  { key: 'error_battery', label: 'Battery', icon: '🔋' },
  { key: 'error_camera', label: 'Camera', icon: '📷' },
  { key: 'error_body', label: 'Body / Casing', icon: '📦' },
  { key: 'error_back_glass', label: 'Back Glass', icon: '🔙' },
  { key: 'error_glass', label: 'Glass', icon: '🔷' }
]

export default function NewRepair() {
  const router = useRouter()
  const [devices, setDevices] = useState<any[]>([])
  const [deviceSearch, setDeviceSearch] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<any>(null)
  const [showDeviceList, setShowDeviceList] = useState(false)

  const [f, setF] = useState({
    customer_name: '', customer_phone: '',
    imei: '', model: '', storage: '', color: '',
    passcode: '', accessories: '',
    issue: '', estimated_cost: 0,
    note: '',
    error_lcd: false,
    error_battery: false,
    error_camera: false,
    error_body: false,
    error_back_glass: false,
    error_glass: false,
    error_other: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('devices')
        .select('id, imei, serial, model, storage, color')
        .order('model')
        .limit(500)
      setDevices(data ?? [])
    })()
  }, [])

  function pickDevice(d: any) {
    setSelectedDevice(d)
    setF(prev => ({
      ...prev,
      imei: d.imei || '',
      model: d.model || '',
      storage: d.storage || '',
      color: d.color || ''
    }))
    setShowDeviceList(false)
    setDeviceSearch('')
  }

  function clearDevice() {
    setSelectedDevice(null)
    setF(prev => ({ ...prev, imei: '', model: '', storage: '', color: '' }))
  }

  const filteredDevices = devices.filter(d => {
    if (!deviceSearch) return true
    const q = deviceSearch.toLowerCase()
    return (
      d.imei?.toLowerCase().includes(q) ||
      d.serial?.toLowerCase().includes(q) ||
      d.model?.toLowerCase().includes(q)
    )
  })

  async function save() {
    if (!f.issue) return alert('ပြဿနာ ဖော်ပြပါ')
    if (!f.model) return alert('စက် Model ရွေးပါ (သို့) ရိုက်ထည့်ပါ')

    const hasError = ERROR_TYPES.some(e => (f as any)[e.key])
    if (!hasError && !f.error_other) {
      return alert('ချို့ယွင်းချက် အနည်းဆုံး တစ်ခု ရွေးပါ')
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('create_repair', {
      p_customer_name: f.customer_name,
      p_customer_phone: f.customer_phone,
      p_imei: f.imei || null,
      p_serial: null,
      p_model: f.model,
      p_storage: f.storage,
      p_color: f.color,
      p_passcode: f.passcode,
      p_accessories: f.accessories,
      p_issue: f.issue,
      p_estimated_cost: f.estimated_cost,
      p_technician_id: null,
      p_note: f.note
    })

    if (error) { setSaving(false); return alert('Error: ' + error.message) }

    await supabase.from('repairs').update({
      error_lcd: f.error_lcd,
      error_battery: f.error_battery,
      error_camera: f.error_camera,
      error_body: f.error_body,
      error_back_glass: f.error_back_glass,
      error_glass: f.error_glass,
      error_other: f.error_other,
      device_id: selectedDevice?.id || null
    }).eq('id', data)

    setSaving(false)
    alert('✅ Service Ticket ဖွင့်ပြီးပါပြီ')
    router.push(`/repairs/${data}`)
  }

  const input = (key: keyof typeof f, ph: string, type = 'text') => (
    <input type={type} value={f[key] as any}
      onChange={e => setF({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value })}
      placeholder={ph}
      className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
  )

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4 text-green-800">🔧 Service Ticket အသစ်</h1>

      {/* Customer */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">👤 ဖောက်သည်</h2>
        <div className="grid grid-cols-2 gap-3">
          {input('customer_name', 'နာမည်')}
          {input('customer_phone', 'ဖုန်း')}
        </div>
      </div>

      {/* Device — Dropdown Selector */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-green-700">📱 စက် အချက်အလက်</h2>

        {!selectedDevice ? (
          <div className="relative">
            <label className="block text-sm mb-1 font-medium">စက် ရွေးပါ (Model / IMEI / Serial)</label>
            <input
              value={deviceSearch}
              onChange={e => { setDeviceSearch(e.target.value); setShowDeviceList(true) }}
              onFocus={() => setShowDeviceList(true)}
              placeholder="🔍 Model / IMEI / Serial ရှာ..."
              className="border-2 border-green-500 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              autoComplete="off"
            />

            {showDeviceList && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-500 rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
                <div className="p-2 bg-green-50 text-xs text-green-800 font-medium border-b sticky top-0">
                  🔍 {filteredDevices.length} လုံး — ရွေးပါ
                </div>
                {filteredDevices.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    စက် မတွေ့ပါ — Manual ဖြည့်ပါ
                  </div>
                ) : (
                  filteredDevices.slice(0, 50).map(d => (
                    <button
                      key={d.id}
                      onClick={() => pickDevice(d)}
                      className="w-full text-left p-3 border-b hover:bg-green-50 transition"
                    >
                      <div className="font-bold text-green-800">
                        {d.model} {d.storage} {d.color && `• ${d.color}`}
                      </div>
                      <div className="text-xs font-mono text-gray-600 mt-0.5">
                        IMEI: {d.imei || '-'}
                        {d.serial && ` • Serial: ${d.serial}`}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-700">
              💡 စက် စာရင်းထဲ မရှိရင် — အောက်မှာ Manual ဖြည့်ပါ
            </div>

            {/* Manual entry fallback */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              {input('imei', 'IMEI (Manual)')}
              {input('model', 'Model * (Manual)')}
              {input('storage', 'Storage')}
              {input('color', 'Color')}
              {input('passcode', 'Passcode / Pattern')}
              {input('accessories', 'ပါလာတဲ့ အပိုပစ္စည်း')}
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-green-800 text-lg">
                  {selectedDevice.model} {selectedDevice.storage} {selectedDevice.color && `• ${selectedDevice.color}`}
                </div>
                {selectedDevice.imei && (
                  <div className="text-sm font-mono text-gray-700 mt-1">IMEI: {selectedDevice.imei}</div>
                )}
                {selectedDevice.serial && (
                  <div className="text-sm font-mono text-gray-700 mt-0.5">Serial: {selectedDevice.serial}</div>
                )}
              </div>
              <button onClick={clearDevice} className="text-red-600 text-sm hover:underline font-medium">
                🔄 ပြန် ရွေး
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-green-300">
              <div>
                <label className="block text-sm mb-1 font-medium">Passcode / Pattern</label>
                <input value={f.passcode} onChange={e => setF({ ...f, passcode: e.target.value })}
                  className="border p-2 rounded w-full" placeholder="optional" />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">ပါလာတဲ့ အပိုပစ္စည်း</label>
                <input value={f.accessories} onChange={e => setF({ ...f, accessories: e.target.value })}
                  className="border p-2 rounded w-full" placeholder="charger, case..." />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Types — Checkboxes */}
      <div className="bg-white rounded shadow p-4 mb-4 border-2 border-orange-300">
        <h2 className="font-bold mb-3 text-orange-700">🔧 ချို့ယွင်းချက် * (Error Types)</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {ERROR_TYPES.map(e => {
            const checked = (f as any)[e.key]
            return (
              <label
                key={e.key}
                className={`flex items-center gap-3 border-2 rounded-lg p-3 cursor-pointer transition ${
                  checked ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-white hover:border-orange-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={ev => setF({ ...f, [e.key]: ev.target.checked })}
                  className="w-5 h-5 accent-orange-500"
                />
                <span className="text-xl">{e.icon}</span>
                <span className={`text-sm font-bold ${checked ? 'text-orange-700' : 'text-gray-700'}`}>
                  {e.label}
                </span>
              </label>
            )
          })}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">အခြား ချို့ယွင်းချက်</label>
          <input
            value={f.error_other}
            onChange={e => setF({ ...f, error_other: e.target.value })}
            placeholder="ဥပမာ — WiFi မရ၊ Speaker အက်သံ၊ Mic မလုပ်"
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      {/* Issue */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-bold mb-3 text-red-700">⚠️ ပြဿနာ အသေးစိတ် *</h2>
        <textarea
          value={f.issue}
          onChange={e => setF({ ...f, issue: e.target.value })}
          placeholder="ဖောက်သည် ပြောတဲ့ ပြဿနာ အသေးစိတ်..."
          className="border p-3 rounded w-full"
          rows={4}
        />
      </div>

      {/* Estimate + Note */}
      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium">ခန့်မှန်း ကုန်ကျစရိတ် (Ks)</label>
            <input
              type="number"
              value={f.estimated_cost || ''}
              onChange={e => setF({ ...f, estimated_cost: +e.target.value || 0 })}
              className="border p-2 rounded w-full text-lg font-bold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">မှတ်ချက်</label>
            <input
              value={f.note}
              onChange={e => setF({ ...f, note: e.target.value })}
              className="border p-2 rounded w-full"
              placeholder="optional"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-medium disabled:opacity-50">
          {saving ? 'သိမ်းနေတယ်...' : '✅ Service Ticket ဖွင့်'}
        </button>
        <button onClick={() => router.push('/repairs')}
          className="bg-gray-200 px-8 py-3 rounded font-medium">ပယ်ဖျက်</button>
      </div>
    </div>
  )
}

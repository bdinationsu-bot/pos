'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'

export default function SettingsPage() {
  const { lang, setLang, t } = useLang()
  const [s, setS] = useState<any>({
    shop_name: '', shop_phone: '', shop_address: '', logo_url: '',
    warranty_policy: '', footer_text: '', footer_text_2: '', invoice_note: ''
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('general')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
      if (data) setS(data)
    })()
  }, [])

  async function uploadLogo(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) { setUploading(false); return alert(error.message) }
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    setS((prev: any) => ({ ...prev, logo_url: data.publicUrl }))
    setUploading(false)
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('settings').upsert({
      id: 1,
      shop_name: s.shop_name || '',
      shop_phone: s.shop_phone || '',
      shop_address: s.shop_address || '',
      logo_url: s.logo_url || '',
      warranty_policy: s.warranty_policy || '',
      footer_text: s.footer_text || '',
      footer_text_2: s.footer_text_2 || '',
      invoice_note: s.invoice_note || ''
    })
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    alert('✅ သိမ်းပြီးပါပြီ')
    window.location.reload()
  }

  const tabs = [
    { code: 'general', name: '🏪 ဆိုင် အချက်အလက်' },
    { code: 'invoice', name: '🧾 Invoice Customize' },
    { code: 'warranty', name: '🛡️ Warranty Policy' },
    { code: 'footer', name: '📝 Footer' }
  ]

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4 text-green-800">{t('settings.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map(x => (
          <button key={x.code} onClick={() => setTab(x.code)}
            className={`px-4 py-2 rounded font-medium text-sm transition ${
              tab === x.code ? 'bg-green-600 text-white' : 'bg-white border hover:border-green-500'
            }`}>
            {x.name}
          </button>
        ))}
      </div>

      {/* GENERAL TAB */}
      {tab === 'general' && (
        <div className="space-y-4">
          <div className="bg-white rounded shadow p-5">
            <label className="block text-sm font-medium mb-2">{t('settings.language')}</label>
            <div className="flex gap-2">
              <button onClick={() => setLang('mm')} className={`px-4 py-2 rounded font-medium ${lang === 'mm' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>🇲🇲 မြန်မာ</button>
              <button onClick={() => setLang('en')} className={`px-4 py-2 rounded font-medium ${lang === 'en' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>🇬🇧 English</button>
            </div>
          </div>

          <div className="bg-white rounded shadow p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {s.logo_url ? (
                  <img src={s.logo_url} className="w-20 h-20 rounded-lg object-cover border bg-white" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No logo</div>
                )}
                <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded cursor-pointer">
                  {uploading ? '...' : 'Logo တင်'}
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ဆိုင်နာမည်</label>
              <input value={s.shop_name || ''} onChange={e => setS({ ...s, shop_name: e.target.value })} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ဖုန်း</label>
              <input value={s.shop_phone || ''} onChange={e => setS({ ...s, shop_phone: e.target.value })} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">လိပ်စာ</label>
              <textarea value={s.shop_address || ''} onChange={e => setS({ ...s, shop_address: e.target.value })} className="border p-2 rounded w-full" rows={2} />
            </div>
          </div>
        </div>
      )}

      {/* INVOICE NOTE TAB */}
      {tab === 'invoice' && (
        <div className="bg-white rounded shadow p-5">
          <h2 className="font-bold text-green-800 mb-1">📌 Invoice အောက်ခြေ မှတ်ချက်</h2>
          <p className="text-xs text-gray-500 mb-3">
            Invoice အောက်ဆုံး (Warranty အပေါ်) မှာ ပေါ်မယ်။ ဥပမာ — "ပစ္စည်းပြန်အမ်းရန် 3 ရက်အတွင်း" စသဖြင့်။
          </p>
          <textarea
            value={s.invoice_note || ''}
            onChange={e => setS({ ...s, invoice_note: e.target.value })}
            className="border p-3 rounded w-full font-mono text-sm"
            rows={4}
            placeholder="ဥပမာ — ပစ္စည်း ပြန်အမ်းရန် 3 ရက် အတွင်း"
          />
          {s.invoice_note && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3 text-xs">
              <div className="font-medium text-gray-700 mb-1">📋 Preview:</div>
              <div className="whitespace-pre-wrap text-gray-600">{s.invoice_note}</div>
            </div>
          )}
        </div>
      )}

      {/* WARRANTY TAB */}
      {tab === 'warranty' && (
        <div className="bg-white rounded shadow p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🛡️</span>
            <h2 className="font-bold text-green-800">Warranty Policy</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            ဒီစာသားက Invoice, PDF, Print အားလုံးမှာ ပေါ်မယ်။ Line တစ်ခုချင်း ခွဲရန် Enter နှိပ်။
          </p>
          <textarea
            value={s.warranty_policy || ''}
            onChange={e => setS({ ...s, warranty_policy: e.target.value })}
            className="border p-3 rounded w-full font-mono text-sm"
            rows={6}
            placeholder="• 7 days warranty&#10;• Physical damage not covered&#10;• Bring invoice"
          />

          <div className="mt-3 bg-gray-50 border rounded p-3 text-xs">
            <div className="font-medium text-gray-700 mb-1">📋 Preview:</div>
            <div className="whitespace-pre-wrap text-gray-600">{s.warranty_policy || '(empty)'}</div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-700">
            <strong>💡 ဥပမာ:</strong>
            <pre className="mt-2 font-mono text-xs whitespace-pre-wrap">{`• ရောင်းပြီး 7 ရက် အတွင်း ချို့ယွင်းမှုရှိပါက လဲလှယ်ပေးပါမည်
• လူကြောင့်ဖြစ်သော ပျက်စီးမှု၊ ရေစိုခြင်း အာမခံမပါ
• အာမခံအသုံးပြုရန် Invoice ယူလာပါ`}</pre>
          </div>
        </div>
      )}

      {/* FOOTER TAB */}
      {tab === 'footer' && (
        <div className="bg-white rounded shadow p-5 space-y-4">
          <div>
            <h2 className="font-bold text-green-800 mb-1">📝 Footer Line 1 (အဓိက စာသား)</h2>
            <p className="text-xs text-gray-500 mb-2">
              Invoice အောက်ဆုံး မှာ အစိမ်းရောင် ဖြင့် ပေါ်မယ်
            </p>
            <input
              value={s.footer_text || ''}
              onChange={e => setS({ ...s, footer_text: e.target.value })}
              className="border p-3 rounded w-full text-center font-bold text-green-700"
              placeholder="🙏 ကျေးဇူးတင်ပါသည် / Thank You"
            />
          </div>

          <div>
            <h2 className="font-bold text-green-800 mb-1">📝 Footer Line 2 (ရက်စွဲ / ဖုန်း / လိပ်စာ)</h2>
            <p className="text-xs text-gray-500 mb-2">
              Footer ရဲ့ အောက်ဆုံး မှာ မြမြလေး ပေါ်မယ်
            </p>
            <input
              value={s.footer_text_2 || ''}
              onChange={e => setS({ ...s, footer_text_2: e.target.value })}
              className="border p-3 rounded w-full text-center text-sm text-gray-500"
              placeholder="ဥပမာ — 09-xxxxxxx / shop@email.com / address"
            />
          </div>

          {/* Live Preview */}
          <div className="mt-4 p-4 bg-white border-2 border-dashed border-green-500 rounded">
            <div className="text-xs text-gray-500 mb-2 text-center">📋 Footer Preview</div>
            <div className="text-center py-4 border-t-2 border-green-500">
              <div className="font-bold text-green-700 text-lg">
                {s.footer_text || '🙏 ကျေးဇူးတင်ပါသည် / Thank You'}
              </div>
              {s.footer_text_2 && (
                <div className="text-xs text-gray-500 mt-2">{s.footer_text_2}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <button onClick={save} disabled={saving}
        className="bg-green-600 hover:bg-green-700 text-white w-full py-3 rounded font-medium disabled:opacity-50 mt-4 sticky bottom-4 shadow-lg">
        {saving ? '...' : '💾 သိမ်း'}
      </button>
    </div>
  )
}

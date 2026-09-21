'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'

export default function SettingsPage() {
  const { lang, setLang, t } = useLang()
  const [s, setS] = useState<any>({ shop_name: '', shop_phone: '', shop_address: '', logo_url: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

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
      logo_url: s.logo_url || ''
    })
    setSaving(false)
    if (error) return alert('Error: ' + error.message)
    alert('✅ သိမ်းပြီးပါပြီ')
    window.location.reload()
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4 text-green-800">{t('settings.title')}</h1>

      <div className="bg-white rounded shadow p-5 mb-4">
        <label className="block text-sm font-medium mb-2">{t('settings.language')}</label>
        <div className="flex gap-2">
          <button onClick={() => setLang('mm')} className={`px-4 py-2 rounded font-medium ${lang === 'mm' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>🇲🇲 မြန်မာ</button>
          <button onClick={() => setLang('en')} className={`px-4 py-2 rounded font-medium ${lang === 'en' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>🇬🇧 English</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t('settings.logo')}</label>
          <div className="flex items-center gap-4">
            {s.logo_url ? (
              <img src={s.logo_url} className="w-20 h-20 rounded-lg object-cover border bg-white" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No logo</div>
            )}
            <label className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded cursor-pointer">
              {uploading ? '...' : t('settings.upload_logo')}
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('settings.shop_name')}</label>
          <input value={s.shop_name || ''} onChange={e => setS({ ...s, shop_name: e.target.value })} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('settings.shop_phone')}</label>
          <input value={s.shop_phone || ''} onChange={e => setS({ ...s, shop_phone: e.target.value })} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('settings.shop_address')}</label>
          <textarea value={s.shop_address || ''} onChange={e => setS({ ...s, shop_address: e.target.value })} className="border p-2 rounded w-full" rows={2} />
        </div>

        <button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded font-medium disabled:opacity-50">
          {saving ? '...' : t('common.save')}
        </button>
      </div>
    </div>
  )
}

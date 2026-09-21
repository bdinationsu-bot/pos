import { supabase } from './supabase'

export function printHTML(html: string, title = 'Print') {
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) return alert('Popup blocker ဖွင့်ပါ')
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <meta charset="utf-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, 'Padauk', 'Myanmar Text', sans-serif; color: #111; }
      @media print {
        @page { margin: 0; }
        body { margin: 0; }
      }
    </style>
  </head><body>${html}</body></html>`)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
  }, 500)
}

export async function getShopInfo() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  return data || { shop_name: 'POS', shop_phone: '', shop_address: '', logo_url: '' }
}

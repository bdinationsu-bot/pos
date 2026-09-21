'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'

type Menu = {
  href: string
  labelKey: string
  icon: string
  roles: string[]
}

const menus: Menu[] = [
  { href: '/', labelKey: 'menu.dashboard', icon: '🏠', roles: ['owner', 'manager', 'cashier', 'accountant', 'customer_service'] },
  { href: '/pos', labelKey: 'menu.pos', icon: '🛒', roles: ['owner', 'manager', 'cashier'] },
  { href: '/sales', labelKey: 'menu.sales', icon: '🧾', roles: ['owner', 'manager', 'cashier', 'accountant'] },
  { href: '/inventory', labelKey: 'menu.inventory', icon: '📱', roles: ['owner', 'manager', 'cashier', 'customer_service'] },
  { href: '/accessories', labelKey: 'menu.accessories', icon: '📦', roles: ['owner', 'manager', 'cashier'] },
  { href: '/tradein/new', labelKey: 'menu.tradein', icon: '🔄', roles: ['owner', 'manager', 'cashier'] },
  { href: '/repairs', labelKey: 'menu.repairs', icon: '🔧', roles: ['owner', 'manager', 'customer_service'] },
  { href: '/suppliers', labelKey: 'menu.suppliers', icon: '🏭', roles: ['owner', 'manager', 'accountant'] },
  { href: '/purchases', labelKey: 'menu.purchases', icon: '🛍️', roles: ['owner', 'manager', 'accountant'] },
  { href: '/accounting', labelKey: 'menu.accounting', icon: '📊', roles: ['owner', 'manager', 'accountant'] },
  { href: '/staff', labelKey: 'menu.staff', icon: '👥', roles: ['owner', 'manager'] },
  { href: '/expense-codes', labelKey: 'menu.expense_codes', icon: '🏷️', roles: ['owner', 'manager', 'accountant'] },
  { href: '/users', labelKey: 'menu.users', icon: '👤', roles: ['owner'] },
  { href: '/settings', labelKey: 'menu.settings', icon: '⚙️', roles: ['owner', 'manager'] },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const { lang, setLang, t } = useLang()
  const [logo, setLogo] = useState<string | null>(null)
  const [name, setName] = useState('POS')
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (auth?.user) {
        setUser(auth.user)
        const { data: prof } = await supabase.from('profiles').select('role, full_name').eq('id', auth.user.id).maybeSingle()
        if (prof?.role) setRole(prof.role)
      }
      const { data } = await supabase.from('settings').select('logo_url, shop_name').eq('id', 1).maybeSingle()
      if (data?.logo_url) setLogo(data.logo_url)
      if (data?.shop_name) setName(data.shop_name)
    })()
  }, [])

  async function logout() {
    if (!confirm('Logout လုပ်မှာ သေချာလား?')) return
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleMenus = menus.filter(m => m.roles.includes(role))

  return (
    <aside className="w-60 bg-green-700 text-white min-h-screen p-3 flex flex-col">
      <div className="flex items-center gap-2 mb-4 px-2 py-3">
        {logo ? (
          <img src={logo} alt="Logo" className="w-10 h-10 rounded object-cover bg-white" />
        ) : (
          <div className="w-10 h-10 rounded bg-white text-green-700 font-bold flex items-center justify-center">P</div>
        )}
        <div className="font-bold text-sm leading-tight">{name}</div>
      </div>

      <div className="mb-4 bg-green-800 rounded-lg p-1 flex gap-1">
        <button onClick={() => setLang('mm')} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${lang === 'mm' ? 'bg-white text-green-700' : 'text-green-200 hover:bg-green-700'}`}>
          🇲🇲 မြန်မာ
        </button>
        <button onClick={() => setLang('en')} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${lang === 'en' ? 'bg-white text-green-700' : 'text-green-200 hover:bg-green-700'}`}>
          🇬🇧 English
        </button>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        {visibleMenus.map(m => {
          const active = m.href === '/' ? path === '/' : (path === m.href || path.startsWith('/' + m.href.split('/')[1]))
          return (
            <Link key={m.href} href={m.href}
              className={`flex items-center gap-3 px-3 py-2 rounded transition text-sm ${active ? 'bg-white text-green-700 font-semibold' : 'hover:bg-green-600'}`}>
              <span>{m.icon}</span>
              <span>{t(m.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-green-600 pt-3 mt-3">
        <div className="text-xs text-green-200 px-2 mb-1 truncate">{user?.email}</div>
        <div className="text-xs text-white font-medium px-2 mb-2">{t('role.' + role)}</div>
        <button onClick={logout} className="w-full bg-green-800 hover:bg-green-900 text-white px-3 py-2 rounded text-sm">
          🚪 {t('auth.logout')}
        </button>
      </div>
    </aside>
  )
}

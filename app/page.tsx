'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({
    devices_in_stock: 0,
    stock_value: 0,
    today_sales: 0,
    today_profit: 0,
    month_sales: 0,
    month_profit: 0,
    supplier_payable: 0,
    low_stock_accessories: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10)
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

      // Devices in stock
      const { data: devices } = await supabase.from('devices').select('cost_price').eq('status', 'in_stock')
      const inStock = devices?.length ?? 0
      const stockVal = (devices ?? []).reduce((s, d) => s + Number(d.cost_price), 0)

      // Today sales
      const { data: todaySales } = await supabase.from('sales').select('*')
        .gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`)
      const todayTotal = (todaySales ?? []).reduce((s, x) => s + Number(x.total), 0)

      const todayIds = (todaySales ?? []).map(s => s.id)
      let todayProfit = 0
      if (todayIds.length) {
        const { data: items } = await supabase.from('sale_items').select('*').in('sale_id', todayIds)
        const cogs = (items ?? []).reduce((s, x) => s + Number(x.cost) * x.qty, 0)
        todayProfit = todayTotal - cogs
      }

      // Month sales
      const { data: monthSales } = await supabase.from('sales').select('*')
        .gte('created_at', `${firstOfMonth}T00:00:00`)
      const monthTotal = (monthSales ?? []).reduce((s, x) => s + Number(x.total), 0)
      const monthIds = (monthSales ?? []).map(s => s.id)
      let monthProfit = 0
      if (monthIds.length) {
        const { data: items } = await supabase.from('sale_items').select('*').in('sale_id', monthIds)
        const cogs = (items ?? []).reduce((s, x) => s + Number(x.cost) * x.qty, 0)
        monthProfit = monthTotal - cogs
      }

      // Supplier payable
      const { data: purchases } = await supabase.from('purchases').select('balance')
      const payable = (purchases ?? []).reduce((s, x) => s + Number(x.balance), 0)

      // Low stock accessories
      const { data: accs } = await supabase.from('accessories').select('qty').lte('qty', 5)
      const lowStock = accs?.length ?? 0

      setStats({
        devices_in_stock: inStock,
        stock_value: stockVal,
        today_sales: todayTotal,
        today_profit: todayProfit,
        month_sales: monthTotal,
        month_profit: monthProfit,
        supplier_payable: payable,
        low_stock_accessories: lowStock
      })
      setLoading(false)
    })()
  }, [])

  const cards = [
    { label: 'လက်ကျန် Devices', value: stats.devices_in_stock, suffix: 'လုံး', color: 'border-green-500', icon: '📱', href: '/inventory' },
    { label: 'Stock တန်ဖိုး', value: stats.stock_value, suffix: 'Ks', color: 'border-blue-500', icon: '💰', href: '/inventory' },
    { label: 'ဒီနေ့ အရောင်း', value: stats.today_sales, suffix: 'Ks', color: 'border-orange-500', icon: '🛒', href: '/reports' },
    { label: 'ဒီနေ့ အမြတ်', value: stats.today_profit, suffix: 'Ks', color: 'border-green-600', icon: '📈', href: '/reports' },
    { label: 'ဒီလ အရောင်း', value: stats.month_sales, suffix: 'Ks', color: 'border-purple-500', icon: '📊', href: '/accounting' },
    { label: 'ဒီလ အမြတ်', value: stats.month_profit, suffix: 'Ks', color: 'border-teal-500', icon: '💵', href: '/accounting' },
    { label: 'Supplier ကျန်ငွေ', value: stats.supplier_payable, suffix: 'Ks', color: 'border-red-500', icon: '🏭', href: '/purchases' },
    { label: 'Accessory နည်း', value: stats.low_stock_accessories, suffix: 'မျိုး', color: 'border-yellow-500', icon: '⚠️', href: '/accessories' }
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-green-800">Dashboard</h1>

      {loading ? <p>စစ်နေတယ်...</p> : (
        <div className="grid grid-cols-4 gap-4">
          {cards.map(c => (
            <Link key={c.label} href={c.href} className={`bg-white rounded-lg shadow p-4 border-l-4 ${c.color} hover:shadow-lg transition`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">{c.label}</span>
                <span className="text-2xl">{c.icon}</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {c.value.toLocaleString()}
                <span className="text-sm text-gray-500 ml-1">{c.suffix}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-4 gap-3">
        <Link href="/pos" className="bg-green-600 text-white py-4 rounded-lg text-center font-medium hover:bg-green-700">
          🛒 POS အသစ်
        </Link>
        <Link href="/purchases/new" className="bg-blue-600 text-white py-4 rounded-lg text-center font-medium hover:bg-blue-700">
          🛍️ Purchase ဝယ်
        </Link>
        <Link href="/tradein/new" className="bg-yellow-600 text-white py-4 rounded-lg text-center font-medium hover:bg-yellow-700">
          🔄 Trade-in
        </Link>
        <Link href="/accounting" className="bg-purple-600 text-white py-4 rounded-lg text-center font-medium hover:bg-purple-700">
          📊 Accounting
        </Link>
      </div>
    </div>
  )
}

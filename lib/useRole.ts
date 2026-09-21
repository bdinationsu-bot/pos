'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useRole() {
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (auth?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', auth.user.id)
          .maybeSingle()
        setRole(data?.role || '')
      }
      setLoading(false)
    })()
  }, [])

  const isOwner = role === 'owner'
  const isManager = role === 'manager'
  const isAccountant = role === 'accountant'
  const isCashier = role === 'cashier'
  const isCustomerService = role === 'customer_service'

  // Profit ကို Owner + Accountant ပဲ မြင်ခွင့်
  const canSeeProfit = isOwner || isAccountant

  // Cost ကို Owner + Manager + Accountant ပဲ မြင်ခွင့်
  const canSeeCost = isOwner || isManager || isAccountant

  return {
    role,
    loading,
    isOwner,
    isManager,
    isAccountant,
    isCashier,
    isCustomerService,
    canSeeProfit,
    canSeeCost
  }
}

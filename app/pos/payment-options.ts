export type PaymentProvider = { code: string; name: string }
export type PaymentCategory = {
  code: string
  name: string
  icon: string
  color: string
  providers: PaymentProvider[]
}

export const PAYMENT_CATEGORIES: PaymentCategory[] = [
  { code: 'cash', name: 'Cash', icon: '💵', color: 'bg-green-600', providers: [] },
  {
    code: 'mmqr', name: 'MMQR Pay', icon: '📱', color: 'bg-blue-600',
    providers: [
      { code: 'kbzpay', name: 'KBZPay' },
      { code: 'wavepay', name: 'WavePay' },
      { code: 'ayapay', name: 'AYA Pay' },
      { code: 'cbpay', name: 'CB Pay' },
      { code: 'uabpay', name: 'UAB Pay' },
      { code: 'yomapay', name: 'Yoma Pay' },
      { code: 'okdollar', name: 'OK Dollar' },
      { code: 'mmqr_other', name: 'အခြား MMQR' }
    ]
  },
  {
    code: 'banking', name: 'Banking', icon: '🏦', color: 'bg-indigo-600',
    providers: [
      { code: 'kbz_bank', name: 'KBZ Bank' },
      { code: 'aya_bank', name: 'AYA Bank' },
      { code: 'cb_bank', name: 'CB Bank' },
      { code: 'uab_bank', name: 'UAB Bank' },
      { code: 'yoma_bank', name: 'Yoma Bank' },
      { code: 'agd_bank', name: 'AGD Bank' },
      { code: 'mab_bank', name: 'MAB Bank' },
      { code: 'cooperative_bank', name: 'Co-operative Bank' },
      { code: 'other_bank', name: 'အခြား ဘဏ်' }
    ]
  },
  { code: 'mpu', name: 'MPU Card', icon: '💳', color: 'bg-orange-600', providers: [] },
  { code: 'visa', name: 'VISA Card', icon: '💳', color: 'bg-red-600', providers: [] },
  { code: 'master', name: 'Master Card', icon: '💳', color: 'bg-purple-600', providers: [] },
  { code: 'installment', name: 'အရစ်ကျ', icon: '📅', color: 'bg-teal-600', providers: [] },
  { code: 'tradein', name: 'Trade-in', icon: '🔄', color: 'bg-yellow-600', providers: [] }
]

export const EXPENSE_CATEGORIES = [
  { code: 'rent', name: 'ဆိုင်ခ' },
  { code: 'salary', name: 'လစာ' },
  { code: 'internet', name: 'Internet' },
  { code: 'electricity', name: 'မီတာခ' },
  { code: 'water', name: 'ရေခ' },
  { code: 'parts', name: 'အပိုပစ္စည်း' },
  { code: 'transport', name: 'သွားလာ' },
  { code: 'marketing', name: 'ကြော်ငြာ' },
  { code: 'tax', name: 'အခွန်' },
  { code: 'repair', name: 'ပြုပြင်' },
  { code: 'other', name: 'အခြား' }
]

export function getMethodLabel(categoryCode: string, providerCode?: string) {
  const cat = PAYMENT_CATEGORIES.find(c => c.code === categoryCode)
  if (!cat) return categoryCode
  if (!providerCode) return cat.name
  const prov = cat.providers.find(p => p.code === providerCode)
  return prov ? `${cat.name} • ${prov.name}` : cat.name
}

export const EXPENSE_CATEGORIES = [
  { code: 'rent', name: 'ဆိုင်ခ', nameEn: 'Rent', icon: '🏠' },
  { code: 'salary', name: 'လစာ', nameEn: 'Salary', icon: '👥' },
  { code: 'internet', name: 'Internet', nameEn: 'Internet', icon: '🌐' },
  { code: 'electricity', name: 'မီတာခ', nameEn: 'Electricity', icon: '💡' },
  { code: 'water', name: 'ရေခ', nameEn: 'Water', icon: '💧' },
  { code: 'parts', name: 'အပိုပစ္စည်း', nameEn: 'Parts', icon: '🔧' },
  { code: 'transport', name: 'သွားလာ', nameEn: 'Transport', icon: '🚗' },
  { code: 'marketing', name: 'ကြော်ငြာ', nameEn: 'Marketing', icon: '📢' },
  { code: 'tax', name: 'အခွန်', nameEn: 'Tax', icon: '📋' },
  { code: 'repair', name: 'ပြုပြင်', nameEn: 'Repair', icon: '🛠️' },
  { code: 'supplies', name: 'ရုံးသုံး', nameEn: 'Supplies', icon: '📎' },
  { code: 'entertainment', name: 'ဧည့်ခံ', nameEn: 'Entertainment', icon: '🍽️' },
  { code: 'bank_fee', name: 'ဘဏ်အခကြေး', nameEn: 'Bank Fee', icon: '🏦' },
  { code: 'loss', name: 'ဆုံးရှုံးမှု', nameEn: 'Loss', icon: '⚠️' },
  { code: 'other', name: 'အခြား', nameEn: 'Other', icon: '📝' }
]

export const EXPENSE_METHODS = [
  { code: 'cash', name: 'ငွေသား', nameEn: 'Cash' },
  { code: 'kbzpay', name: 'KBZPay', nameEn: 'KBZPay' },
  { code: 'wavepay', name: 'WavePay', nameEn: 'WavePay' },
  { code: 'bank', name: 'ဘဏ်', nameEn: 'Bank' },
  { code: 'other', name: 'အခြား', nameEn: 'Other' }
]

export const FOC_REASONS = [
  { code: 'gift', name: 'လက်ဆောင်', nameEn: 'Gift' },
  { code: 'promo', name: 'ပရိုမိုးရှင်း', nameEn: 'Promotion' },
  { code: 'warranty', name: 'အာမခံ', nameEn: 'Warranty Replacement' },
  { code: 'compensation', name: 'လျော်ကြေး', nameEn: 'Compensation' },
  { code: 'sample', name: 'နမူနာ', nameEn: 'Sample' },
  { code: 'other', name: 'အခြား', nameEn: 'Other' }
]

export function getCategoryName(code: string, lang = 'mm') {
  const c = EXPENSE_CATEGORIES.find(x => x.code === code)
  if (!c) return code
  return lang === 'mm' ? c.name : c.nameEn
}

export function getMethodName(code: string, lang = 'mm') {
  const m = EXPENSE_METHODS.find(x => x.code === code)
  if (!m) return code
  return lang === 'mm' ? m.name : m.nameEn
}

export function getFocReason(code: string, lang = 'mm') {
  const r = FOC_REASONS.find(x => x.code === code)
  if (!r) return code
  return lang === 'mm' ? r.name : r.nameEn
}

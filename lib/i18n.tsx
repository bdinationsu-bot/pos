'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Lang = 'en' | 'mm'

const translations: Record<string, { en: string; mm: string }> = {
  'app.name': { en: 'POS', mm: 'POS' },
  'common.save': { en: 'Save', mm: 'သိမ်း' },
  'common.cancel': { en: 'Cancel', mm: 'ပယ်ဖျက်' },
  'common.delete': { en: 'Delete', mm: 'ဖျက်' },
  'common.edit': { en: 'Edit', mm: 'ပြင်' },
  'common.search': { en: 'Search', mm: 'ရှာ' },
  'common.loading': { en: 'Loading...', mm: 'စစ်နေတယ်...' },
  'common.close': { en: 'Close', mm: 'ပိတ်' },
  'common.back': { en: 'Back', mm: 'ပြန်' },
  'common.add': { en: 'Add', mm: 'ထည့်' },
  'common.new': { en: 'New', mm: 'အသစ်' },
  'common.total': { en: 'Total', mm: 'စုစုပေါင်း' },
  'common.status': { en: 'Status', mm: 'အခြေအနေ' },
  'common.date': { en: 'Date', mm: 'ရက်စွဲ' },
  'common.note': { en: 'Note', mm: 'မှတ်ချက်' },
  'common.name': { en: 'Name', mm: 'နာမည်' },
  'common.phone': { en: 'Phone', mm: 'ဖုန်း' },
  'common.address': { en: 'Address', mm: 'လိပ်စာ' },
  'common.amount': { en: 'Amount', mm: 'ပမာဏ' },
  'common.price': { en: 'Price', mm: 'ဈေးနှုန်း' },
  'common.qty': { en: 'Qty', mm: 'အရေအတွက်' },
  'common.active': { en: 'Active', mm: 'အလုပ်လုပ်' },
  'common.inactive': { en: 'Inactive', mm: 'ရပ်' },
  'common.all': { en: 'All', mm: 'အားလုံး' },
  'common.no_data': { en: 'No data', mm: 'မရှိပါ' },
  'common.optional': { en: 'optional', mm: '(မထည့်လည်းရ)' },
  'common.actions': { en: 'Actions', mm: 'လုပ်ဆောင်ချက်' },
  'common.print': { en: 'Print', mm: 'ပရင့်' },

  'menu.pos': { en: 'POS', mm: 'အရောင်း' },
  'menu.sales': { en: 'Sales History', mm: 'အရောင်းမှတ်တမ်း' },
  'menu.inventory': { en: 'Inventory', mm: 'လက်ကျန် ပစ္စည်း' },
  'menu.accessories': { en: 'Accessories', mm: 'ဆက်စပ်ပစ္စည်း' },
  'menu.tradein': { en: 'Trade-in', mm: 'အဟောင်းလဲ' },
  'menu.repairs': { en: 'Repair Desk', mm: 'ပြုပြင်ဌာန' },
  'menu.suppliers': { en: 'Suppliers', mm: 'ကုန်သွင်းသူများ' },
  'menu.purchases': { en: 'Purchases', mm: 'ဝယ်ယူမှု' },
  'menu.accounting': { en: 'Accounting', mm: 'စာရင်းအင်း' },
  'menu.staff': { en: 'Staff', mm: 'ဝန်ထမ်း' },
  'menu.settings': { en: 'Settings', mm: 'ဆက်တင်' },
  'menu.dashboard': { en: 'Dashboard', mm: 'ပင်မစာမျက်နှာ' },
  'menu.users': { en: 'Users', mm: 'အသုံးပြုသူများ' },
  'menu.expense_codes': { en: 'Expense Codes', mm: 'Expense ကုဒ်များ' },

  'pos.title': { en: 'POS', mm: 'အရောင်း' },
  'pos.scan_placeholder': { en: 'IMEI scan or type', mm: 'IMEI scan (သို့) ရိုက်ထည့်' },
  'pos.cart_empty': { en: 'Cart is empty', mm: 'Cart ဗလာ' },
  'pos.staff_select': { en: 'Sales Staff', mm: 'အရောင်းဝန်ထမ်း' },
  'pos.subtotal': { en: 'Subtotal', mm: 'ကုန်ဖိုး' },
  'pos.discount': { en: 'Discount', mm: 'လျှော့ဈေး' },
  'pos.tradein_amount': { en: 'Trade-in', mm: 'အဟောင်းလဲဈေး' },
  'pos.item': { en: 'Item', mm: 'ပစ္စည်း' },
  'pos.imei': { en: 'IMEI', mm: 'IMEI' },
  'pos.sold_success': { en: 'Sale completed! Sale ID', mm: 'ရောင်းပြီးပါပြီ! Sale ID' },
  'pos.no_imei': { en: 'IMEI not found or already sold', mm: 'IMEI မတွေ့ပါ (သို့) ရောင်းပြီးသား' },
  'pos.already_in_cart': { en: 'Already in cart', mm: 'Cart ထဲ ထည့်ပြီးသား' },

  'inv.title': { en: 'Inventory', mm: 'လက်ကျန် ပစ္စည်း' },
  'inv.new_device': { en: '+ New Device', mm: '+ Device အသစ်' },
  'inv.search_placeholder': { en: 'Search IMEI / Model', mm: 'IMEI / Model ရှာ' },

  'status.in_stock': { en: 'In Stock', mm: 'လက်ကျန်' },
  'status.sold': { en: 'Sold', mm: 'ရောင်းပြီး' },
  'status.reserved': { en: 'Reserved', mm: 'ကြိုတင်မှာယူ' },
  'status.trade_in': { en: 'Trade-in', mm: 'အဟောင်းလဲ' },
  'status.repair': { en: 'Repair', mm: 'ပြုပြင်' },
  'status.returned': { en: 'Returned', mm: 'ပြန်အပ်' },
  'status.defective': { en: 'Defective', mm: 'ချို့ယွင်း' },
  'status.parts': { en: 'Parts', mm: 'အပိုပစ္စည်း' },

  'repair.title': { en: 'Repair Desk', mm: 'ပြုပြင်ဌာန' },
  'repair.new_ticket': { en: '+ New Ticket', mm: '+ Ticket အသစ်' },
  'repair.ticket': { en: 'Ticket', mm: 'Ticket' },
  'repair.customer': { en: 'Customer', mm: 'ဖောက်သည်' },
  'repair.device': { en: 'Device', mm: 'စက်' },
  'repair.issue': { en: 'Issue', mm: 'ပြဿနာ' },
  'repair.diagnosis': { en: 'Diagnosis', mm: 'စစ်ဆေးချက်' },
  'repair.technician': { en: 'Technician', mm: 'နည်းပညာရှင်' },
  'repair.parts': { en: 'Parts & Service', mm: 'အပိုပစ္စည်း / ဝန်ဆောင်မှု' },
  'repair.labor': { en: 'Labor', mm: 'လုပ်ခလုပ်' },
  'repair.payment': { en: 'Payment', mm: 'ငွေလက်ခံ' },
  'repair.warranty': { en: 'Warranty', mm: 'အာမခံ' },
  'repair.logs': { en: 'History', mm: 'မှတ်တမ်း' },
  'repair.received': { en: 'Received', mm: 'လက်ခံရရှိ' },
  'repair.diagnosing': { en: 'Diagnosing', mm: 'စစ်ဆေးနေ' },
  'repair.waiting_parts': { en: 'Waiting Parts', mm: 'အပိုပစ္စည်း စောင့်' },
  'repair.in_progress': { en: 'In Progress', mm: 'ပြုပြင်နေ' },
  'repair.completed': { en: 'Completed', mm: 'ပြီးစီး' },
  'repair.delivered': { en: 'Delivered', mm: 'ပေးအပ်' },
  'repair.cancelled': { en: 'Cancelled', mm: 'ပယ်ဖျက်' },

  'payment.cash': { en: 'Cash', mm: 'ငွေသား' },
  'payment.mmqr': { en: 'MMQR Pay', mm: 'MMQR ပေး' },
  'payment.banking': { en: 'Banking', mm: 'ဘဏ်' },
  'payment.mpu': { en: 'MPU Card', mm: 'MPU ကတ်' },
  'payment.visa': { en: 'VISA Card', mm: 'VISA ကတ်' },
  'payment.master': { en: 'Master Card', mm: 'Master ကတ်' },
  'payment.installment': { en: 'Installment', mm: 'အရစ်ကျ' },
  'payment.tradein': { en: 'Trade-in', mm: 'အဟောင်းလဲ' },

  'acc.title': { en: 'Accounting', mm: 'စာရင်းအင်း' },
  'acc.revenue': { en: 'Revenue', mm: 'ဝင်ငွေ' },
  'acc.cogs': { en: 'COGS', mm: 'ကုန်ကျစရိတ်' },
  'acc.gp': { en: 'Gross Profit', mm: 'အကြမ်းအမြတ်' },
  'acc.np': { en: 'Net Profit', mm: 'အသားတင်အမြတ်' },
  'acc.expenses': { en: 'Expenses', mm: 'အသုံးစရိတ်' },
  'acc.margin': { en: 'Margin', mm: 'အမြတ်နှုန်း' },
  'acc.purchases': { en: 'Purchases', mm: 'ဝယ်ယူမှု' },
  'acc.supplier_payable': { en: 'Supplier Payable', mm: 'ကုန်သွင်းသူ ကျန်ငွေ' },
  'acc.add_expense': { en: '+ Add Expense', mm: '+ အသုံးစရိတ် ထည့်' },
  'acc.pdf_export': { en: 'PDF Export', mm: 'PDF ထုတ်' },
  'acc.summary': { en: 'P&L Summary', mm: 'အမြတ်အရှုံး' },

  'settings.title': { en: 'Settings', mm: 'ဆက်တင်' },
  'settings.logo': { en: 'Logo', mm: 'လိုဂို' },
  'settings.shop_name': { en: 'Shop Name', mm: 'ဆိုင်နာမည်' },
  'settings.shop_phone': { en: 'Phone', mm: 'ဖုန်း' },
  'settings.shop_address': { en: 'Address', mm: 'လိပ်စာ' },
  'settings.language': { en: 'Language', mm: 'ဘာသာစကား' },
  'settings.upload_logo': { en: 'Upload Logo', mm: 'လိုဂို တင်' },

  'auth.login': { en: 'Login', mm: 'ဝင်ရောက်' },
  'auth.logout': { en: 'Logout', mm: 'ထွက်ရန်' },
  'auth.email': { en: 'Email', mm: 'အီးမေးလ်' },
  'auth.password': { en: 'Password', mm: 'စကားဝှက်' },
  'auth.signin_title': { en: 'Sign In', mm: 'ဝင်ရောက်ရန်' },
  'auth.role': { en: 'Role', mm: 'ရာထူး' },

  // === Role အသစ် ===
  'role.owner': { en: 'Owner', mm: 'ပိုင်ရှင်' },
  'role.manager': { en: 'Manager', mm: 'မန်နေဂျာ' },
  'role.cashier': { en: 'Cashier', mm: 'ငွေကိုင်' },
  'role.accountant': { en: 'Accountant', mm: 'စာရင်းကိုင်' },
  'role.customer_service': { en: 'Customer Service', mm: 'ဝန်ဆောင်မှု' }
}

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<Ctx>({
  lang: 'mm',
  setLang: () => {},
  t: (k) => k
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('mm')

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('pos-lang')) as Lang | null
    if (saved === 'en' || saved === 'mm') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem('pos-lang', l)
  }

  function t(key: string) {
    const entry = translations[key]
    if (!entry) return key
    return entry[lang]
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

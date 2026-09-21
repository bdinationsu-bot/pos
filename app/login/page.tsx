'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-700 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-700 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-3">P</div>
          <h1 className="text-2xl font-bold text-green-800">POS</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.signin_title')}</p>
        </div>

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white w-full py-3 rounded font-medium disabled:opacity-50"
          >
            {loading ? '...' : t('auth.login')}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Contact owner to create account
        </p>
      </div>
    </div>
  )
}

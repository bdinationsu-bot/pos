'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/i18n'

const ROLES = ['owner', 'manager', 'cashier', 'technician', 'viewer']

export default function UsersPage() {
  const { t } = useLang()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string>('')
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState({ email: '', full_name: '', role: 'cashier', password: '', phone: '' })
  const [inviting, setInviting] = useState(false)

  async function load() {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    if (auth?.user) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
      setMyRole(prof?.role || '')
    }
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setList(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createUser() {
    if (!invite.email) return alert('Email ထည့်ပါ')
    if (!invite.full_name) return alert('နာမည် ထည့်ပါ')
    if (!invite.password || invite.password.length < 6) return alert('Password အနည်းဆုံး ၆ လုံး')

    setInviting(true)

    const { data, error } = await supabase.auth.signUp({
      email: invite.email,
      password: invite.password,
      options: {
        data: {
          full_name: invite.full_name,
          role: invite.role
        }
      }
    })

    if (error) {
      setInviting(false)
      let msg = error.message
      if (msg.includes('already registered') || msg.includes('already exists')) {
        msg = 'ဒီ Email က ရှိပြီးသား'
      }
      if (msg.includes('confirmation')) {
        msg = 'Email confirmation ကို OFF လုပ်ပါ (Supabase Settings)'
      }
      return alert('❌ ' + msg)
    }

    if (data.user) {
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: invite.email,
        full_name: invite.full_name,
        phone: invite.phone || null,
        role: invite.role as any,
        active: true
      })
      
      if (profErr) {
        setInviting(false)
        return alert('⚠️ Auth user ဆောက်ပြီး၊ ဒါပေမယ့် profile မထည့်နိုင်ဘူး: ' + profErr.message)
      }
    }

    setInviting(false)
    setInvite({ email: '', full_name: '', role: 'cashier', password: '', phone: '' })
    setShowInvite(false)
    alert('✅ User ဆောက်ပြီးပါပြီ\n\n' + invite.email + ' / ' + invite.password)
    load()
  }

  async function updateRole(id: string, role: string) {
    if (myRole !== 'owner') return alert('Owner ပဲ role ပြောင်းလို့ ရပါတယ်')
    const { error } = await supabase.from('profiles').update({ role: role as any }).eq('id', id)
    if (error) return alert(error.message)
    load()
  }

  async function toggleActive(id: string, active: boolean) {
    if (myRole !== 'owner') return alert('Owner ပဲ ပြောင်းလို့ ရပါတယ်')
    await supabase.from('profiles').update({ active: !active }).eq('id', id)
    load()
  }

  async function resetPassword(email: string) {
    if (!confirm(`Reset password for ${email}?`)) return
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })
    if (error) return alert(error.message)
    alert('📧 Password reset email ပို့ပြီးပါပြီ')
  }

  async function deleteUser(id: string, email: string) {
    if (myRole !== 'owner') return alert('Owner ပဲ ဖျက်လို့ ရပါတယ်')
    if (!confirm(`${email} ကို ဖျက်မှာ သေချာလား?`)) return
    await supabase.from('profiles').delete().eq('id', id)
    alert('⚠️ Profile ဖျက်ပြီး — Auth user ကို Supabase → Authentication → Users မှာ ဆက်ဖျက်ပါ')
    load()
  }

  const roleColors: any = {
    owner: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    cashier: 'bg-green-100 text-green-800',
    technician: 'bg-orange-100 text-orange-800',
    viewer: 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-green-800">Users</h1>
          <p className="text-xs text-gray-500 mt-1">
            Role: <strong className="text-green-700 capitalize">{myRole || '...'}</strong>
          </p>
        </div>
        {myRole === 'owner' && (
          <button onClick={() => setShowInvite(!showInvite)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
            + User အသစ်
          </button>
        )}
      </div>

      {myRole !== 'owner' && (
        <div className="bg-yellow-50 border-2 border-yellow-400 text-yellow-800 p-4 rounded mb-4 text-sm">
          ⚠️ User ထည့်ခြင်း / ပြင်ခြင်း ကို <strong>Owner</strong> ပဲ လုပ်နိုင်ပါတယ်
        </div>
      )}

      {showInvite && myRole === 'owner' && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h2 className="font-bold mb-3 text-green-700">User အသစ် ဆောက်</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input type="email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })}
                placeholder="user@example.com" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">နာမည် *</label>
              <input value={invite.full_name} onChange={e => setInvite({ ...invite, full_name: e.target.value })}
                placeholder="Aung Aung" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ဖုန်း</label>
              <input value={invite.phone} onChange={e => setInvite({ ...invite, phone: e.target.value })}
                placeholder="09xxxxxxxxx" className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password * (min 6)</label>
              <input type="password" value={invite.password} onChange={e => setInvite({ ...invite, password: e.target.value })}
                placeholder="••••••" className="border p-2 rounded w-full" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Role</label>
              <div className="grid grid-cols-5 gap-2">
                {ROLES.map(r => (
                  <button key={r} type="button" onClick={() => setInvite({ ...invite, role: r })}
                    className={`py-2 rounded border-2 font-medium capitalize text-sm transition ${
                      invite.role === r ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                    }`}>
                    {t('role.' + r)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createUser} disabled={inviting} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50">
              {inviting ? 'ဆောက်နေတယ်...' : '✅ User ဆောက်'}
            </button>
            <button onClick={() => setShowInvite(false)} className="bg-gray-200 px-6 py-2 rounded font-medium">ပယ်ဖျက်</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        {loading ? <p className="p-8 text-center text-gray-400">...</p> : (
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">နာမည်</th>
                <th className="p-3 text-left">ဖုန်း</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">User မရှိပါ</td></tr>}
              {list.map(u => (
                <tr key={u.id} className="border-t hover:bg-green-50">
                  <td className="p-3 font-mono text-xs">{u.email}</td>
                  <td className="p-3">{u.full_name || '-'}</td>
                  <td className="p-3 text-gray-600">{u.phone || '-'}</td>
                  <td className="p-3">
                    {myRole === 'owner' ? (
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                        className={`border p-1 rounded text-xs font-medium ${roleColors[u.role]}`}>
                        {ROLES.map(r => <option key={r} value={r}>{t('role.' + r)}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[u.role]}`}>{t('role.' + u.role)}</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {myRole === 'owner' ? (
                      <button onClick={() => toggleActive(u.id, u.active)}
                        className={`px-2 py-1 rounded text-xs font-medium ${u.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                        {u.active ? '✅ Active' : '⏸ Inactive'}
                      </button>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${u.active ? 'bg-green-100' : 'bg-gray-200'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {myRole === 'owner' && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => resetPassword(u.email)} className="text-xs text-blue-600 hover:underline">Reset PW</button>
                        <button onClick={() => deleteUser(u.id, u.email)} className="text-xs text-red-600 hover:underline">ဖျက်</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <strong className="text-yellow-800">⚠️ Supabase Settings လိုအပ်:</strong>
        <div className="mt-2 text-gray-700">
          Authentication → Providers → Email → <strong>"Confirm email" = OFF</strong>
        </div>
      </div>
    </div>
  )
}

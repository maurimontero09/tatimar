'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@tatimar.ca')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(`Error: ${result.error}`)
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
  }

  const DEMO_ACCOUNTS = [
    { label: 'Super Admin', email: 'admin@tatimar.ca',   password: 'admin123' },
    { label: 'Manager',     email: 'manager@tatimar.ca', password: 'user1234' },
    { label: 'Accountant',  email: 'finance@tatimar.ca', password: 'user1234' },
    { label: 'Cleaner',     email: 'maria@tatimar.ca',   password: 'user1234' },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--navy)' }}>
      {/* Brand panel — full width on mobile, left half on desktop */}
      <div className="flex items-center justify-center p-8 md:flex-1 relative overflow-hidden
                      min-h-[180px] md:min-h-screen">
        <div className="absolute w-[500px] h-[500px] rounded-full -top-24 -left-24 opacity-8"
             style={{ background: 'var(--blue)' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full -bottom-12 -right-12 opacity-8"
             style={{ background: 'var(--blue)' }} />
        <div className="relative text-center z-10">
          <div className="text-5xl md:text-7xl mb-3 md:mb-5">🧹</div>
          <div className="text-xl md:text-3xl font-light text-white/80 leading-tight italic">
            Operations that run<br />
            <strong className="font-semibold text-white not-italic">clean.</strong>
          </div>
          <div className="mt-3 text-xs md:text-sm text-white/30 hidden md:block">
            Tatimar Cleaning Operations Platform
          </div>
        </div>
      </div>

      {/* Form panel — full width on mobile, right column on desktop */}
      <div className="w-full md:w-[420px] md:shrink-0 bg-white flex items-center justify-center
                      px-6 py-8 md:p-10 rounded-t-3xl md:rounded-none">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-semibold text-white"
                 style={{ background: 'var(--navy)' }}>T</div>
            <div>
              <div className="font-semibold text-lg">Tatimar</div>
              <div className="text-xs text-gray-400">Operations Platform</div>
            </div>
          </div>

          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-6">Sign in to your account</p>

          {/* Demo accounts */}
          <div className="mb-5">
            <div className="text-xs font-medium text-gray-500 mb-2">Demo accounts</div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(acc.password) }}
                  className={`px-2.5 py-1 rounded-full border text-xs transition-all ${
                    email === acc.email
                      ? 'border-[var(--blue)] bg-[var(--blue-pale)] text-[var(--blue)] font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" className="rounded" defaultChecked /> Remember me
              </label>
              <a href="#" className="text-xs text-[var(--blue)]">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-white text-sm transition-all
                         disabled:opacity-60"
              style={{ background: loading ? 'var(--navy-80)' : 'var(--navy)' }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="mt-5 text-center text-[11px] text-gray-400">
            Secured with JWT · End-to-end encrypted
          </div>
        </div>
      </div>
    </div>
  )
}

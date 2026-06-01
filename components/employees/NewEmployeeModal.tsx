'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

const ROLE_OPTIONS = [
  { value: 'CLEANER',     label: 'Cleaner'     },
  { value: 'MANAGER',     label: 'Manager'     },
  { value: 'ACCOUNTANT',  label: 'Accountant'  },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
]

const EMPTY = {
  name: '', email: '', phone: '', password: '', role: 'CLEANER',
}

export function NewEmployeeModal({ trigger }: { trigger?: React.ReactNode } = {}) {
  const router  = useRouter()
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = trpc.user.create.useMutation({
    onSuccess: () => { setOpen(false); setForm(EMPTY); setErrors({}); router.refresh() },
  })

  function set(field: keyof typeof EMPTY, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim())                                    e.name     = 'Name is required'
    if (!form.email.trim())                                   e.email    = 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))     e.email    = 'Invalid email'
    if (!form.password)                                       e.password = 'Password is required'
    if (form.password.length < 8)                            e.password = 'Minimum 8 characters'
    return e
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    create.mutate({
      name:     form.name.trim(),
      email:    form.email.trim(),
      phone:    form.phone   || undefined,
      password: form.password,
      role:     form.role as any,
    })
  }

  function close() { setOpen(false); setForm(EMPTY); setErrors({}) }

  return (
    <>
      {trigger
        ? <div onClick={() => setOpen(true)}>{trigger}</div>
        : <button className="btn btn-primary text-sm" onClick={() => setOpen(true)}>+ Add Employee</button>
      }

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md
                          flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-base">New Employee</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Body */}
            <form onSubmit={submit} className="p-6 flex flex-col gap-4">
              {create.error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {create.error.message}
                </div>
              )}

              {/* Name + Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input className={`form-input ${errors.name ? 'border-red-400' : ''}`}
                         placeholder="Maria Dupont"
                         value={form.name} onChange={e => set('name', e.target.value)} />
                  {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                  <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input className={`form-input ${errors.email ? 'border-red-400' : ''}`}
                       type="email" placeholder="maria@tatimar.ca"
                       value={form.email} onChange={e => set('email', e.target.value)} />
                {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Phone + Password */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input className="form-input" type="tel" placeholder="514-000-0000"
                         value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input className={`form-input ${errors.password ? 'border-red-400' : ''}`}
                         type="password" placeholder="Min 8 chars"
                         value={form.password} onChange={e => set('password', e.target.value)} />
                  {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

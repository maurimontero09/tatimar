'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

// ── Reusable dropdown ──────────────────────────────────────────────────────

function DropdownField({
  value, onChange, options, placeholder = '— Select —',
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button type="button"
              className="form-input text-left flex items-center justify-between"
              onClick={() => setIsOpen(o => !o)}>
        <span className={selected ? '' : 'text-gray-400'}>{selected?.label ?? placeholder}</span>
        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-[var(--border)]
                       rounded-lg shadow-lg overflow-y-auto max-h-[8.5rem]">
          {options.map(o => (
            <li key={o.value}
                className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--blue-pale)]
                            ${value === o.value ? 'bg-[var(--blue-pale)] font-medium text-[var(--blue)]' : ''}`}
                onMouseDown={() => { onChange(o.value); setIsOpen(false) }}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'commercial',  label: 'Commercial' },
  { value: 'medical',     label: 'Medical' },
  { value: 'residential', label: 'Residential' },
  { value: 'office',      label: 'Office' },
  { value: 'industrial',  label: 'Industrial' },
]

const CA_PROVINCES = [
  { value: 'AB', label: 'AB' },
  { value: 'BC', label: 'BC' },
  { value: 'MB', label: 'MB' },
  { value: 'NB', label: 'NB' },
  { value: 'NL', label: 'NL' },
  { value: 'NS', label: 'NS' },
  { value: 'NT', label: 'NT' },
  { value: 'NU', label: 'NU' },
  { value: 'ON', label: 'ON' },
  { value: 'PE', label: 'PE' },
  { value: 'QC', label: 'QC' },
  { value: 'SK', label: 'SK' },
  { value: 'YT', label: 'YT' },
]

const FREQ_OPTIONS = [
  { value: 'daily',    label: 'Daily' },
  { value: '2x_week',  label: '2× week' },
  { value: '3x_week',  label: '3× week' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly',  label: 'Monthly' },
]

const EMPTY = {
  name: '', type: '', address: '', city: '', province: 'QC',
  postalCode: '', contactName: '', contactPhone: '', contactEmail: '',
  frequency: '', accessNotes: '',
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function NewClientModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = trpc.clients.create.useMutation({
    onSuccess: () => {
      setOpen(false)
      setForm(EMPTY)
      setErrors({})
      router.refresh()
    },
  })

  function set(field: keyof typeof EMPTY, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim())    e.name    = 'Name is required'
    if (!form.address.trim()) e.address = 'Address is required'
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
      e.contactEmail = 'Invalid email'
    return e
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    create.mutate({
      name:         form.name.trim(),
      type:         form.type        || undefined,
      address:      form.address.trim(),
      city:         form.city        || undefined,
      province:     form.province    || 'QC',
      postalCode:   form.postalCode  || undefined,
      contactName:  form.contactName  || undefined,
      contactPhone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      frequency:    form.frequency   || undefined,
      accessNotes:  form.accessNotes || undefined,
    })
  }

  function close() { setOpen(false); setForm(EMPTY); setErrors({}) }

  return (
    <>
      <button className="btn btn-primary text-sm" onClick={() => setOpen(true)}>
        + New Client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh]
                          flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-base">New Client</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Body */}
            <form onSubmit={submit} className="overflow-y-auto p-6 flex flex-col gap-5">
              {create.error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {create.error.message}
                </div>
              )}

              {/* Name + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Client name <span className="text-red-500">*</span>
                  </label>
                  <input className={`form-input ${errors.name ? 'border-red-400' : ''}`}
                         placeholder="Acme Corp"
                         value={form.name}
                         onChange={e => set('name', e.target.value)} />
                  {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <DropdownField value={form.type} onChange={v => set('type', v)}
                                 options={TYPE_OPTIONS} />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input className={`form-input ${errors.address ? 'border-red-400' : ''}`}
                       placeholder="123 Main St"
                       value={form.address}
                       onChange={e => set('address', e.target.value)} />
                {errors.address && <p className="text-[11px] text-red-500 mt-1">{errors.address}</p>}
              </div>

              {/* City / Province / Postal */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                  <input className="form-input" placeholder="Montréal"
                         value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Province</label>
                  <DropdownField value={form.province} onChange={v => set('province', v)}
                                 options={CA_PROVINCES} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Postal code</label>
                  <input className="form-input" placeholder="H1A 1A1"
                         value={form.postalCode} onChange={e => set('postalCode', e.target.value)} />
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Contact name</label>
                    <input className="form-input" placeholder="Jane Doe"
                           value={form.contactName} onChange={e => set('contactName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                    <input className="form-input" placeholder="514-000-0000" type="tel"
                           value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <input className={`form-input ${errors.contactEmail ? 'border-red-400' : ''}`}
                           placeholder="contact@example.com" type="email"
                           value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
                    {errors.contactEmail && <p className="text-[11px] text-red-500 mt-1">{errors.contactEmail}</p>}
                  </div>
                </div>
              </div>

              {/* Frequency + Access notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                  <DropdownField value={form.frequency} onChange={v => set('frequency', v)}
                                 options={FREQ_OPTIONS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Access notes</label>
                  <input className="form-input" placeholder="Door code, key box…"
                         value={form.accessNotes} onChange={e => set('accessNotes', e.target.value)} />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2 shrink-0">
              <button type="button" className="btn btn-secondary" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Create client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

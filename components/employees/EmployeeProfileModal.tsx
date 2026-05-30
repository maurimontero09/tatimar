'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { initials, getDaysUntilExpiry, formatDate } from '@/lib/utils'

interface Props {
  employeeId: string
  onClose: () => void
}

export function EmployeeProfileModal({ employeeId, onClose }: Props) {
  const router  = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState<{ name: string; phone: string } | null>(null)

  const { data: emp, isLoading } = trpc.user.byId.useQuery({ id: employeeId })

  const update = trpc.user.update.useMutation({
    onSuccess: () => { setEditing(false); router.refresh() },
  })

  function startEdit() {
    if (!emp) return
    setForm({ name: emp.name, phone: emp.phone ?? '' })
    setEditing(true)
  }

  function cancelEdit() { setEditing(false); setForm(null) }

  function saveEdit() {
    if (!form || !emp) return
    update.mutate({ id: emp.id, name: form.name || undefined, phone: form.phone || undefined })
  }

  function toggleActive() {
    if (!emp) return
    update.mutate({ id: emp.id, isActive: !emp.isActive })
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh]
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-base">Employee Profile</h2>
          <button onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex flex-col gap-5 p-6">
          {isLoading && (
            <div className="flex justify-center py-10 text-gray-400 text-sm">Loading…</div>
          )}

          {emp && (
            <>
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center
                                justify-center font-semibold text-lg shrink-0">
                  {initials(emp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input className="form-input text-sm font-semibold mb-1"
                           value={form!.name}
                           onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))} />
                  ) : (
                    <div className="font-semibold text-base">{emp.name}</div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="badge bg-blue-50 text-blue-700 text-[10px] capitalize">
                      {emp.role.replace('_', ' ').toLowerCase()}
                    </span>
                    <span className={`badge text-[10px] ${
                      emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {!editing && (
                  <button className="btn btn-secondary text-xs py-1 px-2.5" onClick={startEdit}>
                    Edit
                  </button>
                )}
              </div>

              {/* Contact info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Contact
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 truncate">
                      {emp.email}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                    {editing ? (
                      <input className="form-input text-sm" placeholder="514-000-0000"
                             value={form!.phone}
                             onChange={e => setForm(f => f && ({ ...f, phone: e.target.value }))} />
                    ) : (
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        {emp.phone || <span className="text-gray-400">—</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Certifications */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Certifications
                </p>
                {emp.certifications.length === 0 ? (
                  <p className="text-sm text-gray-400">No certifications on file.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {emp.certifications.map(c => {
                      const days  = c.expiresAt ? getDaysUntilExpiry(new Date(c.expiresAt)) : null
                      const color = days === null ? 'bg-green-50 text-green-700' :
                                    days < 0      ? 'bg-red-100 text-red-700' :
                                    days <= 30    ? 'bg-red-50 text-red-600' :
                                    days <= 60    ? 'bg-amber-50 text-amber-700' :
                                                   'bg-green-50 text-green-700'
                      return (
                        <div key={c.id}
                             className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                          <span className="text-sm font-medium">{c.certification.name}</span>
                          <span className={`badge text-[10px] ${color}`}>
                            {days === null       ? 'No expiry' :
                             days < 0            ? `Expired ${Math.abs(days)}d ago` :
                             days <= 60          ? `Expires in ${days}d` :
                             c.expiresAt ? formatDate(new Date(c.expiresAt)) : 'Valid'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent jobs */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Recent Jobs
                </p>
                {emp.assignments.length === 0 ? (
                  <p className="text-sm text-gray-400">No jobs assigned yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {emp.assignments.slice(0, 5).map(a => (
                      <div key={a.id}
                           className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                        <div>
                          <div className="text-sm font-medium">{a.schedule.client.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {formatDate(new Date(a.schedule.date))}
                          </div>
                        </div>
                        <span className={`badge text-[10px] ${
                          a.schedule.status === 'COMPLETED'   ? 'bg-green-100 text-green-700' :
                          a.schedule.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          a.schedule.status === 'CANCELLED'   ? 'bg-gray-100 text-gray-500' :
                                                                'bg-amber-50 text-amber-700'
                        }`}>
                          {a.schedule.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deactivate toggle */}
              <div className="pt-1 border-t border-gray-100">
                <button className={`text-xs font-medium ${
                  emp.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
                }`}
                  onClick={toggleActive}
                  disabled={update.isPending}>
                  {emp.isActive ? 'Deactivate employee' : 'Reactivate employee'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer (edit mode) */}
        {editing && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2 shrink-0">
            <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

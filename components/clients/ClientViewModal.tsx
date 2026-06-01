'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { formatDate, getDaysUntilExpiry } from '@/lib/utils'

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily', '2x_week': '2× week', '3x_week': '3× week',
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
}

interface Props { clientId: string; onClose: () => void }

export function ClientViewModal({ clientId, onClose }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<{ name: string; contactName: string; contactPhone: string; accessNotes: string } | null>(null)

  const { data: client, isLoading } = trpc.clients.byId.useQuery({ id: clientId })

  const update = trpc.clients.update.useMutation({
    onSuccess: () => { setEditing(false); setForm(null); router.refresh() },
  })

  function startEdit() {
    if (!client) return
    setForm({
      name:         client.name,
      contactName:  client.contactName  ?? '',
      contactPhone: client.contactPhone ?? '',
      accessNotes:  client.accessNotes  ?? '',
    })
    setEditing(true)
  }

  function saveEdit() {
    if (!form || !client) return
    update.mutate({ id: client.id, name: form.name || undefined, contactName: form.contactName || undefined, contactPhone: form.contactPhone || undefined, accessNotes: form.accessNotes || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-base">Client Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-5 p-6">
          {isLoading && <div className="text-sm text-gray-400 text-center py-10">Loading…</div>}

          {client && (
            <>
              {/* Name + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <input className="form-input font-semibold text-base"
                           value={form!.name}
                           onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))} />
                  ) : (
                    <div className="font-semibold text-lg">{client.name}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <span className="badge bg-gray-100 text-gray-600 text-[10px] capitalize">{client.type ?? '—'}</span>
                    {client.frequency && <span className="badge bg-blue-50 text-blue-700 text-[10px]">{FREQ_LABELS[client.frequency] ?? client.frequency}</span>}
                    <span className={`badge text-[10px] ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {!editing && <button className="btn btn-secondary text-xs py-1 px-2.5" onClick={startEdit}>Edit</button>}
              </div>

              {/* Address */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Address</p>
                <div className="text-sm text-gray-700">{client.address}</div>
                {client.city && <div className="text-xs text-gray-400 mt-0.5">{client.city}, {client.province} {client.postalCode}</div>}
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    {editing ? (
                      <input className="form-input text-sm" value={form!.contactName}
                             onChange={e => setForm(f => f && ({ ...f, contactName: e.target.value }))} />
                    ) : (
                      <div className="text-sm text-gray-700">{client.contactName || <span className="text-gray-400">—</span>}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                    {editing ? (
                      <input className="form-input text-sm" value={form!.contactPhone}
                             onChange={e => setForm(f => f && ({ ...f, contactPhone: e.target.value }))} />
                    ) : (
                      <div className="text-sm text-gray-700">{client.contactPhone || <span className="text-gray-400">—</span>}</div>
                    )}
                  </div>
                  {client.contactEmail && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                      <div className="text-sm text-gray-700">{client.contactEmail}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Access notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Access Notes</label>
                {editing ? (
                  <input className="form-input text-sm" placeholder="Door code, key box…"
                         value={form!.accessNotes}
                         onChange={e => setForm(f => f && ({ ...f, accessNotes: e.target.value }))} />
                ) : (
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    {client.accessNotes || <span className="text-gray-400">None on file</span>}
                  </div>
                )}
              </div>

              {/* Recent jobs */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Jobs</p>
                {client.schedules.length === 0 ? (
                  <p className="text-sm text-gray-400">No jobs on record.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {client.schedules.slice(0, 5).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                        <div>
                          <div className="text-sm font-medium">{formatDate(new Date(s.date))}</div>
                          <div className="text-[11px] text-gray-400">{s.assignments?.[0]?.user?.name ?? 'Unassigned'}</div>
                        </div>
                        <span className={`badge text-[10px] ${
                          s.status === 'COMPLETED'   ? 'bg-green-100 text-green-700' :
                          s.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          s.status === 'CANCELLED'   ? 'bg-gray-100 text-gray-500' :
                                                       'bg-amber-50 text-amber-700'
                        }`}>{s.status.replace('_', ' ').toLowerCase()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {editing && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2 shrink-0">
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setForm(null) }}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEdit} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

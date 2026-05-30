'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { formatDate } from '@/lib/utils'

interface Props {
  employeeId: string
  employeeName: string
  onClose: () => void
}

export function AssignModal({ employeeId, employeeName, onClose }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const { data: schedules = [], isLoading } = trpc.schedule.upcoming.useQuery({ days: 30 })

  const assign = trpc.schedule.assign.useMutation({
    onSuccess: () => { router.refresh(); onClose() },
  })

  const available = schedules.filter(
    s => !s.assignments.some(a => a.userId === employeeId)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh]
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold text-base">Assign to Job</h2>
            <p className="text-xs text-gray-400 mt-0.5">{employeeName}</p>
          </div>
          <button onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading && (
            <div className="text-sm text-gray-400 text-center py-8">Loading schedules…</div>
          )}

          {!isLoading && available.length === 0 && (
            <div className="text-sm text-gray-400 text-center py-8">
              No upcoming jobs available to assign.
            </div>
          )}

          {available.map(s => {
            const isSelected = selected === s.id
            return (
              <button key={s.id} type="button"
                      onClick={() => setSelected(isSelected ? null : s.id)}
                      className={`w-full text-left rounded-xl border px-4 py-3 mb-2 transition-all
                                  ${isSelected
                                    ? 'border-[var(--blue)] bg-[var(--blue-pale)] ring-1 ring-[var(--blue)]'
                                    : 'border-[var(--border)] hover:border-blue-200 hover:bg-gray-50'
                                  }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.client.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(new Date(s.date))} · {new Date(s.startTime).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.assignments.length > 0 && (
                      <span className="text-[10px] text-gray-400">
                        +{s.assignments.length} assigned
                      </span>
                    )}
                    <span className="badge bg-amber-50 text-amber-700 text-[10px]">Pending</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2 shrink-0">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary"
                  disabled={!selected || assign.isPending}
                  onClick={() => selected && assign.mutate({ scheduleId: selected, userId: employeeId })}>
            {assign.isPending ? 'Assigning…' : 'Confirm assignment'}
          </button>
        </div>

        {assign.error && (
          <p className="text-xs text-red-500 px-6 pb-3">{assign.error.message}</p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { format, addDays, parseISO, isToday } from 'date-fns'
import { trpc } from '@/lib/trpc'
import { cn, formatTime, initials } from '@/lib/utils'

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-blue-50 text-blue-700 border-l-blue-500',
  IN_PROGRESS: 'bg-green-50 text-green-700 border-l-green-500',
  COMPLETED:   'bg-gray-100 text-gray-500 border-l-gray-400',
  CANCELLED:   'bg-red-50 text-red-500 border-l-red-400',
}

interface Props {
  schedules: any[]
  cleaners: any[]
  clients: any[]
  weekStart: string
}

export function ScheduleCalendar({ schedules, cleaners, clients, weekStart }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [form, setForm] = useState({
    clientId: '', assigneeId: '', date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00', maxHours: '3', instructions: '', accessNotes: '',
    services: [] as string[],
  })

  const utils = trpc.useContext()
  const createSchedule = trpc.schedule.create.useMutation({
    onSuccess: () => { setShowModal(false); utils.schedule.list.invalidate() },
  })

  const days = Array.from({ length: 5 }, (_, i) => addDays(parseISO(weekStart), i))

  const getSchedulesForDayAndHour = (day: Date, hour: number) =>
    schedules.filter(s => {
      const d = new Date(s.date)
      const h = new Date(s.startTime).getHours()
      return d.toDateString() === day.toDateString() && h === hour
    })

  const handleCreate = () => {
    const [h, m] = form.startTime.split(':').map(Number)
    const startDate = new Date(form.date)
    startDate.setHours(h, m, 0, 0)
    createSchedule.mutate({
      clientId: form.clientId,
      assigneeIds: form.assigneeId ? [form.assigneeId] : [],
      date: new Date(form.date),
      startTime: startDate,
      maxHours: parseFloat(form.maxHours),
      servicesList: form.services,
      instructions: form.instructions || undefined,
      accessNotes: form.accessNotes || undefined,
    })
  }

  const toggleService = (s: string) =>
    setForm(f => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s],
    }))

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-semibold">Schedule</h1>
          <p className="text-sm text-gray-400">
            Week of {format(parseISO(weekStart), 'MMMM d')} – {format(addDays(parseISO(weekStart), 4), 'd, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary text-sm">← Prev</button>
          <button className="btn btn-secondary text-sm"
                  style={{ background: 'var(--blue-pale)', color: 'var(--blue)', borderColor: 'var(--blue-pale)' }}>
            Today
          </button>
          <button className="btn btn-secondary text-sm">Next →</button>
          <button className="btn btn-primary text-sm" onClick={() => setShowModal(true)}>
            + Add Job
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3">
        {[
          { label: 'Pending', cls: 'bg-blue-500' },
          { label: 'In Progress', cls: 'bg-green-500' },
          { label: 'Completed', cls: 'bg-gray-400' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${cls}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid border-b border-gray-100"
             style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
          <div className="bg-gray-50 border-r border-gray-100" />
          {days.map(day => (
            <div key={day.toISOString()}
                 className={cn(
                   'text-center py-2.5 border-l border-gray-100',
                   isToday(day) && 'bg-blue-50'
                 )}>
              <div className="text-[10px] font-medium text-gray-400 uppercase">
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                'text-lg font-semibold mx-auto w-8 h-8 flex items-center justify-center rounded-full',
                isToday(day) ? 'bg-[var(--blue)] text-white' : 'text-gray-700'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots */}
        {HOURS.map(hour => (
          <div key={hour}
               className="grid border-b border-gray-50 last:border-0"
               style={{ gridTemplateColumns: '52px repeat(5, 1fr)', minHeight: '60px' }}>
            {/* Time label */}
            <div className="bg-gray-50 border-r border-gray-100 flex items-start justify-end
                            pr-2 pt-1.5 text-[10px] text-gray-400 shrink-0">
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
            {/* Day cells */}
            {days.map(day => {
              const slots = getSchedulesForDayAndHour(day, hour)
              return (
                <div key={day.toISOString()}
                     className={cn(
                       'border-l border-gray-100 p-1 relative',
                       isToday(day) && 'bg-blue-50/30'
                     )}>
                  {slots.map(s => {
                    const assignee = s.assignments?.[0]?.user
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSchedule(s)}
                        className={cn(
                          'w-full text-left rounded-md px-2 py-1 text-[10px] font-medium mb-1',
                          'border-l-[3px] transition-opacity hover:opacity-80',
                          STATUS_COLORS[s.status] ?? STATUS_COLORS.PENDING
                        )}
                        style={{ minHeight: '44px' }}
                      >
                        <div className="font-semibold truncate">{s.client?.name}</div>
                        {assignee && (
                          <div className="opacity-70 truncate">{assignee.name}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* New Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
             onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <div className="font-semibold">New Schedule</div>
                <div className="text-xs text-gray-400">Assign a cleaning job</div>
              </div>
              <button onClick={() => setShowModal(false)}
                      className="ml-auto text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Client *</label>
                  <select className="form-input" value={form.clientId}
                          onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">Select client…</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign Cleaner *</label>
                  <select className="form-input" value={form.assigneeId}
                          onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
                    <option value="">Select cleaner…</option>
                    {cleaners.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Date *</label>
                  <input className="form-input" type="date" value={form.date}
                         onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Time *</label>
                  <input className="form-input" type="time" value={form.startTime}
                         onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Hours *</label>
                  <input className="form-input" type="number" min="0.5" max="12" step="0.5"
                         value={form.maxHours}
                         onChange={e => setForm(f => ({ ...f, maxHours: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Services</label>
                <div className="flex flex-wrap gap-2">
                  {['Office cleaning','Vacuuming','Washrooms','Kitchen','Floors','Disinfection','Windows','Deep clean'].map(s => (
                    <label key={s}
                           className={cn(
                             'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all',
                             form.services.includes(s)
                               ? 'border-[var(--blue)] bg-[var(--blue-pale)] text-[var(--blue)]'
                               : 'border-gray-200 text-gray-500 hover:border-gray-300'
                           )}>
                      <input type="checkbox" className="hidden"
                             checked={form.services.includes(s)}
                             onChange={() => toggleService(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Work Instructions</label>
                <textarea className="form-input resize-none" rows={3}
                          placeholder="Special instructions for this job…"
                          value={form.instructions}
                          onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Access Notes</label>
                <input className="form-input" type="text"
                       placeholder="Entry code, key location, etc."
                       value={form.accessNotes}
                       onChange={e => setForm(f => ({ ...f, accessNotes: e.target.value }))} />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--blue-pale)] rounded-lg
                              border border-blue-100 text-xs text-[var(--blue)]">
                🔄 This job will be synced to Notion automatically after saving
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="btn btn-secondary text-sm" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary text-sm"
                disabled={!form.clientId || !form.assigneeId || createSchedule.isLoading}
                onClick={handleCreate}
              >
                {createSchedule.isLoading ? 'Creating…' : 'Create Schedule →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
             onClick={e => e.target === e.currentTarget && setSelectedSchedule(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <span className="text-xl">🧹</span>
              <div>
                <div className="font-semibold">{selectedSchedule.client?.name}</div>
                <div className="text-xs text-gray-400">
                  {format(new Date(selectedSchedule.date), 'MMM d')} ·{' '}
                  {format(new Date(selectedSchedule.startTime), 'h:mm a')} ·{' '}
                  {selectedSchedule.maxHours}h max
                </div>
              </div>
              <button onClick={() => setSelectedSchedule(null)}
                      className="ml-auto text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {selectedSchedule.assignments?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-2">ASSIGNED TO</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSchedule.assignments.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center
                                        text-blue-700 text-[9px] font-semibold">
                          {initials(a.user?.name ?? '')}
                        </div>
                        <span className="text-sm font-medium">{a.user?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSchedule.accessNotes && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1.5">ACCESS</div>
                  <div className="text-sm bg-blue-50 text-blue-800 rounded-lg px-3 py-2">
                    🔐 {selectedSchedule.accessNotes}
                  </div>
                </div>
              )}

              {selectedSchedule.servicesList?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1.5">SERVICES</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSchedule.servicesList.map((s: string) => (
                      <span key={s} className="badge bg-gray-100 text-gray-600 text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedSchedule.instructions && (
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1.5">INSTRUCTIONS</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedSchedule.instructions}</p>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-gray-400 mb-1.5">STATUS</div>
                <span className={cn(
                  'badge text-xs',
                  selectedSchedule.status === 'IN_PROGRESS' && 'bg-green-100 text-green-700',
                  selectedSchedule.status === 'COMPLETED'   && 'bg-blue-100 text-blue-700',
                  selectedSchedule.status === 'PENDING'     && 'bg-gray-100 text-gray-600',
                  selectedSchedule.status === 'CANCELLED'   && 'bg-red-100 text-red-600',
                )}>
                  {selectedSchedule.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="btn btn-secondary text-sm" onClick={() => setSelectedSchedule(null)}>
                Close
              </button>
              <button className="btn btn-primary text-sm">Edit Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

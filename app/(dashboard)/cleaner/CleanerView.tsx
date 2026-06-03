'use client'

import { useState, useEffect } from 'react'
import { MapPin, Lock, Clock, Play, Square, CheckCircle, Camera, ChevronRight, X, Upload } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { getDaysUntilExpiry, formatDate, formatTime, initials } from '@/lib/utils'
import { format } from 'date-fns'
import type { ScheduleWithRelations } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClockState(events: any[], userId: string) {
  const mine = [...(events ?? [])]
    .filter(e => e.userId === userId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const lastEvent = mine.at(-1)
  const isClockedIn = lastEvent?.type === 'CLOCK_IN'

  // Sum all completed pairs
  let accumulatedSeconds = 0
  for (let i = 0; i + 1 < mine.length; i++) {
    if (mine[i].type === 'CLOCK_IN' && mine[i + 1].type === 'CLOCK_OUT') {
      accumulatedSeconds += (new Date(mine[i + 1].timestamp).getTime() - new Date(mine[i].timestamp).getTime()) / 1000
      i++ // skip the paired out
    }
  }

  return { isClockedIn, lastClockIn: isClockedIn ? lastEvent : null, accumulatedSeconds, history: mine }
}

function formatDuration(seconds: number) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function getGPS(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { timeout: 6000 }
    )
  })
}

// ─── Live accumulated timer ───────────────────────────────────────────────────

function AccumulatedTimer({ events, userId }: { events: any[]; userId: string }) {
  const [live, setLive] = useState(0)
  const { isClockedIn, lastClockIn, accumulatedSeconds } = getClockState(events, userId)

  useEffect(() => {
    if (!isClockedIn || !lastClockIn) { setLive(0); return }
    const start = new Date(lastClockIn.timestamp).getTime()
    const tick = () => setLive(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isClockedIn, lastClockIn?.timestamp])

  const total = accumulatedSeconds + live
  return (
    <span className="font-mono text-3xl font-bold text-[var(--teal)] tracking-widest">
      {formatDuration(total)}
    </span>
  )
}

// ─── SMS Notification Toast ───────────────────────────────────────────────────

function SmsToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 6000)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 bg-[var(--navy)] text-white rounded-2xl
                    shadow-2xl p-4 border border-white/10 animate-slide-up">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-sm">📱</span>
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
            SMS notification sent
          </span>
        </div>
        <button onClick={onDismiss} className="text-white/40 hover:text-white shrink-0">
          <X size={14} />
        </button>
      </div>
      <pre className="text-xs text-white/80 whitespace-pre-wrap font-sans leading-relaxed">
        {message}
      </pre>
    </div>
  )
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────

function JobDetailModal({ scheduleId, cleanerName, cleanerId, onClose }: {
  scheduleId: string
  cleanerName: string
  cleanerId: string
  onClose: () => void
}) {
  const [uploading, setUploading]   = useState(false)
  const [toast, setToast]           = useState<string | null>(null)

  const { data: schedule, refetch } = trpc.schedule.byId.useQuery({ id: scheduleId })

  const clockIn  = trpc.clock.clockIn.useMutation({
    onSuccess: async () => {
      await refetch()
      const now = new Date()
      buildSms('CLOCK_IN', now)
    },
  })
  const clockOut = trpc.clock.clockOut.useMutation({
    onSuccess: async () => {
      await refetch()
      const now = new Date()
      buildSms('CLOCK_OUT', now)
    },
  })
  const complete = trpc.schedule.markComplete.useMutation({ onSuccess: () => refetch() })

  function buildSms(type: 'CLOCK_IN' | 'CLOCK_OUT', time: Date) {
    const action  = type === 'CLOCK_IN' ? 'clock in' : 'clock out'
    const hour    = format(time, 'HH:mm')
    const date    = format(time, 'MMM d, yyyy')
    const client  = schedule?.client?.name ?? 'Unknown'
    const msg = `${cleanerName}\n\nJust made the ${action} at ${hour} on ${date}\nWork order: ${client}`
    setToast(msg)
  }

  const handleClockIn = async () => {
    const geo = await getGPS()
    clockIn.mutate({ scheduleId, ...geo ?? {} })
  }

  const handleClockOut = async () => {
    const geo = await getGPS()
    clockOut.mutate({ scheduleId, ...geo ?? {} })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, scheduleId, type: 'completion' }),
      })
      const { presignedUrl } = await res.json()
      await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      await refetch()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!schedule) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  )

  const clockState = getClockState(schedule.clockEvents ?? [], cleanerId)

  const isCompleted = schedule.status === 'COMPLETED'
  const photoCount  = schedule.completionPhotos?.length ?? 0

  const STATUS_COLORS: Record<string, string> = {
    IN_PROGRESS: 'bg-[var(--teal-pale)] text-[var(--teal)]',
    PENDING:     'bg-[var(--blue-pale)] text-[var(--blue)]',
    COMPLETED:   'bg-green-100 text-green-700',
    CANCELLED:   'bg-red-100 text-red-600',
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100"
             style={{ background: 'var(--navy)' }}>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-base truncate">{schedule.client?.name}</div>
            <div className="text-white/50 text-xs">
              {formatTime(new Date(schedule.startTime))} · {schedule.maxHours}h max
            </div>
          </div>
          <span className={`badge text-[10px] ${STATUS_COLORS[schedule.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {schedule.status === 'IN_PROGRESS' ? '● Active' :
             schedule.status === 'COMPLETED'   ? '✓ Done'   :
             schedule.status === 'CANCELLED'   ? 'Cancelled' : 'Upcoming'}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-32">

          {/* Timer block */}
          {(clockState.isClockedIn || clockState.accumulatedSeconds > 0) && (
            <div className={`mx-4 mt-4 rounded-2xl p-4 ${clockState.isClockedIn ? 'bg-[var(--teal-pale)]' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-medium mb-1 text-[var(--teal)]">
                    {clockState.isClockedIn
                      ? `Active · clocked in at ${formatTime(new Date(clockState.lastClockIn!.timestamp))}`
                      : 'Total time worked'}
                  </div>
                  <AccumulatedTimer events={schedule.clockEvents ?? []} userId={cleanerId} />
                </div>
                <Clock size={28} className="opacity-20 text-[var(--teal)]" />
              </div>

              {/* Clock history */}
              {clockState.history.length > 0 && (
                <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-1">
                  {clockState.history.map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className={e.type === 'CLOCK_IN' ? 'text-[var(--teal)] font-medium' : 'text-gray-400'}>
                        {e.type === 'CLOCK_IN' ? '▶ Clock in' : '■ Clock out'}
                      </span>
                      <div className="flex items-center gap-2 text-gray-400">
                        {e.lat && <span className="flex items-center gap-0.5"><MapPin size={8} /> GPS saved</span>}
                        <span>{format(new Date(e.timestamp), 'HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Address */}
          <div className="mx-4 mt-4">
            <a href={`https://maps.google.com/?q=${encodeURIComponent(schedule.client?.address ?? '')}`}
               target="_blank" rel="noopener noreferrer"
               className="flex items-start gap-2 text-sm text-gray-600 hover:text-[var(--blue)]">
              <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--blue)]" />
              <span>{schedule.client?.address}</span>
            </a>
          </div>

          {schedule.accessNotes && (
            <div className="mx-4 mt-3 bg-[var(--blue-pale)] rounded-xl p-3 flex items-start gap-2">
              <Lock size={13} className="mt-0.5 shrink-0 text-[var(--blue)]" />
              <span className="text-xs text-[var(--blue)]">{schedule.accessNotes}</span>
            </div>
          )}

          {schedule.servicesList?.length > 0 && (
            <div className="mx-4 mt-4">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Services</div>
              <div className="flex flex-wrap gap-1.5">
                {schedule.servicesList.map((s: string) => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {schedule.instructions && (
            <div className="mx-4 mt-4">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Instructions</div>
              <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
                {schedule.instructions}
              </div>
            </div>
          )}

          {schedule.assignments?.length > 0 && (
            <div className="mx-4 mt-4">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Team</div>
              <div className="flex flex-col gap-2">
                {schedule.assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center
                                    text-blue-700 text-[10px] font-semibold shrink-0">
                      {initials(a.user?.name ?? '')}
                    </div>
                    <span className="text-sm text-gray-700">{a.user?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo upload */}
          <div className="mx-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Completion Photos
              </div>
              {photoCount > 0 && (
                <span className="bg-[var(--blue)] text-white text-[9px] rounded-full px-1.5 py-0.5">
                  {photoCount}
                </span>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                               border-2 border-dashed border-gray-200 text-gray-400 text-sm
                               hover:border-[var(--blue)] hover:text-[var(--blue)] transition-all cursor-pointer">
              {uploading ? <><Upload size={16} className="animate-bounce" /> Uploading…</> : <><Camera size={16} /> Attach photo</>}
              <input type="file" accept="image/*" capture="environment" className="hidden"
                     onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Action bar */}
        {!isCompleted && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2 z-40">
            <a href={`https://maps.google.com/?q=${encodeURIComponent(schedule.client?.address ?? '')}`}
               target="_blank" rel="noopener noreferrer"
               className="py-3 px-4 rounded-xl bg-[var(--blue-pale)] text-[var(--blue)] text-sm font-semibold
                          flex items-center gap-1.5 shrink-0">
              🗺
            </a>

            {!clockState.isClockedIn && (
              <button onClick={handleClockIn} disabled={clockIn.isPending}
                      className="flex-1 py-3 rounded-xl bg-[var(--blue)] text-white text-sm font-semibold
                                 flex items-center justify-center gap-2 disabled:opacity-60">
                <Play size={14} /> {clockIn.isPending ? 'Clocking in…' : clockState.accumulatedSeconds > 0 ? 'Resume' : 'Clock in'}
              </button>
            )}

            {clockState.isClockedIn && (
              <>
                <button onClick={handleClockOut} disabled={clockOut.isPending}
                        className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold
                                   flex items-center justify-center gap-2">
                  <Square size={14} /> {clockOut.isPending ? '…' : 'Clock out'}
                </button>
                <button onClick={() => complete.mutate({ id: scheduleId })} disabled={complete.isPending}
                        className="flex-1 py-3 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold
                                   flex items-center justify-center gap-2">
                  <CheckCircle size={14} /> {complete.isPending ? '…' : 'Done'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* SMS Toast */}
      {toast && <SmsToast message={toast} onDismiss={() => setToast(null)} />}
    </>
  )
}

// ─── Job Card (summary) ───────────────────────────────────────────────────────

function JobCard({ schedule, currentUserId, onOpen }: {
  schedule: any
  currentUserId: string
  onOpen: () => void
}) {
  const [live, setLive] = useState(0)
  const { isClockedIn, lastClockIn, accumulatedSeconds } = getClockState(schedule.clockEvents ?? [], currentUserId)

  useEffect(() => {
    if (!isClockedIn || !lastClockIn) { setLive(0); return }
    const start = new Date(lastClockIn.timestamp).getTime()
    const tick = () => setLive(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isClockedIn, lastClockIn?.timestamp])

  const isActive    = schedule.status === 'IN_PROGRESS'
  const isCompleted = schedule.status === 'COMPLETED'
  const totalSecs   = accumulatedSeconds + live

  return (
    <button onClick={onOpen} className="w-full text-left">
      <div className={`rounded-2xl border overflow-hidden bg-white shadow-sm transition-all
                       active:scale-[0.98] ${isActive ? 'border-[var(--teal)]' : 'border-[var(--border)]'}
                       ${isCompleted ? 'opacity-60' : ''}`}>
        <div className={`px-4 py-2.5 flex justify-between items-center border-b border-gray-100
                         ${isActive ? 'bg-[var(--teal-pale)]' : 'bg-gray-50'}`}>
          <div className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
            <Clock size={11} />
            {formatTime(new Date(schedule.startTime))}
            {` · ${schedule.maxHours}h max`}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isActive     ? 'bg-[var(--teal)] text-white' :
              isCompleted  ? 'bg-green-100 text-green-700' :
              schedule.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                             'bg-[var(--blue-pale)] text-[var(--blue)]'
            }`}>
              {isActive ? '● Active' : isCompleted ? '✓ Done' : schedule.status === 'CANCELLED' ? 'Cancelled' : 'Upcoming'}
            </span>
            <ChevronRight size={14} className="text-gray-300" />
          </div>
        </div>

        <div className="px-4 py-3">
          {totalSecs > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Clock size={10} className="text-[var(--teal)]" />
              <span className="font-mono text-sm font-bold text-[var(--teal)]">{formatDuration(totalSecs)}</span>
              {isClockedIn && <span className="text-[10px] text-[var(--teal)] animate-pulse">live</span>}
            </div>
          )}

          <div className="font-semibold text-base text-[var(--navy)] mb-1">{schedule.client?.name}</div>
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <MapPin size={11} className="text-[var(--blue)] shrink-0" />
            {schedule.client?.address}
          </div>

          {schedule.accessNotes && (
            <div className="flex items-start gap-1.5 bg-[var(--blue-pale)] rounded-lg px-2.5 py-1.5 mb-2">
              <Lock size={10} className="mt-0.5 shrink-0 text-[var(--blue)]" />
              <span className="text-[10px] text-[var(--blue)]">{schedule.accessNotes}</span>
            </div>
          )}

          {schedule.servicesList?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {schedule.servicesList.slice(0, 4).map((s: string) => (
                <span key={s} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{s}</span>
              ))}
              {schedule.servicesList.length > 4 && (
                <span className="text-[10px] text-gray-400">+{schedule.servicesList.length - 4} more</span>
              )}
            </div>
          )}

          {schedule.assignments?.[0]?.user?.name && (
            <div className="text-[10px] text-gray-400">Lead: {schedule.assignments[0].user.name}</div>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Main CleanerView ─────────────────────────────────────────────────────────

interface CleanerViewProps {
  schedules: ScheduleWithRelations[]
  certifications: Array<{ id: string; expiresAt: Date | null; certification: { name: string } }>
  user: { id: string; name: string }
}

export function CleanerView({ schedules, certifications, user }: CleanerViewProps) {
  const [tab, setTab]         = useState<'schedule' | 'instructions' | 'profile'>('schedule')
  const [openJobId, setOpenJobId] = useState<string | null>(null)

  const expiringCerts = certifications.filter(c => c.expiresAt && getDaysUntilExpiry(c.expiresAt) <= 60)
  const totalHours    = schedules.reduce((s, j) => s + j.maxHours, 0)
  const greeting      = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  return (
    <div className="-m-4 md:-m-6 flex flex-col min-h-[calc(100vh-3.5rem)] bg-gray-50">

      {/* Dark header */}
      <div className="px-5 pt-5 pb-14" style={{ background: 'var(--navy)' }}>
        <div className="text-white/50 text-xs mb-0.5">{greeting}</div>
        <div className="text-white text-xl font-bold">{user.name}</div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-white/50 text-xs">
            {schedules.length} job{schedules.length !== 1 ? 's' : ''} today · {totalHours}h scheduled
          </div>
          <div className="bg-white/10 rounded-lg px-2.5 py-1 text-right">
            <div className="text-white/50 text-[9px] uppercase tracking-wide">Today</div>
            <div className="text-white text-xs font-semibold">{format(new Date(), 'EEE MMM d')}</div>
          </div>
        </div>
      </div>

      {/* Content card */}
      <div className="flex-1 -mt-8 rounded-t-3xl bg-gray-50 flex flex-col">
        {/* Tabs */}
        <div className="bg-white rounded-t-3xl px-5 pt-4 pb-0 shadow-sm">
          <div className="flex gap-1">
            {(['schedule', 'instructions', 'profile'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-2.5 text-xs font-semibold capitalize rounded-lg transition-all
                                  ${tab === t ? 'bg-[var(--navy)] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">

          {/* SCHEDULE */}
          {tab === 'schedule' && (
            <div className="flex flex-col gap-3">
              {expiringCerts.map(cert => {
                const days = cert.expiresAt ? getDaysUntilExpiry(cert.expiresAt) : null
                return (
                  <div key={cert.id} className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <div className="text-amber-700 text-xs font-semibold mb-0.5">⚠ Certification expiring</div>
                    <div className="text-amber-600 text-xs">
                      {cert.certification.name} expires {cert.expiresAt ? formatDate(cert.expiresAt) : 'soon'}
                      {days !== null && ` (${days} days)`}
                    </div>
                    <button className="text-[var(--blue)] text-xs font-medium mt-1.5">Contact manager →</button>
                  </div>
                )
              })}

              {schedules.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🎉</div>
                  <div className="font-medium">No jobs today</div>
                  <div className="text-sm mt-1">Enjoy your day off!</div>
                </div>
              ) : (
                schedules.map(s => (
                  <JobCard key={s.id} schedule={s} currentUserId={user.id}
                           onOpen={() => setOpenJobId(s.id)} />
                ))
              )}
            </div>
          )}

          {/* INSTRUCTIONS */}
          {tab === 'instructions' && (
            <div className="flex flex-col gap-3">
              {schedules.filter(s => s.instructions).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="font-medium">No special instructions</div>
                </div>
              ) : (
                schedules.filter(s => s.instructions).map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-sm">
                    <div className="font-semibold text-sm text-[var(--navy)] mb-1">{s.client?.name}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{s.instructions}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PROFILE */}
          {tab === 'profile' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center
                                justify-center font-bold text-xl shrink-0">
                  {initials(user.name)}
                </div>
                <div>
                  <div className="font-semibold text-base">{user.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Cleaner</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--border)] p-4 shadow-sm">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Certifications</div>
                {certifications.length === 0 ? (
                  <p className="text-sm text-gray-400">No certifications on file.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {certifications.map(c => {
                      const days = c.expiresAt ? getDaysUntilExpiry(c.expiresAt) : null
                      const color = days === null ? 'text-green-600' : days < 0 ? 'text-red-600' :
                                    days <= 30    ? 'text-red-500'   : days <= 60 ? 'text-amber-600' : 'text-green-600'
                      return (
                        <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-sm font-medium">{c.certification.name}</span>
                          <span className={`text-xs ${color}`}>
                            {days === null ? 'No expiry' : days < 0 ? 'Expired' : `${days}d left`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center z-10">
        {[
          { icon: '📅', label: 'Schedule',  t: 'schedule'     },
          { icon: '📋', label: 'Tasks',     t: 'instructions' },
          { icon: '🖼',  label: 'Photos',    t: null           },
          { icon: '👤', label: 'Profile',   t: 'profile'      },
        ].map(item => (
          <button key={item.label}
                  onClick={() => item.t && setTab(item.t as any)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium
                              transition-colors ${tab === item.t ? 'text-[var(--blue)]' : 'text-gray-400'}`}>
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Job Detail Modal */}
      {openJobId && (
        <JobDetailModal
          scheduleId={openJobId}
          cleanerName={user.name}
          cleanerId={user.id}
          onClose={() => setOpenJobId(null)}
        />
      )}
    </div>
  )
}

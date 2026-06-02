'use client'

import { useState, useEffect } from 'react'
import { MapPin, Lock, Clock, Play, Square, CheckCircle, Camera, ChevronRight, X, Upload } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { getDaysUntilExpiry, formatDate, formatTime, initials } from '@/lib/utils'
import { format } from 'date-fns'
import type { ScheduleWithRelations } from '@/types'

// ─── Live Timer ───────────────────────────────────────────────────────────────

function LiveTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(since).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [since])

  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
  const s = String(elapsed % 60).padStart(2, '0')
  return <span className="font-mono text-3xl font-bold text-[var(--teal)] tracking-widest">{h}:{m}:{s}</span>
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────

function JobDetailModal({ schedule, currentUserId, onClose }: {
  schedule: any
  currentUserId: string
  onClose: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(schedule.completionPhotos?.length ?? 0)

  const utils = trpc.useContext()
  const clockIn  = trpc.clock.clockIn.useMutation({ onSuccess: () => { utils.schedule.list.invalidate(); onClose() } })
  const clockOut = trpc.clock.clockOut.useMutation({ onSuccess: () => { utils.schedule.list.invalidate(); onClose() } })
  const complete = trpc.schedule.markComplete.useMutation({ onSuccess: () => { utils.schedule.list.invalidate(); onClose() } })

  const lastClockIn  = schedule.clockEvents?.filter((e: any) => e.userId === currentUserId && e.type === 'CLOCK_IN').at(-1)
  const lastClockOut = schedule.clockEvents?.filter((e: any) => e.userId === currentUserId && e.type === 'CLOCK_OUT').at(-1)
  const isClockedIn  = !!lastClockIn && !lastClockOut
  const isCompleted  = schedule.status === 'COMPLETED'

  const handleClockIn = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => clockIn.mutate({ scheduleId: schedule.id, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      ()  => clockIn.mutate({ scheduleId: schedule.id })
    ) ?? clockIn.mutate({ scheduleId: schedule.id })
  }

  const handleClockOut = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => clockOut.mutate({ scheduleId: schedule.id, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => clockOut.mutate({ scheduleId: schedule.id })
    ) ?? clockOut.mutate({ scheduleId: schedule.id })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, scheduleId: schedule.id, type: 'completion' }),
      })
      const { presignedUrl } = await res.json()
      await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      setUploadedCount(uploadedCount + 1)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    IN_PROGRESS: 'bg-[var(--teal-pale)] text-[var(--teal)]',
    PENDING:     'bg-[var(--blue-pale)] text-[var(--blue)]',
    COMPLETED:   'bg-green-100 text-green-700',
    CANCELLED:   'bg-red-100 text-red-600',
  }
  const statusColor = STATUS_COLORS[schedule.status as string] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Modal header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100"
           style={{ background: 'var(--navy)' }}>
        <button onClick={onClose} className="text-white/60 hover:text-white">
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-base truncate">{schedule.client?.name}</div>
          <div className="text-white/50 text-xs">{formatTime(new Date(schedule.startTime))} · {schedule.maxHours}h max</div>
        </div>
        <span className={`badge text-[10px] ${statusColor}`}>
          {schedule.status === 'IN_PROGRESS' ? '● Active' : schedule.status === 'PENDING' ? 'Upcoming' : schedule.status === 'COMPLETED' ? '✓ Done' : 'Cancelled'}
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* Active timer */}
        {isClockedIn && lastClockIn && (
          <div className="mx-4 mt-4 bg-[var(--teal-pale)] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[var(--teal)] font-medium mb-1">
                Clocked in {formatTime(new Date(lastClockIn.timestamp))}
              </div>
              <LiveTimer since={lastClockIn.timestamp} />
            </div>
            <Clock size={28} className="text-[var(--teal)] opacity-30" />
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

        {/* Access notes */}
        {schedule.accessNotes && (
          <div className="mx-4 mt-3 bg-[var(--blue-pale)] rounded-xl p-3 flex items-start gap-2">
            <Lock size={13} className="mt-0.5 shrink-0 text-[var(--blue)]" />
            <span className="text-xs text-[var(--blue)]">{schedule.accessNotes}</span>
          </div>
        )}

        {/* Services */}
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

        {/* Instructions */}
        {schedule.instructions && (
          <div className="mx-4 mt-4">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Instructions</div>
            <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
              {schedule.instructions}
            </div>
          </div>
        )}

        {/* Assigned cleaners */}
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

        {/* Photos section */}
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Completion Photos
              {uploadedCount > 0 && <span className="ml-1 bg-[var(--blue)] text-white rounded-full px-1.5 py-0.5 text-[9px]">{uploadedCount}</span>}
            </div>
          </div>
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                             border-2 border-dashed border-gray-200 text-gray-400 text-sm
                             hover:border-[var(--blue)] hover:text-[var(--blue)] transition-all cursor-pointer">
            {uploading ? (
              <><Upload size={16} className="animate-bounce" /> Uploading…</>
            ) : (
              <><Camera size={16} /> Attach photo</>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Action bar */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <a href={`https://maps.google.com/?q=${encodeURIComponent(schedule.client?.address ?? '')}`}
             target="_blank" rel="noopener noreferrer"
             className="py-3 px-4 rounded-xl bg-[var(--blue-pale)] text-[var(--blue)] text-sm font-semibold flex items-center gap-1.5">
            🗺 Map
          </a>

          {!isClockedIn && schedule.status === 'PENDING' && (
            <button onClick={handleClockIn} disabled={clockIn.isPending}
                    className="flex-1 py-3 rounded-xl bg-[var(--blue)] text-white text-sm font-semibold
                               flex items-center justify-center gap-2 disabled:opacity-60">
              <Play size={14} /> {clockIn.isPending ? 'Clocking in…' : 'Clock in'}
            </button>
          )}

          {isClockedIn && (
            <>
              <button onClick={handleClockOut} disabled={clockOut.isPending}
                      className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold
                                 flex items-center justify-center gap-2">
                <Square size={14} /> {clockOut.isPending ? '…' : 'Clock out'}
              </button>
              <button onClick={() => complete.mutate({ id: schedule.id })} disabled={complete.isPending}
                      className="flex-1 py-3 rounded-xl bg-[var(--teal)] text-white text-sm font-semibold
                                 flex items-center justify-center gap-2">
                <CheckCircle size={14} /> {complete.isPending ? '…' : 'Mark done'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Job Card (summary) ───────────────────────────────────────────────────────

function JobCard({ schedule, currentUserId, onOpen }: {
  schedule: any
  currentUserId: string
  onOpen: () => void
}) {
  const lastClockIn  = schedule.clockEvents?.filter((e: any) => e.userId === currentUserId && e.type === 'CLOCK_IN').at(-1)
  const lastClockOut = schedule.clockEvents?.filter((e: any) => e.userId === currentUserId && e.type === 'CLOCK_OUT').at(-1)
  const isClockedIn  = !!lastClockIn && !lastClockOut
  const isActive     = schedule.status === 'IN_PROGRESS'
  const isCompleted  = schedule.status === 'COMPLETED'

  return (
    <button onClick={onOpen} className="w-full text-left">
      <div className={`rounded-2xl border overflow-hidden bg-white shadow-sm transition-all
                       active:scale-[0.98] ${isActive ? 'border-[var(--teal)]' : 'border-[var(--border)]'}
                       ${isCompleted ? 'opacity-60' : ''}`}>
        {/* Card header */}
        <div className={`px-4 py-2.5 flex justify-between items-center
                         ${isActive ? 'bg-[var(--teal-pale)]' : 'bg-gray-50'} border-b border-gray-100`}>
          <div className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
            <Clock size={11} />
            {formatTime(new Date(schedule.startTime))}
            {schedule.endTime && ` – ${formatTime(new Date(schedule.endTime))}`}
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

        {/* Card body */}
        <div className="px-4 py-3">
          {/* Live timer for active */}
          {isClockedIn && lastClockIn && (
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[10px] text-[var(--teal)] font-medium">
                Clocked in {formatTime(new Date(lastClockIn.timestamp))}
              </div>
              <LiveTimer since={lastClockIn.timestamp} />
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

          {schedule.assignments?.length > 0 && (
            <div className="text-[10px] text-gray-400 mt-1">
              Lead: {schedule.assignments[0]?.user?.name}
            </div>
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
  const [tab, setTab]           = useState<'schedule' | 'instructions' | 'profile'>('schedule')
  const [openJob, setOpenJob]   = useState<any>(null)

  const expiringCerts = certifications.filter(c => c.expiresAt && getDaysUntilExpiry(c.expiresAt) <= 60)

  const totalHours   = schedules.reduce((s, j) => s + j.maxHours, 0)
  const greeting     = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  return (
    // Break out of the default p-4/p-6 padding from DashboardShell
    <div className="-m-4 md:-m-6 flex flex-col min-h-[calc(100vh-3.5rem)] bg-gray-50">

      {/* ── Dark header ── */}
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

      {/* ── Content card (overlaps header) ── */}
      <div className="flex-1 -mt-8 rounded-t-3xl bg-gray-50 flex flex-col">

        {/* Top tabs */}
        <div className="bg-white rounded-t-3xl px-5 pt-4 pb-0 shadow-sm">
          <div className="flex gap-1">
            {(['schedule', 'instructions', 'profile'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-2.5 text-xs font-semibold capitalize rounded-lg transition-all
                                  ${tab === t
                                    ? 'bg-[var(--navy)] text-white'
                                    : 'text-gray-400 hover:text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">

          {/* ── SCHEDULE TAB ── */}
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
                           onOpen={() => setOpenJob(s)} />
                ))
              )}
            </div>
          )}

          {/* ── INSTRUCTIONS TAB ── */}
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

          {/* ── PROFILE TAB ── */}
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
                      const days  = c.expiresAt ? getDaysUntilExpiry(c.expiresAt) : null
                      const color = days === null ? 'text-green-600' : days < 0 ? 'text-red-600' :
                                    days <= 30    ? 'text-red-500'   : days <= 60 ? 'text-amber-600' : 'text-green-600'
                      return (
                        <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-sm font-medium">{c.certification.name}</span>
                          <span className={`text-xs ${color}`}>
                            {days === null ? 'No expiry' : days < 0 ? `Expired` : `${days}d left`}
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

      {/* ── Bottom Navigation ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100
                      flex items-center safe-bottom z-10">
        {[
          { icon: '📅', label: 'Schedule',  t: 'schedule'     },
          { icon: '📋', label: 'Tasks',     t: 'instructions' },
          { icon: '🖼', label: 'Photos',    t: null           },
          { icon: '👤', label: 'Profile',   t: 'profile'      },
        ].map(item => (
          <button key={item.label}
                  onClick={() => item.t && setTab(item.t as any)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium
                              transition-colors ${tab === item.t
                                ? 'text-[var(--blue)]'
                                : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Job Detail Modal ── */}
      {openJob && (
        <JobDetailModal schedule={openJob} currentUserId={user.id} onClose={() => setOpenJob(null)} />
      )}
    </div>
  )
}

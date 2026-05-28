'use client'

import { useState } from 'react'
import { MapPin, Clock, Lock, ChevronDown, ChevronUp, Play, CheckCircle, Camera } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface JobCardProps {
  schedule: any
  currentUserId: string
  isActive?: boolean
}

export function JobCard({ schedule, currentUserId, isActive }: JobCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [uploading, setUploading] = useState(false)

  const utils = trpc.useContext()

  const clockIn = trpc.clock.clockIn.useMutation({
    onSuccess: () => utils.schedule.list.invalidate(),
  })
  const clockOut = trpc.clock.clockOut.useMutation({
    onSuccess: () => utils.schedule.list.invalidate(),
  })
  const complete = trpc.schedule.markComplete.useMutation({
    onSuccess: () => utils.schedule.list.invalidate(),
  })

  const lastClockIn = schedule.clockEvents
    ?.filter((e: any) => e.userId === currentUserId && e.type === 'CLOCK_IN')
    .at(-1)
  const lastClockOut = schedule.clockEvents
    ?.filter((e: any) => e.userId === currentUserId && e.type === 'CLOCK_OUT')
    .at(-1)

  const isClockedIn = !!lastClockIn && !lastClockOut
  const isCompleted = schedule.status === 'COMPLETED'

  const handleClockIn = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => clockIn.mutate({
          scheduleId: schedule.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => clockIn.mutate({ scheduleId: schedule.id })
      )
    } else {
      clockIn.mutate({ scheduleId: schedule.id })
    }
  }

  const handleClockOut = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => clockOut.mutate({ scheduleId: schedule.id, lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => clockOut.mutate({ scheduleId: schedule.id })
      )
    } else {
      clockOut.mutate({ scheduleId: schedule.id })
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          scheduleId: schedule.id,
          type: 'completion',
        }),
      })
      const { presignedUrl } = await res.json()
      await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    } finally {
      setUploading(false)
    }
  }

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(schedule.client?.address ?? '')}`

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden bg-white shadow-sm',
      isActive && 'border-[var(--teal)] border-[1.5px]',
      !isActive && 'border-[var(--border)]',
      isCompleted && 'opacity-70'
    )}>
      {/* Header */}
      <div className={cn(
        'px-3 py-2 flex justify-between items-center border-b border-gray-100',
        isActive && 'bg-[var(--teal-pale)]'
      )}>
        <div className="text-[10px] font-semibold text-[var(--blue)] flex items-center gap-1">
          <Clock size={11} />
          {schedule.startTime && formatTime(new Date(schedule.startTime))}
          {` · ${schedule.maxHours}h max`}
        </div>
        <span className={cn(
          'badge text-[9px]',
          schedule.status === 'IN_PROGRESS' && 'bg-[var(--teal-pale)] text-[var(--teal)]',
          schedule.status === 'PENDING'     && 'bg-[var(--blue-pale)] text-[var(--blue)]',
          schedule.status === 'COMPLETED'   && 'bg-green-100 text-green-700',
          schedule.status === 'CANCELLED'   && 'bg-red-100 text-red-600',
        )}>
          {schedule.status === 'IN_PROGRESS' && '● Active'}
          {schedule.status === 'PENDING'     && 'Upcoming'}
          {schedule.status === 'COMPLETED'   && '✓ Done'}
          {schedule.status === 'CANCELLED'   && 'Cancelled'}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <div className="font-semibold text-[13px] text-[var(--navy)] mb-1">
          {schedule.client?.name}
        </div>
        <div className="text-[10px] text-gray-400 mb-2 flex items-center gap-1">
          <MapPin size={10} /> {schedule.client?.address}
        </div>

        {schedule.accessNotes && (
          <div className="text-[10px] bg-[var(--blue-pale)] text-[var(--blue)] rounded-md
                          px-2 py-1.5 mb-2 flex items-start gap-1">
            <Lock size={10} className="mt-0.5 shrink-0" />
            {schedule.accessNotes}
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          {schedule.servicesList?.map((s: string) => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
              {s}
            </span>
          ))}
        </div>

        {schedule.instructions && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-[var(--blue)] flex items-center gap-1 mb-2"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? 'Hide' : 'Show'} instructions
          </button>
        )}

        {expanded && schedule.instructions && (
          <div className="text-[11px] text-gray-500 leading-relaxed mb-2 p-2 bg-gray-50 rounded-lg">
            {schedule.instructions}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="flex gap-1.5 px-3 py-2 border-t border-gray-100 bg-gray-50">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-md bg-[var(--blue-pale)] text-[var(--blue)]
                       text-[10px] font-semibold flex items-center justify-center gap-1"
          >
            🗺 Map
          </a>

          {!isClockedIn && schedule.status === 'PENDING' && (
            <button
              onClick={handleClockIn}
              disabled={clockIn.isLoading}
              className="flex-1 py-1.5 rounded-md bg-[var(--blue)] text-white
                         text-[10px] font-semibold flex items-center justify-center gap-1
                         disabled:opacity-60"
            >
              <Play size={10} /> {clockIn.isLoading ? '…' : 'Clock in'}
            </button>
          )}

          {isClockedIn && (
            <>
              <button
                onClick={handleClockOut}
                disabled={clockOut.isLoading}
                className="flex-1 py-1.5 rounded-md bg-amber-500 text-white
                           text-[10px] font-semibold flex items-center justify-center gap-1"
              >
                ⏹ {clockOut.isLoading ? '…' : 'Clock out'}
              </button>
              <label className="flex-1 py-1.5 rounded-md bg-gray-200 text-gray-600
                                text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer">
                <Camera size={10} />
                {uploading ? 'Uploading…' : 'Photo'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <button
                onClick={() => complete.mutate({ id: schedule.id })}
                disabled={complete.isLoading}
                className="flex-1 py-1.5 rounded-md bg-[var(--teal)] text-white
                           text-[10px] font-semibold flex items-center justify-center gap-1"
              >
                <CheckCircle size={10} /> {complete.isLoading ? '…' : 'Done'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

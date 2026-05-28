'use client'

import { JobCard } from '@/components/cleaner/JobCard'
import { getDaysUntilExpiry, getCertStatusColor, formatDate } from '@/lib/utils'
import type { ScheduleWithRelations } from '@/types'
import { format } from 'date-fns'

interface CleanerViewProps {
  schedules: ScheduleWithRelations[]
  certifications: Array<{
    id: string
    expiresAt: Date | null
    certification: { name: string }
  }>
  user: { id: string; name: string }
}

export function CleanerView({ schedules, certifications, user }: CleanerViewProps) {
  const expiringCerts = certifications.filter(c => {
    if (!c.expiresAt) return false
    const days = getDaysUntilExpiry(c.expiresAt)
    return days <= 60
  })

  const activeJob = schedules.find(s => s.status === 'IN_PROGRESS')
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="max-w-sm mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="text-xs text-gray-400">{greeting}</div>
        <div className="text-xl font-semibold">{user.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {format(new Date(), 'EEEE, MMMM d')} · {schedules.length} job{schedules.length !== 1 ? 's' : ''} today
        </div>
      </div>

      {/* Cert alerts */}
      {expiringCerts.map(cert => {
        const days = cert.expiresAt ? getDaysUntilExpiry(cert.expiresAt) : null
        return (
          <div key={cert.id}
               className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px]">
            <div className="font-semibold text-amber-700 mb-0.5">⚠️ Certification expiring soon</div>
            <div className="text-gray-600">
              {cert.certification.name} expires {cert.expiresAt ? formatDate(cert.expiresAt) : 'soon'}
              {days !== null && ` (${days} days)`}
            </div>
          </div>
        )
      })}

      {/* Schedule cards */}
      {schedules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-2">🎉</div>
          <div className="font-medium">No jobs scheduled today</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map(s => (
            <JobCard
              key={s.id}
              schedule={s}
              currentUserId={user.id}
              isActive={s.status === 'IN_PROGRESS'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

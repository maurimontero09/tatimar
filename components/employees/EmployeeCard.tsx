'use client'

import { useState } from 'react'
import { initials, getDaysUntilExpiry } from '@/lib/utils'
import { EmployeeProfileModal } from './EmployeeProfileModal'
import { AssignModal } from './AssignModal'

interface Certification {
  id: string
  expiresAt: Date | null
  certification: { name: string }
}

interface Employee {
  id: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  certifications: Certification[]
  clockEvents: { type: string }[]
}

interface Props {
  employee: Employee
  colorClass: string
}

export function EmployeeCard({ employee: emp, colorClass }: Props) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [assignOpen, setAssignOpen]   = useState(false)

  const clockIns  = emp.clockEvents.filter(e => e.type === 'CLOCK_IN').length
  const clockOuts = emp.clockEvents.filter(e => e.type === 'CLOCK_OUT').length
  const estHours  = Math.min(clockIns, clockOuts) * 2.5

  return (
    <>
      <div className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm
                      hover:shadow-md hover:border-blue-200 transition-all flex flex-col gap-3 cursor-pointer"
           onClick={() => setProfileOpen(true)}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center
                           font-semibold text-sm shrink-0 ${colorClass}`}>
            {initials(emp.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{emp.name}</div>
            <div className="text-xs text-gray-400">Cleaner</div>
          </div>
          <span className={`badge text-[10px] ${
            emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {emp.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Contact */}
        <div className="text-xs text-gray-400">
          {emp.email}
          {emp.phone && <span className="ml-2">· {emp.phone}</span>}
        </div>

        {/* Certifications */}
        <div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            Certifications
          </div>
          {emp.certifications.length === 0 ? (
            <span className="text-xs text-gray-400">None on file</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {emp.certifications.map(c => {
                const days  = c.expiresAt ? getDaysUntilExpiry(c.expiresAt) : null
                const color = days === null ? 'bg-green-50 text-green-700' :
                              days < 0      ? 'bg-red-100 text-red-700' :
                              days <= 30    ? 'bg-red-50 text-red-700' :
                              days <= 60    ? 'bg-amber-50 text-amber-700' :
                                             'bg-green-50 text-green-700'
                const icon  = days !== null && days <= 0  ? '✗' :
                              days !== null && days <= 60 ? '⚠' : '✓'
                return (
                  <span key={c.id}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${color}`}
                        title={c.expiresAt ? `Expires ${c.expiresAt.toLocaleDateString()}` : ''}>
                    {icon} {c.certification.name}
                    {days !== null && days <= 60 && ` · ${days}d`}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Stats + actions */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            This week: <strong className="text-gray-700">{estHours.toFixed(1)} hrs</strong>
          </div>
          <div className="flex gap-1.5">
            <button className="btn btn-secondary text-xs py-1 px-2.5"
                    onClick={e => { e.stopPropagation(); setProfileOpen(true) }}>
              Profile
            </button>
            <button className="btn btn-primary text-xs py-1 px-2.5"
                    onClick={e => { e.stopPropagation(); setAssignOpen(true) }}>Assign</button>
          </div>
        </div>
      </div>

      {profileOpen && (
        <EmployeeProfileModal employeeId={emp.id} onClose={() => setProfileOpen(false)} />
      )}

      {assignOpen && (
        <AssignModal employeeId={emp.id} employeeName={emp.name} onClose={() => setAssignOpen(false)} />
      )}
    </>
  )
}

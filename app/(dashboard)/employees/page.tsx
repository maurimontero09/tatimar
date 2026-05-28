import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { getDaysUntilExpiry, getCertStatusColor, initials } from '@/lib/utils'
import Link from 'next/link'

export default async function EmployeesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  const employees = await prisma.user.findMany({
    where: { role: 'CLEANER' },
    include: {
      certifications: {
        include: { certification: true },
        orderBy: { expiresAt: 'asc' },
      },
      clockEvents: {
        where: {
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const AVATAR_COLORS = ['avatar-blue', 'avatar-teal', 'avatar-amber', 'avatar-navy']
  const BG_COLORS = ['bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700',
                     'bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-700']

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-gray-400">
            {employees.filter(e => e.isActive).length} active · {employees.filter(e => !e.isActive).length} inactive
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-[var(--border)]
                          rounded-lg px-3 py-1.5 w-48">
            <span className="text-gray-400 text-sm">🔍</span>
            <input type="text" placeholder="Search employees…"
                   className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <button className="btn btn-primary text-sm">+ Add Employee</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {employees.map((emp, i) => {
          const colorClass = BG_COLORS[i % BG_COLORS.length]
          const expiringCerts = emp.certifications.filter(c => {
            if (!c.expiresAt) return false
            return getDaysUntilExpiry(c.expiresAt) <= 60
          })

          // Rough weekly hours (clock in/out pairs)
          const clockIns  = emp.clockEvents.filter(e => e.type === 'CLOCK_IN').length
          const clockOuts = emp.clockEvents.filter(e => e.type === 'CLOCK_OUT').length
          const estHours  = Math.min(clockIns, clockOuts) * 2.5 // rough estimate

          return (
            <div key={emp.id}
                 className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm
                            hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col gap-3">
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
                <span className={`badge text-[10px] ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
                      const days = c.expiresAt ? getDaysUntilExpiry(c.expiresAt) : null
                      const color = days === null ? 'bg-green-50 text-green-700' :
                                    days < 0      ? 'bg-red-100 text-red-700' :
                                    days <= 30     ? 'bg-red-50 text-red-700' :
                                    days <= 60     ? 'bg-amber-50 text-amber-700' :
                                                    'bg-green-50 text-green-700'
                      const icon  = days !== null && days <= 0 ? '✗' :
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
                  <button className="btn btn-secondary text-xs py-1 px-2.5">Profile</button>
                  <button className="btn btn-primary text-xs py-1 px-2.5">Assign</button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add new card */}
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4
                        flex flex-col items-center justify-center gap-2 cursor-pointer
                        hover:border-[var(--blue)] hover:bg-blue-50/30 transition-all min-h-[200px]">
          <div className="text-3xl text-gray-300">+</div>
          <div className="text-sm text-gray-400">Add new employee</div>
        </div>
      </div>
    </div>
  )
}

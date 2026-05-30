import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { getDaysUntilExpiry } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Redirect cleaners to their view
  if (session.user.role === 'CLEANER') redirect('/cleaner')
  if (session.user.role === 'ACCOUNTANT') redirect('/payroll')

  const today = new Date()

  const [todaySchedules, expiringCerts, activeEmployees] = await Promise.all([
    prisma.schedule.findMany({
      where: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
      include: {
        client: true,
        assignments: { include: { user: true } },
        clockEvents: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
      orderBy: { startTime: 'asc' },
    }).catch(() => []),
    prisma.userCertification.findMany({
      where: { expiresAt: { lte: addDays(today, 60), gte: today } },
      include: { user: { select: { name: true } }, certification: true },
      orderBy: { expiresAt: 'asc' },
      take: 5,
    }).catch(() => []),
    prisma.user.count({ where: { role: 'CLEANER', isActive: true } }).catch(() => 0),
  ])

  const completed = todaySchedules.filter(s => s.status === 'COMPLETED').length
  const inProgress = todaySchedules.filter(s => s.status === 'IN_PROGRESS').length
  const alerts = expiringCerts.length

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {today.toLocaleDateString('en-CA', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Jobs Today',      value: todaySchedules.length, icon: '📅', change: `${inProgress} in progress` },
          { label: 'Completed',       value: completed, icon: '✓', change: `${Math.round(completed/todaySchedules.length*100)||0}% rate` },
          { label: 'Active Cleaners', value: activeEmployees, icon: '👥', change: 'Available today' },
          { label: 'Alerts',          value: alerts, icon: '⚠', change: 'Cert expiring <60d', danger: alerts > 0 },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className={`text-3xl font-semibold mb-1 ${stat.danger ? 'text-red-600' : ''}`}>{stat.value}</div>
            <div className="text-[11px] text-gray-400">{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Jobs table */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Today's Jobs</div>
              <div className="text-xs text-gray-400">Live status</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Time','Client','Assigned To','Status','Hours'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todaySchedules.map(s => {
                  const assignee = s.assignments[0]?.user
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-500">
                        {s.startTime.toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'})}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{s.client.name}</div>
                        <div className="text-[10px] text-gray-400">{s.client.address}</div>
                      </td>
                      <td className="px-4 py-3">
                        {assignee && (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[9px] font-semibold shrink-0">
                              {assignee.name.split(' ').map((n:string) => n[0]).join('').slice(0,2)}
                            </div>
                            <span className="text-sm">{assignee.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] ${
                          s.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' :
                          s.status === 'COMPLETED'   ? 'bg-blue-100 text-blue-700' :
                          s.status === 'CANCELLED'   ? 'bg-red-100 text-red-600' :
                                                       'bg-gray-100 text-gray-500'
                        }`}>
                          {s.status.replace('_',' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-500">
                        — / {s.maxHours}h
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cert alerts sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="font-semibold text-sm">⚠️ Cert Alerts</div>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {expiringCerts.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4">All certifications valid ✓</div>
              ) : (
                expiringCerts.map(c => {
                  const days = c.expiresAt ? getDaysUntilExpiry(c.expiresAt) : null
                  return (
                    <div key={c.id}
                         className={`flex justify-between items-center p-2 rounded-lg border text-xs ${
                           days !== null && days <= 30
                             ? 'bg-red-50 border-red-200'
                             : 'bg-amber-50 border-amber-200'
                         }`}>
                      <div>
                        <div className="font-medium">{c.user.name}</div>
                        <div className="text-gray-500">{c.certification.name}</div>
                      </div>
                      <span className={`badge ${days !== null && days <= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {days}d
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

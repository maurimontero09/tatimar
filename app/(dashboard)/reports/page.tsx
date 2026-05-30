import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'

const REPORTS = [
  { icon: '📊', title: 'Payroll Summary',      desc: 'Hours worked and gross pay per employee',   action: 'Generate', primary: true },
  { icon: '📋', title: 'Attendance Report',    desc: 'Clock-in/out logs, late arrivals, absences', action: 'Generate', primary: true },
  { icon: '🏢', title: 'Client Report',        desc: 'Jobs per client, completion rates, hours',   action: 'Generate', primary: true },
  { icon: '🎖️', title: 'Certification Status', desc: 'All expiry dates and renewal requirements', action: 'Generate', primary: false },
  { icon: '📍', title: 'Location Report',      desc: 'Jobs by location, travel times, coverage',   action: 'Generate', primary: false },
  { icon: '🔄', title: 'Notion Sync Log',      desc: 'All sync events, errors, and conflicts',     action: 'View Log',  primary: false },
]

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['SUPER_ADMIN', 'ACCOUNTANT', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-gray-400">Generate and export operational reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map(r => (
          <div key={r.title}
               className="bg-white rounded-xl border border-[var(--border)] shadow-sm
                          hover:shadow-md transition-all overflow-hidden group cursor-pointer">
            <div className="px-5 py-6 text-center">
              <div className="text-4xl mb-3">{r.icon}</div>
              <div className="font-semibold text-sm mb-1.5">{r.title}</div>
              <div className="text-xs text-gray-400 mb-5 leading-relaxed">{r.desc}</div>
              <button className={`btn text-sm w-full justify-center ${r.primary ? 'btn-primary' : 'btn-secondary'}`}>
                {r.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

const HOURLY_RATES: Record<string, number> = {
  'Senior Cleaner': 19.00,
  'Lead Cleaner':   21.00,
  'Cleaner':        17.00,
}

export default async function PayrollPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['SUPER_ADMIN','ACCOUNTANT'].includes(session.user.role)) redirect('/dashboard')

  const from = startOfMonth(new Date())
  const to   = endOfMonth(new Date())

  const cleaners = await prisma.user.findMany({
    where: { role: 'CLEANER', isActive: true },
    include: {
      clockEvents: {
        where: { timestamp: { gte: from, lte: to } },
        orderBy: { timestamp: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Calculate hours per cleaner
  const payrollRows = cleaners.map(cleaner => {
    const events = cleaner.clockEvents
    let regularHours = 0, overtimeHours = 0

    // Pair clock in/out
    for (let i = 0; i < events.length; i += 2) {
      const clockIn  = events[i]
      const clockOut = events[i + 1]
      if (clockIn?.type === 'CLOCK_IN' && clockOut?.type === 'CLOCK_OUT') {
        const hours = differenceInMinutes(clockOut.timestamp, clockIn.timestamp) / 60
        const daily = Math.min(hours, 8)
        const ot    = Math.max(0, hours - 8)
        regularHours  += daily
        overtimeHours += ot
      }
    }

    regularHours  = Math.round(regularHours * 100) / 100
    overtimeHours = Math.round(overtimeHours * 100) / 100
    const rate    = 18.00 // default — in production, stored on user profile
    const gross   = regularHours * rate + overtimeHours * rate * 1.5

    return { cleaner, regularHours, overtimeHours, totalHours: regularHours + overtimeHours, rate, gross }
  })

  const totalGross = payrollRows.reduce((s, r) => s + r.gross, 0)
  const totalHours = payrollRows.reduce((s, r) => s + r.totalHours, 0)
  const totalOT    = payrollRows.reduce((s, r) => s + r.overtimeHours, 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Payroll</h1>
          <p className="text-sm text-gray-400">
            {from.toLocaleDateString('en-CA',{month:'long',year:'numeric'})} · Current period
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary text-sm">⬇ Export CSV</button>
          <button className="btn btn-teal text-sm">⬇ Export PDF</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Hours',    value: totalHours.toFixed(1), suffix: 'hrs' },
          { label: 'Gross Payroll',  value: formatCurrency(totalGross) },
          { label: 'Overtime Hours', value: totalOT.toFixed(1), suffix: 'hrs' },
          { label: 'Employees',      value: cleaners.length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm">
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{s.label}</div>
            <div className="text-2xl font-semibold">{s.value}{s.suffix && <span className="text-sm text-gray-400 ml-1">{s.suffix}</span>}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <div className="font-semibold text-sm">Employee Hours Breakdown</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee','Regular Hrs','Overtime','Total Hrs','Rate/hr','Gross Pay','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payrollRows.map(({ cleaner, regularHours, overtimeHours, totalHours, rate, gross }) => (
                <tr key={cleaner.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center
                                      text-blue-700 text-[10px] font-semibold shrink-0">
                        {cleaner.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
                      </div>
                      <div className="font-medium text-sm">{cleaner.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{regularHours.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-400">{overtimeHours.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold">{totalHours.toFixed(1)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{formatCurrency(rate)}</td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-green-700">
                    {formatCurrency(gross)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-green-100 text-green-700 text-[10px]">Approved</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

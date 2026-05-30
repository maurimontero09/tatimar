import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { EmployeeCard } from '@/components/employees/EmployeeCard'

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
        {employees.map((emp, i) => (
          <EmployeeCard key={emp.id} employee={emp} colorClass={BG_COLORS[i % BG_COLORS.length]} />
        ))}

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

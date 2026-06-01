import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { NewClientModal } from '@/components/clients/NewClientModal'
import { ClientRow } from '@/components/clients/ClientRow'

const FREQUENCY_LABELS: Record<string, string> = {
  daily:   'Daily',
  '2x_week': '2× week',
  '3x_week': '3× week',
  weekly:  'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
}

export default async function ClientsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: {
      schedules: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { date: 'desc' },
        take: 1,
        include: { assignments: { include: { user: { select: { name: true } } } } },
      },
    },
  }).catch(() => [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-gray-400">
            {clients.filter(c => c.isActive).length} active contracts
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-[var(--border)]
                          rounded-lg px-3 py-1.5 flex-1 sm:w-48 sm:flex-none">
            <span className="text-gray-400 text-sm">🔍</span>
            <input type="text" placeholder="Search clients…"
                   className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <NewClientModal />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Client', 'Address', 'Type', 'Frequency', 'Last Job', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold
                                          text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <ClientRow key={client.id} client={client} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

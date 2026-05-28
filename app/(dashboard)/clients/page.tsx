import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'

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
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-gray-400">
            {clients.filter(c => c.isActive).length} active contracts
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-[var(--border)]
                          rounded-lg px-3 py-1.5 w-48">
            <span className="text-gray-400 text-sm">🔍</span>
            <input type="text" placeholder="Search clients…"
                   className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <button className="btn btn-primary text-sm">+ New Client</button>
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
              {clients.map(client => {
                const lastSched  = client.schedules[0]
                const assignee   = lastSched?.assignments[0]?.user
                const lastJobDate = lastSched?.date

                return (
                  <tr key={client.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className="text-[10px] text-gray-400">{client.type ?? 'Commercial'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-gray-600">{client.address}</div>
                      {client.city && (
                        <div className="text-[10px] text-gray-400">{client.city}, {client.province}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="badge bg-gray-100 text-gray-600 text-[10px] capitalize">
                        {client.type ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {client.frequency ? (
                        <span className="badge bg-blue-50 text-blue-700 text-[10px]">
                          {FREQUENCY_LABELS[client.frequency] ?? client.frequency}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {lastJobDate
                        ? new Date(lastJobDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`badge text-[10px] ${
                        client.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button className="btn btn-secondary text-xs py-1 px-2.5">View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

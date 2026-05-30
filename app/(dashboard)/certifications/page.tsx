import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { getDaysUntilExpiry } from '@/lib/utils'
import { addDays } from 'date-fns'

export default async function CertificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  const now = new Date()

  const [userCerts, certTypes] = await Promise.all([
    prisma.userCertification.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        certification: true,
      },
      orderBy: { expiresAt: 'asc' },
    }).catch(() => []),
    prisma.certification.findMany({ orderBy: { name: 'asc' } }).catch(() => []),
  ])

  const valid    = userCerts.filter(c => !c.expiresAt || getDaysUntilExpiry(c.expiresAt) > 60)
  const expiring = userCerts.filter(c => c.expiresAt && getDaysUntilExpiry(c.expiresAt) <= 60 && getDaysUntilExpiry(c.expiresAt) >= 0)
  const expired  = userCerts.filter(c => c.expiresAt && getDaysUntilExpiry(c.expiresAt) < 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-semibold">Certifications</h1>
          <p className="text-sm text-gray-400">Track, manage and renew employee certifications</p>
        </div>
        <button className="btn btn-primary text-sm">+ Add Certification</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border-l-4 border-l-green-500 border border-[var(--border)] p-4 shadow-sm">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Valid</div>
          <div className="text-3xl font-semibold text-green-600">{valid.length}</div>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-l-amber-500 border border-[var(--border)] p-4 shadow-sm">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Expiring (&lt;60 days)</div>
          <div className="text-3xl font-semibold text-amber-600">{expiring.length}</div>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-l-red-500 border border-[var(--border)] p-4 shadow-sm">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Expired</div>
          <div className="text-3xl font-semibold text-red-600">{expired.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Certification', 'Issued', 'Expires', 'Days Left', 'Document', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold
                                          text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userCerts.map(cert => {
                const days = cert.expiresAt ? getDaysUntilExpiry(cert.expiresAt) : null
                const statusColor =
                  days === null     ? 'bg-green-100 text-green-700' :
                  days < 0          ? 'bg-red-100 text-red-700' :
                  days <= 30        ? 'bg-red-100 text-red-700' :
                  days <= 60        ? 'bg-amber-100 text-amber-700' :
                                      'bg-green-100 text-green-700'
                const statusLabel =
                  days === null ? '✓ Valid' :
                  days < 0      ? '✗ Expired' :
                  days <= 60    ? '⚠ Expiring' :
                                  '✓ Valid'

                return (
                  <tr key={cert.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-sm">{cert.user.name}</div>
                      <div className="text-[10px] text-gray-400">{cert.user.email}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-sm">{cert.certification.name}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {cert.issuedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {cert.expiresAt
                        ? cert.expiresAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {days !== null ? (
                        <span className={`badge text-[10px] ${statusColor}`}>
                          {days < 0 ? `${Math.abs(days)}d ago` : `${days} days`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {cert.documentUrl ? (
                        <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer"
                           className="btn btn-secondary text-xs py-1 px-2.5">
                          📄 View
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No document</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`badge text-[10px] ${statusColor}`}>{statusLabel}</span>
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

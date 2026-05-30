import { auth } from '@/server/auth/config'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/db/client'
import { getDaysUntilExpiry } from '@/lib/utils'

export default async function MyCertificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const certs = await prisma.userCertification.findMany({
    where: { userId: session.user.id },
    include: { certification: true },
    orderBy: { expiresAt: 'asc' },
  }).catch(() => [])

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-5">My Certifications</h1>

      {certs.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--border)] p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">🎖️</div>
          <div>No certifications on file. Contact your manager.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {certs.map(cert => {
            const days = cert.expiresAt ? getDaysUntilExpiry(cert.expiresAt) : null
            const isExpired  = days !== null && days < 0
            const isExpiring = days !== null && days >= 0 && days <= 60
            const isValid    = days === null || days > 60

            return (
              <div key={cert.id}
                   className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 ${
                     isExpired  ? 'border-red-200 bg-red-50' :
                     isExpiring ? 'border-amber-200 bg-amber-50' :
                                  'border-[var(--border)]'
                   }`}>
                <div className="text-3xl">
                  {isExpired ? '✗' : isExpiring ? '⚠️' : '✅'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${
                    isExpired ? 'text-red-700' : isExpiring ? 'text-amber-700' : ''
                  }`}>
                    {cert.certification.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Issued: {cert.issuedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {cert.expiresAt && (
                      <> · Expires: {cert.expiresAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                    )}
                  </div>
                  {cert.certification.description && (
                    <div className="text-xs text-gray-400 mt-0.5">{cert.certification.description}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {days !== null && (
                    <span className={`badge text-[10px] ${
                      isExpired  ? 'bg-red-100 text-red-700' :
                      isExpiring ? 'bg-amber-100 text-amber-700' :
                                   'bg-green-100 text-green-700'
                    }`}>
                      {isExpired ? `Expired ${Math.abs(days)}d ago` :
                       isExpiring ? `${days} days left` :
                       `${days} days`}
                    </span>
                  )}
                  {cert.documentUrl && (
                    <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer"
                       className="btn btn-secondary text-xs py-1 px-2.5">
                      📄 View
                    </a>
                  )}
                  {(isExpired || isExpiring) && (
                    <button className="btn text-xs py-1 px-2.5 bg-red-50 text-red-600 border border-red-200">
                      Renew
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { ClientViewModal } from './ClientViewModal'

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily', '2x_week': '2× week', '3x_week': '3× week',
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
}

interface Props {
  client: {
    id: string
    name: string
    type: string | null
    address: string
    city: string | null
    province: string | null
    frequency: string | null
    isActive: boolean
    schedules: { date: Date }[]
  }
}

export function ClientRow({ client }: Props) {
  const [viewOpen, setViewOpen] = useState(false)
  const lastJobDate = client.schedules[0]?.date

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3.5">
          <div className="font-medium text-sm">{client.name}</div>
          <div className="text-[10px] text-gray-400">{client.type ?? 'Commercial'}</div>
        </td>
        <td className="px-4 py-3.5">
          <div className="text-sm text-gray-600">{client.address}</div>
          {client.city && <div className="text-[10px] text-gray-400">{client.city}, {client.province}</div>}
        </td>
        <td className="px-4 py-3.5">
          <span className="badge bg-gray-100 text-gray-600 text-[10px] capitalize">{client.type ?? '—'}</span>
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
          <span className={`badge text-[10px] ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {client.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <button className="btn btn-secondary text-xs py-1 px-2.5" onClick={() => setViewOpen(true)}>View</button>
        </td>
      </tr>

      {viewOpen && <ClientViewModal clientId={client.id} onClose={() => setViewOpen(false)} />}
    </>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

export function SyncNotionButton() {
  const router = useRouter()
  const [result, setResult] = useState<string | null>(null)

  const sync = trpc.user.syncFromNotion.useMutation({
    onSuccess: (data) => {
      setResult(`✓ ${data.created} added, ${data.updated} updated, ${data.skipped} skipped`)
      router.refresh()
      setTimeout(() => setResult(null), 4000)
    },
    onError: (err) => {
      setResult(`✗ ${err.message}`)
      setTimeout(() => setResult(null), 4000)
    },
  })

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className={`text-xs px-2.5 py-1 rounded-lg ${
          result.startsWith('✓')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {result}
        </span>
      )}
      <button
        className="btn btn-secondary text-sm"
        disabled={sync.isPending}
        onClick={() => sync.mutate()}
      >
        {sync.isPending ? 'Syncing…' : '🔄 Sync Notion'}
      </button>
    </div>
  )
}

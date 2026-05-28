'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleManualSync = async () => {
    setSyncing(true)
    await fetch('/api/webhooks/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tatimar-secret': 'local' },
      body: JSON.stringify({}),
    })
    setTimeout(() => setSyncing(false), 3000)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-5">Settings</h1>

      <div className="max-w-2xl flex flex-col gap-4">

        {/* Notion integration */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <div className="font-semibold text-sm">🔌 Notion Integration</div>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Notion Integration Token
              </label>
              <input className="form-input font-mono text-xs" type="password"
                     defaultValue="secret_••••••••••••••••••••••••••"
                     placeholder="secret_xxxxxxxxxxxx" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Schedules DB ID</label>
                <input className="form-input font-mono text-xs" defaultValue=""
                       placeholder="32-character database ID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Clients DB ID</label>
                <input className="form-input font-mono text-xs" defaultValue=""
                       placeholder="32-character database ID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Users DB ID</label>
                <input className="form-input font-mono text-xs" defaultValue=""
                       placeholder="32-character database ID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Certifications DB ID</label>
                <input className="form-input font-mono text-xs" defaultValue=""
                       placeholder="32-character database ID" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Sync interval</div>
                <div className="text-xs text-gray-400">How often to poll Notion for changes</div>
              </div>
              <select className="form-input w-36">
                <option>60 seconds</option>
                <option>30 seconds</option>
                <option>2 minutes</option>
                <option>5 minutes</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-primary text-sm" onClick={handleSave}>
                {saved ? '✓ Saved!' : 'Save & Test Connection'}
              </button>
              <button className="btn btn-secondary text-sm" onClick={handleManualSync}
                      disabled={syncing}>
                {syncing ? '🔄 Syncing…' : 'Trigger Manual Sync'}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <div className="font-semibold text-sm">🔔 Notifications</div>
          </div>
          <div className="px-5 py-5 space-y-4">
            {[
              { label: 'Certification expiry alerts', sub: 'Alert at 60, 30, and 7 days before expiry', defaultOn: true },
              { label: 'Schedule change notifications', sub: 'Notify cleaners of updates via push notification', defaultOn: true },
              { label: 'Late clock-in alerts', sub: 'Alert manager when cleaner is 15+ min late', defaultOn: true },
              { label: 'SMS reminders (Twilio)', sub: 'Day-before SMS reminder to cleaners', defaultOn: false },
              { label: 'Email summaries', sub: 'Daily email digest of completed jobs', defaultOn: false },
            ].map((item, i) => (
              <div key={item.label}>
                {i > 0 && <div className="h-px bg-gray-100 -mx-5 mb-4" />}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.sub}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.defaultOn} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer
                                    peer-checked:bg-[var(--teal)] transition-colors
                                    after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                    after:bg-white after:rounded-full after:h-4 after:w-4
                                    after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <div className="font-semibold text-sm">🔐 Security</div>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Require MFA for admins</div>
                <div className="text-xs text-gray-400">TOTP via authenticator app</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer
                                peer-checked:bg-[var(--teal)] transition-colors
                                after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                after:bg-white after:rounded-full after:h-4 after:w-4
                                after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
            <div className="h-px bg-gray-100 -mx-5" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Session duration</div>
                <div className="text-xs text-gray-400">Auto-logout after inactivity</div>
              </div>
              <select className="form-input w-36">
                <option>8 hours</option>
                <option>24 hours</option>
                <option>7 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Company info */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <div className="font-semibold text-sm">🏢 Company Info</div>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name</label>
                <input className="form-input" defaultValue="Tatimar" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Primary Email</label>
                <input className="form-input" type="email" defaultValue="admin@tatimar.ca" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                <input className="form-input" type="tel" defaultValue="+1 (514) 000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Province</label>
                <select className="form-input">
                  <option>Quebec (QC)</option>
                  <option>Ontario (ON)</option>
                  <option>British Columbia (BC)</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary text-sm" onClick={handleSave}>
              {saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

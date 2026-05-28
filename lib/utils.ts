import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatDate(date: Date): string {
  return format(date, 'MMM d, yyyy')
}

export function formatDateShort(date: Date): string {
  return format(date, 'MMM d')
}

export function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true })
}

export function minutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function hoursWorked(clockIn: Date, clockOut: Date): number {
  return Math.round((differenceInMinutes(clockOut, clockIn) / 60) * 100) / 100
}

export function getDaysUntilExpiry(expiresAt: Date): number {
  return Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function getCertStatusColor(daysLeft: number | null): string {
  if (daysLeft === null) return 'teal'
  if (daysLeft < 0)  return 'red'
  if (daysLeft <= 30) return 'red'
  if (daysLeft <= 60) return 'amber'
  return 'teal'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount)
}

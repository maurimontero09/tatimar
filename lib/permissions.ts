import type { Role } from '@prisma/client'

type Permission =
  | 'view:all_schedules'
  | 'create:schedule'
  | 'edit:schedule'
  | 'view:own_schedule'
  | 'clock:in_out'
  | 'upload:photos'
  | 'view:all_users'
  | 'manage:users'
  | 'view:payroll'
  | 'export:payroll'
  | 'view:clients'
  | 'manage:clients'
  | 'view:certifications'
  | 'manage:certifications'
  | 'view:system_settings'
  | 'manage:system_settings'
  | 'view:reports'
  | 'trigger:notion_sync'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'view:all_schedules', 'create:schedule', 'edit:schedule', 'view:own_schedule',
    'clock:in_out', 'upload:photos',
    'view:all_users', 'manage:users',
    'view:payroll', 'export:payroll',
    'view:clients', 'manage:clients',
    'view:certifications', 'manage:certifications',
    'view:system_settings', 'manage:system_settings',
    'view:reports', 'trigger:notion_sync',
  ],
  MANAGER: [
    'view:all_schedules', 'create:schedule', 'edit:schedule',
    'upload:photos',
    'view:all_users',
    'view:clients', 'manage:clients',
    'view:certifications', 'manage:certifications',
    'view:reports',
  ],
  ACCOUNTANT: [
    'view:all_schedules',
    'view:payroll', 'export:payroll',
    'view:reports',
  ],
  CLEANER: [
    'view:own_schedule',
    'clock:in_out',
    'upload:photos',
    'view:certifications',
  ],
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => can(role, p))
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    SUPER_ADMIN: 'Super Admin',
    MANAGER:     'Manager',
    ACCOUNTANT:  'Accountant',
    CLEANER:     'Cleaner',
  }
  return labels[role]
}

export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case 'SUPER_ADMIN': return '/dashboard'
    case 'MANAGER':     return '/schedule'
    case 'ACCOUNTANT':  return '/payroll'
    case 'CLEANER':     return '/cleaner'
  }
}

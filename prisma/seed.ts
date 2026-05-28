import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const adminHash = await bcrypt.hash('admin123', 12)
  const userHash  = await bcrypt.hash('user1234', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tatimar.ca' },
    update: {},
    create: { email: 'admin@tatimar.ca', name: 'Alex Martin', role: Role.SUPER_ADMIN, passwordHash: adminHash, phone: '+15140001111' },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@tatimar.ca' },
    update: {},
    create: { email: 'manager@tatimar.ca', name: 'Jean Bouchard', role: Role.MANAGER, passwordHash: userHash, phone: '+15140002222' },
  })

  await prisma.user.upsert({
    where: { email: 'finance@tatimar.ca' },
    update: {},
    create: { email: 'finance@tatimar.ca', name: 'Claire Dubois', role: Role.ACCOUNTANT, passwordHash: userHash, phone: '+15140003333' },
  })

  const maria = await prisma.user.upsert({
    where: { email: 'maria@tatimar.ca' },
    update: {},
    create: { email: 'maria@tatimar.ca', name: 'Maria Dupont', role: Role.CLEANER, passwordHash: userHash, phone: '+15140004444' },
  })

  const jean = await prisma.user.upsert({
    where: { email: 'jean@tatimar.ca' },
    update: {},
    create: { email: 'jean@tatimar.ca', name: 'Jean Tremblay', role: Role.CLEANER, passwordHash: userHash, phone: '+15140005555' },
  })

  const acme = await prisma.client.upsert({
    where: { id: 'client-acme' },
    update: {},
    create: {
      id: 'client-acme',
      name: 'Acme Corp Suite 400',
      type: 'commercial',
      address: '1400 René-Lévesque Blvd W',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H3G 1T7',
      lat: 45.4972, lng: -73.5753,
      accessNotes: 'Lobby code #1842. Elevator to 4th floor. Supplies in Room 4C.',
      contactName: 'Robert Acme',
      contactPhone: '+15140010001',
      frequency: 'daily',
    },
  })

  const clinic = await prisma.client.upsert({
    where: { id: 'client-clinic' },
    update: {},
    create: {
      id: 'client-clinic',
      name: 'Horizon Medical Clinic',
      type: 'medical',
      address: '890 Boulevard de Maisonneuve O',
      city: 'Montreal',
      province: 'QC',
      postalCode: 'H3A 1M8',
      lat: 45.5036, lng: -73.5742,
      accessNotes: 'Side entrance, code #4821. Check in with reception.',
      contactName: 'Dr. Henri Horizon',
      contactPhone: '+15140010002',
      frequency: '3x_week',
    },
  })

  const whmis = await prisma.certification.upsert({
    where: { id: 'cert-whmis' },
    update: {},
    create: { id: 'cert-whmis', name: 'WHMIS 2023', description: 'Workplace Hazardous Materials Information System', validityDays: 1095, isRequired: true },
  })

  const firstAid = await prisma.certification.upsert({
    where: { id: 'cert-firstaid' },
    update: {},
    create: { id: 'cert-firstaid', name: 'First Aid CPR-C', description: 'Standard First Aid with CPR Level C', validityDays: 730, isRequired: true },
  })

  await prisma.userCertification.upsert({
    where: { id: 'uc-maria-whmis' },
    update: {},
    create: { id: 'uc-maria-whmis', userId: maria.id, certificationId: whmis.id, issuedAt: new Date('2023-06-15'), expiresAt: new Date('2026-06-15') },
  })

  await prisma.userCertification.upsert({
    where: { id: 'uc-maria-firstaid' },
    update: {},
    create: { id: 'uc-maria-firstaid', userId: maria.id, certificationId: firstAid.id, issuedAt: new Date('2024-11-12'), expiresAt: new Date('2026-11-12') },
  })

  await prisma.userCertification.upsert({
    where: { id: 'uc-jean-firstaid' },
    update: {},
    create: { id: 'uc-jean-firstaid', userId: jean.id, certificationId: firstAid.id, issuedAt: new Date('2024-06-28'), expiresAt: new Date('2026-06-28') },
  })

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const sched1 = await prisma.schedule.create({
    data: {
      clientId: acme.id,
      date: today,
      startTime: new Date(today.getTime() + 8 * 3600_000),
      maxHours: 3,
      status: 'IN_PROGRESS',
      servicesList: ['Office cleaning', 'Vacuuming', 'Washrooms', 'Kitchen'],
      instructions: 'Focus on boardroom. Use medical-grade disinfectant on all surfaces.',
      accessNotes: 'Lobby code #1842. Supplies in Room 4C.',
      assignments: { create: { userId: maria.id, status: 'ACCEPTED' } },
    },
  })

  await prisma.clockEvent.create({
    data: {
      userId: maria.id, scheduleId: sched1.id, type: 'CLOCK_IN',
      timestamp: new Date(today.getTime() + 7 * 3600_000 + 58 * 60_000),
      lat: 45.4972, lng: -73.5753,
    },
  })

  const sched2 = await prisma.schedule.create({
    data: {
      clientId: clinic.id,
      date: today,
      startTime: new Date(today.getTime() + 12 * 3600_000),
      maxHours: 2.5,
      status: 'PENDING',
      servicesList: ['Medical-grade cleaning', 'Disinfection', 'Floors'],
      instructions: 'Wear PPE at all times. Sterilize all surfaces with approved solution.',
      accessNotes: 'Side entrance code #4821.',
      assignments: { create: { userId: maria.id, status: 'ASSIGNED' } },
    },
  })

  console.log('✅ Seed complete!')
  console.log('')
  console.log('Demo accounts:')
  console.log('  admin@tatimar.ca     / admin123  (Super Admin)')
  console.log('  manager@tatimar.ca   / user1234  (Manager)')
  console.log('  finance@tatimar.ca   / user1234  (Accountant)')
  console.log('  maria@tatimar.ca     / user1234  (Cleaner)')
}

main().catch(console.error).finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
try {
  const n = await prisma.user.count()
  console.log('DB_OK count=' + n)
} catch (e) {
  const msg = String(e.message || e)
  // Avoid printing connection strings / secrets
  const safe = msg
    .replace(/postgresql:\/\/[^\s]+/gi, 'postgresql://***')
    .replace(/postgres\.[a-z0-9]+/gi, 'postgres.***')
    .split('\n')
    .slice(0, 4)
    .join(' | ')
  console.log('DB_FAIL ' + safe)
} finally {
  await prisma.$disconnect()
}

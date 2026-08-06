'use server'

import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { redirect } from 'next/navigation'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string
  const auditType = formData.get('auditType') as string || 'MIGRATION'
  const oldWebsite = formData.get('oldWebsite') as string
  const newWebsite = formData.get('newWebsite') as string
  const oldSitemap = formData.get('oldSitemap') as string
  const newSitemap = formData.get('newSitemap') as string

  if (!name || !newWebsite) {
    throw new Error('Missing required fields')
  }
  
  if (auditType === 'MIGRATION' && !oldWebsite) {
    throw new Error('Old website is required for migration audits')
  }

  const getHostname = (u: string) => {
    try { return new URL(u).hostname.replace(/^www\./, '') } catch(e) { return u.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] }
  }

  const newHostname = getHostname(newWebsite)

  // Find and remove existing duplicates by domain
  const existingProjects = await prisma.project.findMany()
  for (const ep of existingProjects) {
    if (getHostname(ep.newWebsite) === newHostname) {
      await prisma.project.delete({ where: { id: ep.id } })
    }
  }

  const project = await prisma.project.create({
    data: {
      name,
      auditType,
      oldWebsite: oldWebsite || null,
      newWebsite,
      oldSitemap: oldSitemap || null,
      newSitemap: newSitemap || null,
    }
  })

  redirect(`/dashboard/${project.id}`)
}

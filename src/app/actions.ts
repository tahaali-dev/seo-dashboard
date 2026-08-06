'use server'

import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import { redirect } from 'next/navigation'

const connection = new Database('dev.db')
const adapter = new PrismaBetterSqlite3(connection)
const prisma = new PrismaClient({ adapter })

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string
  const oldWebsite = formData.get('oldWebsite') as string
  const newWebsite = formData.get('newWebsite') as string
  const oldSitemap = formData.get('oldSitemap') as string
  const newSitemap = formData.get('newSitemap') as string

  if (!name || !oldWebsite || !newWebsite) {
    throw new Error('Missing required fields')
  }

  const project = await prisma.project.create({
    data: {
      name,
      oldWebsite,
      newWebsite,
      oldSitemap: oldSitemap || null,
      newSitemap: newSitemap || null,
    }
  })

  redirect(`/dashboard/${project.id}`)
}

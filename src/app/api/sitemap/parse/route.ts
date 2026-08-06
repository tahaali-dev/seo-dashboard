import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import * as cheerio from 'cheerio'

const connection = new Database('dev.db')
const adapter = new PrismaBetterSqlite3(connection)
const prisma = new PrismaClient({ adapter })

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json()
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const fetchSitemap = async (url: string, siteType: 'OLD' | 'NEW') => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch sitemap: ${res.status}`)
        const text = await res.text()
        const $ = cheerio.load(text, { xmlMode: true })
        
        const urls: string[] = []
        $('loc').each((_, el) => {
          urls.push($(el).text().trim())
        })

        const pages = urls.map(u => ({
          projectId: project.id,
          url: u,
          siteType
        }))

        if (pages.length > 0) {
            await prisma.page.createMany({
                data: pages,
                skipDuplicates: true
            })
        }
        return urls.length
      } catch (err) {
        console.error(`Error parsing sitemap for ${siteType}:`, err)
        return 0
      }
    }

    let oldCount = 0
    let newCount = 0

    if (project.oldSitemap) {
      oldCount = await fetchSitemap(project.oldSitemap, 'OLD')
    }
    if (project.newSitemap) {
      newCount = await fetchSitemap(project.newSitemap, 'NEW')
    }

    return NextResponse.json({ success: true, oldCount, newCount })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

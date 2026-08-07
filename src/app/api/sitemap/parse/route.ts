import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as cheerio from 'cheerio'

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
        
        const existingPages = await prisma.page.findMany({
          where: { projectId: project.id, siteType },
          select: { url: true }
        })
        const existingUrls = new Set(existingPages.map(p => p.url))

        const urls: string[] = []
        $('loc').each((_, el) => {
          const u = $(el).text().trim()
          if (!existingUrls.has(u)) {
            urls.push(u)
            // also add to set to handle duplicates within the sitemap itself
            existingUrls.add(u)
          }
        })

        const pages = urls.map(u => ({
          projectId: project.id,
          url: u,
          siteType
        }))

        if (pages.length > 0) {
            await prisma.page.createMany({
                data: pages
            })
        }
        return urls.length
      } catch (err) {
        console.error(`Error parsing sitemap for ${siteType}:`, err)
        return 0
      }
    }

    const addFallbackUrl = async (url: string, siteType: string) => {
      const exists = await prisma.page.findFirst({ where: { projectId: project.id, url, siteType } })
      if (!exists) {
        await prisma.page.create({ data: { projectId: project.id, url, siteType } })
        return 1
      }
      return 0
    }

    let oldCount = 0
    let newCount = 0

    if (project.oldSitemap) {
      oldCount = await fetchSitemap(project.oldSitemap, 'OLD')
    }
    if (oldCount === 0 && project.oldWebsite) {
      oldCount = await addFallbackUrl(project.oldWebsite, 'OLD')
    }

    if (project.newSitemap) {
      newCount = await fetchSitemap(project.newSitemap, 'NEW')
    }
    if (newCount === 0 && project.newWebsite) {
      newCount = await addFallbackUrl(project.newWebsite, 'NEW')
    }

    const pages = await prisma.page.findMany({ where: { projectId } })
    return NextResponse.json({ success: true, oldCount, newCount, pages })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

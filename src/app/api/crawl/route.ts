import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import * as cheerio from 'cheerio'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

export async function POST(req: Request) {
  try {
    const { pageId } = await req.json()
    const page = await prisma.page.findUnique({ where: { id: pageId } })
    
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    try {
      const res = await fetch(page.url, {
        headers: { 'User-Agent': 'SEO-Dashboard-Crawler/1.0' }
      })
      
      if (!res.ok) {
        throw new Error(`Status ${res.status}`)
      }

      const html = await res.text()
      const $ = cheerio.load(html)

      const htmlSize = Buffer.byteLength(html, 'utf8')
      const textContent = $('body').text().replace(/\s+/g, ' ').trim()
      const wordCount = textContent.split(' ').length

      // Extract Metadata
      const metadata = {
        title: $('title').text().trim(),
        description: $('meta[name="description"]').attr('content') || '',
        canonical: $('link[rel="canonical"]').attr('href') || '',
        robots: $('meta[name="robots"]').attr('content') || '',
        htmlSize,
        wordCount
      }

      // Extract Headings
      const headings = {
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2Count: $('h2').length,
        h3Count: $('h3').length
      }
      
      // Extract Schema
      let schemaFound = false
      $('script[type="application/ld+json"]').each((_, el) => {
          schemaFound = true
      })

      // Extract Links
      const links = {
        internal: 0,
        external: 0,
        insecureOutbound: 0
      }
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (href.startsWith('http://') && !href.includes(new URL(page.url).hostname)) {
            links.insecureOutbound++
            links.external++
        } else if (href.startsWith('https://') && !href.includes(new URL(page.url).hostname)) {
            links.external++
        } else {
            links.internal++
        }
      })

      // Extract Images
      const images = {
        total: $('img').length,
        missingAlt: $('img:not([alt]), img[alt=""]').length
      }

      // Generate some dummy SEO score (Will be completely replaced by Audit engine later)
      let seoScore = 100
      if (!metadata.title) seoScore -= 20
      if (!metadata.description) seoScore -= 10
      if (headings.h1.length === 0) seoScore -= 10
      if (headings.h1.length > 1) seoScore -= 5
      if (images.missingAlt > 0) seoScore -= (images.missingAlt * 2)
      seoScore = Math.max(0, seoScore)

      // Update Database
      await prisma.page.update({
        where: { id: page.id },
        data: {
          crawlStatus: 'SUCCESS',
          seoScore,
          metadata: JSON.stringify(metadata),
          headings: JSON.stringify(headings),
          links: JSON.stringify(links),
          images: JSON.stringify(images),
          schema: schemaFound ? "PRESENT" : "MISSING"
        }
      })

      return NextResponse.json({ success: true, seoScore })
    } catch (crawlError: any) {
      console.error(`Crawl failed for ${page.url}:`, crawlError)
      await prisma.page.update({
        where: { id: page.id },
        data: { crawlStatus: 'ERROR' }
      })
      return NextResponse.json({ error: crawlError.message }, { status: 500 })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

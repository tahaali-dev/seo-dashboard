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

      // Advanced Keyword Extraction
      const stopWords = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'i', 'is', 'that', 'it', 'on', 'you', 'this', 'for', 'but', 'with', 'are', 'have', 'be', 'at', 'or', 'as', 'was', 'so', 'if', 'out', 'not', 'we', 'my', 'by', 'about', 'from', 'an', 'they', 'your', 'which', 'what', 'can', 'has', 'all', 'there', 'will', 'more', 'when', 'who', 'how'])
      
      const cleanText = $('p, h1, h2, h3, li, span').text().toLowerCase().replace(/[^a-z\s]/g, '')
      const words = cleanText.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
      
      const wordCounts: Record<string, number> = {}
      words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1 })
      
      const topKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count, density: ((count / words.length) * 100).toFixed(2) }))

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

      // Extract Links and actively ping them
      const links = {
        internal: 0,
        external: 0,
        insecureOutbound: 0
      }
      
      const uniqueOutboundUrls = new Set<string>()
      
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (href.startsWith('http://') && !href.includes(new URL(page.url).hostname)) {
            links.insecureOutbound++
            links.external++
            uniqueOutboundUrls.add(href)
        } else if (href.startsWith('https://') && !href.includes(new URL(page.url).hostname)) {
            links.external++
            uniqueOutboundUrls.add(href)
        } else if (href.startsWith('/') || href.includes(new URL(page.url).hostname)) {
            links.internal++
        }
      })

      const brokenLinks: Array<{ url: string, status: number }> = []
      
      // Ping external links to check for 404s and 301s
      // We limit to 10 to avoid stalling the entire crawl on large pages
      const linksToPing = Array.from(uniqueOutboundUrls).slice(0, 10)
      
      await Promise.allSettled(linksToPing.map(async (url) => {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
          
          const response = await fetch(url, { 
            method: 'HEAD', 
            redirect: 'manual', 
            signal: controller.signal 
          })
          clearTimeout(timeoutId)
          
          if (response.status >= 300 && response.status < 400) {
            brokenLinks.push({ url, status: response.status }) // Redirect
          } else if (response.status >= 400) {
            brokenLinks.push({ url, status: response.status }) // Broken
          }
        } catch (e) {
          brokenLinks.push({ url, status: 500 }) // Network error / timeout
        }
      }))

      // Extract Images
      const missingAltSrcs: string[] = []
      $('img:not([alt]), img[alt=""]').each((_, el) => {
        const src = $(el).attr('src')
        if (src) missingAltSrcs.push(src)
      })

      const images = {
        total: $('img').length,
        missingAlt: missingAltSrcs.length,
        missingAltSrcs
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
          keywords: JSON.stringify(topKeywords),
          brokenLinks: JSON.stringify(brokenLinks),
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

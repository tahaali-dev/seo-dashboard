import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json()
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // 1. Clear existing issues
    await prisma.issue.deleteMany({
      where: { projectId }
    })

    // 2. Fetch all pages
    const pages = await prisma.page.findMany({
      where: { projectId }
    })

    const issuesToCreate: any[] = []

    const oldPages = pages.filter(p => p.siteType === 'OLD')
    const newPages = pages.filter(p => p.siteType === 'NEW')

    // Map new site paths
    const newPaths = new Set()
    newPages.forEach(p => {
      try {
        newPaths.add(new URL(p.url).pathname)
      } catch (e) {}
    })

    // Helper to add issue
    const addIssue = (pageId: string | null, category: string, severity: string, title: string, description: string) => {
      issuesToCreate.push({
        projectId,
        pageId,
        category,
        severity,
        title,
        description,
        status: 'OPEN'
      })
    }

    // --- RULE: Missing 301 Redirects (Server) ---
    for (const oldPage of oldPages) {
      try {
        const oldPath = new URL(oldPage.url).pathname
        if (!newPaths.has(oldPath)) {
          addIssue(
            oldPage.id,
            'Server',
            'CRITICAL',
            'Missing 301 Redirect',
            `The old path ${oldPath} does not have a direct equivalent on the new site.`
          )
        }
      } catch (e) {}
    }

    // --- Iterate all crawled pages for On-Page Rules ---
    for (const page of pages) {
      if (page.crawlStatus === 'ERROR') {
        addIssue(page.id, 'Server', 'HIGH', 'Server Error', 'Page failed to crawl (4xx/5xx).')
        continue
      }
      if (page.crawlStatus === 'PENDING') continue

      let metadata, headings, links, images, keywords, brokenLinks
      try {
        metadata = page.metadata ? JSON.parse(page.metadata) : null
        headings = page.headings ? JSON.parse(page.headings) : null
        links = page.links ? JSON.parse(page.links) : null
        images = page.images ? JSON.parse(page.images) : null
        keywords = page.keywords ? JSON.parse(page.keywords) : null
        brokenLinks = page.brokenLinks ? JSON.parse(page.brokenLinks) : null
      } catch (e) {
        continue
      }

      // --- Category 1: Meta data ---
      if (metadata) {
        if (!metadata.title) {
          addIssue(page.id, 'Meta data', 'HIGH', 'Missing Meta Title', 'The page has no <title> tag.')
        } else {
          if (metadata.title.length > 60) addIssue(page.id, 'Meta data', 'LOW', 'Title Too Long', 'Title is over 60 characters and may truncate in SERPs.')
          if (metadata.title.length < 30) addIssue(page.id, 'Meta data', 'LOW', 'Title Too Short', 'Title is under 30 characters and might not be descriptive enough.')
        }

        if (!metadata.description) {
          addIssue(page.id, 'Meta data', 'HIGH', 'Missing Meta Description', 'The page has no meta description.')
        } else {
          if (metadata.description.length > 160) addIssue(page.id, 'Meta data', 'LOW', 'Description Too Long', 'Description is over 160 characters.')
          if (metadata.description.length < 50) addIssue(page.id, 'Meta data', 'LOW', 'Description Too Short', 'Description is under 50 characters.')
        }
      }

      // --- Category 2: Page structure ---
      if (headings) {
        if (headings.h1.length === 0) {
          addIssue(page.id, 'Page structure', 'HIGH', 'Missing H1 Tag', 'The page is missing an H1 heading.')
        } else if (headings.h1.length > 1) {
          addIssue(page.id, 'Page structure', 'MEDIUM', 'Multiple H1 Tags', 'The page has more than one H1 heading.')
        }
      }

      if (images && images.missingAlt > 0) {
        addIssue(page.id, 'Page structure', 'MEDIUM', 'Missing Image Alt Text', `Found ${images.missingAlt} images without alt text.`)
      }

      if (metadata && !metadata.canonical) {
        addIssue(page.id, 'Page structure', 'MEDIUM', 'Missing Canonical Tag', 'The page has no canonical link.')
      }

      if (page.schema === 'MISSING') {
        addIssue(page.id, 'Page structure', 'LOW', 'Missing Schema Markup', 'No JSON-LD structured data found on page.')
      }

      // --- Category 3: Server ---
      if (page.url.startsWith('http://')) {
        addIssue(page.id, 'Server', 'HIGH', 'Non-HTTPS URL', 'The page is served over insecure HTTP.')
      }

      // --- Category 4: Page quality ---
      if (metadata && metadata.wordCount !== undefined) {
        if (metadata.wordCount < 300) {
          addIssue(page.id, 'Page quality', 'HIGH', 'Thin Content', `Page has a very low word count (${metadata.wordCount} words).`)
        }
      }
      if (metadata && metadata.htmlSize && metadata.htmlSize > 2000000) {
        addIssue(page.id, 'Page quality', 'MEDIUM', 'Large Page Size', `HTML payload exceeds 2MB (${Math.round(metadata.htmlSize / 1024)} KB).`)
      }

      if (keywords && keywords.length > 0) {
        const topKeyword = keywords[0]
        if (parseFloat(topKeyword.density) > 5.0) {
          addIssue(page.id, 'Page quality', 'HIGH', 'Keyword Stuffing Risk', `The keyword "${topKeyword.word}" has a very high density of ${topKeyword.density}%.`)
        }
        if (topKeyword.count < 3 && metadata?.wordCount && metadata.wordCount > 300) {
          addIssue(page.id, 'Page quality', 'LOW', 'Unfocused Content', `The most frequent keyword "${topKeyword.word}" only appears ${topKeyword.count} times. The page lacks a clear topic focus.`)
        }
      }

      // --- Category 5: Links ---
      if (links) {
        if (links.internal < 2) {
          addIssue(page.id, 'Links', 'MEDIUM', 'Poor Internal Linking', 'Page has less than 2 internal links (Orphan Risk).')
        }
        if (links.internal + links.external > 100) {
          addIssue(page.id, 'Links', 'LOW', 'Too Many On-Page Links', 'Page has over 100 total links, diluting link equity.')
        }
      }

      if (brokenLinks && brokenLinks.length > 0) {
        let deadCount = 0
        let redirectCount = 0
        brokenLinks.forEach((bl: any) => {
          if (bl.status >= 400) deadCount++
          else if (bl.status >= 300) redirectCount++
        })

        if (deadCount > 0) {
          addIssue(page.id, 'Links', 'CRITICAL', 'Broken Outbound Links', `Found ${deadCount} outbound links returning a 4xx or 5xx error.`)
        }
        if (redirectCount > 0) {
          addIssue(page.id, 'Links', 'MEDIUM', 'Redirect Chain Risk', `Found ${redirectCount} outbound links that redirect (3xx). Link directly to the final destination.`)
        }
      }

      // --- Category 6: External factors ---
      if (links && links.insecureOutbound > 0) {
        addIssue(page.id, 'External factors', 'MEDIUM', 'Insecure Outbound Links', `Found ${links.insecureOutbound} external links pointing to http:// destinations.`)
      }
    }

    // Bulk create
    if (issuesToCreate.length > 0) {
      // Chunking for sqlite limits (Prisma createMany limit is usually fine, but 10k items might exceed SQLite bindings)
      const chunkSize = 1000
      for (let i = 0; i < issuesToCreate.length; i += chunkSize) {
        const chunk = issuesToCreate.slice(i, i + chunkSize)
        await prisma.issue.createMany({ data: chunk })
      }
    }

    const issues = await prisma.issue.findMany({
      where: { projectId },
      include: {
        page: {
          select: {
            url: true,
            siteType: true,
          },
        },
      },
    })
    return NextResponse.json({ success: true, count: issuesToCreate.length, issues })
  } catch (error: any) {
    console.error('Audit failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

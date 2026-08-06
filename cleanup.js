const { PrismaClient } = require('@prisma/client')
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
const Database = require('better-sqlite3')

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
  const prisma = new PrismaClient({ adapter })

  console.log("Cleaning up duplicates...")
  
  const pages = await prisma.page.findMany()
  
  const seen = new Set()
  let deleted = 0
  
  for (const page of pages) {
    const key = `${page.projectId}-${page.url}-${page.siteType}`
    if (seen.has(key)) {
      await prisma.page.delete({ where: { id: page.id } })
      deleted++
    } else {
      seen.add(key)
    }
  }
  
  console.log(`Deleted ${deleted} duplicate pages.`)
}

main()

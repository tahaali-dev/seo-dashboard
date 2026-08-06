const { PrismaClient } = require('@prisma/client')
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
const Database = require('better-sqlite3')

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
  const prisma = new PrismaClient({ adapter })

  console.log("Trying to query...")
  try {
    const projects = await prisma.project.findMany()
    console.log("Success:", projects)
  } catch (e) {
    console.error("Error:", e)
  }
}

main()

const cheerio = require('cheerio')
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://portlessv2.webflow.io/glossary/last-mile-delivery</loc>
    </url>
</urlset>`

const $ = cheerio.load(xml, { xmlMode: true })
console.log("locs found:", $('loc').length)

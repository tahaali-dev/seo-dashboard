# SEO Migration & Audit Dashboard

A modern, fast, and comprehensive web application for conducting professional SEO audits and managing website migrations. Built with Next.js, Prisma, and Tailwind CSS.

## 🚀 Features

- **Dual Audit Modes:**
  - **Fresh Audits:** Analyze a single website for SEO best practices, page speed, metadata, and structural integrity.
  - **Migration Audits:** Compare an old website architecture with a new one to ensure no SEO value is lost during a transition.
- **Automated Crawling:**
  - Sitemap discovery and fallback URL crawling.
  - Asynchronous, concurrent page crawling using Puppeteer and Cheerio.
- **Deep-Dive SEO Analysis:**
  - Checks for missing Alt text, broken links, heading hierarchy (H1/H2), canonical tags, and Schema markup.
  - TF-IDF Keyword Density analysis for content evaluation.
- **Project Management:**
  - Clean, grid-based dashboard to track multiple audits simultaneously.
  - Automatic duplicate domain detection to keep your workspace clean.
- **Advanced Filtering & Reporting:**
  - Live search and filter by issue severity, category, or page status.
  - Side-by-side URL mapping diff for migration audits.
- **Modern UI:**
  - Beautiful Dark Mode interface with Glassmorphism elements.
  - Built-in visual indicators and SEO scores (0-100).

## 🛠 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Server Actions)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database:** [SQLite](https://sqlite.org/) via [Prisma ORM](https://www.prisma.io/)
- **Crawling/Scraping:** [Puppeteer](https://pptr.dev/) & [Cheerio](https://cheerio.js.org/)
- **Icons:** [Heroicons](https://heroicons.com/)

## 📦 Getting Started

### Prerequisites
- Node.js 18+ (20+ recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd seo-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   The project uses a local SQLite database (`dev.db`). Initialize it with Prisma:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🧠 Usage Workflow

1. **Create an Audit:** Click "New Audit" and provide the target URL (and optionally, the old URL if it's a migration).
2. **Discover URLs:** Use the "Discover URLs" button in your project dashboard to fetch URLs from sitemaps or fallback links.
3. **Crawl Pages:** Run the crawler to extract metadata, headings, images, and links from the discovered pages.
4. **Run Audit:** Generate the SEO score and flag any critical, high, medium, or low severity issues.
5. **Resolve Issues:** Use the detailed issue reports and advanced filters to pinpoint and fix SEO problems.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

import { parseHtml } from "./html-parser";
import { safeFetchText } from "./safe-fetch";
import { normalizeCrawlUrl } from "@/features/scanner/url";
import { evaluateCrawler, AI_CRAWLERS, parseRobots } from "@/features/ai-crawlers/robots";
import type { CrawledPage, CrawlerAccess, SitemapSummary } from "@/types/audit";

const MAX_PAGES = 50;
const CONCURRENCY = 5;

function robotsAllows(text: string | null, pathname: string) {
  if (!text) return true;
  const wildcard = parseRobots(text).groups.filter((group) => group.agents.includes("*")).flatMap((group) => group.disallow);
  return !wildcard.some((rule) => rule === "/" || (rule && pathname.startsWith(rule.replace(/\*.*$/, ""))));
}

async function fetchPage(url: string): Promise<CrawledPage | null> {
  try {
    const result = await safeFetchText(new URL(url));
    const type = result.response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) return null;
    return parseHtml(result.finalUrl, result.text, result.response.status, result.response.headers);
  } catch {
    return { id: crypto.randomUUID(), url, statusCode: 0, h1: [], h2: [], h3: [], text: "", wordCount: 0, internalLinks: [], externalLinks: [], schema: [], schemaTypes: [], semanticTags: [], headingsValid: false, authors: [], dates: [], emails: [], phones: [], socialLinks: [], score: 0, issueCount: 1, issues: ["Não foi possível acessar a página"], headers: {} };
  }
}

async function discoverSitemap(base: URL, robotsText: string | null): Promise<SitemapSummary> {
  const declared = robotsText ? parseRobots(robotsText).sitemaps : [];
  const candidates = [...declared, new URL("/sitemap.xml", base).toString(), new URL("/sitemap_index.xml", base).toString()];
  for (const candidate of [...new Set(candidates)]) {
    try {
      const url = new URL(candidate, base); if (url.hostname !== base.hostname) continue;
      const result = await safeFetchText(url, 8_000);
      if (!result.response.ok || !/<(?:urlset|sitemapindex)\b/i.test(result.text)) continue;
      const urls = [...result.text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => match[1].replace(/&amp;/g, "&"));
      const pageUrls = urls.filter((value) => { try { return new URL(value).hostname === base.hostname && !/\.xml(?:$|\?)/i.test(value); } catch { return false; } });
      const samples = await Promise.all(pageUrls.slice(0, 5).map(async (value) => { try { const response = await safeFetchText(new URL(value), 6_000); return response.response.ok; } catch { return false; } }));
      return { url: result.finalUrl.toString(), found: true, urlCount: pageUrls.length, sampledOk: samples.filter(Boolean).length, errors: samples.some((ok) => !ok) ? ["Algumas URLs de amostra não responderam com sucesso."] : [] };
    } catch { /* try next candidate */ }
  }
  return { url: null, found: false, urlCount: 0, sampledOk: 0, errors: [] };
}

export interface CrawlResult { pages: CrawledPage[]; robotsText: string | null; robotsUrl: string; crawlerAccess: CrawlerAccess[]; sitemap: SitemapSummary; }

export async function crawlSite(input: URL): Promise<CrawlResult> {
  const origin = new URL(input.origin); const robotsUrl = new URL("/robots.txt", origin).toString();
  let robotsText: string | null = null;
  try { const robots = await safeFetchText(new URL(robotsUrl), 7_000); if (robots.response.ok) robotsText = robots.text; } catch { /* absence is a measurable result */ }
  const crawlerAccess = AI_CRAWLERS.map(([name, agent]) => evaluateCrawler(robotsText, name, agent));
  const sitemapPromise = discoverSitemap(origin, robotsText);
  const firstUrl = normalizeCrawlUrl(input.toString(), origin) ?? origin.toString();
  const queue = [firstUrl]; const visited = new Set<string>(); const pages: CrawledPage[] = [];
  while (queue.length && pages.length < MAX_PAGES) {
    const batch: string[] = [];
    while (queue.length && batch.length < CONCURRENCY && pages.length + batch.length < MAX_PAGES) {
      const next = queue.shift()!; if (visited.has(next)) continue;
      visited.add(next); if (robotsAllows(robotsText, new URL(next).pathname)) batch.push(next);
    }
    const results = await Promise.all(batch.map(fetchPage));
    for (const page of results) {
      if (!page) continue; pages.push(page);
      for (const link of page.internalLinks) if (!visited.has(link) && !queue.includes(link) && queue.length < MAX_PAGES * 3) queue.push(link);
    }
  }
  return { pages, robotsText, robotsUrl, crawlerAccess, sitemap: await sitemapPromise };
}

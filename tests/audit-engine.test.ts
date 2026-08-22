import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCrawler, parseRobots } from "../features/ai-crawlers/robots";
import { detectSchemas, parseHtml } from "../features/crawler/html-parser";
import { assertPublicHostname, normalizeCrawlUrl, normalizeInputUrl } from "../features/scanner/url";
import { buildReport } from "../features/audits/engine";

test("robots parser honors explicit AI crawler blocks", () => {
  const text = "User-agent: OAI-SearchBot\nDisallow: /\n\nUser-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml";
  assert.deepEqual(parseRobots(text).sitemaps, ["https://example.com/sitemap.xml"]);
  assert.equal(evaluateCrawler(text, "ChatGPT Search", "OAI-SearchBot").status, "blocked");
  assert.equal(evaluateCrawler(text, "Claude", "ClaudeBot").status, "allowed");
});

test("URL normalization removes fragments and tracking parameters", () => {
  const base = new URL("https://example.com/");
  assert.equal(normalizeCrawlUrl("/about/?utm_source=x#team", base), "https://example.com/about");
  assert.equal(normalizeInputUrl("example.com").toString(), "https://example.com/");
});

test("SSRF guard rejects local and private targets", () => {
  for (const host of ["localhost", "127.0.0.1", "10.0.0.8", "192.168.1.2", "service.internal", "::1"]) assert.throws(() => assertPublicHostname(host));
  assert.doesNotThrow(() => assertPublicHostname("example.com"));
});

test("schema detection extracts valid JSON-LD types and ignores malformed blocks", () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme"}</script><script type="application/ld+json">{broken}</script>`;
  const result = detectSchemas(html); assert.deepEqual(result.types, ["Organization"]); assert.equal(result.schemas.length, 1);
});

test("HTML crawler parser keeps internal links and measures page issues", () => {
  const html = `<html lang="pt-BR"><head><title>Página de serviços especializada</title><meta name="description" content="Descrição clara"><meta name="viewport" content="width=device-width"><link rel="canonical" href="/servicos"></head><body><main><h1>Serviços de consultoria</h1><h2>Como funciona</h2><a href="/sobre#time">Sobre</a><a href="https://external.example/x">Fonte</a><p>${"conteúdo ".repeat(130)}</p></main></body></html>`;
  const page = parseHtml(new URL("https://example.com/servicos"), html, 200, new Headers());
  assert.deepEqual(page.internalLinks, ["https://example.com/sobre"]); assert.equal(page.externalLinks.length, 1); assert.equal(page.score, 100);
});

test("scoring is the deterministic sum of checks and category weights total 100", () => {
  const html = `<html lang="pt-BR"><head><title>Acme | Consultoria especializada</title><meta name="description" content="A Acme oferece consultoria especializada."><meta name="viewport" content="width=device-width"><link rel="canonical" href="/"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme","description":"Consultoria especializada","email":"oi@example.com"}</script></head><body><header><nav>Menu</nav></header><main><article><h1>Acme oferece consultoria especializada</h1><h2>Serviços de consultoria</h2><p>${"A Acme oferece consultoria especializada para empresas. ".repeat(35)}</p></article></main><footer>oi@example.com</footer></body></html>`;
  const page = parseHtml(new URL("https://example.com/"), html, 200, new Headers());
  const crawl = { pages: [page], robotsText: "User-agent: *\nAllow: /", robotsUrl: "https://example.com/robots.txt", crawlerAccess: ["OAI-SearchBot","GPTBot","ClaudeBot","PerplexityBot","Googlebot","bingbot"].map((agent) => evaluateCrawler("User-agent: *\nAllow: /", agent, agent)), sitemap: { url: "https://example.com/sitemap.xml", found: true, urlCount: 1, sampledOk: 1, errors: [] } };
  const report = buildReport(new URL("https://example.com/"), crawl, Date.now());
  assert.equal(report.categories.reduce((sum, category) => sum + category.maxScore, 0), 100);
  assert.equal(report.score, Math.round(report.checks.reduce((sum, item) => sum + item.score, 0)));
  assert.ok(report.score >= 0 && report.score <= 100);
});

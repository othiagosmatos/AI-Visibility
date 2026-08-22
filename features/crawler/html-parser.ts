import type { CrawledPage } from "@/types/audit";
import { isLikelyHtml, normalizeCrawlUrl } from "@/features/scanner/url";

function decodeHtml(value: string) {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|\w+);/gi, (_, code: string) => {
    if (code[0] === "#") { const hex = code[1]?.toLowerCase() === "x"; return String.fromCodePoint(parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10)); }
    return entities[code.toLowerCase()] ?? `&${code};`;
  });
}

function clean(value: string) { return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()); }
function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}
function tags(html: string, name: string) { return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "gi"))].map((match) => clean(match[1])); }
function meta(html: string, name: string) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if ([attr(tag, "name"), attr(tag, "property")].some((value) => value.toLowerCase() === name.toLowerCase())) return attr(tag, "content");
  }
  return "";
}

function schemaTypes(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(schemaTypes);
  const object = value as Record<string, unknown>;
  const own = typeof object["@type"] === "string" ? [object["@type"]] : Array.isArray(object["@type"]) ? object["@type"].filter((item): item is string => typeof item === "string") : [];
  return [...own, ...schemaTypes(object["@graph"]), ...schemaTypes(object.mainEntity)];
}

export function detectSchemas(html: string) {
  const schemas: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) schemas.push(...parsed.filter((item) => item && typeof item === "object"));
      else if (parsed && typeof parsed === "object") schemas.push(parsed);
    } catch { /* invalid JSON-LD is recorded as absent */ }
  }
  return { schemas, types: [...new Set(schemas.flatMap(schemaTypes))] };
}

export function parseHtml(url: URL, html: string, statusCode: number, headers: Headers): CrawledPage {
  const withoutNoise = html.replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ");
  const title = clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const h1 = tags(withoutNoise, "h1"); const h2 = tags(withoutNoise, "h2"); const h3 = tags(withoutNoise, "h3");
  const description = meta(html, "description");
  const metaRobots = meta(html, "robots");
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].find((match) => /\brel\s*=\s*["'][^"']*canonical/i.test(match[0]));
  const canonical = canonicalTag ? normalizeCrawlUrl(attr(canonicalTag[0], "href"), url) ?? attr(canonicalTag[0], "href") : undefined;
  const linkTags = [...html.matchAll(/<a\b[^>]*>/gi)];
  const internalLinks: string[] = []; const externalLinks: string[] = [];
  for (const match of linkTags) {
    const href = attr(match[0], "href");
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const target = new URL(href, url); target.hash = "";
      if (target.hostname === url.hostname) { const normalized = normalizeCrawlUrl(target.toString(), url); if (normalized && isLikelyHtml(normalized)) internalLinks.push(normalized); }
      else if (['http:', 'https:'].includes(target.protocol)) externalLinks.push(target.toString());
    } catch { /* ignore malformed links */ }
  }
  const { schemas, types } = detectSchemas(html);
  const semanticTags = ["header", "nav", "main", "section", "article", "aside", "footer"].filter((tag) => new RegExp(`<${tag}\\b`, "i").test(html));
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? withoutNoise;
  const text = clean(body).slice(0, 100_000);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const lang = attr(html.match(/<html\b[^>]*>/i)?.[0] ?? "", "lang");
  const authors = [...new Set([meta(html, "author"), ...schemas.flatMap((schema) => {
    const author = schema.author; if (typeof author === "string") return [author];
    if (author && typeof author === "object" && "name" in author && typeof author.name === "string") return [author.name]; return [];
  })].filter(Boolean))];
  const dates = [...new Set([...html.matchAll(/<time\b[^>]*>/gi)].map((match) => attr(match[0], "datetime")).filter(Boolean))];
  const emails = [...new Set([...html.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map((match) => match[0]))].slice(0, 10);
  const phones = [...new Set([...text.matchAll(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g)].map((match) => match[0]))].slice(0, 10);
  const socialLinks = [...new Set(externalLinks.filter((link) => /(linkedin|instagram|facebook|youtube|x\.com|twitter)\.com/i.test(link)))].slice(0, 10);
  const issues: string[] = [];
  if (statusCode >= 400) issues.push(`Status HTTP ${statusCode}`);
  if (!title) issues.push("Title ausente"); else if (title.length < 20 || title.length > 65) issues.push("Title com tamanho inadequado");
  if (!description) issues.push("Meta description ausente");
  if (!canonical) issues.push("Canonical ausente");
  if (h1.length === 0) issues.push("H1 ausente"); else if (h1.length > 1) issues.push("Múltiplos H1");
  if (!lang) issues.push("Idioma do HTML ausente");
  if (!meta(html, "viewport")) issues.push("Viewport ausente");
  if (wordCount < 120) issues.push("Conteúdo pouco informativo");
  const headingsValid = h1.length === 1 && (h2.length > 0 || wordCount < 300) && ![...h1, ...h2, ...h3].some((heading) => !heading);
  const pageScore = Math.max(0, 100 - issues.length * 8 - (statusCode >= 400 ? 20 : 0));
  return { id: crypto.randomUUID(), url: url.toString(), statusCode, title: title || undefined, description: description || undefined, canonical, metaRobots: metaRobots || undefined, lang: lang || undefined, viewport: Boolean(meta(html, "viewport")), h1, h2, h3, text, wordCount, internalLinks: [...new Set(internalLinks)], externalLinks: [...new Set(externalLinks)], schema: schemas, schemaTypes: types, semanticTags, headingsValid, authors, dates, emails, phones, socialLinks, score: pageScore, issueCount: issues.length, issues, headers: Object.fromEntries(headers.entries()) };
}

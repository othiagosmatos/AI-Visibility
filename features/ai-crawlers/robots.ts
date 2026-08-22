import type { CrawlerAccess } from "@/types/audit";

export const AI_CRAWLERS = [
  ["ChatGPT Search", "OAI-SearchBot"], ["OpenAI", "GPTBot"], ["Claude", "ClaudeBot"],
  ["Perplexity", "PerplexityBot"], ["Google", "Googlebot"], ["Microsoft", "bingbot"],
] as const;

interface Group { agents: string[]; allow: string[]; disallow: string[]; }
export function parseRobots(text: string) {
  const groups: Group[] = []; let current: Group | null = null; const sitemaps: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "").trim(); if (!line) continue;
    const separator = line.indexOf(":"); if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase(); const value = line.slice(separator + 1).trim();
    if (key === "sitemap" && value) { sitemaps.push(value); continue; }
    if (key === "user-agent") {
      if (!current || current.allow.length || current.disallow.length) { current = { agents: [], allow: [], disallow: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase()); continue;
    }
    if (!current) continue;
    if (key === "allow") current.allow.push(value);
    if (key === "disallow" && value) current.disallow.push(value);
  }
  return { groups, sitemaps };
}

export function evaluateCrawler(text: string | null, name: string, userAgent: string): CrawlerAccess {
  if (text === null) return { name, userAgent, status: "allowed", rule: "Nenhuma regra específica encontrada", explanation: "O arquivo robots.txt não foi encontrado; não identificamos um bloqueio declarado para este crawler." };
  const { groups } = parseRobots(text); const agent = userAgent.toLowerCase();
  const exact = groups.filter((group) => group.agents.some((value) => value === agent));
  const relevant = exact.length ? exact : groups.filter((group) => group.agents.includes("*"));
  const disallow = relevant.flatMap((group) => group.disallow); const allow = relevant.flatMap((group) => group.allow);
  const blockedAll = disallow.includes("/") && !allow.some((rule) => rule === "/" || rule.startsWith("/"));
  if (blockedAll) return { name, userAgent, status: "blocked", rule: `User-agent: ${userAgent}\nDisallow: /`, explanation: `${name} não pode rastrear o conteúdo público segundo a regra encontrada.` };
  if (disallow.length) return { name, userAgent, status: "partial", rule: `Disallow: ${disallow.join(", ")}`, explanation: `${name} pode rastrear parte do site, mas alguns caminhos estão bloqueados.` };
  return { name, userAgent, status: "allowed", rule: allow.length ? `Allow: ${allow.join(", ")}` : "Nenhum bloqueio aplicável", explanation: `${name} pode rastrear o conteúdo público do site.` };
}

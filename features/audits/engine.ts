import type { AuditCheck, CategoryScore, CrawledPage, Recommendation, SiteReport } from "@/types/audit";
import type { CrawlResult } from "@/features/crawler/crawler";
import { extractEntity } from "@/features/entities/extract";
import { buildQuestions, citationReadiness, questionScore } from "@/features/geo/citation";

type CheckInput = Omit<AuditCheck, "status" | "score"> & { ratio: number };
const scoreValue = (max: number, ratio: number) => Math.round(Math.max(0, Math.min(1, ratio)) * max * 100) / 100;
function check(input: CheckInput): AuditCheck {
  const ratio = Math.max(0, Math.min(1, input.ratio));
  return { ...input, score: scoreValue(input.maxScore, ratio), status: ratio >= .85 ? "passed" : ratio >= .45 ? "warning" : "failed" };
}
const pageRatio = (pages: CrawledPage[], predicate: (page: CrawledPage) => boolean) => pages.length ? pages.filter(predicate).length / pages.length : 0;

const categoryLabels: Record<string, string> = {
  crawlability: "AI Crawlability", content: "Conteúdo", semantic: "Estrutura Semântica", schema: "Structured Data",
  entities: "Entidades", authority: "Autoridade", citation: "Citation Readiness", technical: "SEO Técnico",
};

function recommendationsFromChecks(checks: AuditCheck[], pages: CrawledPage[], organizationExample: string): Recommendation[] {
  const pageUrls = pages.map((page) => page.url);
  const advice: Record<string, Pick<Recommendation, "why" | "howTo" | "example" | "difficulty">> = {
    "crawler-rules": { why: "Bloqueios amplos podem impedir que mecanismos de IA acessem conteúdo público.", howTo: "Revise os grupos específicos no robots.txt e remova Disallow: / somente para os crawlers que deseja permitir.", example: "User-agent: OAI-SearchBot\nAllow: /", difficulty: "Fácil" },
    sitemap: { why: "O sitemap oferece um mapa explícito das páginas canônicas do site.", howTo: "Publique um sitemap XML com URLs canônicas e declare-o no robots.txt.", example: "Sitemap: https://seu-dominio.com/sitemap.xml", difficulty: "Médio" },
    metadata: { why: "Títulos e descrições ajudam a identificar assunto, intenção e escopo de cada página.", howTo: "Escreva títulos específicos e descrições que resumam claramente a resposta oferecida.", example: "<title>Serviço principal | Nome da empresa</title>\n<meta name=\"description\" content=\"Resumo objetivo da página.\">", difficulty: "Fácil" },
    questions: { why: "Lacunas em perguntas básicas deixam a representação da empresa incompleta.", howTo: "Crie blocos curtos que respondam quem, o quê, para quem, onde e como contratar.", example: "## Onde atendemos\nAtendemos [local identificado] e explicamos aqui a área de cobertura.", difficulty: "Fácil" },
    semantics: { why: "Marcos semânticos ajudam crawlers a separar navegação, conteúdo principal e informações complementares.", howTo: "Use main, article, nav e footer de acordo com a função real de cada bloco.", example: "<main><article>…</article></main>", difficulty: "Médio" },
    headings: { why: "Uma hierarquia clara torna o conteúdo escaneável e reduz ambiguidades.", howTo: "Mantenha um H1 principal e organize subtópicos em H2 e H3 descritivos.", example: "<h1>Serviço principal</h1>\n<h2>Como funciona</h2>", difficulty: "Fácil" },
    jsonld: { why: "Dados estruturados explicitam tipos e relações que podem ficar ambíguos no texto.", howTo: "Adicione JSON-LD válido usando somente informações verificadas no próprio site.", example: organizationExample, difficulty: "Médio" },
    organization: { why: "Organization Schema ajuda a consolidar a identidade principal do domínio.", howTo: "Inclua nome, URL e apenas os contatos ou perfis realmente publicados no site.", example: organizationExample, difficulty: "Médio" },
    entity: { why: "Sem um nome consistente, sistemas podem não conectar páginas e informações à mesma entidade.", howTo: "Repita o nome oficial de forma consistente no title, H1, rodapé e dados estruturados.", example: "<meta property=\"og:site_name\" content=\"Nome oficial\">", difficulty: "Fácil" },
    contact: { why: "Dados institucionais verificáveis aumentam clareza e confiança.", howTo: "Publique uma página de contato com os canais reais e associe-os à entidade principal.", example: "<address>Canal de contato verificado</address>", difficulty: "Fácil" },
    location: { why: "A ausência de localização pode dificultar respostas sobre área de atuação e relevância local.", howTo: "Se localização for relevante, informe cidade/região no conteúdo e em PostalAddress Schema.", example: "\"address\": { \"@type\": \"PostalAddress\", \"addressLocality\": \"[cidade real]\" }", difficulty: "Fácil" },
    authority: { why: "Sinais institucionais ajudam pessoas e sistemas a avaliar origem e responsabilidade pelo conteúdo.", howTo: "Adicione página Sobre, autores, equipe, cases, políticas e fontes onde aplicável.", example: "Por [autor identificado] · Atualizado em [data real]", difficulty: "Médio" },
    citation: { why: "Respostas diretas e verificáveis são mais fáceis de extrair e citar com contexto.", howTo: "Use perguntas descritivas, respostas objetivas, listas, autores, datas e fontes próximas às afirmações.", example: "## O que o serviço inclui?\nO serviço inclui…", difficulty: "Médio" },
    canonical: { why: "Canonicals reduzem ambiguidade entre versões duplicadas de uma página.", howTo: "Defina um canonical absoluto e coerente em cada página indexável.", example: "<link rel=\"canonical\" href=\"https://seu-dominio.com/pagina\">", difficulty: "Fácil" },
  };
  const candidates = checks.filter((item) => item.status !== "passed").map((item) => {
    const data = advice[item.id] ?? { why: item.description, howTo: item.recommendation ?? "Revise as páginas afetadas e corrija o sinal medido.", example: "Valide a correção e execute uma nova análise.", difficulty: "Médio" as const };
    const impact = item.priority === "critical" ? "Crítico" : item.priority === "high" ? "Alto" : item.priority === "medium" ? "Médio" : "Baixo";
    const affected = item.affectedPages?.length ? item.affectedPages : pageUrls.slice(0, 5);
    return { id: item.id, title: item.title, problem: item.description, why: data.why, impact, difficulty: data.difficulty, howTo: data.howTo, example: data.example, affectedPages: affected, quickWin: (impact === "Crítico" || impact === "Alto") && data.difficulty === "Fácil" } satisfies Recommendation;
  });
  const impactRank = { Crítico: 4, Alto: 3, Médio: 2, Baixo: 1 }; const easeRank = { Fácil: 3, Médio: 2, Difícil: 1 };
  return candidates.sort((a, b) => impactRank[b.impact] * easeRank[b.difficulty] - impactRank[a.impact] * easeRank[a.difficulty]);
}

export function buildReport(input: URL, crawl: CrawlResult, startedAt: number): SiteReport {
  const { pages } = crawl; const entity = extractEntity(pages); const citationScore = citationReadiness(pages);
  const questions = buildQuestions(entity); const coverage = questionScore(questions);
  const schemaCounts: Record<string, number> = {};
  for (const page of pages) for (const type of page.schemaTypes) schemaCounts[type] = (schemaCounts[type] ?? 0) + 1;
  const allowedRatio = crawl.crawlerAccess.filter((crawler) => crawler.status === "allowed").length / crawl.crawlerAccess.length;
  const orgFound = Boolean(schemaCounts.Organization || schemaCounts.LocalBusiness);
  const institutional = pages.some((page) => /\/(sobre|about|empresa|equipe|team)(?:\/|$)/i.test(new URL(page.url).pathname));
  const proofRatio = pageRatio(pages, (page) => /case|cliente|depoimento|certific|referênc|fonte/i.test(page.text));
  const orgExample = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", ...(entity.name ? { name: entity.name } : {}), url: input.origin, ...(entity.email ? { email: entity.email } : {}), ...(entity.phone ? { telephone: entity.phone } : {}) }, null, 2);

  const checks: AuditCheck[] = [
    check({ id: "crawler-rules", category: "crawlability", title: "Acesso dos crawlers de IA", description: `${crawl.crawlerAccess.filter((item) => item.status === "blocked").length} crawler(s) com bloqueio total identificado.`, ratio: allowedRatio, maxScore: 7, priority: "critical", affectedPages: [crawl.robotsUrl] }),
    check({ id: "sitemap", category: "crawlability", title: "Sitemap acessível", description: crawl.sitemap.found ? `Sitemap com ${crawl.sitemap.urlCount} URL(s) encontrado.` : "Nenhum sitemap XML acessível foi encontrado.", ratio: crawl.sitemap.found ? 1 : 0, maxScore: 4, priority: "high", affectedPages: crawl.sitemap.url ? [crawl.sitemap.url] : [input.origin] }),
    check({ id: "crawl-success", category: "crawlability", title: "Páginas acessíveis", description: `${pages.filter((page) => page.statusCode >= 200 && page.statusCode < 400).length} de ${pages.length} páginas responderam com sucesso.`, ratio: pageRatio(pages, (page) => page.statusCode >= 200 && page.statusCode < 400), maxScore: 4, priority: "high", affectedPages: pages.filter((page) => page.statusCode === 0 || page.statusCode >= 400).map((page) => page.url) }),
    check({ id: "content-depth", category: "content", title: "Conteúdo informativo", description: "Proporção de páginas com contexto suficiente para explicar o assunto.", ratio: pageRatio(pages, (page) => page.wordCount >= 120 && page.h1.length > 0), maxScore: 8, priority: "high", affectedPages: pages.filter((page) => page.wordCount < 120).map((page) => page.url) }),
    check({ id: "metadata", category: "content", title: "Títulos e descrições claros", description: "Páginas com title e meta description presentes.", ratio: pageRatio(pages, (page) => Boolean(page.title && page.description)), maxScore: 5, priority: "high", affectedPages: pages.filter((page) => !page.title || !page.description).map((page) => page.url) }),
    check({ id: "questions", category: "content", title: "Cobertura de perguntas essenciais", description: `${questions.filter((item) => item.status === "answered").length} de ${questions.length} perguntas respondidas claramente.`, ratio: coverage / 100, maxScore: 7, priority: "high" }),
    check({ id: "semantics", category: "semantic", title: "Marcos HTML semânticos", description: "Uso de main, article, nav e outros elementos que separam funções do conteúdo.", ratio: pageRatio(pages, (page) => page.semanticTags.includes("main") && page.semanticTags.length >= 3), maxScore: 5, priority: "medium", affectedPages: pages.filter((page) => !page.semanticTags.includes("main")).map((page) => page.url) }),
    check({ id: "headings", category: "semantic", title: "Hierarquia de headings", description: "Páginas com um H1 e organização coerente de subtítulos.", ratio: pageRatio(pages, (page) => page.headingsValid), maxScore: 5, priority: "medium", affectedPages: pages.filter((page) => !page.headingsValid).map((page) => page.url) }),
    check({ id: "jsonld", category: "schema", title: "JSON-LD válido", description: `${pages.filter((page) => page.schema.length).length} página(s) possuem dados estruturados válidos.`, ratio: pageRatio(pages, (page) => page.schema.length > 0), maxScore: 6, priority: "high", affectedPages: pages.filter((page) => !page.schema.length).map((page) => page.url) }),
    check({ id: "organization", category: "schema", title: "Organization Schema", description: orgFound ? "Entidade principal declarada em dados estruturados." : "Organization ou LocalBusiness Schema não encontrado.", ratio: orgFound ? 1 : 0, maxScore: 5, priority: "high", affectedPages: [pages[0]?.url ?? input.origin] }),
    check({ id: "schema-coverage", category: "schema", title: "Cobertura de tipos Schema.org", description: `${Object.keys(schemaCounts).length} tipo(s) de schema identificados.`, ratio: Math.min(1, Object.keys(schemaCounts).length / 4), maxScore: 4, priority: "medium" }),
    check({ id: "entity", category: "entities", title: "Nome da entidade principal", description: entity.name ? `Entidade identificada com ${entity.confidence}% de confiança.` : "Nome da entidade principal não identificado com segurança.", ratio: entity.name ? Math.max(.5, entity.confidence / 100) : 0, maxScore: 5, priority: "high" }),
    check({ id: "entity-description", category: "entities", title: "Descrição da atividade", description: entity.description ? "Descrição principal encontrada." : "Atividade da empresa não está descrita com clareza.", ratio: entity.description ? 1 : 0, maxScore: 3, priority: "high" }),
    check({ id: "entity-services", category: "entities", title: "Serviços identificáveis", description: `${entity.services.length} serviço(s) ou oferta(s) identificados.`, ratio: Math.min(1, entity.services.length / 3), maxScore: 3, priority: "medium" }),
    check({ id: "contact", category: "entities", title: "Contato verificável", description: entity.email || entity.phone ? "Canal de contato encontrado." : "Nenhum email ou telefone foi identificado.", ratio: entity.email || entity.phone ? 1 : 0, maxScore: 2, priority: "medium" }),
    check({ id: "location", category: "entities", title: "Localização clara", description: entity.location ? `Localização identificada: ${entity.location}.` : "Localização não identificada.", ratio: entity.location ? 1 : 0, maxScore: 2, priority: "medium" }),
    check({ id: "authority", category: "authority", title: "Informações institucionais", description: institutional ? "Página institucional encontrada." : "Página Sobre ou equivalente não identificada.", ratio: institutional ? 1 : 0, maxScore: 4, priority: "medium" }),
    check({ id: "authors", category: "authority", title: "Autores e responsáveis", description: `${pages.filter((page) => page.authors.length).length} página(s) identificam autoria.`, ratio: pageRatio(pages, (page) => page.authors.length > 0), maxScore: 2, priority: "medium" }),
    check({ id: "proof", category: "authority", title: "Provas e referências", description: "Presença de cases, clientes, depoimentos, certificações ou fontes.", ratio: proofRatio, maxScore: 2, priority: "medium" }),
    check({ id: "authority-contact", category: "authority", title: "Presença institucional verificável", description: "Contato, localização ou perfis sociais encontrados no próprio site.", ratio: entity.email || entity.phone || entity.location || pages.some((page) => page.socialLinks.length) ? 1 : 0, maxScore: 2, priority: "medium" }),
    check({ id: "citation", category: "citation", title: "Conteúdo pronto para citação", description: `Citation Readiness calculado em ${citationScore}/100.`, ratio: citationScore / 100, maxScore: 10, priority: "high" }),
    check({ id: "https", category: "technical", title: "HTTPS", description: input.protocol === "https:" ? "Site servido por HTTPS." : "Site não utiliza HTTPS.", ratio: input.protocol === "https:" ? 1 : 0, maxScore: 1, priority: "critical" }),
    check({ id: "http-status", category: "technical", title: "Status HTTP", description: "Páginas com resposta HTTP válida.", ratio: pageRatio(pages, (page) => page.statusCode >= 200 && page.statusCode < 400), maxScore: 1, priority: "high" }),
    check({ id: "canonical", category: "technical", title: "Canonicals", description: "Páginas com canonical declarado.", ratio: pageRatio(pages, (page) => Boolean(page.canonical)), maxScore: 1, priority: "medium", affectedPages: pages.filter((page) => !page.canonical).map((page) => page.url) }),
    check({ id: "lang", category: "technical", title: "Idioma do documento", description: "Páginas com atributo lang no HTML.", ratio: pageRatio(pages, (page) => Boolean(page.lang)), maxScore: 1, priority: "low" }),
    check({ id: "viewport", category: "technical", title: "Viewport responsivo", description: "Páginas com meta viewport.", ratio: pageRatio(pages, (page) => Boolean(page.viewport)), maxScore: 1, priority: "low" }),
  ];
  const categories: CategoryScore[] = Object.entries(categoryLabels).map(([id, label]) => ({ id, label, score: Math.round(checks.filter((item) => item.category === id).reduce((sum, item) => sum + item.score, 0) * 10) / 10, maxScore: checks.filter((item) => item.category === id).reduce((sum, item) => sum + item.maxScore, 0) }));
  const score = Math.round(checks.reduce((sum, item) => sum + item.score, 0));
  const missing = [!entity.location && "Localização da empresa", !entity.audience && "Público atendido", !entity.people.length && "Fundador, equipe ou autoria", !entity.services.length && "Principais serviços"].filter((value): value is string => Boolean(value));
  const recommendations = recommendationsFromChecks(checks, pages, `<script type="application/ld+json">\n${orgExample}\n</script>`);
  return { id: crypto.randomUUID(), domain: input.hostname, inputUrl: input.toString(), scannedAt: new Date().toISOString(), durationMs: Date.now() - startedAt, score, scoreLabel: score >= 85 ? "Excelente" : score >= 70 ? "Bom" : score >= 50 ? "Melhorar" : "Crítico", citationScore, questionCoverageScore: coverage, categories, checks, pages, crawlerAccess: crawl.crawlerAccess, robotsUrl: crawl.robotsUrl, robotsText: crawl.robotsText, sitemap: crawl.sitemap, schemaCounts, entity, questions, recommendations, interpretation: { company: entity.name ?? "Não identificada claramente", activity: entity.activity ?? "Não identificada", audience: entity.audience ?? "Não identificado", location: entity.location ?? "Não encontrada", services: entity.services, differentials: proofRatio > 0 ? "Sinais de diferenciação encontrados em cases, provas ou referências." : "Pouco claros", founder: entity.people[0] ?? "Não identificado", missing } };
}

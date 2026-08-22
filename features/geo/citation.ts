import type { CrawledPage, EntitySummary, QuestionCoverage } from "@/types/audit";

export function citationReadiness(pages: CrawledPage[]) {
  if (!pages.length) return 0;
  const withLists = pages.filter((page) => /<(?:ul|ol)\b/i.test(page.text)).length;
  const descriptiveHeadings = pages.filter((page) => [...page.h1, ...page.h2].some((heading) => heading.length > 15 && !/^(início|home|sobre|serviços|blog)$/i.test(heading))).length;
  const directAnswers = pages.filter((page) => /\b(?:é|somos|oferecemos|ajudamos|significa|consiste em)\b/i.test(page.text)).length;
  const provenance = pages.filter((page) => page.authors.length || page.dates.length || /fontes?|referências?/i.test(page.text)).length;
  const structured = pages.filter((page) => page.schemaTypes.length || page.semanticTags.includes("article")).length;
  const ratio = (count: number) => count / pages.length;
  return Math.round(Math.min(100, ratio(directAnswers) * 25 + ratio(descriptiveHeadings) * 25 + ratio(structured) * 20 + ratio(provenance) * 20 + ratio(withLists) * 10));
}

export function buildQuestions(entity: EntitySummary): QuestionCoverage[] {
  const name = entity.name ?? "a empresa";
  return [
    { question: `O que ${name} faz?`, status: entity.description ? "answered" : "missing", evidence: entity.description ?? undefined },
    { question: `Quais serviços ${name} oferece?`, status: entity.services.length ? "answered" : entity.description ? "partial" : "missing", evidence: entity.services.join(", ") || entity.description || undefined },
    { question: `Onde ${name} está localizada?`, status: entity.location ? "answered" : "missing", evidence: entity.location ?? undefined },
    { question: `Quem representa ou escreve por ${name}?`, status: entity.people.length ? "answered" : "missing", evidence: entity.people.join(", ") || undefined },
    { question: `Para quem ${name} trabalha?`, status: entity.audience ? "answered" : "missing", evidence: entity.audience ?? undefined },
    { question: `Como entrar em contato com ${name}?`, status: entity.email || entity.phone ? "answered" : "missing", evidence: entity.email ?? entity.phone ?? undefined },
  ];
}

export function questionScore(questions: QuestionCoverage[]) {
  return Math.round(questions.reduce((total, item) => total + (item.status === "answered" ? 1 : item.status === "partial" ? .5 : 0), 0) / questions.length * 100);
}

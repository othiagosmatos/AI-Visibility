export type AuditStatus = "passed" | "warning" | "failed";
export type Priority = "critical" | "high" | "medium" | "low";

export interface AuditCheck {
  id: string;
  category: string;
  title: string;
  description: string;
  status: AuditStatus;
  score: number;
  maxScore: number;
  priority: Priority;
  affectedPages?: string[];
  recommendation?: string;
}

export interface CrawledPage {
  id: string;
  url: string;
  statusCode: number;
  title?: string;
  description?: string;
  canonical?: string;
  metaRobots?: string;
  lang?: string;
  viewport?: boolean;
  h1: string[];
  h2: string[];
  h3: string[];
  text: string;
  wordCount: number;
  internalLinks: string[];
  externalLinks: string[];
  schema: Record<string, unknown>[];
  schemaTypes: string[];
  semanticTags: string[];
  headingsValid: boolean;
  authors: string[];
  dates: string[];
  emails: string[];
  phones: string[];
  socialLinks: string[];
  score: number;
  issueCount: number;
  issues: string[];
  headers: Record<string, string>;
}

export interface CrawlerAccess {
  name: string;
  userAgent: string;
  status: "allowed" | "partial" | "blocked";
  rule: string;
  explanation: string;
}

export interface Recommendation {
  id: string;
  title: string;
  problem: string;
  why: string;
  impact: "Crítico" | "Alto" | "Médio" | "Baixo";
  difficulty: "Fácil" | "Médio" | "Difícil";
  howTo: string;
  example: string;
  affectedPages: string[];
  quickWin: boolean;
}

export interface CategoryScore { id: string; label: string; score: number; maxScore: number; }
export interface QuestionCoverage { question: string; status: "answered" | "partial" | "missing"; evidence?: string; }

export interface EntitySummary {
  name: string | null;
  confidence: number;
  description: string | null;
  activity: string | null;
  audience: string | null;
  location: string | null;
  services: string[];
  people: string[];
  email: string | null;
  phone: string | null;
  evidence: string[];
}

export interface SitemapSummary {
  url: string | null;
  found: boolean;
  urlCount: number;
  sampledOk: number;
  errors: string[];
}

export interface SiteReport {
  id: string;
  domain: string;
  inputUrl: string;
  scannedAt: string;
  durationMs: number;
  score: number;
  scoreLabel: string;
  citationScore: number;
  questionCoverageScore: number;
  categories: CategoryScore[];
  checks: AuditCheck[];
  pages: CrawledPage[];
  crawlerAccess: CrawlerAccess[];
  robotsUrl: string;
  robotsText: string | null;
  sitemap: SitemapSummary;
  schemaCounts: Record<string, number>;
  entity: EntitySummary;
  questions: QuestionCoverage[];
  recommendations: Recommendation[];
  interpretation: { company: string; activity: string; audience: string; location: string; services: string[]; differentials: string; founder: string; missing: string[]; };
}

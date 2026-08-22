import { env } from "cloudflare:workers";
import type { CrawledPage, SiteReport } from "@/types/audit";

let initialized = false;
function db() {
  if (!env.DB) throw new Error("Banco de dados indisponível.");
  return env.DB;
}

export async function ensureDatabase() {
  if (initialized) return;
  const database = db();
  await database.batch([
    database.prepare("CREATE TABLE IF NOT EXISTS domains (id TEXT PRIMARY KEY, domain TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, domain_id TEXT NOT NULL REFERENCES domains(id), status TEXT NOT NULL, score INTEGER NOT NULL, report_json TEXT NOT NULL, started_at INTEGER NOT NULL, completed_at INTEGER NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, scan_id TEXT NOT NULL REFERENCES scans(id), url TEXT NOT NULL, status_code INTEGER NOT NULL, title TEXT, description TEXT, canonical TEXT, content TEXT, score INTEGER NOT NULL, page_json TEXT NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS audit_results (id TEXT PRIMARY KEY, scan_id TEXT NOT NULL REFERENCES scans(id), page_id TEXT, category TEXT NOT NULL, check_id TEXT NOT NULL, status TEXT NOT NULL, score REAL NOT NULL, max_score REAL NOT NULL, priority TEXT NOT NULL, description TEXT NOT NULL, recommendation TEXT)"),
    database.prepare("CREATE TABLE IF NOT EXISTS recommendations (id TEXT PRIMARY KEY, scan_id TEXT NOT NULL REFERENCES scans(id), title TEXT NOT NULL, impact TEXT NOT NULL, difficulty TEXT NOT NULL, payload_json TEXT NOT NULL)"),
    database.prepare("CREATE INDEX IF NOT EXISTS idx_scans_domain_completed ON scans(domain_id, completed_at DESC)"),
    database.prepare("CREATE INDEX IF NOT EXISTS idx_pages_scan_id ON pages(scan_id)"),
    database.prepare("CREATE INDEX IF NOT EXISTS idx_audit_results_scan_id ON audit_results(scan_id)"),
    database.prepare("CREATE INDEX IF NOT EXISTS idx_recommendations_scan_id ON recommendations(scan_id)"),
  ]);
  await database.prepare("PRAGMA optimize").run(); initialized = true;
}

function compactReport(report: SiteReport): SiteReport {
  return { ...report, pages: report.pages.map((page) => ({ ...page, text: page.text.slice(0, 6_000), headers: Object.fromEntries(Object.entries(page.headers).slice(0, 30)) })) };
}

export async function saveReport(report: SiteReport, startedAt: number) {
  await ensureDatabase(); const database = db(); const domainId = `domain:${report.domain}`;
  await database.prepare("INSERT INTO domains (id, domain, created_at) VALUES (?, ?, ?) ON CONFLICT(domain) DO NOTHING").bind(domainId, report.domain, startedAt).run();
  const compact = compactReport(report);
  await database.prepare("INSERT INTO scans (id, domain_id, status, score, report_json, started_at, completed_at) VALUES (?, ?, 'completed', ?, ?, ?, ?)").bind(report.id, domainId, report.score, JSON.stringify(compact), startedAt, Date.now()).run();
  const statements = [
    ...compact.pages.map((page) => database.prepare("INSERT INTO pages (id, scan_id, url, status_code, title, description, canonical, content, score, page_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(page.id, report.id, page.url, page.statusCode, page.title ?? null, page.description ?? null, page.canonical ?? null, page.text.slice(0, 10_000), page.score, JSON.stringify(page))),
    ...report.checks.map((item) => database.prepare("INSERT INTO audit_results (id, scan_id, page_id, category, check_id, status, score, max_score, priority, description, recommendation) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), report.id, item.category, item.id, item.status, item.score, item.maxScore, item.priority, item.description, item.recommendation ?? null)),
    ...report.recommendations.map((item) => database.prepare("INSERT INTO recommendations (id, scan_id, title, impact, difficulty, payload_json) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), report.id, item.title, item.impact, item.difficulty, JSON.stringify(item))),
  ];
  for (let index = 0; index < statements.length; index += 80) await database.batch(statements.slice(index, index + 80));
}

export async function getReport(id: string): Promise<SiteReport | null> {
  await ensureDatabase(); const row = await db().prepare("SELECT report_json FROM scans WHERE id = ? LIMIT 1").bind(id).first<{ report_json: string }>();
  if (!row) return null; try { return JSON.parse(row.report_json) as SiteReport; } catch { return null; }
}

export async function getPage(scanId: string, pageId: string): Promise<CrawledPage | null> {
  await ensureDatabase(); const row = await db().prepare("SELECT page_json FROM pages WHERE scan_id = ? AND id = ? LIMIT 1").bind(scanId, pageId).first<{ page_json: string }>();
  if (!row) return null; try { return JSON.parse(row.page_json) as CrawledPage; } catch { return null; }
}

export async function listRecentReports() {
  await ensureDatabase();
  const result = await db().prepare("SELECT scans.id, domains.domain, scans.score, scans.completed_at FROM scans JOIN domains ON domains.id = scans.domain_id WHERE scans.status = 'completed' ORDER BY scans.completed_at DESC LIMIT 30").run<{ id: string; domain: string; score: number; completed_at: number }>();
  return result.results ?? [];
}

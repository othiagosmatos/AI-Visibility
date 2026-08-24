import { getStore } from "@netlify/blobs";
import type { CrawledPage, SiteReport } from "@/types/audit";

const REPORT_PREFIX = "reports/";
const RECENT_KEY = "_recent";

type RecentReport = {
  id: string;
  domain: string;
  score: number;
  completed_at: number;
};

function reportsStore() {
  return getStore({ name: "lumina-reports", consistency: "strong" });
}

function reportKey(id: string) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) return null;
  return `${REPORT_PREFIX}${id}`;
}

function compactReport(report: SiteReport): SiteReport {
  return {
    ...report,
    pages: report.pages.map((page) => ({
      ...page,
      text: page.text.slice(0, 6_000),
      headers: Object.fromEntries(Object.entries(page.headers).slice(0, 30)),
    })),
  };
}

async function addToRecent(entry: RecentReport) {
  const store = reportsStore();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await store.getWithMetadata(RECENT_KEY, { type: "json" });
    const recent = Array.isArray(current?.data) ? current.data as RecentReport[] : [];
    const next = [entry, ...recent.filter((item) => item.id !== entry.id)]
      .sort((a, b) => b.completed_at - a.completed_at)
      .slice(0, 30);
    const result = await store.setJSON(
      RECENT_KEY,
      next,
      current ? { onlyIfMatch: current.etag } : { onlyIfNew: true },
    );
    if (result.modified) return;
  }
  throw new Error("Não foi possível atualizar o histórico da análise.");
}

export async function saveReport(report: SiteReport, _startedAt: number) {
  const key = reportKey(report.id);
  if (!key) throw new Error("Identificador de relatório inválido.");
  const compact = compactReport(report);
  const completedAt = Date.now();
  await reportsStore().setJSON(key, compact, {
    metadata: { domain: report.domain, score: report.score, completedAt },
  });
  await addToRecent({
    id: report.id,
    domain: report.domain,
    score: report.score,
    completed_at: completedAt,
  });
}

export async function getReport(id: string): Promise<SiteReport | null> {
  const key = reportKey(id);
  if (!key) return null;
  return await reportsStore().get(key, { type: "json" }) as SiteReport | null;
}

export async function getPage(scanId: string, pageId: string): Promise<CrawledPage | null> {
  const report = await getReport(scanId);
  return report?.pages.find((page) => page.id === pageId) ?? null;
}

export async function listRecentReports(): Promise<RecentReport[]> {
  const recent = await reportsStore().get(RECENT_KEY, { type: "json" });
  return Array.isArray(recent) ? recent as RecentReport[] : [];
}

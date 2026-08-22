import { z } from "zod";
import { crawlSite } from "@/features/crawler/crawler";
import { normalizeInputUrl } from "@/features/scanner/url";
import { buildReport } from "@/features/audits/engine";
import { saveReport } from "@/features/reports/store";

const payloadSchema = z.object({ url: z.string().trim().min(3).max(2048) });
const attempts = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now(); const recent = (attempts.get(key) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 3) return true; recent.push(now); attempts.set(key, recent); return false;
}

export async function POST(request: Request) {
  const client = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(client)) return Response.json({ error: "Muitas análises em sequência. Aguarde um minuto e tente novamente." }, { status: 429 });
  const startedAt = Date.now();
  try {
    const body = payloadSchema.parse(await request.json()); const url = normalizeInputUrl(body.url);
    const crawl = await crawlSite(url);
    if (!crawl.pages.length || crawl.pages.every((page) => page.statusCode === 0)) throw new Error("Não conseguimos acessar páginas HTML nesse endereço.");
    const report = buildReport(url, crawl, startedAt); await saveReport(report, startedAt);
    return Response.json({ id: report.id, score: report.score, pages: report.pages.length });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Informe uma URL válida com até 2.048 caracteres." : error instanceof Error && /local|privad|HTTP|HTTPS|credenciais|redirecion|2 MB|acessar páginas/i.test(error.message) ? error.message : "Não foi possível concluir a análise. Verifique se o site está online e tente novamente.";
    return Response.json({ error: message }, { status: 400 });
  }
}

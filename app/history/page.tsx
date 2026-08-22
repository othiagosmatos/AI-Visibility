import Link from "next/link";
import { listRecentReports } from "@/features/reports/store";

export const metadata = { title: "Histórico de análises — Lumina", description: "Análises recentes de AI Visibility.", robots: { index: false, follow: false } };

export default async function HistoryPage() {
  const reports = await listRecentReports();
  return <main className="history-shell"><header><Link className="brand" href="/"><span className="brand-mark">L</span><span>Lumina</span></Link><Link href="/">Nova análise ↗</Link></header><section><div className="history-title"><p>HISTÓRICO</p><h1>Análises recentes</h1><span>Cada novo scan fica salvo para consulta. A comparação visual entre períodos entra na próxima fase.</span></div>{reports.length ? <div className="history-list">{reports.map((report) => <Link href={`/report/${report.id}`} key={report.id}><div><strong>{report.domain}</strong><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(report.completed_at))}</span></div><b className={report.score >= 80 ? "good" : report.score >= 55 ? "warn" : "bad"}>{report.score}<small>/100</small></b><em>Ver relatório →</em></Link>)}</div> : <div className="empty-history"><span>◎</span><h2>Você ainda não analisou nenhum site.</h2><p>Insira seu domínio para descobrir como as IAs enxergam seu conteúdo.</p><Link href="/#analisar">Analisar meu site</Link></div>}</section></main>;
}

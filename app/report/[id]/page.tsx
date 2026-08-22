import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReport } from "@/features/reports/store";
import { ReportView } from "@/components/ReportView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const report = await getReport(id);
  if (!report) return { title: "Relatório não encontrado — Lumina" };
  const title = `${report.domain} — AI Visibility Score ${report.score}`; const description = `Relatório técnico de visibilidade em IA para ${report.domain}, baseado em ${report.pages.length} páginas analisadas.`;
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const report = await getReport(id); if (!report) notFound();
  return <ReportView report={report} />;
}

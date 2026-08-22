"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const phases = ["Preparando análise…", "Encontrando páginas internas…", "Analisando estrutura e conteúdo…", "Verificando crawlers de IA…", "Calculando o AI Visibility Score…", "Gerando recomendações…"];

export function ScanForm() {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [phase, setPhase] = useState(0); const [error, setError] = useState(""); const router = useRouter();
  useEffect(() => { if (!busy) return; const timer = setInterval(() => setPhase((value) => Math.min(phases.length - 1, value + 1)), 2200); return () => clearInterval(timer); }, [busy]);
  async function startScan(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setPhase(0); setError("");
    try {
      const response = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error || "Não foi possível concluir a análise.");
      router.push(`/report/${payload.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir a análise."); setBusy(false); }
  }
  return (
    <div className="scan-box">
      <form className="scan-form" id="analisar" onSubmit={startScan} aria-busy={busy}>
        <div className="url-field"><span className="globe" aria-hidden="true">◎</span><label className="sr-only" htmlFor="site-url">URL do site</label><input id="site-url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://seudominio.com.br" required value={url} onChange={(event) => setUrl(event.target.value)} disabled={busy} /></div>
        <button type="submit" disabled={busy}>{busy ? "Analisando…" : "Analisar site"} <span aria-hidden="true">↗</span></button>
      </form>
      {busy && <div className="scan-progress" role="status"><span className="progress-spinner" aria-hidden="true" /><div><strong>{phases[phase]}</strong><small>A análise usa dados reais do site e pode levar alguns instantes.</small></div><span>{Math.round((phase + 1) / phases.length * 100)}%</span></div>}
      {error && <div className="form-error" role="alert"><strong>Não foi possível analisar</strong><span>{error}</span></div>}
      {!busy && !error && <p className="form-note"><span>✓</span> Análise gratuita · Sem cartão de crédito</p>}
    </div>
  );
}

import { ScanForm } from "@/components/ScanForm";

const signals = [
  ["AI", "AI Visibility Score"], ["GEO", "GEO Analysis"],
  ["BOT", "AI Crawler Access"], ["{ }", "Structured Data"],
  ["CITE", "Citation Readiness"], ["ENT", "Entity Recognition"],
];

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="topbar" aria-label="Navegação principal">
        <a className="brand" href="#top" aria-label="Lumina, início">
          <span className="brand-mark">L</span><span>Lumina</span>
        </a>
        <div className="nav-links"><a href="/history">Histórico</a><a className="nav-cta" href="#analisar">Analisar site</a></div>
      </nav>
      <section className="hero" id="top">
        <div className="eyebrow"><span /> Visibilidade para a era da IA</div>
        <h1>Descubra como as IAs<br />enxergam seu site.</h1>
        <p className="hero-copy">Veja se seu site está preparado para ser encontrado, compreendido e citado por ChatGPT, Gemini, Claude, Perplexity e outros mecanismos de IA.</p>
        <ScanForm />
        <div className="trust-row" aria-label="Mecanismos analisados">
          <span>Compatível com</span><strong>OpenAI</strong><strong>Gemini</strong><strong>Claude</strong><strong>Perplexity</strong>
        </div>
      </section>
      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark">L</span><span>Lumina</span></a><p>Preparação para IA, medida com evidências.</p><span>© 2026 Lumina</span></footer>
      <section className="signals-section" aria-labelledby="signals-title">
        <div className="section-heading">
          <p>UMA ANÁLISE COMPLETA</p>
          <h2 id="signals-title">Tudo o que seu site precisa<br />para ser entendido por IAs.</h2>
          <span>Uma leitura técnica e editorial, traduzida em decisões claras.</span>
        </div>
        <div className="signal-grid">
          {signals.map(([code, label]) => (
            <article className="signal-card" key={label}>
              <span>{code}</span><h3>{label}</h3>
              <p>Diagnóstico objetivo com evidências e próximos passos priorizados.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ScoreGauge({ score, label, compact = false }: { score: number; label?: string; compact?: boolean }) {
  const color = score >= 80 ? "#12a66a" : score >= 55 ? "#f0a51a" : "#e34b4b";
  return <div className={`score-gauge ${compact ? "compact" : ""}`} style={{ "--score": `${score * 3.6}deg`, "--score-color": color } as React.CSSProperties}><div><strong>{Math.round(score)}</strong><span>/ 100</span>{label && <small>{label}</small>}</div></div>;
}

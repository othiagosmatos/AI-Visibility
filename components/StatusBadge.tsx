export function StatusBadge({ status }: { status: "passed" | "warning" | "failed" | "allowed" | "partial" | "blocked" }) {
  const labels = { passed: "Aprovado", warning: "Atenção", failed: "Falhou", allowed: "Permitido", partial: "Parcial", blocked: "Bloqueado" };
  const tone = status === "allowed" || status === "passed" ? "good" : status === "warning" || status === "partial" ? "warn" : "bad";
  return <span className={`status-badge ${tone}`}><i />{labels[status]}</span>;
}

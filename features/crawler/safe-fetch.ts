import { assertPublicHostname } from "@/features/scanner/url";

const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;

export async function safeFetchText(input: URL, timeoutMs = 10_000): Promise<{ response: Response; text: string; finalUrl: URL }> {
  let current = new URL(input);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    assertPublicHostname(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, { redirect: "manual", signal: controller.signal, headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8", "User-Agent": "LuminaAuditBot/1.0 (+AI visibility audit requested by site user)" } });
    } finally { clearTimeout(timer); }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirecionamento sem destino.");
      current = new URL(location, current);
      if (redirects === MAX_REDIRECTS) throw new Error("Muitos redirecionamentos.");
      continue;
    }

    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error("A resposta excede o limite de 2 MB.");
    const reader = response.body?.getReader();
    if (!reader) return { response, text: "", finalUrl: current };
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) { await reader.cancel(); throw new Error("A resposta excede o limite de 2 MB."); }
      chunks.push(value);
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
    return { response, text: new TextDecoder().decode(merged), finalUrl: current };
  }
  throw new Error("Falha ao buscar a página.");
}

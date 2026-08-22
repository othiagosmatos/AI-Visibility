const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i, /\.localhost$/i, /\.local$/i, /\.internal$/i,
  /^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^\[?::1\]?$/i, /^\[?f[cd][0-9a-f]{2}:/i, /^\[?fe8[0-9a-f]:/i,
];

export function normalizeInputUrl(value: string): URL {
  const raw = value.trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Use apenas endereços HTTP ou HTTPS.");
  if (url.username || url.password) throw new Error("URLs com credenciais não são permitidas.");
  assertPublicHostname(url.hostname);
  url.hash = "";
  return url;
}

export function assertPublicHostname(hostname: string) {
  const normalized = hostname.replace(/\.$/, "").toLowerCase();
  if (!normalized || PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error("Endereços locais ou de rede privada não podem ser analisados.");
  }
  const ipv4 = normalized.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (ipv4 && normalized.split(".").some((part) => Number(part) > 255)) throw new Error("Endereço IP inválido.");
}

export function normalizeCrawlUrl(value: string, base: URL): string | null {
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== base.hostname) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid|fbclid|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch { return null; }
}

export function isLikelyHtml(url: string) {
  return !/\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3|woff2?|ttf|css|js|xml)(?:\?|$)/i.test(url);
}

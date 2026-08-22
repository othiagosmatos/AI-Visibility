interface Fetcher { fetch(request: Request): Promise<Response>; }
interface D1Result<T = unknown> { success: boolean; results?: T[]; meta?: Record<string, unknown>; }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}
declare module "cloudflare:workers" {
  export const env: { DB: D1Database; ASSETS: Fetcher; [key: string]: unknown };
}

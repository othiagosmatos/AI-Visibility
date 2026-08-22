import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, DB: { prepare() { return { bind() { return this; }, async first() { return null; }, async run() { return { success: true }; } }; }, async batch() { return []; } } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Lumina landing page", async () => {
  const response = await render(); assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Lumina — AI Visibility para seu site<\/title>/i);
  assert.match(html, /Descubra como as IAs/);
  assert.match(html, /Analisar site/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/i);
});

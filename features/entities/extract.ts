import type { CrawledPage, EntitySummary } from "@/types/audit";

function objectsByType(pages: CrawledPage[], type: string) {
  return pages.flatMap((page) => page.schema).flatMap((schema) => {
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] as Record<string, unknown>[] : [];
    return [schema, ...graph];
  }).filter((schema) => schema["@type"] === type || (Array.isArray(schema["@type"]) && schema["@type"].includes(type)));
}
function firstString(...values: unknown[]) { return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null; }

export function extractEntity(pages: CrawledPage[]): EntitySummary {
  const home = pages[0]; const organizations = [...objectsByType(pages, "Organization"), ...objectsByType(pages, "LocalBusiness")];
  const org = organizations[0]; const evidence: string[] = [];
  let name = firstString(org?.name);
  if (name) evidence.push("Organization Schema");
  if (!name && home?.title) { name = home.title.split(/[|–—-]/)[0].trim(); evidence.push("title da página inicial"); }
  if (!name && home?.h1[0]) { name = home.h1[0]; evidence.push("H1 da página inicial"); }
  const description = firstString(org?.description, home?.description);
  if (description) evidence.push(org?.description ? "descrição estruturada" : "meta description");
  const address = org?.address && typeof org.address === "object" ? org.address as Record<string, unknown> : null;
  const location = address ? [address.addressLocality, address.addressRegion, address.addressCountry].filter((value): value is string => typeof value === "string").join(", ") || null : null;
  if (location) evidence.push("PostalAddress Schema");
  const serviceHeadings = pages.flatMap((page) => [...page.h1, ...page.h2]).filter((heading) => /serviç|soluç|produto|consult|desenvolv|plano|oferec/i.test(heading));
  const serviceSchemas = objectsByType(pages, "Service").map((schema) => firstString(schema.name)).filter((value): value is string => Boolean(value));
  const services = [...new Set([...serviceSchemas, ...serviceHeadings])].slice(0, 8);
  if (services.length) evidence.push("títulos e serviços encontrados");
  const people = [...new Set([...objectsByType(pages, "Person").map((schema) => firstString(schema.name)).filter((value): value is string => Boolean(value)), ...pages.flatMap((page) => page.authors)])].slice(0, 8);
  if (people.length) evidence.push("autores ou Person Schema");
  const email = firstString(org?.email, ...pages.flatMap((page) => page.emails));
  const phone = firstString(org?.telephone, ...pages.flatMap((page) => page.phones));
  if (email || phone) evidence.push("dados de contato");
  const confidence = Math.min(100, (name ? 28 : 0) + (description ? 18 : 0) + (organizations.length ? 24 : 0) + (services.length ? 12 : 0) + (location ? 10 : 0) + (email || phone ? 8 : 0));
  return { name, confidence, description, activity: description, audience: null, location, services, people, email, phone, evidence };
}

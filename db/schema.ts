import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(), domain: text("domain").notNull().unique(), createdAt: integer("created_at").notNull(),
});
export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(), domainId: text("domain_id").notNull().references(() => domains.id), status: text("status").notNull(), score: integer("score").notNull(), reportJson: text("report_json").notNull(), startedAt: integer("started_at").notNull(), completedAt: integer("completed_at").notNull(),
}, (table) => [index("idx_scans_domain_completed").on(table.domainId, table.completedAt)]);
export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(), scanId: text("scan_id").notNull().references(() => scans.id), url: text("url").notNull(), statusCode: integer("status_code").notNull(), title: text("title"), description: text("description"), canonical: text("canonical"), content: text("content"), score: integer("score").notNull(), pageJson: text("page_json").notNull(),
}, (table) => [index("idx_pages_scan_id").on(table.scanId)]);
export const auditResults = sqliteTable("audit_results", {
  id: text("id").primaryKey(), scanId: text("scan_id").notNull().references(() => scans.id), pageId: text("page_id"), category: text("category").notNull(), checkId: text("check_id").notNull(), status: text("status").notNull(), score: real("score").notNull(), maxScore: real("max_score").notNull(), priority: text("priority").notNull(), description: text("description").notNull(), recommendation: text("recommendation"),
}, (table) => [index("idx_audit_results_scan_id").on(table.scanId)]);
export const recommendations = sqliteTable("recommendations", {
  id: text("id").primaryKey(), scanId: text("scan_id").notNull().references(() => scans.id), title: text("title").notNull(), impact: text("impact").notNull(), difficulty: text("difficulty").notNull(), payloadJson: text("payload_json").notNull(),
}, (table) => [index("idx_recommendations_scan_id").on(table.scanId)]);

import type { EntitySummary, CrawledPage } from "@/types/audit";

export interface SiteContext { pages: CrawledPage[]; deterministicEntity: EntitySummary; }
export interface AIAnalysis { summary: string | null; provider: string; }
export interface AIProvider { analyzeSite(data: SiteContext): Promise<AIAnalysis>; }

export class MockAIProvider implements AIProvider {
  async analyzeSite(data: SiteContext): Promise<AIAnalysis> {
    return { summary: data.deterministicEntity.description, provider: "deterministic-fallback" };
  }
}

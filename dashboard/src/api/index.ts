const CAP_URL = import.meta.env.VITE_CAP_SERVICE_URL || "http://localhost:8080";
const BUDGET_URL = import.meta.env.VITE_BUDGET_MANAGER_URL || "http://localhost:8081";

export interface Bucket { count: number; frequency: number; }
export interface BudgetRow {
  cohort_id: string; campaign_id: string;
  remaining: number; spent: number; max_budget: number;
  window_expires_at: string;
}
export interface EnforcementSummary { served: number; suppressed: number; }
export interface AdStats { campaign_id: string; served: number; suppressed: number; total: number; }

export async function fetchCampaigns(): Promise<string[]> {
  try {
    const r = await fetch(`${CAP_URL}/campaigns`);
    if (r.ok) return r.json();
  } catch {}
  return [];
}

export async function fetchDistribution(campaignId: string): Promise<Bucket[]> {
  const r = await fetch(`${CAP_URL}/distribution/${campaignId}`);
  const d = await r.json();
  return (d.buckets || []).map((b: any) => ({ count: b.count, frequency: b.frequency }));
}

export async function fetchBudgets(cohortId: string): Promise<BudgetRow[]> {
  const r = await fetch(`${BUDGET_URL}/budget/${cohortId}`);
  return r.json();
}

export async function fetchEnforcementSummary(_campaignId: string): Promise<EnforcementSummary> {
  try {
    const r = await fetch(`${CAP_URL}/enforcement-summary`);
    if (r.ok) return r.json();
  } catch {}
  return { served: 0, suppressed: 0 };
}

export async function fetchTopAds(cohortId: string): Promise<AdStats[]> {
  const r = await fetch(`${CAP_URL}/top-ads/${cohortId}`);
  return r.json();
}

export const CAP_SERVICE_URL = CAP_URL;
export const BUDGET_MANAGER_URL = BUDGET_URL;

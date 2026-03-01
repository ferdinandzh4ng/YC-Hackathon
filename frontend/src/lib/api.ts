import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  if (refreshed?.access_token) return refreshed.access_token;
  // Client may not have session yet right after nav (cookies/hydration)
  await new Promise((r) => setTimeout(r, 300));
  const { data: { session: retry } } = await supabase.auth.getSession();
  return retry?.access_token ?? null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = (err as { detail?: string }).detail || res.statusText;
    if (res.status === 401) {
      throw new Error(msg === "Missing or invalid authorization header" ? "Not signed in. Please sign in again." : msg);
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Company {
  id: string;
  name: string;
  market: string;
  website: string | null;
  location: string | null;
  created_at: string;
  last_updated?: string | null;
}

export interface Competitor {
  id: string;
  url: string;
  name: string | null;
}

export interface AggregatedFeedback {
  competitor_id: string;
  url: string;
  competitor_name: string | null;
  pros: string[];
  cons: string[];
  average_rating: number;
  run_count: number;
}

export interface RankingItem {
  competitor_id: string;
  url: string;
  name: string | null;
  average_rating: number;
  rank: number;
}

export interface ReviewItem {
  id?: string;
  company_id?: string;
  source: string;
  place_name: string | null;
  rating: string | null;
  review_text: string | null;
  reviewer_name: string | null;
  url: string | null;
}

export interface CompanyDetail {
  company: Company;
  competitors: Competitor[];
  aggregated_feedback: AggregatedFeedback[];
  rankings: RankingItem[];
  review_items: ReviewItem[];
  social_items: unknown[];
}

export interface ScrapeRun {
  id: string;
  competitor_id: string | null;
  type: string;
  status: string;
  live_url: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  metadata?: { source?: string } | null;
}

export interface ScrapeRunsResponse {
  runs: ScrapeRun[];
  agents_running_count: number;
}

export async function deleteCompany(id: string): Promise<void> {
  await apiFetch(`/companies/${id}`, { method: "DELETE" });
}

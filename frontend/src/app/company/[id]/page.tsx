"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Clock, Users, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AnalyticsTab from "@/components/AnalyticsTab";
import ScrapersTab from "@/components/ScrapersTab";
import {
  apiFetch,
  type CompanyDetail,
  type ScrapeRunsResponse,
} from "../../../lib/api";

type Tab = "analytics" | "scrapers";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [runs, setRuns] = useState<ScrapeRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    () => (tabParam === "scrapers" ? "scrapers" : "analytics")
  );
  useEffect(() => {
    if (tabParam === "scrapers" || tabParam === "analytics") setActiveTab(tabParam);
  }, [tabParam]);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiFetch<CompanyDetail>(`/companies/${id}`);
      setDetail(data);
    } catch {
      router.replace("/");
      return;
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const loadRuns = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiFetch<ScrapeRunsResponse>(`/companies/${id}/runs`);
      setRuns(data);
    } catch {
      setRuns({ runs: [], agents_running_count: 0 });
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    loadRuns();
    const t = setInterval(loadRuns, 10000);
    return () => clearInterval(t);
  }, [loadRuns]);

  if (loading || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="text-zinc-400 animate-spin" />
      </div>
    );
  }

  const company = detail.company;
  const hasData = detail.rankings.length > 0 || detail.aggregated_feedback.length > 0 || detail.review_items.length > 0;

  return (
    <>
      <Sidebar activeTab={activeTab} onTabChange={(t) => setActiveTab(t as Tab)} />

      <div className="ml-[220px] px-8 py-7">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-lg font-bold text-zinc-600">
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  {company.name}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[12px] text-zinc-500">{company.market}</span>
                  <span className="text-zinc-200">|</span>
                  <div className="flex items-center gap-1">
                    <Users size={11} className="text-zinc-400" />
                    <span className="text-[12px] text-zinc-500">
                      {detail.competitors.length} competitors
                    </span>
                  </div>
                  {runs && runs.agents_running_count > 0 && (
                    <>
                      <span className="text-zinc-200">|</span>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-zinc-400" />
                        <span className="text-[12px] text-zinc-500">
                          {runs.agents_running_count} agents running
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] flex-wrap justify-end">
              {detail.competitors.map((c) => (
                <span
                  key={c.id}
                  className="px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-500 font-medium"
                >
                  {c.name || c.url}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "analytics" ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {hasData ? (
                <AnalyticsTab
                  rankings={detail.rankings}
                  aggregatedFeedback={detail.aggregated_feedback}
                  reviewItems={detail.review_items}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                    <BarChart3 size={24} className="text-zinc-400" />
                  </div>
                  <p className="text-[15px] font-medium text-zinc-700 mb-1">
                    No analysis data yet
                  </p>
                  <p className="text-[13px] text-zinc-400 max-w-[300px]">
                    Scrapers are still collecting competitor data. Switch to
                    Scrapers to monitor progress.
                  </p>
                  <button
                    onClick={() => setActiveTab("scrapers")}
                    className="mt-4 px-4 py-2 bg-black text-white text-[12px] font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    View Scrapers
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="scrapers"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <ScrapersTab
                runs={runs?.runs ?? []}
                agentsRunningCount={runs?.agents_running_count ?? 0}
                competitors={detail.competitors}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

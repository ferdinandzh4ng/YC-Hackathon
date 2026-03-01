"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Clock, Users, Loader2, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AnalyticsTab from "@/components/AnalyticsTab";
import ScrapersTab from "@/components/ScrapersTab";
import SocialPostQualityTab from "@/components/SocialPostQualityTab";
import OutreachTab from "@/components/OutreachTab";
import {
  apiFetch,
  deleteCompany,
  type CompanyDetail,
  type ScrapeRunsResponse,
} from "../../../lib/api";

type Tab = "analytics" | "scrapers" | "social" | "outreach";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [runs, setRuns] = useState<ScrapeRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const agentsRunningRef = useRef(0);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    () => (tabParam === "scrapers" ? "scrapers" : tabParam === "social" ? "social" : tabParam === "outreach" ? "outreach" : "analytics")
  );
  useEffect(() => {
    if (tabParam === "scrapers" || tabParam === "analytics" || tabParam === "social" || tabParam === "outreach") setActiveTab(tabParam);
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

    const delay = runs?.agents_running_count && runs.agents_running_count > 0 ? 3000 : 10000;
    const t = setInterval(loadRuns, delay);
    return () => clearInterval(t);
  }, [loadRuns]);

  useEffect(() => {
    const running = runs?.agents_running_count ?? 0;
    const prev = agentsRunningRef.current;
    agentsRunningRef.current = running;
    if (prev > 0 && running === 0 && id) {
      loadDetail();
      setActiveTab("analytics");
      router.replace(`/company/${id}?tab=analytics`);
    }
  }, [runs?.agents_running_count, id, router, loadDetail]);

  if (loading || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="text-zinc-400 animate-spin" />
      </div>
    );
  }

  const company = detail.company;
  const hasData = detail.rankings.length > 0 || detail.aggregated_feedback.length > 0 || detail.review_items.length > 0;

  const handleDelete = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      await deleteCompany(id);
      router.push("/");
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      <Sidebar
          activeTab={activeTab}
          onTabChange={(t) => {
            setActiveTab(t as Tab);
            const next = new URLSearchParams(searchParams?.toString() ?? "");
            next.set("tab", t);
            router.replace(`/company/${id}?${next.toString()}`, { scroll: false });
          }}
        />

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
                      {detail.competitors.length} companies
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
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
            >
              <Trash2 size={14} />
              Delete company
            </button>
          </div>

          <AnimatePresence>
            {deleteConfirmOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40"
                onClick={() => !deleting && setDeleteConfirmOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
                >
                  <p className="text-[15px] font-medium text-zinc-900 mb-1">
                    Delete company?
                  </p>
                  <p className="text-[13px] text-zinc-500 mb-5">
                    This will permanently remove <strong>{company.name}</strong> and all its competitor data, runs, and feedback.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(false)}
                      disabled={deleting}
                      className="px-4 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {deleting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
                  socialItems={detail.social_items}
                  companyName={company.name}
                  onSwitchToSocial={() => {
                    setActiveTab("social");
                    router.replace(`/company/${id}?tab=social`);
                  }}
                />
              ) : (runs && runs.agents_running_count > 0) ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-5">
                    <Loader2 size={28} className="text-zinc-500 animate-spin" />
                  </div>
                  <p className="text-[15px] font-medium text-zinc-800 mb-1">
                    Compiling data
                  </p>
                  <p className="text-[13px] text-zinc-500 max-w-[300px]">
                    Analysis is being built from scrapers. This may take a minute.
                  </p>
                  <button
                    onClick={() => setActiveTab("scrapers")}
                    className="mt-5 px-4 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors"
                  >
                    View Scrapers
                  </button>
                </div>
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
          ) : activeTab === "scrapers" ? (
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
          ) : activeTab === "social" ? (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <SocialPostQualityTab
                socialItems={detail.social_items}
                companyName={company.name}
                companyId={company.id}
                runs={runs?.runs ?? []}
                onRefresh={() => {
                  loadDetail();
                  loadRuns();
                }}
                onSwitchToScrapers={() => {
                  setActiveTab("scrapers");
                  const next = new URLSearchParams(searchParams?.toString() ?? "");
                  next.set("tab", "scrapers");
                  router.replace(`/company/${id}?${next.toString()}`, { scroll: false });
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="outreach"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <OutreachTab
                outreachItems={detail.outreach_items ?? []}
                companyName={company.name}
                companyMarket={company.market}
                companyId={company.id}
                competitors={detail.competitors}
                socialItems={detail.social_items}
                runs={runs?.runs ?? []}
                onRefresh={() => {
                  loadDetail();
                  loadRuns();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

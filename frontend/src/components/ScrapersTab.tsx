"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Globe,
  Activity,
  Play,
  Clock,
  X,
  Bot,
} from "lucide-react";
import type { ScrapeRun } from "../lib/api";
import type { Competitor } from "../lib/api";

export interface ScrapersTabProps {
  runs?: ScrapeRun[];
  agentsRunningCount?: number;
  competitors?: Competitor[];
}

type SiteKind = { id: string; name: string; isSocial: boolean };

function formatStartedAt(s: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

function runSubLabel(run: ScrapeRun): string {
  if (run.type === "social" && run.metadata?.source) return run.metadata.source as string;
  return run.type;
}

export default function ScrapersTab({
  runs = [],
  agentsRunningCount = 0,
  competitors = [],
}: ScrapersTabProps) {
  const [selectedSite, setSelectedSite] = useState<SiteKind | null>(null);
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const compMap = new Map(competitors.map((c) => [c.id, c]));

  const sites: SiteKind[] = useMemo(() => {
    const list: SiteKind[] = competitors.map((c) => ({
      id: c.id,
      name: c.name || c.url || c.id,
      isSocial: false,
    }));
    const hasSocialRuns = runs.some((r) => r.type === "social");
    if (hasSocialRuns) list.push({ id: "__social__", name: "Social", isSocial: true });
    return list;
  }, [competitors, runs]);

  const runsForSite = useMemo(() => {
    if (!selectedSite) return [];
    if (selectedSite.isSocial) return runs.filter((r) => r.type === "social");
    return runs.filter((r) => r.competitor_id === selectedSite.id);
  }, [selectedSite, runs]);

  const completedCount = runs.filter((r) => r.status === "done").length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Activity size={18} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-zinc-900">{agentsRunningCount}</p>
            <p className="text-[11px] text-zinc-500 font-medium">Agents running</p>
          </div>
        </div>
        <div className="text-[12px] text-zinc-500">
          {completedCount} / {runs.length} completed
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        <h3 className="text-[14px] font-semibold text-zinc-900 mb-3">Scrapers</h3>
        <p className="text-[11px] text-zinc-500 mb-6">
          Each cube is a site. Click a cube to see scrapers for that site, then click Watch to open the live agent.
        </p>

        {sites.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-zinc-500 rounded-xl border border-zinc-200 bg-zinc-50/50">
            No sites yet. Add a company to start competitor and social scrapes.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {sites.map((site, index) => {
              const siteRuns = site.isSocial
                ? runs.filter((r) => r.type === "social")
                : runs.filter((r) => r.competitor_id === site.id);
              const running = siteRuns.filter((r) => r.status === "running").length;
              const done = siteRuns.filter((r) => r.status === "done").length;
              return (
                <motion.button
                  key={site.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                  onClick={() => setSelectedSite(site)}
                  className="group flex flex-col items-center text-left"
                >
                  <div className="relative w-full aspect-square max-w-[140px] rounded-xl bg-white border-2 border-zinc-200 shadow-sm group-hover:border-zinc-300 group-hover:shadow-md transition-all flex flex-col justify-end overflow-hidden">
                    <div className="flex-1 flex items-center justify-center p-3">
                      <Globe size={28} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                    </div>
                    <div className="h-2 w-full bg-zinc-100 group-hover:bg-zinc-200 transition-colors" />
                  </div>
                  <p className="mt-2 text-[12px] font-medium text-zinc-800 truncate w-full max-w-[140px]" title={site.name}>
                    {site.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                    {running > 0 && (
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <Loader2 size={10} className="animate-spin" />
                        {running}
                      </span>
                    )}
                    {done > 0 && (
                      <span className="flex items-center gap-0.5 text-blue-600">
                        <CheckCircle2 size={10} />
                        {done}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Overlay 1: list of runs for selected site (iframe overlay sits on top when watchUrl is set) */}
      <AnimatePresence>
        {selectedSite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setSelectedSite(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg max-h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                <h3 className="text-[14px] font-semibold text-zinc-900">
                  Scrapers — {selectedSite.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedSite(null)}
                  className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-600 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 min-h-0">
                {runsForSite.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-zinc-500">
                    No runs for this site yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {runsForSite.map((run) => {
                      const isRunning = run.status === "running";
                      const isDone = run.status === "done";
                      const isFailed = run.status === "failed";
                      const subLabel = runSubLabel(run);
                      return (
                        <li
                          key={run.id}
                          className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                              <Bot size={16} className="text-zinc-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-zinc-800">{subLabel}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatStartedAt(run.started_at)}
                                </span>
                                {isRunning && (
                                  <span className="flex items-center gap-1 text-emerald-600">
                                    <Loader2 size={10} className="animate-spin" />
                                    Running
                                  </span>
                                )}
                                {isDone && (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <CheckCircle2 size={10} />
                                    Done
                                  </span>
                                )}
                                {isFailed && (
                                  <span className="text-red-600">Failed</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {run.live_url && (
                            <button
                              type="button"
                              onClick={() => setWatchUrl(run.live_url!)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors flex-shrink-0"
                            >
                              <Play size={12} />
                              Watch
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay 2: iframe for live scraper */}
      <AnimatePresence>
        {watchUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setWatchUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50">
                <span className="text-[13px] font-medium text-zinc-700">Live agent</span>
                <button
                  type="button"
                  onClick={() => setWatchUrl(null)}
                  className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-600 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <iframe
                src={watchUrl}
                title="Live agent"
                className="flex-1 w-full min-h-0 border-0"
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

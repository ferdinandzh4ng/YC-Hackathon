"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  Play,
  MessageSquare,
  Activity,
  Clock,
  Loader2,
  CheckCircle2,
  X,
  Bot,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { SocialItem, ScrapeRun } from "../lib/api";

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

const HOOK_POWER_WORDS = [
  "how",
  "why",
  "secret",
  "best",
  "top",
  "new",
  "free",
  "proven",
  "simple",
  "ultimate",
  "mistake",
  "guide",
  "tips",
  "hack",
];

const CTA_PHRASES = [
  "save this",
  "share",
  "comment",
  "link in bio",
  "tag someone",
  "follow",
  "dm me",
  "click the link",
  "drop a",
  "let me know",
  "tell me",
  "link in my bio",
];

export interface PostQualityBreakdown {
  hook: number;
  emotion: number;
  format: number;
  timing: number;
  cta: number;
}

export interface PostQualityScore {
  total: number;
  breakdown: PostQualityBreakdown;
}

export function scorePostQuality(
  text: string,
  _source: string,
  postedAt?: Date | null
): PostQualityScore {
  const t = (text ?? "").trim();
  const hook = t.slice(0, 125);
  const firstFive = hook.split(/\s+/).slice(0, 5).join(" ");

  let hookPts = 0;
  if (/\d+/.test(firstFive)) hookPts += 5;
  if (/\?/.test(firstFive)) hookPts += 5;
  const lower = firstFive.toLowerCase();
  if (HOOK_POWER_WORDS.some((w) => lower.includes(w))) hookPts += 5;
  if (hook.length > 0 && hook.length <= 80) hookPts += 5;
  const clarity = Math.min(5, Math.floor(hook.length / 25));
  hookPts = Math.min(25, hookPts + clarity);

  let emotionPts = 10;
  const curiosity = /curious|discover|learn|find out|secret|why|how/i;
  const excitement = /excited|amazing|incredible|love|best|top/i;
  if (curiosity.test(t) || excitement.test(t)) emotionPts = Math.min(20, emotionPts + 8);

  let formatPts = 10;
  const lines = t.split(/\n/).filter(Boolean).length;
  if (lines >= 3 && t.length > 200) formatPts = 16;

  let timingPts = 10;
  if (postedAt) {
    const h = postedAt.getHours();
    const peak = (h >= 9 && h <= 11) || (h >= 19 && h <= 21);
    if (peak) timingPts = 20;
    else if (h >= 12 && h <= 14) timingPts = 12;
    else if (h >= 7 && h <= 22) timingPts = 5;
  }

  const lowerText = t.toLowerCase();
  const ctaCount = CTA_PHRASES.filter((p) => lowerText.includes(p)).length;
  let ctaPts = 5;
  if (ctaCount === 1) ctaPts = 15;
  else if (ctaCount > 1) ctaPts = 3;

  const breakdown: PostQualityBreakdown = {
    hook: hookPts,
    emotion: emotionPts,
    format: formatPts,
    timing: timingPts,
    cta: ctaPts,
  };
  const total = Math.min(
    100,
    breakdown.hook + breakdown.emotion + breakdown.format + breakdown.timing + breakdown.cta
  );
  return { total, breakdown };
}

export function getScoreBand(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  if (score >= 20) return "Weak";
  return "Don't post";
}

export function getScoreBandColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-blue-100 text-blue-800";
  if (score >= 40) return "bg-amber-100 text-amber-800";
  if (score >= 20) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export interface SocialPostQualityTabProps {
  socialItems: SocialItem[];
  companyName: string;
  companyId?: string;
  runs?: ScrapeRun[];
  onRefresh?: () => void;
  onSwitchToScrapers?: () => void;
}

export default function SocialPostQualityTab({
  socialItems = [],
  companyName,
  companyId,
  runs = [],
  onRefresh,
  onSwitchToScrapers,
}: SocialPostQualityTabProps) {
  const runBySource = useMemo(() => {
    const m = new Map<string, ScrapeRun>();
    runs.forEach((r) => {
      if (r.type === "social" && r.metadata?.source) {
        const s = r.metadata.source as string;
        if (!m.has(s)) m.set(s, r);
      }
    });
    return m;
  }, [runs]);

  const socialRuns = useMemo(() => runs.filter((r) => r.type === "social"), [runs]);
  const [showRunsModal, setShowRunsModal] = useState(false);
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const [socialScrapeStarting, setSocialScrapeStarting] = useState(false);
  const [socialScrapeError, setSocialScrapeError] = useState<string | null>(null);

  const startSocialScrape = useCallback(async () => {
    if (!companyId) return;
    setSocialScrapeError(null);
    setSocialScrapeStarting(true);
    try {
      await apiFetch(`/companies/${companyId}/scrape/social`, { method: "POST" });
      onRefresh?.();
    } catch (e) {
      setSocialScrapeError(e instanceof Error ? e.message : "Failed to start social scrapes");
    } finally {
      setSocialScrapeStarting(false);
    }
  }, [companyId, onRefresh]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[18px] font-bold text-zinc-900 mb-1">Scraped posts — {companyName}</h2>
              <p className="text-[12px] text-zinc-500">
                Posts from social scrapes (X, Instagram, Facebook).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {companyId && (
                <button
                  type="button"
                  onClick={startSocialScrape}
                  disabled={socialScrapeStarting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {socialScrapeStarting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Activity size={16} className="text-zinc-500" />
                      Run social scrapers
                    </>
                  )}
                </button>
              )}
              {socialRuns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowRunsModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  <Activity size={16} className="text-zinc-500" />
                  Watch social agents
                </button>
              )}
            </div>
          </div>

          {socialItems.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-zinc-200 bg-zinc-50/50 px-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-zinc-400" />
              </div>
              <p className="text-[15px] font-medium text-zinc-700 mb-1">No social posts yet</p>
              <p className="text-[13px] text-zinc-500 max-w-[400px] mx-auto mb-4">
                Social scrapers run for X, Instagram, and Facebook. They start when you add a company, or you can start them below. Go to the <strong>Scrapers</strong> tab and click the <strong>Social</strong> cube to see runs and watch agents live. Posts appear here when each run completes.
              </p>
              {socialScrapeError && (
                <p className="text-[12px] text-red-600 mb-3">{socialScrapeError}</p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {companyId && (
                  <>
                    <button
                      type="button"
                      onClick={startSocialScrape}
                      disabled={socialScrapeStarting}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[13px] font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {socialScrapeStarting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Starting…
                        </>
                      ) : (
                        <>
                          <Activity size={16} />
                          Run social scrapers
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRefresh?.()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      Refresh
                    </button>
                  </>
                )}
                {onSwitchToScrapers && (
                  <button
                    type="button"
                    onClick={onSwitchToScrapers}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    View Scrapers tab
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {socialItems.map((item, index) => {
                const text = item.text ?? "";
                const scoreResult = scorePostQuality(text, item.source, null);
                const band = getScoreBand(scoreResult.total);
                const bandColor = getScoreBandColor(scoreResult.total);
                const run = item.source ? runBySource.get(item.source) : undefined;
                const hookPreview = text.slice(0, 125);
                const hasMore = text.length > 125;
                return (
                  <motion.li
                    key={item.id ?? index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                            {item.source}
                          </span>
                          {(item.handle_or_author || item.display_name) && (
                            <span className="text-[12px] text-zinc-600">
                              {item.display_name || item.handle_or_author}
                              {item.handle_or_author && item.display_name && ` (@${item.handle_or_author})`}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-zinc-800">
                          {hookPreview}
                          {hasMore && "…"}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
                            >
                              <ExternalLink size={12} />
                              View post
                            </a>
                          )}
                          {run?.live_url && (
                            <a
                              href={run.live_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 bg-white text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              <Play size={11} />
                              Watch
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold border-2 border-zinc-200"
                          title={`Hook ${scoreResult.breakdown.hook} · Emotion ${scoreResult.breakdown.emotion} · Format ${scoreResult.breakdown.format} · Timing ${scoreResult.breakdown.timing} · CTA ${scoreResult.breakdown.cta}`}
                        >
                          {scoreResult.total}
                        </div>
                        <span
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold ${bandColor}`}
                        >
                          {band}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Modal: list of social runs with Watch */}
        <AnimatePresence>
          {showRunsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setShowRunsModal(false)}
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
                    Social scrapers — Watch live
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowRunsModal(false)}
                    className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-600 transition-colors"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0">
                  {socialRuns.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[13px] text-zinc-500">
                      No social runs yet.
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-100">
                      {socialRuns.map((run) => {
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
                                onClick={() => {
                                  setWatchUrl(run.live_url!);
                                  setShowRunsModal(false);
                                }}
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

        {/* Iframe overlay: live agent view */}
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
      </motion.div>
    </>
  );
}

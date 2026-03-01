"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  X,
  MessageSquare,
  Activity,
  Bot,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { OutreachItem, ScrapeRun, Competitor, SocialItem } from "../lib/api";

function formatStartedAt(s: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

type Platform = "x" | "instagram" | "facebook";

const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X (Twitter)",
  instagram: "Instagram",
  facebook: "Facebook",
};

const PLATFORM_DOMAINS: Record<Platform, RegExp> = {
  x: /(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/,
  instagram: /instagram\.com\/([a-zA-Z0-9_.]+)/,
  facebook: /facebook\.com\/([a-zA-Z0-9_.]+)/,
};

/** Extract platform handles from social item URLs. */
function extractHandleFromUrl(url: string, platform: Platform): string | null {
  const match = url.match(PLATFORM_DOMAINS[platform]);
  if (!match) return null;
  const handle = match[1];
  // Filter out non-profile paths
  if (["search", "explore", "hashtag", "status", "p", "reel", "stories", "share"].includes(handle.toLowerCase())) return null;
  return handle;
}

/** For a competitor name, find matching social handles from social_items. */
function buildCompetitorSocialMap(
  competitors: Competitor[],
  socialItems: SocialItem[]
): Map<string, Record<Platform, string>> {
  const map = new Map<string, Record<Platform, string>>();

  for (const comp of competitors) {
    const handles: Partial<Record<Platform, string>> = {};
    const compNameLower = (comp.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const compUrlDomain = (comp.url || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "").toLowerCase();

    for (const item of socialItems) {
      const itemUrl = item.url || "";
      const itemHandle = (item.handle_or_author || "").replace(/^@/, "").toLowerCase();
      const itemDisplayLower = (item.display_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check if this social item is related to this competitor
      const nameMatch =
        (compNameLower && itemDisplayLower && (itemDisplayLower.includes(compNameLower) || compNameLower.includes(itemDisplayLower))) ||
        (compNameLower && itemHandle && (itemHandle.includes(compNameLower) || compNameLower.includes(itemHandle)));
      const domainMatch = compUrlDomain && itemUrl.toLowerCase().includes(compUrlDomain.split(".")[0]);

      if (!nameMatch && !domainMatch) continue;

      for (const platform of Object.keys(PLATFORM_DOMAINS) as Platform[]) {
        if (handles[platform]) continue;
        // Try extracting from the item URL
        const fromUrl = extractHandleFromUrl(itemUrl, platform);
        if (fromUrl) {
          handles[platform] = fromUrl;
          continue;
        }
        // If the social item source matches the platform, use the handle_or_author
        if (item.source === platform && itemHandle) {
          handles[platform] = itemHandle;
        }
      }
    }

    if (Object.keys(handles).length > 0) {
      map.set(comp.id, handles as Record<Platform, string>);
    }
  }

  return map;
}

export interface OutreachTabProps {
  outreachItems: OutreachItem[];
  companyName: string;
  companyMarket: string;
  companyId: string;
  competitors?: Competitor[];
  socialItems?: SocialItem[];
  runs?: ScrapeRun[];
  onRefresh?: () => void;
}

export default function OutreachTab({
  outreachItems = [],
  companyName,
  companyMarket,
  companyId,
  competitors = [],
  socialItems = [],
  runs = [],
  onRefresh,
}: OutreachTabProps) {
  const [selectedCompetitorId, setSelectedCompetitorId] = useState("");
  const [selectedSources, setSelectedSources] = useState<Platform[]>([]);
  const [limit, setLimit] = useState(20);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [watchUrl, setWatchUrl] = useState<string | null>(null);
  const [showRunsModal, setShowRunsModal] = useState(false);

  const outreachRuns = useMemo(
    () => runs.filter((r) => r.type === "outreach"),
    [runs]
  );

  // Build competitor → platform handle map
  const competitorSocialMap = useMemo(
    () => buildCompetitorSocialMap(competitors, socialItems),
    [competitors, socialItems]
  );

  // Competitors that have at least one social handle
  const outreachableCompetitors = useMemo(
    () => competitors.filter((c) => competitorSocialMap.has(c.id)),
    [competitors, competitorSocialMap]
  );

  // Available platforms for the selected competitor
  const availablePlatforms = useMemo<Platform[]>(() => {
    if (!selectedCompetitorId) return [];
    const handles = competitorSocialMap.get(selectedCompetitorId);
    if (!handles) return [];
    return (Object.keys(handles) as Platform[]).filter((p) => handles[p]);
  }, [selectedCompetitorId, competitorSocialMap]);

  // When competitor changes, auto-select all available platforms
  const handleCompetitorChange = (compId: string) => {
    setSelectedCompetitorId(compId);
    setSelectedSources([]);
    setError(null);
    setSuccess(null);
    if (compId) {
      const handles = competitorSocialMap.get(compId);
      if (handles) {
        setSelectedSources((Object.keys(handles) as Platform[]).filter((p) => handles[p]));
      }
    }
  };

  const toggleSource = (src: Platform) => {
    setSelectedSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src]
    );
  };

  // Build per-source handle for the API call
  const selectedHandles = useMemo(() => {
    if (!selectedCompetitorId) return {};
    const handles = competitorSocialMap.get(selectedCompetitorId);
    if (!handles) return {};
    const result: Record<string, string> = {};
    for (const src of selectedSources) {
      if (handles[src]) result[src] = handles[src];
    }
    return result;
  }, [selectedCompetitorId, competitorSocialMap, selectedSources]);

  const startOutreach = useCallback(async () => {
    if (!companyId || !selectedCompetitorId || selectedSources.length === 0) return;
    const handles = competitorSocialMap.get(selectedCompetitorId);
    if (!handles) return;

    setError(null);
    setSuccess(null);
    setStarting(true);
    try {
      // Fire one outreach request per platform with the correct handle
      const promises = selectedSources.map((src) => {
        const handle = handles[src];
        if (!handle) return Promise.resolve();
        return apiFetch(`/companies/${companyId}/outreach`, {
          method: "POST",
          body: JSON.stringify({
            sources: [src],
            competitor_handle: handle,
            company_name: companyName,
            company_market: companyMarket,
            limit,
          }),
        });
      });
      await Promise.all(promises);
      setSuccess(`Outreach started for ${selectedSources.length} platform(s)`);
      onRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start outreach");
    } finally {
      setStarting(false);
    }
  }, [
    companyId,
    selectedCompetitorId,
    competitorSocialMap,
    selectedSources,
    companyName,
    companyMarket,
    limit,
    onRefresh,
  ]);

  const runningOutreach = outreachRuns.filter((r) => r.status === "running");
  const doneOutreach = outreachRuns.filter((r) => r.status === "done");
  const failedOutreach = outreachRuns.filter((r) => r.status === "failed");
  const dmsSent = outreachItems.filter((i) => i.dm_sent).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[18px] font-bold text-zinc-900 mb-1">
                Outreach — {companyName}
              </h2>
              <p className="text-[12px] text-zinc-500">
                DM competitor followers with personalized messages via browser
                automation.
              </p>
            </div>
            {outreachRuns.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRunsModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                <Bot size={16} className="text-zinc-500" />
                Watch outreach agents
              </button>
            )}
          </div>

          {/* Launch form */}
          {outreachableCompetitors.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-zinc-200 bg-zinc-50/50 px-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <Send size={24} className="text-zinc-400" />
              </div>
              <p className="text-[15px] font-medium text-zinc-700 mb-1">
                No competitors with social profiles found
              </p>
              <p className="text-[13px] text-zinc-500 max-w-[420px] mx-auto">
                Outreach requires competitors with known X, Instagram, or Facebook profiles.
                Run social scrapers first to discover competitor handles, then come back here.
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">
                  Competitor
                </label>
                <select
                  value={selectedCompetitorId}
                  onChange={(e) => handleCompetitorChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 text-[13px] text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-zinc-300 transition-all"
                >
                  <option value="">Select a competitor...</option>
                  {outreachableCompetitors.map((c) => {
                    const handles = competitorSocialMap.get(c.id);
                    const platformCount = handles ? Object.keys(handles).length : 0;
                    const platformList = handles
                      ? (Object.keys(handles) as Platform[]).map((p) => PLATFORM_LABELS[p]).join(", ")
                      : "";
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name || c.url} — {platformCount} platform{platformCount !== 1 ? "s" : ""} ({platformList})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedCompetitorId && availablePlatforms.length > 0 && (
                <>
                  {/* Show detected handles */}
                  <div className="px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1.5">Detected profiles</p>
                    <div className="flex flex-wrap gap-2">
                      {availablePlatforms.map((p) => {
                        const handle = competitorSocialMap.get(selectedCompetitorId)?.[p];
                        return (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-[11px] text-zinc-700"
                          >
                            <span className="font-medium">{PLATFORM_LABELS[p]}</span>
                            <span className="text-zinc-400">@{handle}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">
                      Platforms to outreach
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availablePlatforms.map((p) => {
                        const active = selectedSources.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => toggleSource(p)}
                            className={`px-3 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                            }`}
                          >
                            {PLATFORM_LABELS[p]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">
                      Max followers to DM per platform
                    </label>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) =>
                        setLimit(Math.max(1, Math.min(100, Number(e.target.value))))
                      }
                      min={1}
                      max={100}
                      className="w-24 px-3 py-2.5 rounded-lg border border-zinc-200 text-[13px] text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-zinc-300 transition-all"
                    />
                  </div>

                  {error && <p className="text-[12px] text-red-600">{error}</p>}
                  {success && <p className="text-[12px] text-emerald-600">{success}</p>}

                  <button
                    type="button"
                    onClick={startOutreach}
                    disabled={starting || selectedSources.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[13px] font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {starting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Start outreach ({selectedSources.length} platform{selectedSources.length !== 1 ? "s" : ""})
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Live monitoring panel */}
        {outreachRuns.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-zinc-900">
                Live Agents
              </h3>
              <div className="flex items-center gap-4 text-[12px] text-zinc-500">
                {runningOutreach.length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Loader2 size={12} className="animate-spin" />
                    {runningOutreach.length} running
                  </span>
                )}
                {doneOutreach.length > 0 && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <CheckCircle2 size={12} />
                    {doneOutreach.length} done
                  </span>
                )}
                {failedOutreach.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle size={12} />
                    {failedOutreach.length} failed
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {outreachRuns.map((run) => {
                const isRunning = run.status === "running";
                const isDone = run.status === "done";
                const isFailed = run.status === "failed";
                const source = (run.metadata?.source as string) ?? "outreach";
                const handle = (run.metadata?.competitor_handle as string) ?? "";
                return (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative p-4 rounded-xl border bg-white transition-all ${
                      isRunning
                        ? "border-emerald-200 shadow-sm shadow-emerald-100"
                        : isFailed
                          ? "border-red-200"
                          : "border-zinc-200"
                    }`}
                  >
                    {isRunning && (
                      <div className="absolute top-3 right-3">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isRunning ? "bg-emerald-50" : isFailed ? "bg-red-50" : "bg-zinc-100"
                      }`}>
                        <Send size={16} className={
                          isRunning ? "text-emerald-600" : isFailed ? "text-red-500" : "text-zinc-600"
                        } />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-zinc-800 capitalize">
                          {source}
                        </p>
                        {handle && (
                          <p className="text-[11px] text-zinc-400 truncate">
                            @{handle.replace(/^@/, "")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <Clock size={10} />
                        {formatStartedAt(run.started_at)}
                        {isRunning && (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <Activity size={10} />
                            Live
                          </span>
                        )}
                        {isDone && (
                          <span className="text-blue-600 font-medium">Complete</span>
                        )}
                        {isFailed && (
                          <span className="text-red-500 font-medium">Failed</span>
                        )}
                      </div>
                      {run.live_url && (
                        <button
                          type="button"
                          onClick={() => setWatchUrl(run.live_url!)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            isRunning
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
                          }`}
                        >
                          <Play size={11} />
                          Watch
                        </button>
                      )}
                    </div>

                    {isFailed && run.error_message && (
                      <p className="mt-2 text-[11px] text-red-500 truncate" title={run.error_message}>
                        {run.error_message}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* DM History */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[15px] font-semibold text-zinc-900">
              DM History
            </h3>
            {outreachItems.length > 0 && (
              <span className="text-[12px] text-zinc-500">
                {dmsSent} sent / {outreachItems.length} total
              </span>
            )}
          </div>

          {outreachItems.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-zinc-200 bg-zinc-50/50 px-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-zinc-400" />
              </div>
              <p className="text-[15px] font-medium text-zinc-700 mb-1">
                No outreach yet
              </p>
              <p className="text-[13px] text-zinc-500 max-w-[400px] mx-auto">
                Select a competitor above and start outreach. The browser
                agent will scrape their followers and send personalized DMs.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {outreachItems.map((item, index) => (
                <motion.li
                  key={item.id ?? index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                          {item.source}
                        </span>
                        <span className="text-[12px] font-medium text-zinc-800">
                          @{item.username}
                        </span>
                        {item.display_name && (
                          <span className="text-[12px] text-zinc-500">
                            ({item.display_name})
                          </span>
                        )}
                        {item.competitor_handle && (
                          <span className="text-[11px] text-zinc-400">
                            via {item.competitor_handle}
                          </span>
                        )}
                      </div>
                      {item.bio && (
                        <p className="text-[12px] text-zinc-500 mb-2 line-clamp-1">
                          {item.bio}
                        </p>
                      )}
                      {item.dm_text && (
                        <div className="px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
                          <p className="text-[12px] text-zinc-700 italic">
                            &ldquo;{item.dm_text}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {item.dm_sent ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 size={14} />
                          Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-red-500">
                          <XCircle size={14} />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>

      {/* Modal: outreach runs */}
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
                  Outreach agents — Watch live
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
                {outreachRuns.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-zinc-500">
                    No outreach runs yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {outreachRuns.map((run) => {
                      const isRunning = run.status === "running";
                      const isDone = run.status === "done";
                      const isFailed = run.status === "failed";
                      const subLabel =
                        (run.metadata?.source as string) ?? "outreach";
                      return (
                        <li
                          key={run.id}
                          className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                              <Send size={16} className="text-zinc-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-zinc-800">
                                {subLabel}
                              </p>
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

      {/* Iframe overlay */}
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
                <span className="text-[13px] font-medium text-zinc-700">
                  Live agent
                </span>
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

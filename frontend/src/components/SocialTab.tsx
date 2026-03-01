"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, ExternalLink, ChevronLeft, ChevronRight, Play, Loader2 } from "lucide-react";
import type { SocialItem, ScrapeRun } from "../lib/api";

const SOURCE_LABEL: Record<string, string> = { x: "X", instagram: "Instagram", facebook: "Facebook" };

function postsBySource(items: SocialItem[]): { source: string; label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = (item.source || "").toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([source]) => ({
      source,
      label: SOURCE_LABEL[source] || source.charAt(0).toUpperCase() + source.slice(1),
      count: counts[source],
    }));
}

function formatStartedAt(s: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

export interface SocialTabProps {
  socialItems: SocialItem[];
  runs: ScrapeRun[];
  onSwitchToScrapers: () => void;
}

export default function SocialTab({
  socialItems,
  runs,
  onSwitchToScrapers,
}: SocialTabProps) {
  const socialRuns = runs.filter((r) => r.type === "social");
  const socialSourceRows = postsBySource(socialItems);
  const samplePosts = socialItems.slice(0, 8);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);
  const scrollCarousel = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollBy({ left: direction === "left" ? -width : width, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };
  useEffect(() => {
    const t = setTimeout(checkScroll, 100);
    return () => clearTimeout(t);
  }, [samplePosts.length, checkScroll]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
          <Share2 size={13} className="text-zinc-600" />
        </div>
        <h2 className="text-[15px] font-semibold text-zinc-900">
          Social media
        </h2>
      </div>
      <p className="text-[11px] text-zinc-500 mb-6">
        View scraped posts from X, Instagram, and Facebook. Run or watch social scrapers from the Scrapers tab.
      </p>

      {socialRuns.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[13px] font-semibold text-zinc-900 mb-3">Social scrape runs</h3>
          <ul className="space-y-2">
            {socialRuns.slice(0, 12).map((run) => {
              const isRunning = run.status === "running";
              const source = run.metadata?.source ?? run.type;
              return (
                <li
                  key={run.id}
                  className="flex items-center justify-between gap-4 py-2.5 px-4 rounded-lg border border-zinc-200 bg-white text-[13px]"
                >
                  <span className="font-medium text-zinc-800 capitalize">{String(source)}</span>
                  <span className="text-zinc-500 text-[12px]">{formatStartedAt(run.started_at)}</span>
                  <span className={`text-[12px] ${isRunning ? "text-amber-600" : "text-zinc-500"}`}>
                    {isRunning ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Running
                      </span>
                    ) : run.status === "done" ? (
                      "Done"
                    ) : (
                      run.status
                    )}
                  </span>
                  {run.live_url && (
                    <a
                      href={run.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-[12px] font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <Play size={12} />
                      Watch
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={onSwitchToScrapers}
            className="mt-3 px-4 py-2 text-[13px] font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg border border-zinc-200 transition-colors"
          >
            Open Scrapers to run or watch agents
          </button>
        </div>
      )}

      <div className="grid grid-cols-10 gap-5">
        <div className="col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl border border-zinc-200 overflow-hidden h-full"
          >
            <div className="px-6 py-5 border-b border-zinc-100">
              <h3 className="text-[13px] font-semibold text-zinc-900">
                Posts by source
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                From X, Instagram, Facebook scrapes
              </p>
            </div>
            <div className="overflow-y-auto">
              {socialSourceRows.length === 0 ? (
                <div className="px-6 py-8 text-center text-[13px] text-zinc-500">
                  No posts yet. Run social scrapers from the Scrapers tab.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">#</th>
                      <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Source</th>
                      <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-6 py-3">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {socialSourceRows.map((row, index) => (
                      <tr
                        key={row.source}
                        className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/70 transition-colors"
                      >
                        <td className="px-6 py-3 text-[12px] text-zinc-500 font-mono w-10">{index + 1}</td>
                        <td className="px-6 py-3 text-[13px] font-medium text-zinc-800">{row.label}</td>
                        <td className="px-6 py-3 text-right text-[12px] font-semibold text-zinc-700">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>

        <div className="col-span-5">
          <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-5 h-full">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
              Sample posts
            </p>
            {samplePosts.length === 0 ? (
              <p className="text-[13px] text-zinc-500 py-5">No posts yet. Run social scrapers from the Scrapers tab.</p>
            ) : (
              <div className="relative">
                {samplePosts.length > 1 && (
                  <div className="flex items-center justify-end gap-1.5 mb-3">
                    <button
                      type="button"
                      onClick={() => scrollCarousel("left")}
                      disabled={!canScrollLeft}
                      className="w-7 h-7 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel("right")}
                      disabled={!canScrollRight}
                      className="w-7 h-7 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
                <div
                  ref={scrollRef}
                  onScroll={checkScroll}
                  className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                >
                  {samplePosts.map((post, index) => {
                    const author = post.display_name || post.handle_or_author || "—";
                    const snippet = (post.text || "").slice(0, 80) + ((post.text?.length ?? 0) > 80 ? "…" : "");
                    const label = SOURCE_LABEL[(post.source || "").toLowerCase()] || post.source || "Social";
                    return (
                      <div
                        key={post.id ?? `${post.source}-${index}`}
                        className="flex-shrink-0 w-full min-w-full snap-start"
                      >
                        <div className="bg-white rounded-xl border border-zinc-200 p-5 h-full hover:border-zinc-300 transition-all duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                              {label}
                            </span>
                            {post.url && (
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900"
                              >
                                View
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                          <p className="text-[13px] font-medium text-zinc-800 mb-1">{author}</p>
                          <p className="text-[13px] text-zinc-600 leading-snug line-clamp-3">{snippet || "—"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {socialRuns.length === 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onSwitchToScrapers}
            className="px-4 py-2 text-[13px] font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg border border-zinc-200 transition-colors"
          >
            Go to Scrapers to run social agents
          </button>
        </div>
      )}
    </motion.div>
  );
}

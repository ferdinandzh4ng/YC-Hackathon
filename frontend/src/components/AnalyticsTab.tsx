"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Monitor, Star, MessageSquare, Share2, ExternalLink, ChevronLeft, ChevronRight, Bot } from "lucide-react";
import RankingTable from "@/components/RankingTable";
import UXFeedbackCarousel, { UXFeedback } from "@/components/UXFeedbackCarousel";
import FrequentReviewsCarousel, { CompanyReviews } from "@/components/FrequentReviewsCarousel";
import type { AggregatedFeedback, PersonaFeedback, RankingItem, ReviewItem, SocialItem } from "../lib/api";
import { fetchPostingGuide, type PostingGuide } from "../lib/api";

function aggregatedToUXFeedback(f: AggregatedFeedback): UXFeedback {
  const name = f.competitor_name || f.url || "Unknown";
  return {
    id: f.competitor_id,
    company: name,
    avatar: name.charAt(0).toUpperCase(),
    source: f.url,
    scrapedAt: "",
    pros: f.pros,
    cons: f.cons,
  };
}

function getSentiment(rating: number): "positive" | "negative" | "neutral" {
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";
  return "neutral";
}

function reviewItemsToCompanyReviews(source: string, items: ReviewItem[]): CompanyReviews[] {
  if (items.length === 0) return [];
  const byPlace = new Map<string, { rating: string; text: string; reviewer: string }[]>();
  for (const r of items) {
    const place = r.place_name || "Unknown";
    if (!byPlace.has(place)) byPlace.set(place, []);
    byPlace.get(place)!.push({
      rating: r.rating || "",
      text: r.review_text || "",
      reviewer: r.reviewer_name || "",
    });
  }
  return Array.from(byPlace.entries()).map(([place, reviews], i) => {
    const avg = reviews.reduce((a, r) => a + (parseFloat(r.rating) || 0), 0) / reviews.length;
    const withNum = reviews.map((r) => ({ ...r, num: parseFloat(r.rating) || 0 }));
    const sorted = [...withNum].sort((a, b) => b.num - a.num);
    const n = sorted.length;
    const indices = n <= 5
      ? sorted.map((_, j) => j)
      : [
          0, 1,
          Math.floor(n / 2),
          Math.max(0, n - 2),
          n - 1,
        ].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 5);
    const balanced = indices.map((j) => sorted[j]);
    const frequent = balanced.map((r) => ({
      text: r.text,
      count: 1,
      sentiment: getSentiment(r.num),
    }));
    return {
      id: `${source}-${i}`,
      company: place,
      avatar: place.charAt(0).toUpperCase(),
      totalReviews: reviews.length,
      avgRating: Number.isNaN(avg) ? 0 : avg,
      frequent,
    };
  });
}

const SOURCE_LABEL: Record<string, string> = { x: "X", instagram: "Instagram", facebook: "Facebook" };
const PERSONA_LABELS: Record<string, string> = {
  elderly: "Elderly Cautious",
  new_user: "First-Time Visitor",
  frustrated: "Frustrated User",
  enthusiast: "Power User",
};
const STEP_TITLES = [
  "Observed evidence",
  "Persona interpretation",
  "Score normalization",
  "Final conclusion",
];
const POSITIVE_STEP_HINTS = ["positive", "supporting", "strong", "clear", "improved", "good", "high", "best"];
const NEGATIVE_STEP_HINTS = ["concern", "friction", "risk", "negative", "slow", "poor", "weak", "drop", "issue"];

type StepTone = "positive" | "negative" | "neutral";

function classifyStepTone(step: string, rating: number): StepTone {
  const lower = step.toLowerCase();
  if (NEGATIVE_STEP_HINTS.some((k) => lower.includes(k))) return "negative";
  if (POSITIVE_STEP_HINTS.some((k) => lower.includes(k))) return "positive";
  if (lower.includes("normalized")) {
    if (rating >= 7) return "positive";
    if (rating <= 4) return "negative";
  }
  return "neutral";
}

function stepToneChip(tone: StepTone): { label: string; cls: string } {
  if (tone === "positive") {
    return {
      label: "Positive indicator",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (tone === "negative") {
    return {
      label: "Negative indicator",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  return {
    label: "Neutral indicator",
    cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
}

function groupPersonaFeedback(items: PersonaFeedback[]): Array<{ key: string; label: string; url: string; rows: PersonaFeedback[] }> {
  const grouped = new Map<string, { key: string; label: string; url: string; rows: PersonaFeedback[] }>();
  for (const item of items) {
    const key = item.competitor_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: item.competitor_name || item.url || "Unknown competitor",
        url: item.url,
        rows: [],
      });
    }
    grouped.get(key)!.rows.push(item);
  }
  const order = ["elderly", "new_user", "frustrated", "enthusiast"];
  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort(
        (a, b) =>
          (order.indexOf(a.persona) === -1 ? 999 : order.indexOf(a.persona)) -
          (order.indexOf(b.persona) === -1 ? 999 : order.indexOf(b.persona))
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const POSITIVE_WORDS = new Set([
  "love", "best", "great", "amazing", "recommend", "excellent", "good", "fantastic", "wonderful",
  "favorite", "perfect", "delicious", "beautiful", "awesome", "outstanding", "incredible", "superb",
  "enjoy", "happy", "satisfied", "impressed", "quality", "fresh", "must try", "highly recommend",
]);
const NEGATIVE_WORDS = new Set([
  "bad", "worst", "avoid", "slow", "disappointing", "terrible", "horrible", "awful", "never again",
  "overpriced", "rude", "poor", "mediocre", "waste", "bland", "dry", "cold", "messy", "dirty",
  "overrated", "underwhelming", "skip", "regret", "unacceptable", "broken", "wrong",
]);

function deriveSocialFeedback(items: SocialItem[], companyName: string): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  const seenPro = new Set<string>();
  const seenCon = new Set<string>();
  const normalize = (s: string) => s.slice(0, 120).trim().toLowerCase();
  for (const item of items) {
    const text = (item.text || "").trim();
    if (text.length < 10) continue;
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    let posCount = 0;
    let negCount = 0;
    for (const w of words) {
      const clean = w.replace(/[^a-z]/g, "");
      if (POSITIVE_WORDS.has(clean)) posCount++;
      if (NEGATIVE_WORDS.has(clean)) negCount++;
    }
    const snippet = text.slice(0, 100) + (text.length > 100 ? "…" : "");
    const key = normalize(snippet);
    if (posCount > negCount && pros.length < 7 && !seenPro.has(key)) {
      seenPro.add(key);
      pros.push(snippet);
    } else if (negCount > posCount && cons.length < 7 && !seenCon.has(key)) {
      seenCon.add(key);
      cons.push(snippet);
    }
  }
  return { pros, cons };
}

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

interface AnalyticsTabProps {
  companyId?: string;
  rankings?: RankingItem[];
  aggregatedFeedback?: AggregatedFeedback[];
  personaFeedback?: PersonaFeedback[];
  reviewItems?: ReviewItem[];
  socialItems?: SocialItem[];
  companyName?: string;
}

export default function AnalyticsTab({
  companyId,
  rankings = [],
  aggregatedFeedback = [],
  personaFeedback = [],
  reviewItems = [],
  socialItems = [],
  companyName = "",
}: AnalyticsTabProps) {
  const socialSourceRows = postsBySource(socialItems);
  const personaGroups = groupPersonaFeedback(personaFeedback);
  const samplePosts = socialItems.slice(0, 8);
  const socialFeedback = deriveSocialFeedback(socialItems, companyName);
  const socialFeedbackCard: UXFeedback | null =
    socialItems.length > 0 && (socialFeedback.pros.length > 0 || socialFeedback.cons.length > 0)
      ? {
          id: "social-feedback",
          company: companyName || "This business",
          avatar: (companyName || "B").charAt(0).toUpperCase(),
          source: "From X, Instagram, Facebook",
          scrapedAt: "",
          pros: socialFeedback.pros,
          cons: socialFeedback.cons,
        }
      : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [personaSlideByGroup, setPersonaSlideByGroup] = useState<Record<string, number>>({});
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("");
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
  const slidePersona = (groupKey: string, direction: "left" | "right", max: number) => {
    setPersonaSlideByGroup((prev) => {
      const current = prev[groupKey] ?? 0;
      const next = direction === "left" ? Math.max(0, current - 1) : Math.min(max - 1, current + 1);
      return { ...prev, [groupKey]: next };
    });
  };
  useEffect(() => {
    const t = setTimeout(checkScroll, 100);
    return () => clearTimeout(t);
  }, [samplePosts.length, checkScroll]);

  const [postingGuide, setPostingGuide] = useState<PostingGuide | null>(null);
  const [postingGuideLoading, setPostingGuideLoading] = useState(false);
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setPostingGuideLoading(true);
    fetchPostingGuide(companyId).then((guide) => {
      if (!cancelled) {
        setPostingGuide(guide ?? null);
      }
      setPostingGuideLoading(false);
    });
    return () => { cancelled = true; };
  }, [companyId]);
  useEffect(() => {
    if (personaGroups.length === 0) {
      setSelectedGroupKey("");
      return;
    }
    if (!selectedGroupKey || !personaGroups.some((g) => g.key === selectedGroupKey)) {
      setSelectedGroupKey(personaGroups[0].key);
    }
  }, [personaGroups, selectedGroupKey]);

  const uxFeedback: UXFeedback[] = aggregatedFeedback.length > 0
    ? aggregatedFeedback.map(aggregatedToUXFeedback)
    : [];
  const googleItems = reviewItems.filter((r) => r.source === "google");
  const yelpItems = reviewItems.filter((r) => r.source === "yelp");
  const googleReviewData = reviewItemsToCompanyReviews("google", googleItems);
  const yelpReviewData = reviewItemsToCompanyReviews("yelp", yelpItems);
  const selectedGroup = personaGroups.find((g) => g.key === selectedGroupKey) || null;

  return (
    <div>
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
            <Monitor size={13} className="text-zinc-600" />
          </div>
          <h2 className="text-[15px] font-semibold text-zinc-900">
            User Experience
          </h2>
        </div>

        <div className="grid grid-cols-10 gap-5">
          <div className="col-span-5">
            <RankingTable rankings={rankings} />
          </div>
          <div className="col-span-5">
            <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-4 h-full">
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Site Feedback
              </p>
              {uxFeedback.length > 0 ? (
                <UXFeedbackCarousel feedback={uxFeedback} />
              ) : (
                <p className="text-[13px] text-zinc-500 py-4">No site feedback yet. Run scrapers to collect pros/cons per competitor.</p>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
              <Bot size={13} className="text-zinc-600" />
            </div>
            <h2 className="text-[15px] font-semibold text-zinc-900">
              Agent score derivation
            </h2>
          </div>
          {personaGroups.length > 0 && (
            <select
              value={selectedGroupKey}
              onChange={(e) => setSelectedGroupKey(e.target.value)}
              className="min-w-[240px] px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              {personaGroups.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-4">
          {personaGroups.length === 0 ? (
            <p className="text-[13px] text-zinc-500 py-2">
              No persona-level reasoning yet. Run site scrapers to see each agent personality and why it scored a site this way.
            </p>
          ) : (
            <div className="space-y-4">
              {selectedGroup && (
                <div key={selectedGroup.key} className="bg-white rounded-xl border border-zinc-200 p-4">
                  <div className="flex items-center justify-between mb-3 gap-4">
                    <div>
                      <p className="text-[15px] font-semibold text-zinc-900">{selectedGroup.label}</p>
                      <p className="text-[12px] text-zinc-500">{selectedGroup.url}</p>
                    </div>
                    <a
                      href={selectedGroup.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1"
                    >
                      Open site <ExternalLink size={10} />
                    </a>
                  </div>
                  {(() => {
                    const activeIdx = Math.min(
                      personaSlideByGroup[selectedGroup.key] ?? 0,
                      Math.max(selectedGroup.rows.length - 1, 0)
                    );
                    const row = selectedGroup.rows[activeIdx];
                    if (!row) return null;
                    return (
                      <div className="rounded-lg border border-zinc-200 p-3 bg-zinc-50/60">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-semibold text-zinc-900">
                              {PERSONA_LABELS[row.persona] || row.persona}
                            </p>
                            <p className="text-[12px] text-zinc-500 mt-0.5 line-clamp-2">{row.persona_description}</p>
                          </div>
                          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full border bg-white text-zinc-700 border-zinc-200">
                            {row.rating_numeric.toFixed(1)}/10
                          </span>
                        </div>
                        {selectedGroup.rows.length > 1 && (
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[11px] text-zinc-500">
                              Behavior {activeIdx + 1} of {selectedGroup.rows.length}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => slidePersona(selectedGroup.key, "left", selectedGroup.rows.length)}
                                disabled={activeIdx === 0}
                                className="w-6 h-6 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronLeft size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => slidePersona(selectedGroup.key, "right", selectedGroup.rows.length)}
                                disabled={activeIdx >= selectedGroup.rows.length - 1}
                                className="w-6 h-6 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>
                        )}

                        <p className="text-[13px] text-zinc-700 mt-2 leading-snug">{row.summary || "No summary provided."}</p>

                        <div className="mt-3">
                          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Reasoning path
                          </p>
                          <div className="space-y-2">
                          {row.derivation.map((step, idx) => (
                            <div key={idx}>
                              <div className="rounded-md border border-zinc-200 bg-white px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                                    Step {idx + 1}
                                  </span>
                                  <span className="text-[11px] text-zinc-400">
                                    {STEP_TITLES[idx] || "Reasoning step"}
                                  </span>
                                </div>
                                {(() => {
                                  const tone = classifyStepTone(step, row.rating_numeric);
                                  const chip = stepToneChip(tone);
                                  return (
                                    <span className={`inline-flex mt-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${chip.cls}`}>
                                      {chip.label}
                                    </span>
                                  );
                                })()}
                                <p className="text-[13px] text-zinc-700 leading-snug mt-1">{step}</p>
                              </div>
                              {idx < row.derivation.length - 1 && (
                                <div className="h-2 flex items-center justify-center">
                                  <span className="w-px h-2 bg-zinc-300" />
                                </div>
                              )}
                            </div>
                          ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
                <Star size={13} className="text-zinc-600" />
              </div>
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Google Reviews
              </h2>
            </div>
            <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-4">
              {googleReviewData.length > 0 ? (
                <FrequentReviewsCarousel companies={googleReviewData} />
              ) : (
                <p className="text-[13px] text-zinc-500 py-4">No Google reviews yet.</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
                <MessageSquare size={13} className="text-zinc-600" />
              </div>
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Yelp Reviews
              </h2>
            </div>
            <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-4">
              {yelpReviewData.length > 0 ? (
                <FrequentReviewsCarousel companies={yelpReviewData} />
              ) : (
                <p className="text-[13px] text-zinc-500 py-4">No Yelp reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-12"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
            <Share2 size={13} className="text-zinc-600" />
          </div>
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Social media
          </h2>
        </div>

        <div className="grid grid-cols-10 gap-5">
          <div className="col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
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
                        <motion.tr
                          key={row.source}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
                          className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/70 transition-colors"
                        >
                          <td className="px-6 py-3 text-[12px] text-zinc-500 font-mono w-10">{index + 1}</td>
                          <td className="px-6 py-3 text-[13px] font-medium text-zinc-800">{row.label}</td>
                          <td className="px-6 py-3 text-right text-[12px] font-semibold text-zinc-700">{row.count}</td>
                        </motion.tr>
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
                        className="w-7 h-7 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollCarousel("right")}
                        disabled={!canScrollRight}
                        className="w-7 h-7 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
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
                        <motion.div
                          key={post.id ?? `${post.source}-${index}`}
                          initial={{ opacity: 0, scale: 0.96, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.07, duration: 0.4, ease: "easeOut" }}
                          className="flex-shrink-0 w-full min-w-full snap-start"
                        >
                          <div className="bg-white rounded-xl border border-zinc-200 p-5 h-full hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 group">
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
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {socialItems.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Social media feedback
            </p>
            <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-4">
              {socialFeedbackCard ? (
                <UXFeedbackCarousel feedback={[socialFeedbackCard]} />
              ) : (
                <p className="text-[13px] text-zinc-500 py-4">
                  Not enough positive or negative signals in posts yet. More social posts may yield pros/cons.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            How to make a good post in your market
          </p>
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {postingGuideLoading ? (
              <div className="px-6 py-8 text-center text-[13px] text-zinc-500">
                Loading guide…
              </div>
            ) : postingGuide && postingGuide.total_posts_analyzed > 0 ? (
              <div className="p-6 space-y-5">
                <p className="text-[13px] text-zinc-600">
                  Based on {postingGuide.total_posts_analyzed} analyzed posts in <strong>{postingGuide.market}</strong> (avg score {postingGuide.average_score.toFixed(1)}/10).
                </p>
                {postingGuide.best_times && (
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Best times to post</p>
                    <p className="text-[13px] text-zinc-800">{postingGuide.best_times}</p>
                  </div>
                )}
                {postingGuide.best_post_types.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Best post types</p>
                    <p className="text-[13px] text-zinc-800">{postingGuide.best_post_types.join(", ")}</p>
                  </div>
                )}
                {postingGuide.best_sources.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Best sources</p>
                    <p className="text-[13px] text-zinc-800">{postingGuide.best_sources.join(", ")}</p>
                  </div>
                )}
                {postingGuide.rubric_tips.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Tips from top posts</p>
                    <ul className="list-disc list-inside text-[13px] text-zinc-800 space-y-1">
                      {postingGuide.rubric_tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-6 py-6 text-[13px] text-zinc-500">
                Run social scrapers and analyze posts to see a data-driven guide for your market.
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

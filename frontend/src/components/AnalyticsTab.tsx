"use client";

import { motion } from "framer-motion";
import { Monitor, Star, MessageSquare } from "lucide-react";
import RankingTable from "@/components/RankingTable";
import UXFeedbackCarousel, { UXFeedback } from "@/components/UXFeedbackCarousel";
import FrequentReviewsCarousel, { CompanyReviews } from "@/components/FrequentReviewsCarousel";
import type { AggregatedFeedback, RankingItem, ReviewItem } from "../lib/api";

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

interface AnalyticsTabProps {
  rankings?: RankingItem[];
  aggregatedFeedback?: AggregatedFeedback[];
  reviewItems?: ReviewItem[];
}

export default function AnalyticsTab({
  rankings = [],
  aggregatedFeedback = [],
  reviewItems = [],
}: AnalyticsTabProps) {
  const uxFeedback: UXFeedback[] = aggregatedFeedback.length > 0
    ? aggregatedFeedback.map(aggregatedToUXFeedback)
    : [];
  const googleItems = reviewItems.filter((r) => r.source === "google");
  const yelpItems = reviewItems.filter((r) => r.source === "yelp");
  const googleReviewData = reviewItemsToCompanyReviews("google", googleItems);
  const yelpReviewData = reviewItemsToCompanyReviews("yelp", yelpItems);

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
    </div>
  );
}

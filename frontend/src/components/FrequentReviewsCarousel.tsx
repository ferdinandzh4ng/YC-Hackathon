"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

const TRUNCATE_LEN = 80;

export interface FrequentReview {
  text: string;
  count: number;
  sentiment: "positive" | "negative" | "neutral";
}

export interface CompanyReviews {
  id: string;
  company: string;
  avatar: string;
  totalReviews: number;
  avgRating: number;
  frequent: FrequentReview[];
}

interface FrequentReviewsCarouselProps {
  companies: CompanyReviews[];
}

const sentimentStyles = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-100",
  negative: "bg-red-50 text-red-600 border-red-100",
  neutral: "bg-zinc-50 text-zinc-600 border-zinc-100",
};

const sentimentDot = {
  positive: "bg-emerald-400",
  negative: "bg-red-400",
  neutral: "bg-zinc-300",
};

export default function FrequentReviewsCarousel({
  companies,
}: FrequentReviewsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -width : width,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 350);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-1.5 mb-3">
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className="w-7 h-7 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className="w-7 h-7 rounded-full border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {companies.map((company, index) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 0.2 + index * 0.07,
              duration: 0.4,
              ease: "easeOut",
            }}
            className="flex-shrink-0 w-full min-w-full snap-start"
          >
            <div className="bg-white rounded-xl border border-zinc-200 p-5 h-full hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 group flex flex-col max-h-[420px]">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500 group-hover:bg-zinc-200 transition-colors">
                    {company.avatar}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-800">
                      {company.company}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {company.totalReviews.toLocaleString()} reviews
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-zinc-800">
                    {company.avgRating.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                    avg
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-3 flex-shrink-0">
                <MessageSquare size={12} className="text-zinc-400" />
                <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                  Most mentioned
                </p>
              </div>

              <ul className="space-y-2 overflow-y-auto min-h-0 flex-1 pr-1 -mr-1">
                {company.frequent.map((review, i) => {
                  const key = `${company.id}-${i}`;
                  const isExpanded = expanded.has(key);
                  const isLong = review.text.length > TRUNCATE_LEN;
                  const displayText = isLong && !isExpanded
                    ? review.text.slice(0, TRUNCATE_LEN) + "…"
                    : review.text;
                  return (
                    <li
                      key={i}
                      className={`px-3 py-2 rounded-lg border text-[13px] ${sentimentStyles[review.sentiment]}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${sentimentDot[review.sentiment]}`}
                          />
                          <span className="font-medium break-words">{displayText}</span>
                        </div>
                        <span className="text-xs opacity-70 font-mono flex-shrink-0">
                          {review.count.toLocaleString()}x
                        </span>
                      </div>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(key)}
                          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-700"
                        >
                          {isExpanded ? (
                            <>Show less <ChevronUp size={12} /></>
                          ) : (
                            <>Read more <ChevronDown size={12} /></>
                          )}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

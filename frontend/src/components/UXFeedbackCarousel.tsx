"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, X, Globe } from "lucide-react";

export interface UXFeedback {
  id: string;
  company: string;
  avatar: string;
  source: string;
  scrapedAt: string;
  pros: string[];
  cons: string[];
}

interface UXFeedbackCarouselProps {
  feedback: UXFeedback[];
}

export default function UXFeedbackCarousel({
  feedback,
}: UXFeedbackCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
        {feedback.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 0.2 + index * 0.07,
              duration: 0.4,
              ease: "easeOut",
            }}
            className="flex-shrink-0 w-full min-w-full snap-start"
          >
            <div className="bg-white rounded-xl border border-zinc-200 p-5 h-full hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500 group-hover:bg-zinc-200 transition-colors">
                    {item.avatar}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-800">
                      {item.company}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Globe size={11} className="text-zinc-400" />
                      <p className="text-xs text-zinc-400">{item.source}</p>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-zinc-400 whitespace-nowrap">
                  {item.scrapedAt}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                    Pros
                  </p>
                  <ul className="space-y-1.5">
                    {item.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check
                          size={14}
                          className="text-emerald-500 mt-[2px] flex-shrink-0"
                          strokeWidth={2.5}
                        />
                        <span className="text-[13px] text-zinc-600 leading-snug">
                          {pro}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-2">
                    Cons
                  </p>
                  <ul className="space-y-1.5">
                    {item.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <X
                          size={14}
                          className="text-red-400 mt-[2px] flex-shrink-0"
                          strokeWidth={2.5}
                        />
                        <span className="text-[13px] text-zinc-600 leading-snug">
                          {con}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

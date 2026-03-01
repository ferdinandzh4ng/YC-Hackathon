"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Loader2,
  X,
  ArrowLeft,
  Globe,
  Clock,
  Activity,
  ChevronRight,
  MousePointer2,
  RefreshCw,
  Lock,
  Star,
} from "lucide-react";
import { averageProfileRatings } from "@/lib/ratings";

interface BrowserStep {
  time: string;
  action: string;
  url?: string;
  type: "navigate" | "click" | "scroll" | "extract" | "wait" | "done";
}

interface Scraper {
  id: string;
  name: string;
  target: string;
  status: "active" | "completed";
  startedAt: string;
  duration: string;
  itemsCollected: number;
  currentUrl: string;
  steps: BrowserStep[];
  /** Rating returned by this profile (e.g. 1–5). Optional while still scraping. */
  rating?: number;
}

interface ScraperSite {
  id: string;
  name: string;
  initial: string;
  domain: string;
  color: string;
  scrapers: Scraper[];
}

const sites: ScraperSite[] = [
  {
    id: "google",
    name: "Google Reviews",
    initial: "G",
    domain: "google.com/maps",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    scrapers: [
      {
        id: "g1",
        name: "Stripe Reviews Collector",
        target: "google.com/maps/stripe",
        status: "active",
        startedAt: "11:32 PM",
        duration: "8m 12s",
        itemsCollected: 47,
        currentUrl: "https://www.google.com/maps/place/Stripe/@37.7749,-122.4194",
        rating: 4.6,
        steps: [
          { time: "11:40 PM", action: "Clicking 'More reviews' button", type: "click", url: "https://www.google.com/maps/place/Stripe/@37.7749,-122.4194" },
          { time: "11:39 PM", action: "Scrolling review panel to load more", type: "scroll" },
          { time: "11:38 PM", action: "Extracting 5 reviews from current view", type: "extract" },
          { time: "11:37 PM", action: "Waiting for review content to render", type: "wait" },
          { time: "11:36 PM", action: "Clicking 'Newest' sort filter", type: "click" },
          { time: "11:35 PM", action: "Extracted 23 reviews from initial page", type: "extract" },
          { time: "11:33 PM", action: "Navigating to Stripe business listing", type: "navigate", url: "https://www.google.com/maps/place/Stripe" },
          { time: "11:32 PM", action: "Opening Google Maps", type: "navigate", url: "https://www.google.com/maps" },
        ],
      },
      {
        id: "g2",
        name: "Linear Reviews Collector",
        target: "google.com/maps/linear",
        status: "active",
        startedAt: "11:28 PM",
        duration: "12m 45s",
        itemsCollected: 89,
        currentUrl: "https://www.google.com/maps/place/Linear/@37.78,-122.39",
        rating: 4.8,
        steps: [
          { time: "11:40 PM", action: "Extracting reviewer name and rating", type: "extract" },
          { time: "11:38 PM", action: "Scrolling to load review batch #4", type: "scroll" },
          { time: "11:35 PM", action: "Clicking reviewer profile for metadata", type: "click" },
          { time: "11:30 PM", action: "Initial page loaded with 34 reviews", type: "extract" },
          { time: "11:28 PM", action: "Navigating to Linear listing", type: "navigate", url: "https://www.google.com/maps/place/Linear" },
        ],
      },
      {
        id: "g3",
        name: "Notion Reviews Collector",
        target: "google.com/maps/notion",
        status: "completed",
        startedAt: "10:45 PM",
        duration: "38m 22s",
        itemsCollected: 312,
        currentUrl: "https://www.google.com/maps/place/Notion/@37.7749,-122.4194",
        rating: 4.3,
        steps: [
          { time: "11:23 PM", action: "Scraping completed. 312 reviews saved.", type: "done" },
          { time: "11:20 PM", action: "Deduplicating review entries", type: "extract" },
          { time: "11:15 PM", action: "Extracting final batch of reviews", type: "extract" },
          { time: "10:45 PM", action: "Navigating to Notion listing", type: "navigate", url: "https://www.google.com/maps/place/Notion" },
        ],
      },
    ],
  },
  {
    id: "appstore",
    name: "App Store",
    initial: "A",
    domain: "apps.apple.com",
    color: "bg-sky-50 text-sky-600 border-sky-100",
    scrapers: [
      {
        id: "a1",
        name: "Notion App Reviews",
        target: "apps.apple.com/notion",
        status: "active",
        startedAt: "11:15 PM",
        duration: "25m 30s",
        itemsCollected: 156,
        currentUrl: "https://apps.apple.com/app/notion/id1232780281?see-all=reviews",
        rating: 4.1,
        steps: [
          { time: "11:40 PM", action: "Clicking 'Show More' on review #156", type: "click" },
          { time: "11:38 PM", action: "Extracting star rating distribution", type: "extract" },
          { time: "11:30 PM", action: "Scrolling paginated review list", type: "scroll" },
          { time: "11:15 PM", action: "Navigating to Notion app page", type: "navigate", url: "https://apps.apple.com/app/notion/id1232780281" },
        ],
      },
      {
        id: "a2",
        name: "Slack App Reviews",
        target: "apps.apple.com/slack",
        status: "completed",
        startedAt: "10:30 PM",
        duration: "42m 18s",
        itemsCollected: 489,
        currentUrl: "https://apps.apple.com/app/slack/id618783545",
        rating: 4.0,
        steps: [
          { time: "11:12 PM", action: "Complete. 489 reviews collected.", type: "done" },
          { time: "11:00 PM", action: "Processing final review batch", type: "extract" },
          { time: "10:30 PM", action: "Navigating to Slack app page", type: "navigate", url: "https://apps.apple.com/app/slack/id618783545" },
        ],
      },
    ],
  },
  {
    id: "playstore",
    name: "Play Store",
    initial: "P",
    domain: "play.google.com",
    color: "bg-green-50 text-green-600 border-green-100",
    scrapers: [
      {
        id: "p1",
        name: "Zoom Play Reviews",
        target: "play.google.com/zoom",
        status: "active",
        startedAt: "11:20 PM",
        duration: "20m 15s",
        itemsCollected: 203,
        currentUrl: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings",
        rating: 3.9,
        steps: [
          { time: "11:40 PM", action: "Scrolling infinite review list", type: "scroll" },
          { time: "11:35 PM", action: "Extracted 203 reviews from 6 scroll loads", type: "extract" },
          { time: "11:20 PM", action: "Navigating to Zoom app page", type: "navigate", url: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings" },
        ],
      },
      {
        id: "p2",
        name: "Slack Play Reviews",
        target: "play.google.com/slack",
        status: "completed",
        startedAt: "10:00 PM",
        duration: "55m 40s",
        itemsCollected: 678,
        currentUrl: "https://play.google.com/store/apps/details?id=com.Slack",
        rating: 4.2,
        steps: [
          { time: "10:55 PM", action: "Complete. 678 reviews collected.", type: "done" },
          { time: "10:00 PM", action: "Navigating to Slack app page", type: "navigate", url: "https://play.google.com/store/apps/details?id=com.Slack" },
        ],
      },
    ],
  },
  {
    id: "trustpilot",
    name: "Trustpilot",
    initial: "T",
    domain: "trustpilot.com",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    scrapers: [
      {
        id: "t1",
        name: "Stripe Trustpilot Reviews",
        target: "trustpilot.com/stripe",
        status: "active",
        startedAt: "11:35 PM",
        duration: "5m 42s",
        itemsCollected: 34,
        currentUrl: "https://www.trustpilot.com/review/stripe.com?page=3",
        rating: 4.5,
        steps: [
          { time: "11:40 PM", action: "Clicking page 4 pagination link", type: "click" },
          { time: "11:38 PM", action: "Extracting 12 reviews from page 3", type: "extract" },
          { time: "11:37 PM", action: "Waiting for page 3 to load", type: "wait" },
          { time: "11:35 PM", action: "Navigating to Stripe on Trustpilot", type: "navigate", url: "https://www.trustpilot.com/review/stripe.com" },
        ],
      },
      {
        id: "t2",
        name: "Notion Trustpilot Reviews",
        target: "trustpilot.com/notion",
        status: "completed",
        startedAt: "10:15 PM",
        duration: "48m 10s",
        itemsCollected: 567,
        currentUrl: "https://www.trustpilot.com/review/notion.so",
        rating: 4.2,
        steps: [
          { time: "11:03 PM", action: "Complete. 567 reviews collected.", type: "done" },
          { time: "10:15 PM", action: "Navigating to Notion on Trustpilot", type: "navigate", url: "https://www.trustpilot.com/review/notion.so" },
        ],
      },
    ],
  },
  {
    id: "g2site",
    name: "G2",
    initial: "G2",
    domain: "g2.com",
    color: "bg-orange-50 text-orange-600 border-orange-100",
    scrapers: [
      {
        id: "g2-1",
        name: "Linear G2 Reviews",
        target: "g2.com/linear",
        status: "active",
        startedAt: "11:30 PM",
        duration: "10m 55s",
        itemsCollected: 78,
        currentUrl: "https://www.g2.com/products/linear/reviews?page=5",
        rating: 4.7,
        steps: [
          { time: "11:40 PM", action: "Extracting pros/cons from review cards", type: "extract" },
          { time: "11:36 PM", action: "Clicking 'Read more' on truncated review", type: "click" },
          { time: "11:30 PM", action: "Navigating to Linear on G2", type: "navigate", url: "https://www.g2.com/products/linear/reviews" },
        ],
      },
      {
        id: "g2-2",
        name: "Figma G2 Reviews",
        target: "g2.com/figma",
        status: "completed",
        startedAt: "9:45 PM",
        duration: "1h 12m",
        itemsCollected: 890,
        currentUrl: "https://www.g2.com/products/figma/reviews",
        rating: 4.6,
        steps: [
          { time: "10:57 PM", action: "Complete. 890 reviews collected.", type: "done" },
          { time: "9:45 PM", action: "Navigating to Figma on G2", type: "navigate", url: "https://www.g2.com/products/figma/reviews" },
        ],
      },
    ],
  },
  {
    id: "capterra",
    name: "Capterra",
    initial: "C",
    domain: "capterra.com",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    scrapers: [
      {
        id: "c1",
        name: "Notion Capterra Reviews",
        target: "capterra.com/notion",
        status: "completed",
        startedAt: "9:30 PM",
        duration: "1h 5m",
        itemsCollected: 432,
        currentUrl: "https://www.capterra.com/p/notion/reviews",
        rating: 4.4,
        steps: [
          { time: "10:35 PM", action: "Complete. 432 reviews collected.", type: "done" },
          { time: "9:30 PM", action: "Navigating to Notion on Capterra", type: "navigate", url: "https://www.capterra.com/p/notion/reviews" },
        ],
      },
    ],
  },
  {
    id: "producthunt",
    name: "Product Hunt",
    initial: "PH",
    domain: "producthunt.com",
    color: "bg-rose-50 text-rose-600 border-rose-100",
    scrapers: [
      {
        id: "ph1",
        name: "Vercel Product Hunt",
        target: "producthunt.com/vercel",
        status: "active",
        startedAt: "11:25 PM",
        duration: "15m 30s",
        itemsCollected: 45,
        currentUrl: "https://www.producthunt.com/products/vercel/reviews",
        rating: 4.8,
        steps: [
          { time: "11:40 PM", action: "Clicking comment thread to expand", type: "click" },
          { time: "11:35 PM", action: "Extracting upvotes and comment data", type: "extract" },
          { time: "11:25 PM", action: "Navigating to Vercel on Product Hunt", type: "navigate", url: "https://www.producthunt.com/products/vercel" },
        ],
      },
    ],
  },
  {
    id: "yelp",
    name: "Yelp",
    initial: "Y",
    domain: "yelp.com",
    color: "bg-red-50 text-red-600 border-red-100",
    scrapers: [
      {
        id: "y1",
        name: "Stripe Yelp Reviews",
        target: "yelp.com/stripe",
        status: "completed",
        startedAt: "9:00 PM",
        duration: "1h 20m",
        itemsCollected: 234,
        currentUrl: "https://www.yelp.com/biz/stripe-san-francisco",
        rating: 4.0,
        steps: [
          { time: "10:20 PM", action: "Complete. 234 reviews collected.", type: "done" },
          { time: "9:00 PM", action: "Navigating to Stripe on Yelp", type: "navigate", url: "https://www.yelp.com/biz/stripe-san-francisco" },
        ],
      },
    ],
  },
];

const totalActive = sites.reduce(
  (acc, s) => acc + s.scrapers.filter((sc) => sc.status === "active").length,
  0
);
const totalCompleted = sites.reduce(
  (acc, s) => acc + s.scrapers.filter((sc) => sc.status === "completed").length,
  0
);
const totalItems = sites.reduce(
  (acc, s) => acc + s.scrapers.reduce((a, sc) => a + sc.itemsCollected, 0),
  0
);

const stepTypeIcon = (type: BrowserStep["type"]) => {
  switch (type) {
    case "navigate":
      return <Globe size={11} className="text-blue-500" />;
    case "click":
      return <MousePointer2 size={11} className="text-amber-500" />;
    case "scroll":
      return <RefreshCw size={11} className="text-violet-500" />;
    case "extract":
      return <Activity size={11} className="text-emerald-500" />;
    case "wait":
      return <Clock size={11} className="text-zinc-400" />;
    case "done":
      return <CheckCircle2 size={11} className="text-blue-500" />;
  }
};

function BrowserView({ scraper }: { scraper: Scraper }) {
  const logRef = useRef<HTMLDivElement>(null);
  const [visibleSteps, setVisibleSteps] = useState<number>(0);

  useEffect(() => {
    setVisibleSteps(0);
    const timers: NodeJS.Timeout[] = [];
    scraper.steps.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleSteps(i + 1), (i + 1) * 300));
    });
    return () => timers.forEach(clearTimeout);
  }, [scraper.id, scraper.steps]);

  const isActive = scraper.status === "active";
  const latestStep = scraper.steps[0];

  return (
    <div className="flex flex-col h-full">
      {/* Browser Chrome */}
      <div className="bg-zinc-100 rounded-t-lg border border-zinc-200 border-b-0">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white rounded-md px-3 py-1.5 ml-2 border border-zinc-200">
            <Lock size={10} className="text-zinc-400" />
            <span className="text-[11px] text-zinc-500 truncate font-mono">
              {scraper.currentUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Browser Viewport */}
      <div className="flex-1 bg-white border-x border-zinc-200 relative overflow-hidden min-h-[200px]">
        <div className="absolute inset-0 p-5 flex flex-col items-center justify-center">
          {isActive ? (
            <>
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
                  <Bot size={24} className="text-zinc-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <Loader2 size={10} className="text-white animate-spin" />
                </div>
              </div>
              <p className="text-[13px] font-medium text-zinc-700 mb-1 text-center">
                Agent is working
              </p>
              <p className="text-[12px] text-zinc-400 text-center max-w-[280px]">
                {latestStep?.action}
              </p>

              {/* Animated cursor indicator */}
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mt-4 flex items-center gap-1.5"
              >
                <MousePointer2 size={14} className="text-zinc-400" />
                <span className="text-[11px] text-zinc-400">
                  Interacting with page...
                </span>
              </motion.div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-blue-500" />
              </div>
              <p className="text-[13px] font-medium text-zinc-700 mb-1">
                Scraping complete
              </p>
              <p className="text-[12px] text-zinc-400">
                Collected {scraper.itemsCollected} items in {scraper.duration}
              </p>
            </>
          )}
        </div>

        {/* Simulated scan lines for active scrapers */}
        {isActive && (
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-px bg-emerald-400/30"
            style={{ boxShadow: "0 0 8px 2px rgba(52, 211, 153, 0.15)" }}
          />
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 border-x border-zinc-200 text-[11px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {isActive ? (
              <Loader2 size={10} className="text-emerald-500 animate-spin" />
            ) : (
              <CheckCircle2 size={10} className="text-blue-500" />
            )}
            <span className={isActive ? "text-emerald-600 font-medium" : "text-blue-600 font-medium"}>
              {isActive ? "Active" : "Completed"}
            </span>
          </div>
          <span className="text-zinc-400">
            {scraper.duration}
          </span>
        </div>
        <span className="text-zinc-500 font-medium">
          {scraper.itemsCollected} items
        </span>
      </div>

      {/* Activity Log */}
      <div
        ref={logRef}
        className="bg-zinc-900 rounded-b-lg border border-zinc-700 border-t-0 p-3 max-h-[180px] overflow-y-auto font-mono"
      >
        {scraper.steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={i < visibleSteps ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 py-1"
          >
            <span className="text-[10px] text-zinc-500 whitespace-nowrap mt-px">
              {step.time}
            </span>
            <span className="mt-px">{stepTypeIcon(step.type)}</span>
            <span className="text-[11px] text-zinc-300 leading-snug">
              {step.action}
            </span>
          </motion.div>
        ))}
        {isActive && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-2 py-1 mt-0.5"
          >
            <span className="text-[10px] text-emerald-500">▸</span>
            <span className="text-[11px] text-emerald-400">
              awaiting next action...
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function ScrapersTab() {
  const [selectedSite, setSelectedSite] = useState<ScraperSite | null>(null);
  const [selectedScraper, setSelectedScraper] = useState<Scraper | null>(null);

  const closeOverlay = () => {
    setSelectedScraper(null);
    setSelectedSite(null);
  };

  const backToList = () => {
    setSelectedScraper(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Activity size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-zinc-900">{totalActive}</p>
            <p className="text-[11px] text-zinc-500 font-medium">Active Scrapers</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-zinc-900">{totalCompleted}</p>
            <p className="text-[11px] text-zinc-500 font-medium">Completed</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
            <Globe size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-zinc-900">
              {totalItems.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-500 font-medium">Items Collected</p>
          </div>
        </div>
      </motion.div>

      {/* Site Grid */}
      <div className="grid grid-cols-4 gap-4">
        {sites.map((site, index) => {
          const active = site.scrapers.filter((s) => s.status === "active").length;
          const completed = site.scrapers.filter((s) => s.status === "completed").length;
          const { average, count } = averageProfileRatings(
            site.scrapers.map((s) => s.rating)
          );
          return (
            <motion.button
              key={site.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + index * 0.04, duration: 0.35 }}
              onClick={() => setSelectedSite(site)}
              className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-300 text-left group"
            >
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center text-[15px] font-bold mb-3 transition-transform duration-200 group-hover:scale-105 ${site.color}`}
              >
                {site.initial}
              </div>
              <p className="text-[14px] font-semibold text-zinc-800 mb-0.5">
                {site.name}
              </p>
              <p className="text-[11px] text-zinc-400 mb-3">{site.domain}</p>
              {count > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="text-[13px] font-semibold text-zinc-800">
                    {average.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    avg ({count} profile{count !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                {active > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-medium text-emerald-600">
                      {active} active
                    </span>
                  </div>
                )}
                {completed > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[11px] font-medium text-blue-500">
                      {completed} done
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Centered Modal Overlay */}
      <AnimatePresence>
        {selectedSite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
              onClick={closeOverlay}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-[700px] max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {selectedScraper && (
                    <button
                      onClick={backToList}
                      className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
                    >
                      <ArrowLeft size={14} />
                    </button>
                  )}
                  <div
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[12px] font-bold ${selectedSite.color}`}
                  >
                    {selectedSite.initial}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-900">
                      {selectedScraper
                        ? selectedScraper.name
                        : selectedSite.name}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {selectedScraper
                        ? selectedScraper.target
                        : `${selectedSite.scrapers.length} scraper${selectedSite.scrapers.length !== 1 ? "s" : ""} on ${selectedSite.domain}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeOverlay}
                  className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {selectedScraper ? (
                    <motion.div
                      key="browser"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                      className="p-5"
                    >
                      <BrowserView scraper={selectedScraper} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ duration: 0.25 }}
                      className="p-5"
                    >
                      <div className="space-y-2">
                        {selectedSite.scrapers.map((scraper) => (
                          <button
                            key={scraper.id}
                            onClick={() => setSelectedScraper(scraper)}
                            className="w-full text-left bg-zinc-50 hover:bg-zinc-100 rounded-xl p-4 transition-all duration-200 group/item"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                                  <Bot size={14} className="text-zinc-500" />
                                </div>
                                <div>
                                  <p className="text-[13px] font-semibold text-zinc-800">
                                    {scraper.name}
                                  </p>
                                  <p className="text-[11px] text-zinc-400">
                                    {scraper.target}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {scraper.status === "active" ? (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                                    <Loader2
                                      size={10}
                                      className="text-emerald-500 animate-spin"
                                    />
                                    <span className="text-[10px] font-semibold text-emerald-600">
                                      Active
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full">
                                    <CheckCircle2
                                      size={10}
                                      className="text-blue-500"
                                    />
                                    <span className="text-[10px] font-semibold text-blue-600">
                                      Done
                                    </span>
                                  </div>
                                )}
                                <ChevronRight
                                  size={14}
                                  className="text-zinc-300 group-hover/item:text-zinc-500 transition-colors"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] text-zinc-500 ml-[42px]">
                              <div className="flex items-center gap-1">
                                <Clock size={10} />
                                <span>{scraper.duration}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Activity size={10} />
                                <span>
                                  {scraper.itemsCollected} items collected
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { motion } from "framer-motion";
import { Monitor, Star, Smartphone } from "lucide-react";
import RankingTable from "@/components/RankingTable";
import UXFeedbackCarousel, {
  UXFeedback,
} from "@/components/UXFeedbackCarousel";
import FrequentReviewsCarousel, {
  CompanyReviews,
} from "@/components/FrequentReviewsCarousel";

const uxFeedback: UXFeedback[] = [
  {
    id: "ux-1",
    company: "Stripe",
    avatar: "S",
    source: "stripe.com/dashboard",
    scrapedAt: "2h ago",
    pros: [
      "Clean, minimal dashboard layout",
      "API docs are searchable and well-structured",
      "Payment flow completes in under 3 clicks",
      "Real-time webhook logs are very useful",
    ],
    cons: [
      "Settings page is deeply nested",
      "Mobile dashboard lacks feature parity",
    ],
  },
  {
    id: "ux-2",
    company: "Linear",
    avatar: "L",
    source: "linear.app",
    scrapedAt: "4h ago",
    pros: [
      "Sub-100ms page transitions throughout",
      "Keyboard shortcuts for every action",
      "Issue creation modal is frictionless",
    ],
    cons: [
      "No native time-tracking support",
      "Roadmap view can feel cramped on smaller screens",
      "Limited custom field types",
    ],
  },
  {
    id: "ux-3",
    company: "Vercel",
    avatar: "V",
    source: "vercel.com/dashboard",
    scrapedAt: "6h ago",
    pros: [
      "Deployment status visible at a glance",
      "Preview URLs auto-generated per commit",
      "Clean project overview with key metrics",
    ],
    cons: [
      "Log viewer truncates long outputs",
      "Domain management UI could be simpler",
      "Usage analytics are buried in settings",
    ],
  },
  {
    id: "ux-4",
    company: "Notion",
    avatar: "N",
    source: "notion.so",
    scrapedAt: "8h ago",
    pros: [
      "Block-based editor is extremely flexible",
      "Template gallery covers most use cases",
      "Drag-and-drop reordering is smooth",
    ],
    cons: [
      "Page load times increase with database size",
      "Search indexing is noticeably slow",
      "Nested pages create confusing navigation",
      "Offline mode has reliability issues",
    ],
  },
  {
    id: "ux-5",
    company: "Figma",
    avatar: "F",
    source: "figma.com",
    scrapedAt: "12h ago",
    pros: [
      "Real-time multiplayer editing is seamless",
      "Auto-layout reduces manual spacing work",
      "Dev mode bridges design-to-code gap",
    ],
    cons: [
      "Performance degrades on files with 50+ pages",
      "Variable scoping can be confusing initially",
    ],
  },
];

const googleReviewData: CompanyReviews[] = [
  {
    id: "gr-1",
    company: "Stripe",
    avatar: "S",
    totalReviews: 4820,
    avgRating: 4.6,
    frequent: [
      { text: "Easy API integration", count: 892, sentiment: "positive" },
      { text: "Excellent documentation", count: 764, sentiment: "positive" },
      { text: "Fast payout processing", count: 531, sentiment: "positive" },
      { text: "Complex fee structure", count: 287, sentiment: "negative" },
      { text: "Support response times", count: 198, sentiment: "negative" },
    ],
  },
  {
    id: "gr-2",
    company: "Linear",
    avatar: "L",
    totalReviews: 1340,
    avgRating: 4.8,
    frequent: [
      { text: "Blazing fast interface", count: 412, sentiment: "positive" },
      { text: "Great keyboard shortcuts", count: 356, sentiment: "positive" },
      { text: "Clean, minimal design", count: 298, sentiment: "positive" },
      { text: "Limited integrations", count: 134, sentiment: "negative" },
      { text: "No built-in time tracking", count: 89, sentiment: "neutral" },
    ],
  },
  {
    id: "gr-3",
    company: "Notion",
    avatar: "N",
    totalReviews: 8930,
    avgRating: 4.3,
    frequent: [
      { text: "Extremely flexible tool", count: 2140, sentiment: "positive" },
      { text: "Great for team wikis", count: 1870, sentiment: "positive" },
      { text: "Slow with large databases", count: 1230, sentiment: "negative" },
      { text: "Steep learning curve", count: 890, sentiment: "negative" },
      { text: "Offline mode unreliable", count: 650, sentiment: "negative" },
    ],
  },
  {
    id: "gr-4",
    company: "Figma",
    avatar: "F",
    totalReviews: 6210,
    avgRating: 4.7,
    frequent: [
      { text: "Best collaboration tool", count: 1890, sentiment: "positive" },
      { text: "Powerful component system", count: 1340, sentiment: "positive" },
      { text: "Free tier is generous", count: 980, sentiment: "positive" },
      { text: "Laggy on complex files", count: 670, sentiment: "negative" },
      { text: "Font management issues", count: 320, sentiment: "neutral" },
    ],
  },
  {
    id: "gr-5",
    company: "Vercel",
    avatar: "V",
    totalReviews: 2750,
    avgRating: 4.5,
    frequent: [
      { text: "Instant deployments", count: 820, sentiment: "positive" },
      { text: "Great Next.js support", count: 690, sentiment: "positive" },
      { text: "Preview URLs per branch", count: 540, sentiment: "positive" },
      { text: "Pricing scales quickly", count: 410, sentiment: "negative" },
      { text: "Bandwidth limits hit fast", count: 280, sentiment: "negative" },
    ],
  },
];

const appReviewData: CompanyReviews[] = [
  {
    id: "ar-1",
    company: "Notion",
    avatar: "N",
    totalReviews: 312000,
    avgRating: 4.1,
    frequent: [
      { text: "Great for note-taking", count: 48200, sentiment: "positive" },
      { text: "Syncs across devices well", count: 31400, sentiment: "positive" },
      { text: "App feels slow / heavy", count: 28900, sentiment: "negative" },
      { text: "Crashes on large pages", count: 12300, sentiment: "negative" },
      { text: "Needs better offline mode", count: 9800, sentiment: "neutral" },
    ],
  },
  {
    id: "ar-2",
    company: "Slack",
    avatar: "S",
    totalReviews: 589000,
    avgRating: 4.0,
    frequent: [
      { text: "Essential for team comms", count: 89400, sentiment: "positive" },
      { text: "Good channel organization", count: 54200, sentiment: "positive" },
      { text: "High battery drain", count: 67800, sentiment: "negative" },
      { text: "Notifications unreliable", count: 45100, sentiment: "negative" },
      { text: "Uses too much storage", count: 32600, sentiment: "negative" },
    ],
  },
  {
    id: "ar-3",
    company: "Figma",
    avatar: "F",
    totalReviews: 48700,
    avgRating: 4.4,
    frequent: [
      { text: "Great for design previews", count: 12800, sentiment: "positive" },
      { text: "Prototype testing on device", count: 8900, sentiment: "positive" },
      { text: "No full editing on mobile", count: 7200, sentiment: "negative" },
      { text: "Mirror app works well", count: 5600, sentiment: "positive" },
      { text: "Needs iPad pencil support", count: 3400, sentiment: "neutral" },
    ],
  },
  {
    id: "ar-4",
    company: "Linear",
    avatar: "L",
    totalReviews: 18900,
    avgRating: 4.7,
    frequent: [
      { text: "Fast even on mobile", count: 5600, sentiment: "positive" },
      { text: "Quick issue creation", count: 4800, sentiment: "positive" },
      { text: "Great push notifications", count: 3200, sentiment: "positive" },
      { text: "Limited filter options", count: 1400, sentiment: "neutral" },
      { text: "No offline support", count: 980, sentiment: "negative" },
    ],
  },
  {
    id: "ar-5",
    company: "Zoom",
    avatar: "Z",
    totalReviews: 1240000,
    avgRating: 3.9,
    frequent: [
      { text: "Reliable video quality", count: 234000, sentiment: "positive" },
      { text: "Easy to join meetings", count: 189000, sentiment: "positive" },
      { text: "Excessive battery usage", count: 156000, sentiment: "negative" },
      { text: "App is too bloated now", count: 98000, sentiment: "negative" },
      { text: "Background noise filter", count: 67000, sentiment: "positive" },
    ],
  },
];

export default function AnalyticsTab() {
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
            <RankingTable />
          </div>
          <div className="col-span-5">
            <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-4 h-full">
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Site Feedback
              </p>
              <UXFeedbackCarousel feedback={uxFeedback} />
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
              <FrequentReviewsCarousel companies={googleReviewData} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
                <Smartphone size={13} className="text-zinc-600" />
              </div>
              <h2 className="text-[15px] font-semibold text-zinc-900">
                App Reviews
              </h2>
            </div>
            <div className="bg-zinc-50/50 rounded-xl border border-zinc-200/60 p-4">
              <FrequentReviewsCarousel companies={appReviewData} />
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

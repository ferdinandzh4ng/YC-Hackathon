"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

interface Company {
  rank: number;
  name: string;
  category: string;
  rating: number;
  trend: "up" | "down" | "same";
  url: string;
}

const companies: Company[] = [
  { rank: 1, name: "Stripe", category: "Fintech", rating: 9.8, trend: "up", url: "https://stripe.com" },
  { rank: 2, name: "Linear", category: "Productivity", rating: 9.2, trend: "up", url: "https://linear.app" },
  { rank: 3, name: "Vercel", category: "DevTools", rating: 8.7, trend: "same", url: "https://vercel.com" },
  { rank: 4, name: "Notion", category: "Productivity", rating: 8.4, trend: "down", url: "https://notion.so" },
  { rank: 5, name: "Figma", category: "Design", rating: 7.9, trend: "up", url: "https://figma.com" },
];

const trendIcon = (trend: Company["trend"]) => {
  switch (trend) {
    case "up":
      return <TrendingUp size={13} className="text-emerald-500" />;
    case "down":
      return <TrendingDown size={13} className="text-red-400" />;
    default:
      return <Minus size={13} className="text-zinc-400" />;
  }
};

const ratingColor = (rating: number) => {
  if (rating >= 8.5) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (rating >= 7) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-600 border-red-200";
};

export default function RankingTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-xl border border-zinc-200 overflow-hidden h-full"
    >
      <div className="px-5 py-4 border-b border-zinc-100">
        <h3 className="text-[13px] font-semibold text-zinc-900">
          Company Rankings
        </h3>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Based on user experience scores
        </p>
      </div>

      <div className="overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-5 py-2.5">
                #
              </th>
              <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-5 py-2.5">
                Company
              </th>
              <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-5 py-2.5">
                Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company, index) => (
              <motion.tr
                key={company.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
                className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/70 transition-colors group"
              >
                <td className="px-5 py-3 text-[12px] text-zinc-500 font-mono w-10">
                  {company.rank}
                </td>
                <td className="px-5 py-3">
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 group/link"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-bold text-zinc-600 group-hover:bg-zinc-200 transition-colors">
                      {company.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-zinc-800 group-hover/link:text-black transition-colors">
                          {company.name}
                        </p>
                        <ExternalLink
                          size={10}
                          className="text-zinc-300 group-hover/link:text-zinc-500 transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {company.category}
                      </p>
                    </div>
                  </a>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {trendIcon(company.trend)}
                    <span
                      className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${ratingColor(company.rating)}`}
                    >
                      {company.rating.toFixed(1)}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { RankingItem } from "../lib/api";

interface RankingTableProps {
  rankings?: RankingItem[];
}

const ratingColor = (rating: number) => {
  if (rating >= 8.5) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (rating >= 7) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-600 border-red-200";
};

export default function RankingTable({ rankings = [] }: RankingTableProps) {
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
          Based on site UX scores (4 personas)
        </p>
      </div>

      <div className="overflow-y-auto">
        {rankings.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-zinc-500">
            No rankings yet. Run scrapers to collect site feedback.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-5 py-2.5">#</th>
                <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-5 py-2.5">Company</th>
                <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-5 py-2.5">Rating</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((row, index) => (
                <motion.tr
                  key={row.competitor_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
                  className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/70 transition-colors group"
                >
                  <td className="px-5 py-3 text-[12px] text-zinc-500 font-mono w-10">{row.rank}</td>
                  <td className="px-5 py-3">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group/link"
                    >
                      <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-bold text-zinc-600">
                        {(row.name || row.url)[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-medium text-zinc-800 group-hover/link:text-black transition-colors">
                            {row.name || row.url}
                          </p>
                          <ExternalLink size={10} className="text-zinc-300 group-hover/link:text-zinc-500 transition-colors" />
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate max-w-[180px]">{row.url}</p>
                      </div>
                    </a>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${ratingColor(row.average_rating)}`}>
                      {row.average_rating.toFixed(1)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

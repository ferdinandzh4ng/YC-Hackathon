"use client";

import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Globe,
  Activity,
  ExternalLink,
  Clock,
} from "lucide-react";
import type { ScrapeRun } from "../lib/api";
import type { Competitor } from "../lib/api";

export interface ScrapersTabProps {
  runs?: ScrapeRun[];
  agentsRunningCount?: number;
  competitors?: Competitor[];
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

export default function ScrapersTab({
  runs = [],
  agentsRunningCount = 0,
  competitors = [],
}: ScrapersTabProps) {
  const completedCount = runs.filter((r) => r.status === "done").length;
  const failedCount = runs.filter((r) => r.status === "failed").length;
  const compMap = new Map(competitors.map((c) => [c.id, c]));

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
            <p className="text-[22px] font-bold text-zinc-900">{agentsRunningCount}</p>
            <p className="text-[11px] text-zinc-500 font-medium">Agents Running</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-zinc-900">{completedCount}</p>
            <p className="text-[11px] text-zinc-500 font-medium">Completed</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
            <Globe size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-zinc-900">{runs.length}</p>
            <p className="text-[11px] text-zinc-500 font-medium">Total Runs</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="bg-white rounded-xl border border-zinc-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-[14px] font-semibold text-zinc-900">Scrape runs</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Site scrapes (4 personas per competitor). Click &quot;Watch&quot; to open the live agent in a new tab.
          </p>
        </div>
        {runs.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-zinc-500">
            No runs yet. Add a company to start competitor site scrapes.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {runs.map((run, index) => {
              const comp = run.competitor_id ? compMap.get(run.competitor_id) : null;
              const label = comp?.name || comp?.url || run.competitor_id || run.type;
              const isRunning = run.status === "running";
              const isDone = run.status === "done";
              const isFailed = run.status === "failed";
              return (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * index }}
                  className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-zinc-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-800 truncate">
                        {run.type} — {label}
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
                          <span className="text-red-600 truncate" title={run.error_message || ""}>
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {run.live_url && (
                      <a
                        href={run.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Watch
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </>
  );
}

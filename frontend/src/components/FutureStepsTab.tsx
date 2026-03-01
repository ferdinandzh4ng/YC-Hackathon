"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Target, Loader2 } from "lucide-react";
import { fetchFutureSteps, type FutureStepItem } from "../lib/api";

export interface FutureStepsTabProps {
  companyId: string;
  companyName?: string;
}

export default function FutureStepsTab({ companyId, companyName = "" }: FutureStepsTabProps) {
  const [steps, setSteps] = useState<FutureStepItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFutureSteps(companyId);
      setSteps(res.steps || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load future steps");
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24"
      >
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
          <Loader2 size={26} className="text-zinc-500 animate-spin" />
        </div>
        <p className="text-[15px] font-medium text-zinc-700">Generating future steps from your data…</p>
        <p className="text-[13px] text-zinc-500 mt-1">Using competitor and market insights</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-zinc-200 bg-white p-6"
      >
        <p className="text-[14px] text-red-600 mb-3">{error}</p>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 text-[13px] font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center">
          <Target size={13} className="text-zinc-600" />
        </div>
        <h2 className="text-[15px] font-semibold text-zinc-900">
          Future steps
        </h2>
      </div>
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-8">
        Recommendations to increase sales and performance, based on your scraped data
      </p>

      {steps.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <p className="text-[14px] text-zinc-600">
            No steps yet. Run scrapers to collect competitor, review, and social data, then return here.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-zinc-200"
            aria-hidden
          />
          <ul className="space-y-0">
            {steps.map((step, index) => {
              const isLeft = index % 2 === 0;
              const stepNum = index + 1;
              return (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                  className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-6 py-5"
                >
                  {/* Left card */}
                  {isLeft ? (
                    <div className="pr-8">
                      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden hover:border-zinc-300 transition-colors h-full">
                        <div className="p-5">
                          <h3 className="text-[15px] font-semibold text-zinc-900 mb-2">
                            {step.title}
                          </h3>
                          <p className="text-[13px] text-zinc-600 leading-snug mb-4">
                            {step.description}
                          </p>
                          {step.evidence && step.evidence.length > 0 && (
                            <div className="pt-3 border-t border-zinc-100">
                              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                Evidence from your data
                              </p>
                              <ul className="space-y-1">
                                {step.evidence.map((ev, i) => (
                                  <li key={i} className="text-[12px] text-zinc-500 flex gap-1.5">
                                    <span className="text-zinc-300 shrink-0">•</span>
                                    <span>{ev}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  {/* Center step marker */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center justify-center w-16 rounded-lg bg-zinc-100 border border-zinc-200/80 px-2 py-2 shrink-0`}
                  >
                    <span className="text-[18px] font-bold text-zinc-800 leading-none">{stepNum}</span>
                    <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Step</span>
                  </div>
                  <div className="w-16" />

                  {/* Right card */}
                  {!isLeft ? (
                    <div className="pl-8">
                      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden hover:border-zinc-300 transition-colors h-full">
                        <div className="p-5">
                          <h3 className="text-[15px] font-semibold text-zinc-900 mb-2">
                            {step.title}
                          </h3>
                          <p className="text-[13px] text-zinc-600 leading-snug mb-4">
                            {step.description}
                          </p>
                          {step.evidence && step.evidence.length > 0 && (
                            <div className="pt-3 border-t border-zinc-100">
                              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                Evidence from your data
                              </p>
                              <ul className="space-y-1">
                                {step.evidence.map((ev, i) => (
                                  <li key={i} className="text-[12px] text-zinc-500 flex gap-1.5">
                                    <span className="text-zinc-300 shrink-0">•</span>
                                    <span>{ev}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

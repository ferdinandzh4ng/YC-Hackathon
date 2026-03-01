"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Clock, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AnalyticsTab from "@/components/AnalyticsTab";
import ScrapersTab from "@/components/ScrapersTab";

interface Company {
  id: string;
  name: string;
  initial: string;
  industry: string;
  competitors: string[];
  hasData: boolean;
  lastAnalyzed?: string;
}

const companiesMap: Record<string, Company> = {
  "acme-payments": {
    id: "acme-payments",
    name: "Acme Payments",
    initial: "A",
    industry: "Fintech",
    competitors: ["Stripe", "Square", "Adyen", "PayPal"],
    hasData: true,
    lastAnalyzed: "5 min ago",
  },
  taskflow: {
    id: "taskflow",
    name: "TaskFlow",
    initial: "T",
    industry: "Productivity",
    competitors: ["Linear", "Asana", "Monday", "Jira", "ClickUp"],
    hasData: true,
    lastAnalyzed: "12 min ago",
  },
  cloudbase: {
    id: "cloudbase",
    name: "CloudBase",
    initial: "C",
    industry: "DevTools",
    competitors: ["Vercel", "Netlify", "Railway", "Render"],
    hasData: false,
  },
};

type Tab = "analytics" | "scrapers";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const company = companiesMap[params.id as string];
  const [activeTab, setActiveTab] = useState<Tab>(
    company?.hasData ? "analytics" : "scrapers"
  );

  if (!company) {
    router.replace("/");
    return null;
  }

  return (
    <>
      <Sidebar activeTab={activeTab} onTabChange={(t) => setActiveTab(t as Tab)} />

      <div className="ml-[220px] px-8 py-7">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-lg font-bold text-zinc-600">
                {company.initial}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  {company.name}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[12px] text-zinc-500">
                    {company.industry}
                  </span>
                  <span className="text-zinc-200">|</span>
                  <div className="flex items-center gap-1">
                    <Users size={11} className="text-zinc-400" />
                    <span className="text-[12px] text-zinc-500">
                      {company.competitors.length} competitors
                    </span>
                  </div>
                  {company.lastAnalyzed && (
                    <>
                      <span className="text-zinc-200">|</span>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-zinc-400" />
                        <span className="text-[12px] text-zinc-500">
                          Updated {company.lastAnalyzed}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              {company.competitors.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-500 font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "analytics" ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {company.hasData ? (
                <AnalyticsTab />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                    <BarChart3 size={24} className="text-zinc-400" />
                  </div>
                  <p className="text-[15px] font-medium text-zinc-700 mb-1">
                    No analysis data yet
                  </p>
                  <p className="text-[13px] text-zinc-400 max-w-[300px]">
                    Scrapers are still collecting competitor data. Switch to
                    Scrapers to monitor progress.
                  </p>
                  <button
                    onClick={() => setActiveTab("scrapers")}
                    className="mt-4 px-4 py-2 bg-black text-white text-[12px] font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    View Scrapers
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="scrapers"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <ScrapersTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

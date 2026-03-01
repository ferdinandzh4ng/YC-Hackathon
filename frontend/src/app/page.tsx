"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowRight,
  Bot,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  initial: string;
  industry: string;
  description: string;
  hasData: boolean;
  lastAnalyzed?: string;
  competitors: number;
  activscrapers: number;
}

const companies: Company[] = [
  {
    id: "acme-payments",
    name: "Acme Payments",
    initial: "A",
    industry: "Fintech",
    description:
      "Your payment processing platform. Tracking competitors like Stripe, Square, Adyen, and PayPal across review sites.",
    hasData: true,
    lastAnalyzed: "5 min ago",
    competitors: 4,
    activscrapers: 6,
  },
  {
    id: "taskflow",
    name: "TaskFlow",
    initial: "T",
    industry: "Productivity",
    description:
      "Your project management tool. Monitoring competitors like Linear, Asana, Monday, and Jira for market positioning.",
    hasData: true,
    lastAnalyzed: "12 min ago",
    competitors: 5,
    activscrapers: 4,
  },
  {
    id: "cloudbase",
    name: "CloudBase",
    initial: "C",
    industry: "DevTools",
    description:
      "Your deployment platform. Analyzing Vercel, Netlify, Railway, and Render to find competitive advantages.",
    hasData: false,
    competitors: 4,
    activscrapers: 3,
  },
];

export default function CompaniesPage() {
  const router = useRouter();

  return (
    <div className="px-8 pt-8 pb-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-10"
      >
        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </div>
        <span className="text-lg font-semibold tracking-tight">limitus</span>
      </motion.div>

      <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Your Companies
          </h1>
          <p className="text-[13px] text-zinc-400 mt-1">
            Add your company to analyze competitors and track market sentiment.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[13px] font-medium rounded-lg hover:bg-zinc-800 transition-colors">
          <Plus size={15} />
          Add Company
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {companies.map((company, index) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + index * 0.06, duration: 0.4 }}
          >
            <button
              onClick={() => router.push(`/company/${company.id}`)}
              className="w-full text-left bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center text-[15px] font-bold text-zinc-600 group-hover:bg-zinc-200 transition-colors">
                    {company.initial}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-zinc-900">
                      {company.name}
                    </p>
                    <p className="text-xs text-zinc-500">{company.industry}</p>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all mt-1"
                />
              </div>

              <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">
                {company.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-zinc-400" />
                    <span className="text-[12px] font-medium text-zinc-600">
                      {company.competitors} competitors
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bot size={12} className="text-zinc-400" />
                    <span className="text-[12px] font-medium text-zinc-600">
                      {company.activscrapers} scrapers
                    </span>
                  </div>
                </div>

                {company.hasData ? (
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} className="text-zinc-400" />
                    <span className="text-[11px] text-zinc-400">
                      {company.lastAnalyzed}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full">
                    <TrendingUp size={10} className="text-amber-600" />
                    <span className="text-[10px] font-semibold text-amber-700">
                      Collecting data
                    </span>
                  </div>
                )}
              </div>
            </button>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
}

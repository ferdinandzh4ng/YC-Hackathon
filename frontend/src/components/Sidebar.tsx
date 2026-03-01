"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, Bot, Target, Settings, ArrowLeft } from "lucide-react";

const tabs = [
  { icon: BarChart3, label: "Analytics", tab: "analytics" },
  { icon: Bot, label: "Scrapers", tab: "scrapers" },
  { icon: Target, label: "Future steps", tab: "future-steps" },
];

export default function Sidebar({
  activeTab,
  onTabChange,
}: {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-zinc-200 flex flex-col z-50"
    >
      <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-zinc-100">
        <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
          <svg
            width="16"
            height="16"
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
        <span className="text-base font-semibold tracking-tight truncate">limitus</span>
        </div>
      </div>

      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-3 text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors border-b border-zinc-100 group"
      >
        <ArrowLeft
          size={13}
          className="group-hover:-translate-x-0.5 transition-transform"
        />
        Back to companies
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {tabs.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange?.(item.tab)}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-zinc-100 text-black"
                  : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <item.icon size={17} strokeWidth={1.8} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-5 border-t border-zinc-100 pt-3">
        <button className="w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all duration-200">
          <Settings size={17} strokeWidth={1.8} />
          Settings
        </button>
      </div>
    </motion.aside>
  );
}

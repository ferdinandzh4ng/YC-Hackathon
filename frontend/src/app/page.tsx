"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight, BarChart3, Radar, Sparkles, PlayCircle } from "lucide-react";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Success Stories", href: "#stories" },
  { label: "Resources", href: "#resources" },
  { label: "Pricing", href: "#pricing" },
];

const PARTNER_LOGOS = [
  "Atlas Supply",
  "Northbay Foods",
  "Sora Wellness",
  "Cedar Commerce",
  "Greyline Retail",
  "Oxbow Labs",
  "Horizon Health",
  "Blueleaf Beauty",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#9ea594]">
      <div className="w-full min-h-screen bg-[#f6f6f4] overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 lg:px-12 py-5 border-b border-zinc-200/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <span className="text-[14px] font-medium text-zinc-900">/ limitus</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-0.5"
            >
              {link.label}
              {link.label === "Product" && <ChevronDown size={14} className="opacity-60" />}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex px-4 py-2 border border-zinc-300 text-zinc-800 text-[13px] font-medium rounded-full hover:bg-white transition-colors"
          >
            Book A Demo
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 bg-black text-white text-[13px] font-medium rounded-full hover:bg-zinc-800 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="relative px-8 lg:px-12 pt-8 pb-10">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute right-10 top-6 w-[44%] h-[540px] rounded-2xl border border-zinc-300/70 bg-gradient-to-b from-zinc-700 to-zinc-900 text-white p-7 hidden lg:block"
        >
          <p className="text-3xl font-medium leading-tight max-w-[260px]">Your market snapshot, in one place.</p>
          <div className="mt-6 rounded-xl bg-white/10 p-4 border border-white/20">
            <p className="text-xs uppercase tracking-wider text-zinc-200">Weekly intelligence</p>
            <p className="mt-2 text-sm text-zinc-100">Competitor velocity +18%</p>
            <p className="text-sm text-zinc-100">Review sentiment +12 points</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 rounded-2xl border border-zinc-300/80 bg-[#f9f9f7] overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.12)]"
        >
          {/* Browser chrome */}
          <div className="h-11 border-b border-zinc-200 flex items-center justify-between px-4 bg-[#efefec]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
            </div>
            <div className="hidden sm:flex flex-1 mx-6 h-7 rounded-md border border-zinc-300 bg-white items-center px-3 text-[11px] text-zinc-500">
              https://limitus.ai
            </div>
            <div className="text-[12px] text-zinc-500">+</div>
          </div>

          {/* Main window content */}
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-8 p-8 lg:p-10">
            <div>
              <p className="text-[11px] tracking-wider text-zinc-500 uppercase">/ Why Limitus</p>
              <h1 className="mt-4 text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-900 leading-[1.04]">
                Move Your <br /> Market Forward
              </h1>
              <p className="mt-5 max-w-[540px] text-[17px] leading-relaxed text-zinc-600">
                We combine competitor discovery, website scoring, social listening, and review mining so your team can spot opportunities faster and act with confidence.
              </p>
              <div className="mt-7 flex items-center gap-3">
                <Link
                  href="/signup"
                  className="px-5 py-3 rounded-full bg-black text-white text-[14px] font-medium hover:bg-zinc-800 transition-colors"
                >
                  Start Free
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-3 rounded-full border border-zinc-300 text-zinc-800 text-[14px] font-medium hover:bg-white transition-colors inline-flex items-center gap-2"
                >
                  Open Dashboard <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-[11px] tracking-wider text-zinc-500 uppercase">/ Why teams switch</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                    <Radar size={18} className="text-zinc-700" />
                    <p className="mt-2 text-[13px] font-semibold text-zinc-900">Global Reach</p>
                    <p className="mt-1 text-[12px] text-zinc-600">Track local and national competitors in one feed.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                    <BarChart3 size={18} className="text-zinc-700" />
                    <p className="mt-2 text-[13px] font-semibold text-zinc-900">Custom Models</p>
                    <p className="mt-1 text-[12px] text-zinc-600">4 persona scoring for stronger buying signals.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                    <Sparkles size={18} className="text-zinc-700" />
                    <p className="mt-2 text-[13px] font-semibold text-zinc-900">AI-Native</p>
                    <p className="mt-1 text-[12px] text-zinc-600">Automated scrape runs with live watch links.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                    <PlayCircle size={18} className="text-zinc-700" />
                    <p className="mt-2 text-[13px] font-semibold text-zinc-900">Actionable</p>
                    <p className="mt-1 text-[12px] text-zinc-600">Prioritized insights for growth and outreach.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column cards */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-xs text-zinc-500">This week</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">+24 key changes</p>
                <p className="text-sm text-zinc-600 mt-1">Detected across websites, reviews, and socials.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium text-zinc-900">Top competitor momentum</p>
                <div className="mt-4 h-28 rounded-xl bg-gradient-to-r from-zinc-100 to-zinc-200 flex items-end px-3 pb-3">
                  <div className="w-6 h-10 bg-zinc-500 rounded-sm mr-2" />
                  <div className="w-6 h-16 bg-zinc-700 rounded-sm mr-2" />
                  <div className="w-6 h-12 bg-zinc-600 rounded-sm mr-2" />
                  <div className="w-6 h-20 bg-zinc-900 rounded-sm" />
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium text-zinc-900">Latest summary</p>
                <p className="mt-2 text-sm text-zinc-600">
                  “Competitor B improved onboarding copy; your social sentiment dipped on shipping times. Suggested action plan ready.”
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Partner logos */}
      <section className="border-t border-zinc-200 py-10 px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {PARTNER_LOGOS.map((name) => (
            <span
              key={name}
              className="text-zinc-400 font-medium text-sm tracking-tight hover:text-zinc-600 transition-colors"
            >
              {name}
            </span>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ArrowRight, BarChart3, Radar, Sparkles, PlayCircle } from "lucide-react";

const NAV_LINKS = [
  { label: "Success Stories", href: "#stories" },
  { label: "Resources", href: "#resources" },
  { label: "Pricing", href: "#pricing" },
];

const PRODUCT_DROPDOWN_LINKS = [
  { label: "Overview", href: "#product" },
  { label: "Docs", href: "/docs" },
];

const HERO_SCROLL_FADE_DISTANCE = 200;

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [productOpen, setProductOpen] = useState(false);
  const productMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productMenuRef.current && !productMenuRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
    };
    if (productOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [productOpen]);

  const heroProgress = Math.min(scrollY / HERO_SCROLL_FADE_DISTANCE, 1);
  const heroOpacity = 1 - heroProgress;
  const heroY = -heroProgress * 32;
  const heroScale = 1 - heroProgress * 0.03;

  return (
    <div className="min-h-screen bg-[#9ea594]">
      {/* Fixed Nav — always visible, shrinks on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full bg-[#f6f6f4]/98 backdrop-blur-md border-b border-zinc-200/80 transition-all duration-300 ease-out ${
          isScrolled ? "py-2 shadow-[0_4px 24px_rgba(0,0,0,0.08)]" : "py-5"
        }`}
      >
        <nav className="flex items-center justify-between px-8 lg:px-12 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div
              className={`bg-black rounded-lg flex items-center justify-center transition-all duration-300 ${
                isScrolled ? "w-7 h-7" : "w-8 h-8"
              }`}
            >
              <svg
                className={isScrolled ? "scale-90" : ""}
                width="18"
                height="18"
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
            <span className={`font-display font-semibold text-zinc-900 transition-all duration-300 ${isScrolled ? "text-[13px]" : "text-[14px]"}`}>
              / limitus
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="relative" ref={productMenuRef}>
              <button
                type="button"
                onClick={() => setProductOpen((o) => !o)}
                className="text-[13px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-0.5"
              >
                Product
                <ChevronDown size={14} className={`opacity-60 transition-transform ${productOpen ? "rotate-180" : ""}`} />
              </button>
              {productOpen && (
                <div className="absolute top-full left-0 mt-1 py-1.5 min-w-[160px] rounded-xl border border-zinc-200 bg-white shadow-lg shadow-black/10 z-50">
                  {PRODUCT_DROPDOWN_LINKS.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="block px-4 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg mx-1 transition-colors"
                      onClick={() => setProductOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[13px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2.5 border-2 border-zinc-300 text-zinc-800 text-[13px] font-semibold rounded-full hover:bg-white hover:border-zinc-400 transition-all"
            >
              Book A Demo
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2.5 bg-black text-white text-[13px] font-semibold rounded-full hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Spacer so content starts below fixed nav */}
      <div className="h-16 sm:h-20" aria-hidden="true" />

      <div className="w-full min-h-screen bg-[#f6f6f4]">
      <section className="relative px-8 lg:px-12 pt-6 pb-10">
        <motion.div
          className="relative"
          animate={{
            opacity: heroOpacity,
            y: heroY,
            scale: heroScale,
          }}
          transition={{ type: "tween", duration: 0.2 }}
          style={{ pointerEvents: heroOpacity < 0.5 ? "none" : "auto" }}
        >
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute right-10 top-6 w-[44%] h-[540px] rounded-2xl border-2 border-zinc-400/60 bg-gradient-to-b from-zinc-700 to-zinc-900 text-white p-7 hidden lg:block shadow-xl shadow-black/20"
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
          className="relative z-10 rounded-2xl border-2 border-zinc-300/90 bg-[#f9f9f7] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.14)]"
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
              <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase font-semibold">/ Why Limitus</p>
              <h1 className="mt-4 font-display text-5xl lg:text-7xl font-extrabold tracking-tighter text-zinc-900 leading-[0.98]">
                Move Your <br /> Market Forward
              </h1>
              <p className="mt-6 max-w-[540px] text-lg leading-relaxed text-zinc-600 font-medium">
                We combine competitor discovery, website scoring, social listening, and review mining so your team can spot opportunities faster and act with confidence.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <Link
                  href="/signup"
                  className="px-6 py-3.5 rounded-full bg-black text-white text-[14px] font-semibold hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20"
                >
                  Start Free
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-full border-2 border-zinc-300 text-zinc-800 text-[14px] font-semibold hover:bg-white hover:border-zinc-400 transition-all inline-flex items-center gap-2"
                >
                  Open Dashboard <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-10 rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-lg shadow-black/5">
                <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase font-semibold">/ Why teams switch</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                  <div className="rounded-xl bg-zinc-50/80 border-2 border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
                    <Radar size={20} className="text-zinc-800" strokeWidth={2} />
                    <p className="mt-3 font-display text-sm font-bold text-zinc-900">Global Reach</p>
                    <p className="mt-1.5 text-[13px] text-zinc-600 font-medium">Track local and national competitors in one feed.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50/80 border-2 border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
                    <BarChart3 size={20} className="text-zinc-800" strokeWidth={2} />
                    <p className="mt-3 font-display text-sm font-bold text-zinc-900">Custom Models</p>
                    <p className="mt-1.5 text-[13px] text-zinc-600 font-medium">4 persona scoring for stronger buying signals.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50/80 border-2 border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
                    <Sparkles size={20} className="text-zinc-800" strokeWidth={2} />
                    <p className="mt-3 font-display text-sm font-bold text-zinc-900">AI-Native</p>
                    <p className="mt-1.5 text-[13px] text-zinc-600 font-medium">Automated scrape runs with live watch links.</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50/80 border-2 border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-md transition-all">
                    <PlayCircle size={20} className="text-zinc-800" strokeWidth={2} />
                    <p className="mt-3 font-display text-sm font-bold text-zinc-900">Actionable</p>
                    <p className="mt-1.5 text-[13px] text-zinc-600 font-medium">Prioritized insights for growth and outreach.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column cards */}
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 shadow-md shadow-black/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">This week</p>
                <p className="mt-2 font-display text-2xl font-bold text-zinc-900">+24 key changes</p>
                <p className="text-sm text-zinc-600 mt-1 font-medium">Detected across websites, reviews, and socials.</p>
              </div>
              <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 shadow-md shadow-black/5">
                <p className="text-sm font-bold text-zinc-900">Top competitor momentum</p>
                <div className="mt-4 h-28 rounded-xl bg-gradient-to-r from-zinc-100 to-zinc-200 flex items-end px-3 pb-3">
                  <div className="w-6 h-10 bg-zinc-500 rounded-sm mr-2" />
                  <div className="w-6 h-16 bg-zinc-700 rounded-sm mr-2" />
                  <div className="w-6 h-12 bg-zinc-600 rounded-sm mr-2" />
                  <div className="w-6 h-20 bg-zinc-900 rounded-sm" />
                </div>
              </div>
              <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 shadow-md shadow-black/5">
                <p className="text-sm font-bold text-zinc-900">Latest summary</p>
                <p className="mt-2 text-sm text-zinc-600 font-medium">
                  “Competitor B improved onboarding copy; your social sentiment dipped on shipping times. Suggested action plan ready.”
                </p>
              </div>
            </div>
          </div>
        </motion.div>
        </motion.div>
      </section>

      {/* Demo video (left) + one-sentence pitch (right) — below hero */}
      <section className="px-8 lg:px-12 py-12 lg:py-16 border-t border-zinc-200/80 bg-[#fafaf8]">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center max-w-6xl mx-auto">
          <div className="aspect-video rounded-2xl border-2 border-zinc-300/90 bg-zinc-100 flex items-center justify-center overflow-hidden shadow-xl shadow-black/5">
            <div className="text-center text-zinc-500">
              <PlayCircle className="w-14 h-14 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
              <p className="text-sm font-medium">Demo video coming soon</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase font-semibold">/ What we do</p>
            <p className="mt-4 font-display text-2xl lg:text-3xl font-bold text-zinc-900 leading-snug tracking-tight">
              We combine competitor discovery, website scoring, social listening, and review mining so your team can spot opportunities faster and act with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Partner logos */}
      <section className="border-t-2 border-zinc-200 py-12 px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {PARTNER_LOGOS.map((name) => (
            <span
              key={name}
              className="font-display text-zinc-500 font-semibold text-sm tracking-tight hover:text-zinc-800 transition-colors"
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

"use client";

import Link from "next/link";
import { PlusCircle, LayoutDashboard, BarChart3, MessageSquare, RefreshCw } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f4]">
      {/* Minimal header — matches landing */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-[#f6f6f4]/95 backdrop-blur-sm py-3">
        <nav className="flex items-center justify-between px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
            <span className="text-[13px] font-medium text-zinc-900">/ limitus</span>
            <span className="text-zinc-400 text-[13px]">· Docs</span>
          </Link>
          <Link
            href="/"
            className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Back to home
          </Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-8 lg:px-12 py-12">
        <p className="text-[11px] tracking-wider text-zinc-500 uppercase">/ Documentation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
          How to use Limitus
        </h1>
        <p className="mt-3 text-zinc-600">
          A short guide to get you from signup to insights.
        </p>

        <div className="mt-12 space-y-10">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-zinc-700" />
              <h2 className="text-lg font-semibold text-zinc-900">Add your business</h2>
            </div>
            <p className="mt-3 text-[14px] text-zinc-600 leading-relaxed">
              From the dashboard, click <strong>Add company</strong>. Enter your business name, market (e.g. “cake shops SF”), and optionally your website and location. We’ll discover competitors and start analyzing them automatically.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-zinc-700" />
              <h2 className="text-lg font-semibold text-zinc-900">Your company dashboard</h2>
            </div>
            <p className="mt-3 text-[14px] text-zinc-600 leading-relaxed">
              Open a company to see competitors, website feedback from four personas (e.g. new user, frustrated buyer), review summaries, and social posts. Use the tabs to switch between Analytics, Scrapers, Rankings, and more.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-zinc-700" />
              <h2 className="text-lg font-semibold text-zinc-900">Rankings & feedback</h2>
            </div>
            <p className="mt-3 text-[14px] text-zinc-600 leading-relaxed">
              We score each competitor’s site through different user lenses and rank them. Check pros and cons per persona so you know where you stand and where to improve.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-zinc-700" />
              <h2 className="text-lg font-semibold text-zinc-900">Reviews & social</h2>
            </div>
            <p className="mt-3 text-[14px] text-zinc-600 leading-relaxed">
              Reviews (Google, Yelp) and social posts (X, LinkedIn, Instagram, Reddit) are scraped and shown per company. Use them to see what customers say about you and competitors.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-zinc-700" />
              <h2 className="text-lg font-semibold text-zinc-900">Rescraping</h2>
            </div>
            <p className="mt-3 text-[14px] text-zinc-600 leading-relaxed">
              Data is refreshed on a schedule. You can also trigger a full rescrape from the dashboard to pull the latest competitor sites, reviews, and social data.
            </p>
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-zinc-200">
          <p className="text-[11px] tracking-wider text-zinc-500 uppercase">/ Need help?</p>
          <p className="mt-2 text-sm text-zinc-600">
            Book a demo or reach out for support — we’re here to help you move your market forward.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 border border-zinc-300 text-zinc-800 text-[13px] font-medium rounded-full hover:bg-white transition-colors"
            >
              Book a demo
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-black text-white text-[13px] font-medium rounded-full hover:bg-zinc-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

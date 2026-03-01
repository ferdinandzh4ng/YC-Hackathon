"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowRight,
  Users,
  TrendingUp,
  X,
  Loader2,
  MapPin,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import type { Company } from "../lib/api";
import { createClient } from "../lib/supabase";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await apiFetch<{ companies: Company[] }>("/companies");
      setCompanies(res.companies);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const getGeolocation = () => {
    setGeoLoading(true);
    setLocation("");
    if (!navigator.geolocation) {
      setGeoLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitLoading(true);
    try {
      await apiFetch<Company>("/companies", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          market: market.trim(),
          website: website.trim() || undefined,
          location: location.trim() || undefined,
        }),
      });
      setOverlayOpen(false);
      setName("");
      setMarket("");
      setWebsite("");
      setLocation("");
      await loadCompanies();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add company");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="px-8 pt-8 pb-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between mb-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">limitus</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-[13px] text-zinc-500 hover:text-zinc-700"
        >
          Sign out
        </button>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
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
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[13px] font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <Plus size={15} />
            Add Company
          </button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-zinc-400 animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-zinc-500 text-[14px]"
          >
            No companies yet. Click &quot;Add Company&quot; to get started.
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {companies.map((company, index) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.06, duration: 0.4 }}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/company/${company.id}`)}
                  className="w-full text-left bg-white rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center text-[15px] font-bold text-zinc-600 group-hover:bg-zinc-200 transition-colors">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-zinc-900">
                          {company.name}
                        </p>
                        <p className="text-xs text-zinc-500">{company.market}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all mt-1" />
                  </div>
                  <p className="text-[13px] text-zinc-500 leading-relaxed mb-4">
                    {company.website ? `${company.website}${company.location ? ` · ${company.location}` : ""}` : company.location || "No website or location set."}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-zinc-400" />
                      <span className="text-[12px] font-medium text-zinc-600">
                        View details
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full">
                      <TrendingUp size={10} className="text-amber-600" />
                      <span className="text-[10px] font-semibold text-amber-700">
                        Scrapers may be running
                      </span>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {overlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitLoading && setOverlayOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">Add Company</h2>
                <button
                  type="button"
                  onClick={() => !submitLoading && setOverlayOpen(false)}
                  className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddCompany} className="space-y-4">
                <div>
                  <label htmlFor="add-name" className="block text-[12px] font-medium text-zinc-600 mb-1.5">Company name</label>
                  <input
                    id="add-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="Acme Inc"
                  />
                </div>
                <div>
                  <label htmlFor="add-market" className="block text-[12px] font-medium text-zinc-600 mb-1.5">Market / industry</label>
                  <input
                    id="add-market"
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="Fintech"
                  />
                </div>
                <div>
                  <label htmlFor="add-website" className="block text-[12px] font-medium text-zinc-600 mb-1.5">Website (optional)</label>
                  <input
                    id="add-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="https://acme.com"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-600 mb-1.5">Location (from geolocation)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={location}
                      readOnly
                      className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 text-[14px] bg-zinc-50 text-zinc-600"
                      placeholder="Click to use your location"
                    />
                    <button
                      type="button"
                      onClick={getGeolocation}
                      disabled={geoLoading}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-[13px] font-medium disabled:opacity-50"
                    >
                      <MapPin size={14} />
                      {geoLoading ? "Getting…" : "Use my location"}
                    </button>
                  </div>
                </div>
                {submitError && <p className="text-[13px] text-red-600">{submitError}</p>}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => !submitLoading && setOverlayOpen(false)}
                    className="flex-1 py-2.5 border border-zinc-200 text-[14px] font-medium rounded-lg hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 py-2.5 bg-black text-white text-[14px] font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitLoading ? <Loader2 size={16} className="animate-spin" /> : "Add company"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

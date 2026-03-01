"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">limitus</span>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-1">Create account</h1>
        <p className="text-[13px] text-zinc-500 mb-6">Enter your email and a password to sign up.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[12px] font-medium text-zinc-600 mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-[12px] font-medium text-zinc-600 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              placeholder="At least 6 characters"
            />
          </div>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-black text-white text-[14px] font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-[13px] text-zinc-500 text-center">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

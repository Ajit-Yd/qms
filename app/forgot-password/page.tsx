"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Failed to send instructions");
      else setSent(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <form onSubmit={handleSubmit} className="animate-in mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_32px_rgba(16,24,40,0.08)]">
        <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your email and we will send reset instructions.</p>
        <input required type="email" name="email" aria-label="Email" className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus:bg-white" />
        <Button type="submit" variant="primary" size="lg" fullWidth className="mt-4" loading={loading} disabled={loading || sent}>Send instructions</Button>
        {sent && <p className="mt-3 text-sm text-emerald-700">Instructions sent if the account exists. Check your email (or server logs in dev).</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const token = searchParams.get("token") ?? String(form.get("token") ?? "");
    const email = String(form.get("email") ?? searchParams.get("email") ?? "");
    const newPassword = String(form.get("password") ?? "");
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, email, newPassword }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Failed to reset password");
      else setSaved(true);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-4 sm:p-6 text-slate-800 dark:bg-[#0b1220] dark:text-slate-200">
      <div className="mx-auto flex w-full max-w-[92%] justify-end sm:max-w-md"><ThemeToggle /></div>
      <form onSubmit={handleSubmit} className="animate-in mx-auto mt-4 max-w-[92%] sm:max-w-md rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:mt-8 sm:p-6 shadow-[0_8px_32px_rgba(16,24,40,0.08)]">
        <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter the token from your email (auto-filled if you clicked the link) and your new password.</p>
        <input name="email" type="email" placeholder="Email (optional)" aria-label="Email" className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus:bg-white" defaultValue={searchParams.get("email") ?? ""} />
        <input name="token" placeholder="Reset token" aria-label="Reset token" className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs transition focus:bg-white" defaultValue={searchParams.get("token") ?? ""} required />
        <input required minLength={8} type="password" name="password" aria-label="New password" placeholder="New password (8+ characters)" className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus:bg-white" />
        <Button type="submit" variant="primary" size="lg" fullWidth className="mt-4" loading={loading} disabled={loading || saved}>Save password</Button>
        {saved && <p className="mt-3 text-sm text-emerald-700">Password updated. <Link href="/login" className="font-semibold underline">Sign in</Link></p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}

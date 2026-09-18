"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-4 sm:p-6 text-slate-800">
      <form onSubmit={async (event) => { event.preventDefault(); setError(""); const formData = new FormData(event.currentTarget); const result = await signIn("credentials", { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? ""), redirect: false, callbackUrl }); if (result?.error) { setError("Invalid credentials"); return; } setMessage("Signed in"); router.push(result?.url ?? callbackUrl); }} className="animate-in mx-auto mt-8 w-full max-w-[92%] sm:max-w-md rounded-2xl border border-slate-200 bg-white p-4 sm:mt-16 sm:p-6 shadow-[0_8px_32px_rgba(16,24,40,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">QMS access</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in</h1>
        <label className="mt-6 block text-sm font-medium text-slate-700">Email<input required type="email" name="email" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 transition focus:bg-white" /></label>
        <label className="mt-3 block text-sm font-medium text-slate-700">Password<input required type="password" name="password" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 transition focus:bg-white" /></label>
        <Button type="submit" variant="primary" size="lg" fullWidth className="mt-5">Sign in</Button>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <Link href="/forgot-password" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-800">Forgot password?</Link>
      </form>
    </main>
  );
}

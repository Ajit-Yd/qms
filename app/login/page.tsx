"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <form onSubmit={async (event) => { event.preventDefault(); setError(""); const formData = new FormData(event.currentTarget); const result = await signIn("credentials", { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? ""), redirect: false, callbackUrl: "/" }); if (result?.error) { setError("Invalid credentials"); return; } setMessage("Signed in"); router.push(result?.url ?? "/"); }} className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">QMS access</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in</h1>
        <label className="mt-6 block text-sm font-medium">Email<input required type="email" name="email" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
        <label className="mt-3 block text-sm font-medium">Password<input required type="password" name="password" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
        <button type="submit" className="mt-5 w-full rounded-xl bg-[#1D9E75] px-4 py-2.5 font-semibold text-white">Sign in</button>
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <Link href="/forgot-password" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-800">Forgot password?</Link>
      </form>
    </main>
  );
}

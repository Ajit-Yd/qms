"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <form onSubmit={(event) => { event.preventDefault(); setSent(true); }} className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your email and we will send reset instructions.</p>
        <input required type="email" name="email" aria-label="Email" className="mt-5 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        <button type="submit" className="mt-4 w-full rounded-xl bg-[#1D9E75] px-4 py-2.5 font-semibold text-white">Send instructions</button>
        {sent && <p className="mt-3 text-sm text-emerald-700">Instructions sent if the account exists.</p>}
      </form>
    </main>
  );
}

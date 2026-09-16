"use client";

import { useState } from "react";

export default function ResetPasswordPage() {
  const [saved, setSaved] = useState(false);
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <form onSubmit={(event) => { event.preventDefault(); setSaved(true); }} className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
        <input required minLength={8} type="password" name="password" aria-label="New password" className="mt-5 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        <button type="submit" className="mt-4 w-full rounded-xl bg-[#1D9E75] px-4 py-2.5 font-semibold text-white">Save password</button>
        {saved && <p className="mt-3 text-sm text-emerald-700">Password updated.</p>}
      </form>
    </main>
  );
}

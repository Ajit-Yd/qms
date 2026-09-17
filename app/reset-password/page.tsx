"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [saved, setSaved] = useState(false);
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <form onSubmit={(event) => { event.preventDefault(); setSaved(true); }} className="animate-in mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_32px_rgba(16,24,40,0.08)]">
        <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
        <input required minLength={8} type="password" name="password" aria-label="New password" className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus:bg-white" />
        <Button type="submit" variant="primary" size="lg" fullWidth className="mt-4">Save password</Button>
        {saved && <p className="mt-3 text-sm text-emerald-700">Password updated.</p>}
      </form>
    </main>
  );
}

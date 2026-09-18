"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen bg-[#EEF2FA] p-4 sm:p-6 text-slate-800 dark:bg-[#0b1220] dark:text-slate-200"><div className="mx-auto flex max-w-xl justify-end"><ThemeToggle /></div><section className="mx-auto mt-6 max-w-[92%] sm:mt-10 sm:max-w-xl animate-in rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:p-8 shadow-[0_8px_32px_rgba(16,24,40,0.08)]"><h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Something went wrong</h1><p className="mt-2 text-sm text-slate-600 sm:text-base">The QMS could not complete that request.</p><Button onClick={() => reset()} variant="primary" className="mt-6">Try again</Button></section></main>;
}

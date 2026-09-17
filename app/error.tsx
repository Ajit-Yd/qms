"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800"><section className="mx-auto mt-20 max-w-xl animate-in rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_8px_32px_rgba(16,24,40,0.08)]"><h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1><p className="mt-2 text-slate-600">The QMS could not complete that request.</p><Button onClick={() => reset()} variant="primary" className="mt-6">Try again</Button></section></main>;
}

"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800"><section className="mx-auto mt-20 max-w-xl rounded-2xl border border-slate-200 bg-white p-8"><h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1><p className="mt-2 text-slate-600">The QMS could not complete that request.</p><button type="button" onClick={() => reset()} className="mt-6 rounded-xl bg-[#1D9E75] px-4 py-2 font-semibold text-white">Try again</button></section></main>;
}

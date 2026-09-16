import Link from "next/link";

export default function NotFound() {
  return <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800"><section className="mx-auto mt-20 max-w-xl rounded-2xl border border-slate-200 bg-white p-8"><p className="text-sm font-semibold text-[#C1614F]">404</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Page not found</h1><p className="mt-2 text-slate-600">That QMS page does not exist.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-[#1D9E75] px-4 py-2 font-semibold text-white">Back to dashboard</Link></section></main>;
}

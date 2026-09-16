import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C1614F]">Access restricted</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600">Your role does not include access to this record or action.</p>
        <Link href="/" className="mt-5 inline-block rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white">Back to dashboard</Link>
      </section>
    </main>
  );
}

import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <section className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Registration unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">Users are created and managed by an administrator from the team screen.</p>
        <Link href="/login" className="mt-5 inline-block rounded-xl bg-[#1D9E75] px-4 py-2 font-semibold text-white">Back to sign in</Link>
      </section>
    </main>
  );
}

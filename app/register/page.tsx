import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#EEF2FA] p-4 sm:p-6 text-slate-800 dark:bg-[#0b1220] dark:text-slate-200">
      <div className="mx-auto flex w-full max-w-[92%] justify-end sm:max-w-md"><ThemeToggle /></div>
      <section className="animate-in mx-auto mt-4 max-w-[92%] sm:max-w-md rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:mt-8 sm:p-6 shadow-[0_8px_32px_rgba(16,24,40,0.08)]">
        <h1 className="text-2xl font-bold text-slate-900">Registration unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">Users are created and managed by an administrator from the team screen.</p>
        <Link href="/login" className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#1D9E75] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#188a65] hover:shadow-md">Back to sign in</Link>
      </section>
    </main>
  );
}

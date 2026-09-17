"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        if (!cancelled) setNotifications(data.notifications ?? []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <main className="min-h-screen bg-[#EEF2FA] p-6 text-slate-800">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-slate-500">Back to dashboard</Link>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Notifications</h1>
          </div>
          {!loading && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${unread > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-2">
          {loading ? (
            <p className="animate-pulse py-6 text-center text-sm text-slate-500">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">You have no notifications.</p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${item.read ? "border-slate-200" : "border-orange-200 bg-orange-50"}`}
              >
                {item.link ? (
                  <Link href={item.link} className="flex-1 text-slate-700 hover:text-slate-900">{item.message}</Link>
                ) : (
                  <span className="flex-1 text-slate-700">{item.message}</span>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                  {!item.read && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => markRead(item.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
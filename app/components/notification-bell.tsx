"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMode } from "./mode-provider";

type Notification = {
  id: number;
  kind:
    | "award-sticker"
    | "award-badge"
    | "award-dice"
    | "award-flip-tokens"
    | "account-suspended"
    | "account-unsuspended"
    | "high-roller-completed"
    | "high-roller-bust"
    | "event-fast-forwarded"
    | "daily-spin-won"
    | "combo-milestone"
    | "custom";
  title: string;
  body: string;
  payload: { image?: string; title?: string; count?: number } | null;
  createdAt: string;
  readAt: string | null;
};

const POLL_MS = 30_000;
const SEEN_KEY = "sidequest_notifications_seen_v1";
const KIND_COLORS: Record<Notification["kind"], string> = {
  "award-sticker": "var(--pink)",
  "award-badge": "var(--yellow)",
  "award-dice": "var(--red)",
  "award-flip-tokens": "var(--mint)",
  "account-suspended": "var(--pink)",
  "account-unsuspended": "var(--mint)",
  "high-roller-completed": "var(--yellow)",
  "high-roller-bust": "var(--red)",
  "event-fast-forwarded": "var(--sky)",
  "daily-spin-won": "var(--yellow)",
  "combo-milestone": "var(--mint)",
  custom: "var(--sky)"
};

function loadSeen(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<number>) {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(set).slice(-100);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const mode = useMode();
  const isPro = mode === "pro";
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const seenRef = useRef<Set<number>>(new Set());
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    seenRef.current = loadSeen();
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Notification[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
      // Pop a toast for any unread notification we've never shown before.
      const seen = seenRef.current;
      const surprise = data.items.find((n) => !n.readAt && !seen.has(n.id));
      if (surprise) {
        setToast(surprise);
        seen.add(surprise.id);
        saveSeen(seen);
        if (toastTimer.current) {
          window.clearTimeout(toastTimer.current);
        }
        toastTimer.current = window.setTimeout(() => setToast(null), 6500);
      }
    } catch {
      /* swallow */
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const t = window.setInterval(fetchNotifications, POLL_MS);
    return () => {
      window.clearInterval(t);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const prevUnread = unread;
    setUnread(0);
    setItems((curr) => curr.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    if (prevUnread === 0) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" })
      });
    } catch {
      /* ignore — stale state will self-correct on next poll */
    }
  }, [unread]);

  const dismissToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void markAllRead();
  };

  return (
    <>
      <div className="notif-wrap">
        <button
          type="button"
          className={`notif-bell${unread > 0 ? " has-unread" : ""}`}
          onClick={() => handleOpenChange(!open)}
          aria-label={`${unread} new notification${unread === 1 ? "" : "s"}`}
          aria-expanded={open}
        >
          <span className="notif-bell-icon" aria-hidden="true">🔔</span>
          {unread > 0 ? <span className="notif-badge">{Math.min(9, unread)}{unread > 9 ? "+" : ""}</span> : null}
        </button>

        {open ? (
          <div className="notif-panel" role="dialog" aria-label="Notifications">
            <div className="notif-panel-head">
              <strong>Notifications</strong>
              <button type="button" className="notif-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            {items.length === 0 ? (
              <p className="notif-empty">Nothing here yet. You&apos;ll get a ping when something lands.</p>
            ) : (
              <ul className="notif-list">
                {items.map((n) => (
                  <li key={n.id} className={`notif-item${n.readAt ? "" : " is-unread"}`}>
                    <span
                      className="notif-accent"
                      style={{ background: KIND_COLORS[n.kind] }}
                      aria-hidden="true"
                    />
                    <div className="notif-item-body">
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <small>{timeAgo(n.createdAt)}</small>
                    </div>
                    {n.payload?.image ? (
                      // Intentional <img> to skip next/image optimization for svg data loaded at runtime
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.payload.image} alt="" className="notif-item-image" />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {toast ? (
        <div
          className="notif-toast-overlay"
          role="status"
          aria-live="polite"
          onClick={dismissToast}
        >
          <div className="notif-toast" style={{ borderColor: "var(--ink)" }}>
            <div
              className="notif-toast-burst"
              style={{ background: KIND_COLORS[toast.kind] }}
              aria-hidden="true"
            />
            {toast.payload?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={toast.payload.image} alt="" className="notif-toast-image" />
            ) : (
              <span className="notif-toast-glyph" aria-hidden="true">
                {toast.kind === "award-dice"
                  ? "🎲"
                  : toast.kind === "award-flip-tokens"
                    ? "🪙"
                    : toast.kind === "award-badge"
                      ? "🏅"
                      : toast.kind === "high-roller-completed"
                        ? "🪙"
                        : toast.kind === "high-roller-bust"
                          ? "💥"
                          : toast.kind === "event-fast-forwarded"
                            ? "⏭"
                            : toast.kind === "daily-spin-won"
                              ? "🎡"
                              : toast.kind === "combo-milestone"
                                ? "🔥"
                                : toast.kind === "account-suspended"
                                  ? "⏸"
                                  : toast.kind === "account-unsuspended"
                                    ? "🔓"
                                    : "✨"}
              </span>
            )}
            <div className="notif-toast-copy">
              <span className="notif-toast-kicker">
                {toast.kind === "award-dice"
                  ? "Bonus rolls"
                  : toast.kind === "award-flip-tokens"
                    ? (isPro ? "Bonus tokens" : "Flip tokens")
                    : toast.kind === "award-badge"
                      ? (isPro ? "Recognition granted" : "Badge dropped")
                      : toast.kind === "award-sticker"
                        ? (isPro ? "Achievement granted" : "Sticker dropped")
                        : toast.kind === "high-roller-completed"
                          ? (isPro ? "Bonus event complete" : "Tower cleared")
                          : toast.kind === "high-roller-bust"
                            ? (isPro ? "Reset" : "Bust")
                            : toast.kind === "event-fast-forwarded"
                              ? "Event jumped"
                              : toast.kind === "daily-spin-won"
                                ? (isPro ? "Daily reward" : "Daily spin")
                                : toast.kind === "combo-milestone"
                                  ? (isPro ? "Streak milestone" : "Combo unlocked")
                                  : toast.kind === "account-suspended"
                                    ? "Account paused"
                                    : toast.kind === "account-unsuspended"
                                      ? "You're back"
                                      : "For you"}
              </span>
              <strong>{toast.title}</strong>
              <p>{toast.body}</p>
            </div>
            <button
              type="button"
              className="notif-toast-close"
              aria-label="Dismiss notification"
              onClick={(e) => {
                e.stopPropagation();
                dismissToast();
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

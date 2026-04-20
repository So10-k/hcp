"use client";

import { useState } from "react";

type Props = {
  initialEnabled: boolean;
  initialMessage: string;
};

export function SiteControls({ initialEnabled, initialMessage }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastBusy, setBroadcastBusy] = useState(false);

  const notify = (kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  const toggleMaintenance = async (next: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next })
      });
      if (!res.ok) throw new Error("Failed to toggle maintenance.");
      setEnabled(next);
      notify("ok", next ? "Maintenance mode ON — non-admins are blocked." : "Site is back online.");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveMessage = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error("Failed to save message.");
      notify("ok", "Maintenance message saved.");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      notify("err", "Title and message are required.");
      return;
    }
    setBroadcastBusy(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "broadcast", title: broadcastTitle.trim(), body: broadcastBody.trim() })
      });
      const data = (await res.json()) as { ok?: boolean; sentTo?: number; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed.");
      notify("ok", `Broadcast sent to ${data.sentTo ?? "all"} users.`);
      setBroadcastTitle("");
      setBroadcastBody("");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Failed.");
    } finally {
      setBroadcastBusy(false);
    }
  };

  return (
    <section className="admin-panel site-controls" aria-labelledby="site-controls-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Site controls</p>
          <h2 id="site-controls-title">Global switches</h2>
        </div>
      </div>

      {toast ? (
        <div className={`admin-toast admin-toast-${toast.kind}`} role="status">
          {toast.text}
        </div>
      ) : null}

      <div className="site-controls-body">
        <div className="site-controls-section">
          <div className="site-controls-section-head">
            <div>
              <strong>Maintenance mode</strong>
              <span className={`admin-status ${enabled ? "admin-status-paused" : "admin-status-live"}`}>
                {enabled ? "ON" : "OFF"}
              </span>
            </div>
            <p>Blocks all non-admin traffic. Admins can still reach /admin.</p>
          </div>
          <div className="site-controls-row">
            <button
              type="button"
              className={enabled ? "is-warn" : "admin-modal-submit"}
              disabled={busy}
              onClick={() => void toggleMaintenance(!enabled)}
            >
              {enabled ? "Turn off maintenance" : "Enable maintenance mode"}
            </button>
          </div>
          <label className="site-controls-label">
            Custom message shown to blocked users
            <textarea
              className="site-controls-textarea"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="SideQuest is down for a quick update. Check back soon!"
            />
          </label>
          <button
            type="button"
            className="site-controls-save"
            disabled={busy}
            onClick={() => void saveMessage()}
          >
            Save message
          </button>
        </div>

        <div className="site-controls-section">
          <div className="site-controls-section-head">
            <div>
              <strong>Broadcast notification</strong>
            </div>
            <p>Sends a notification to every active (non-suspended) user.</p>
          </div>
          <label className="site-controls-label">
            Title
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="e.g. New feature dropped"
              maxLength={80}
            />
          </label>
          <label className="site-controls-label">
            Message
            <textarea
              rows={2}
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder="What do you want to tell everyone?"
              maxLength={300}
            />
          </label>
          <button
            type="button"
            className="admin-modal-submit"
            disabled={broadcastBusy || !broadcastTitle.trim() || !broadcastBody.trim()}
            onClick={() => void sendBroadcast()}
          >
            {broadcastBusy ? "Sending…" : "Send broadcast"}
          </button>
        </div>
      </div>
    </section>
  );
}

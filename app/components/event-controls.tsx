"use client";

import { useState, useTransition } from "react";

type EventId = "spring-sprint" | "high-roller";
type Preference = "auto" | "spring" | "high-roller";

type Props = {
  initialPreference: Preference;
  springCompleted: boolean;
  highRollerCompleted: boolean;
};

/**
 * Lets the user steer where their quest-completion tokens go and
 * restart a finished run for a replay. Needed because the original
 * "Spring first, then High Roller" priority traps users in an event
 * they no longer want to play — especially after completing High
 * Roller and wanting another go at the tower.
 */
export function EventControls({ initialPreference, springCompleted, highRollerCompleted }: Props) {
  const [preference, setPreference] = useState<Preference>(initialPreference);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startRefresh] = useTransition();

  async function save(next: Preference) {
    setBusy(true);
    setError(null);
    try {
      const prev = preference;
      setPreference(next);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-preference", preference: next })
      });
      if (!res.ok) {
        setPreference(prev);
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not save preference.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function restart(eventId: EventId) {
    const label = eventId === "spring-sprint" ? "Spring Sprint" : "High Roller";
    if (!window.confirm(`Restart ${label}? Your progress on this event will reset to zero.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", eventId })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not restart event.");
      }
      startRefresh(() => {
        window.location.reload();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <section className="event-controls" aria-label="Event routing">
      <div className="event-controls-head">
        <strong>Event routing</strong>
        <small>Pick where new quest-completion tokens go. Restart a finished event to replay it.</small>
      </div>
      <div className="event-controls-switch" role="radiogroup" aria-label="Active event preference">
        <button
          type="button"
          role="radio"
          aria-checked={preference === "auto"}
          className={preference === "auto" ? "is-active" : ""}
          onClick={() => save("auto")}
          disabled={busy}
        >
          Auto
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={preference === "spring"}
          className={preference === "spring" ? "is-active" : ""}
          onClick={() => save("spring")}
          disabled={busy}
        >
          Spring Sprint
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={preference === "high-roller"}
          className={preference === "high-roller" ? "is-active" : ""}
          onClick={() => save("high-roller")}
          disabled={busy}
        >
          High Roller
        </button>
      </div>
      <div className="event-controls-restart">
        <button type="button" className="ghost-button small" onClick={() => restart("spring-sprint")} disabled={busy}>
          {springCompleted ? "Replay Spring Sprint" : "Restart Spring Sprint"}
        </button>
        <button type="button" className="ghost-button small" onClick={() => restart("high-roller")} disabled={busy}>
          {highRollerCompleted ? "Replay High Roller" : "Restart High Roller"}
        </button>
      </div>
      {error ? <p className="event-controls-error">{error}</p> : null}
    </section>
  );
}

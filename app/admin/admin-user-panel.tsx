"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { AdminBadge } from "../lib/badge-catalog";

type AdminUserSummary = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "member" | "admin";
  joinedAt: string;
  lastActiveAt: string;
  questsCreated: number;
  questsCompleted: number;
  suspendedAt: string | null;
  suspendedReason: string | null;
  rewardsCount: number;
  gameboardPosition: number;
  gameboardCompleted: boolean;
  highRollerRung: number;
  highRollerPeak: number;
  highRollerBusts: number;
  highRollerCompleted: boolean;
};

type EventId = "spring-sprint" | "high-roller";
type EventActionKind = "fast-forward" | "reset" | "award-tokens";

const EVENT_OPTIONS: Array<{ id: EventId; label: string }> = [
  { id: "spring-sprint", label: "Spring Sprint" },
  { id: "high-roller", label: "High Roller" }
];

type Props = {
  initialUsers: AdminUserSummary[];
  badges: AdminBadge[];
  adminId: string;
};

type ModalState =
  | { kind: "suspend"; user: AdminUserSummary }
  | { kind: "dice"; user: AdminUserSummary }
  | { kind: "sticker"; user: AdminUserSummary }
  | { kind: "badge"; user: AdminUserSummary }
  | { kind: "event"; user: AdminUserSummary }
  | null;

async function postAction(body: Record<string, unknown>): Promise<{ ok?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok) {
      return { error: data?.error ?? "Action failed." };
    }
    return data ?? { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Action failed." };
  }
}

async function refreshUsers(): Promise<AdminUserSummary[]> {
  try {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { users: AdminUserSummary[] };
    return data.users ?? [];
  } catch {
    return [];
  }
}

export function AdminUserPanel({ initialUsers, badges, adminId }: Props) {
  const [users, setUsers] = useState<AdminUserSummary[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const refresh = useCallback(async () => {
    const next = await refreshUsers();
    if (next.length > 0) setUsers(next);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) =>
      [u.name, u.username, u.email].some((v) => v.toLowerCase().includes(query))
    );
  }, [users, search]);

  const notify = (kind: "ok" | "err", message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  const runAction = async (body: Record<string, unknown>, user: AdminUserSummary, label: string) => {
    setBusyId(user.id);
    const result = await postAction(body);
    setBusyId(null);
    if (result.error) {
      notify("err", result.error);
      return false;
    }
    notify("ok", `${label} · @${user.username}`);
    void refresh();
    return true;
  };

  const quickUnsuspend = (user: AdminUserSummary) =>
    runAction({ action: "unsuspend", userId: user.id }, user, "Account restored");

  return (
    <section className="admin-panel admin-user-panel" aria-labelledby="admin-users-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">User management</p>
          <h2 id="admin-users-title">Boards &amp; accounts</h2>
          <p className="admin-panel-sub">
            Award stickers, drop bonus dice, hand out badges, or pause an account. Every action
            pings the user with a cute notification on their next load.
          </p>
        </div>
        <input
          className="admin-user-search"
          type="search"
          value={search}
          placeholder="Search by name, @username, email"
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search users"
        />
      </div>

      {toast ? (
        <div className={`admin-toast admin-toast-${toast.kind}`} role="status">
          {toast.message}
        </div>
      ) : null}

      <div className="admin-user-table-wrap">
        <table className="admin-user-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Quests</th>
              <th>Rewards</th>
              <th>Spring Sprint</th>
              <th>High Roller</th>
              <th>Status</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty">
                  No matching users.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className={busyId === user.id ? "is-busy" : ""}>
                  <td>
                    <strong>{user.name}</strong>
                    <span className="admin-user-meta">
                      @{user.username} · {user.email}
                    </span>
                    <span className="admin-user-meta">
                      Joined {new Date(user.joinedAt).toLocaleDateString()} · last active{" "}
                      {new Date(user.lastActiveAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-role-pill admin-role-${user.role}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className="admin-user-stat">{user.questsCompleted}</span>
                    <span className="admin-user-sub">of {user.questsCreated} made</span>
                  </td>
                  <td>
                    <span className="admin-user-stat">{user.rewardsCount}</span>
                    <span className="admin-user-sub">in shelf</span>
                  </td>
                  <td>
                    <span className="admin-user-stat">Tile {user.gameboardPosition}</span>
                    <span className="admin-user-sub">
                      {user.gameboardCompleted ? "Complete" : "In progress"}
                    </span>
                  </td>
                  <td>
                    <span className="admin-user-stat">
                      Rung {user.highRollerRung}
                    </span>
                    <span className="admin-user-sub">
                      {user.highRollerCompleted
                        ? "Cleared"
                        : user.gameboardCompleted
                          ? `Peak ${user.highRollerPeak} · ${user.highRollerBusts} bust${user.highRollerBusts === 1 ? "" : "s"}`
                          : "Locked"}
                    </span>
                  </td>
                  <td>
                    {user.suspendedAt ? (
                      <span className="admin-status admin-status-paused" title={user.suspendedReason ?? ""}>
                        Paused
                      </span>
                    ) : (
                      <span className="admin-status admin-status-live">Active</span>
                    )}
                  </td>
                  <td className="admin-user-actions">
                    <button type="button" onClick={() => setModal({ kind: "sticker", user })}>
                      Sticker
                    </button>
                    <button type="button" onClick={() => setModal({ kind: "badge", user })}>
                      Badge
                    </button>
                    <button type="button" onClick={() => setModal({ kind: "dice", user })}>
                      Dice
                    </button>
                    <button type="button" onClick={() => setModal({ kind: "event", user })}>
                      Event
                    </button>
                    <Link
                      className="admin-user-action-link"
                      href={`/admin/spectate/${user.id}`}
                    >
                      Spectate
                    </Link>
                    {user.suspendedAt ? (
                      <button
                        type="button"
                        className="is-warn"
                        onClick={() => void quickUnsuspend(user)}
                        disabled={user.id === adminId}
                      >
                        Unpause
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => setModal({ kind: "suspend", user })}
                        disabled={user.id === adminId}
                      >
                        Pause
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal ? (
        <AdminModal
          modal={modal}
          badges={badges}
          busy={busyId === modal.user.id}
          onClose={() => setModal(null)}
          onSubmit={async (body, label) => {
            const ok = await runAction(body, modal.user, label);
            if (ok) setModal(null);
          }}
        />
      ) : null}
    </section>
  );
}

function AdminModal({
  modal, badges, busy, onClose, onSubmit
}: {
  modal: NonNullable<ModalState>;
  badges: AdminBadge[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>, label: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [count, setCount] = useState(1);
  const [stickerTitle, setStickerTitle] = useState("");
  const [stickerNote, setStickerNote] = useState("");
  const [stickerImage, setStickerImage] = useState("/sticker-star.svg");
  const [stickerKind, setStickerKind] = useState<"badge" | "sticker">("sticker");
  const [badgeId, setBadgeId] = useState(badges[0]?.id ?? "");
  const [eventId, setEventId] = useState<EventId>("spring-sprint");
  const [eventAction, setEventAction] = useState<EventActionKind>("fast-forward");
  const [eventCount, setEventCount] = useState(5);

  const handleSubmit = async () => {
    switch (modal.kind) {
      case "suspend":
        await onSubmit({ action: "suspend", userId: modal.user.id, reason }, "Account paused");
        return;
      case "dice":
        await onSubmit({ action: "award-dice", userId: modal.user.id, count }, `+${count} dice`);
        return;
      case "sticker":
        if (!stickerTitle.trim()) return;
        await onSubmit(
          {
            action: "award-sticker",
            userId: modal.user.id,
            title: stickerTitle.trim(),
            image: stickerImage,
            note: stickerNote.trim() || `Awarded by admin.`,
            kind: stickerKind
          },
          `Sticker sent`
        );
        return;
      case "badge":
        if (!badgeId) return;
        await onSubmit({ action: "award-badge", userId: modal.user.id, badgeId }, "Badge dropped");
        return;
      case "event": {
        const eventLabel = EVENT_OPTIONS.find((e) => e.id === eventId)?.label ?? eventId;
        if (eventAction === "fast-forward") {
          await onSubmit(
            { action: "fast-forward-event", userId: modal.user.id, eventId },
            `${eventLabel} fast-forwarded`
          );
        } else if (eventAction === "reset") {
          await onSubmit(
            { action: "reset-event", userId: modal.user.id, eventId },
            `${eventLabel} reset`
          );
        } else {
          await onSubmit(
            {
              action: "award-event-tokens",
              userId: modal.user.id,
              eventId,
              count: eventCount
            },
            `+${eventCount} ${eventId === "high-roller" ? "flips" : "dice"} · ${eventLabel}`
          );
        }
        return;
      }
    }
  };

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal-head">
          <div>
            <p className="eyebrow">{modalTitle(modal.kind)}</p>
            <strong>
              {modal.user.name} · @{modal.user.username}
            </strong>
          </div>
          <button type="button" onClick={onClose} className="admin-modal-close">
            Close
          </button>
        </header>
        <div className="admin-modal-body">
          {modal.kind === "suspend" ? (
            <>
              <label>
                Reason (shown to user)
                <textarea
                  rows={3}
                  value={reason}
                  placeholder="Short reason — they&apos;ll see this in the pause notification and on the locked screen."
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <p className="admin-modal-warn">
                This signs the user out immediately and prevents sign-in until you unpause them.
              </p>
            </>
          ) : null}

          {modal.kind === "dice" ? (
            <label>
              Bonus rolls to grant
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(event) => setCount(Number.parseInt(event.target.value, 10) || 1)}
              />
            </label>
          ) : null}

          {modal.kind === "sticker" ? (
            <>
              <label>
                Title
                <input
                  type="text"
                  value={stickerTitle}
                  onChange={(event) => setStickerTitle(event.target.value)}
                  placeholder="e.g. Midnight Hustle"
                />
              </label>
              <label>
                Note (message with the sticker)
                <textarea
                  rows={2}
                  value={stickerNote}
                  onChange={(event) => setStickerNote(event.target.value)}
                  placeholder="Why they're getting this."
                />
              </label>
              <label>
                Art
                <select value={stickerImage} onChange={(event) => setStickerImage(event.target.value)}>
                  <option value="/sticker-star.svg">Brain Star</option>
                  <option value="/sticker-leaf.svg">Fresh Leaf</option>
                  <option value="/sticker-bolt.svg">Squad Spark</option>
                  <option value="/sticker-spark.svg">Paint Flare</option>
                  <option value="/sticker-shield.svg">Done Shield</option>
                  <option value="/sticker-spring-sprint.svg">Spring Sprint</option>
                </select>
              </label>
              <label>
                Kind
                <select
                  value={stickerKind}
                  onChange={(event) => setStickerKind(event.target.value as "badge" | "sticker")}
                >
                  <option value="sticker">Sticker</option>
                  <option value="badge">Badge</option>
                </select>
              </label>
            </>
          ) : null}

          {modal.kind === "badge" ? (
            <div className="admin-badge-grid">
              {badges.map((badge) => (
                <label
                  key={badge.id}
                  className={`admin-badge-option${badgeId === badge.id ? " is-active" : ""}`}
                  style={{ background: badge.color }}
                >
                  <input
                    type="radio"
                    name="badge"
                    value={badge.id}
                    checked={badgeId === badge.id}
                    onChange={() => setBadgeId(badge.id)}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={badge.image} alt="" />
                  <strong>{badge.title}</strong>
                  <small>{badge.note}</small>
                </label>
              ))}
            </div>
          ) : null}

          {modal.kind === "event" ? (
            <>
              <fieldset className="admin-event-fieldset">
                <legend>Event</legend>
                {EVENT_OPTIONS.map((opt) => (
                  <label key={opt.id} className={`admin-event-option${eventId === opt.id ? " is-active" : ""}`}>
                    <input
                      type="radio"
                      name="event-id"
                      value={opt.id}
                      checked={eventId === opt.id}
                      onChange={() => setEventId(opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}
              </fieldset>
              <fieldset className="admin-event-fieldset">
                <legend>Action</legend>
                {([
                  { id: "fast-forward" as const, label: "Fast-forward to complete" },
                  { id: "award-tokens" as const, label: "Award flip / dice tokens" },
                  { id: "reset" as const, label: "Reset run (admin testing)" }
                ]).map((opt) => (
                  <label key={opt.id} className={`admin-event-option${eventAction === opt.id ? " is-active" : ""}`}>
                    <input
                      type="radio"
                      name="event-action"
                      value={opt.id}
                      checked={eventAction === opt.id}
                      onChange={() => setEventAction(opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}
              </fieldset>
              {eventAction === "award-tokens" ? (
                <label>
                  Tokens to grant
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={eventCount}
                    onChange={(event) => setEventCount(Number.parseInt(event.target.value, 10) || 1)}
                  />
                </label>
              ) : null}
              {eventAction === "fast-forward" ? (
                <p className="admin-modal-warn">
                  Marks the run complete. {eventId === "spring-sprint"
                    ? "Drops the Spring Sprint sticker into the user's reward shelf."
                    : "Does NOT award the High Roller badge — admins must earn it through the actual flip flow when testing."}
                </p>
              ) : null}
              {eventAction === "reset" ? (
                <p className="admin-modal-warn">
                  Wipes position, rolls, busts, and completion. The user gets no notification.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <footer className="admin-modal-foot">
          <button type="button" className="admin-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-modal-submit"
            disabled={busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? "Working…" : modalAction(modal.kind)}
          </button>
        </footer>
      </div>
    </div>
  );
}

function modalTitle(kind: NonNullable<ModalState>["kind"]) {
  switch (kind) {
    case "suspend": return "Pause account";
    case "dice": return "Drop bonus dice";
    case "sticker": return "Award sticker";
    case "badge": return "Award badge";
    case "event": return "Event controls";
  }
}

function modalAction(kind: NonNullable<ModalState>["kind"]) {
  switch (kind) {
    case "suspend": return "Pause account";
    case "dice": return "Drop dice";
    case "sticker": return "Award sticker";
    case "badge": return "Award badge";
    case "event": return "Apply event action";
  }
}

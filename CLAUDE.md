# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where the app lives

The Next.js app is in `hcp/` — the repo root (`/Users/samuelotten/Downloads/hackclub/`) only contains that one folder. Run all commands from `hcp/`. Vercel project: `sam-os-projects-b5ec88d7/hcp`. Vercel **Root Directory must be `hcp/`** — running `vercel --prod` from the repo root fails the build.

## Commands

```bash
npm run dev                  # Next.js dev server (http://localhost:3000)
npm run build                # production build
npm start                    # run built app
npm run typecheck            # tsc --noEmit — the only type-check gate (no ESLint, no tests, no hooks)
npm run remotion:studio      # open Remotion Studio
npm run remotion:still       # render a still PNG from a composition
node scripts/generate-audio.mjs   # regenerate WAV audio (pure-Node, no ffmpeg)
```

`npm run typecheck` is the only verification step before shipping. Then `vercel --prod` from `hcp/`.

## Required env

`DATABASE_URL` — Neon serverless Postgres connection string. `getSql()` in `app/lib/sidequest-db.ts` throws immediately if it's missing. The schema is self-bootstrapping via `ensureSideQuestSchema()` (`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN IF NOT EXISTS`) — no migration files.

## Architecture

### Stack
- **Next.js 16** App Router, **React 19**, TypeScript strict. All pages are Server Components except `sidequest-client.tsx`, the components in `app/components/`, and gameboard/highroller clients.
- **Neon serverless Postgres** (`@neondatabase/serverless`) via lazily-initialized singleton.
- **Remotion 4** for tutorial/ad reels + `@remotion/player` for in-page playback.
- **Cookie-based sessions** — no Next.js auth library. `sidequest_session` cookie. `pbkdf2_sha256` 120k iterations. Session tokens sha256-hashed before storage.

### Data flow
`app/seed-data.ts` is the single source of truth for shared types (`Quest`, `Reward`, `SideQuestState`, `Category`, …) plus `makeStarterState()` and `mergeWithStarterState()`. Imported by both client (`sidequest-client.tsx`) and server (`lib/sidequest-db.ts`, api routes). If you change the shape, touch both sides.

The board lifecycle:
1. `app/board/page.tsx` (server) calls `requireUser()` then renders `<SideQuestClient />`.
2. The client fetches `GET /api/sidequest` on mount → `loadSideQuestBoard(user.id)`. Empty user gets a starter state.
3. Every mutation PUTs the full state back to `/api/sidequest` with an `eventType` string → `saveSideQuestBoard`. State stored as `jsonb` keyed by `user.id`; events appended to `sidequest_board_events`.
4. `app/admin/page.tsx` calls `getSideQuestAnalytics()`.

Almost the entire board UI (~1800 lines) lives in `app/sidequest-client.tsx`. When adding board features, expect to edit that file.

### DB schema (self-bootstrapped by `ensureSideQuestSchema`)

| Table | Purpose |
|---|---|
| `sidequest_users` | Account row. `username`, `email`, `password_hash`, `role` (`admin`/`member`), `suspended_at`, `peak_combo`, `total_combos`, `preferred_mode` (`playful`/`pro`). |
| `sidequest_sessions` | `token_hash` + 14d expiry. Deleted on suspend. |
| `sidequest_boards` | `id` PK = `user:<userId>` (or `party:<code>`). Full state as `jsonb`. |
| `sidequest_board_events` | Append-only event log for analytics. |
| `sidequest_gameboard_runs` | PK = `(user_id, event_id)`. `position`, `peak_position`, `rolls_earned/used`, `laps`, `completed_at`. **Reused for both Spring Sprint AND High Roller** — `event_id` distinguishes. |
| `sidequest_gameboard_events` | Append-only roll/flip event log. |
| `sidequest_parties` | Server-authoritative party rows keyed by `invite_code`. |
| `sidequest_party_members` | Membership table (composite PK). |
| `sidequest_notifications` | Bell items. Polled every 30s by `notification-bell.tsx`. Toast pops for unread items the client hasn't seen. |
| `sidequest_admin_audit` | Every admin action writes a row. |
| `sidequest_daily_spins` | PK = `(user_id, date_key)` where `date_key` is UTC `YYYY-MM-DD`. One spin per day. |
| **`sidequest_quest_completions`** | PK = `(user_id, quest_id)`. **Anti-exploit ledger** — see Anti-exploit section below. |
| **`sidequest_rate_log`** | Per-endpoint POST timestamps. Read by `enforceRateLimit`. |

### Auth
- `app/lib/auth.ts` exposes `getCurrentUser()`, `requireUser()` (redirects to `/login`), `requireAdmin()` (redirects to `/dashboard?admin=required`). Use these at the top of every protected server component or route handler.
- API routes that need the user: anything under `app/api/` except the public ones (login, signup, logout). All check `getCurrentUser()` first and return 401 if missing.

## Features shipped

### Personal board (`/board`)
Quest grid (5 categories: school / creative / health / social / life-admin), drag-from-rail to create, focus mode, completion confetti, reward shelf. Combo overlay shows multipliers when quests are cleared inside a 90s window.

### Spring Sprint event (`/gameboard-ltd`)
Monopoly-style 8×8 dice board. **Server-authoritative roll** — `executeGameboardRoll` rolls `1 + Math.floor(Math.random() * 6)` and applies tile effects (`forward` / `back` / `lap`). Reach finish → unlock `"Spring Sprint Champion"` sticker. Tutorial video plays on first visit (`tutorial-player.tsx`).

### High Roller event (`/highroller-ltd`)
10-rung Coin Tower. **Server-authoritative coin flip**. Below rung `HIGHROLLER_SOFT_BUST_THRESHOLD` (5), tails resets to 0; at or above, tails drops by `HIGHROLLER_SOFT_BUST_DROP` (3) instead. Reach top → unlock `"High Roller"` badge. Auto-activates after Spring Sprint completes (dashboard banner picks active event).

### Daily Spin
Wheel of fortune at top-right of board/dashboard. 8 weighted wedges (`xp/dice/flips/sticker/jackpot`). Once per UTC day, server picks the wedge in `pickSpinPrize()` and `executeDailySpin` writes to `sidequest_daily_spins` (PK enforces idempotency). Wedge components are CSS conic-gradient + decorative SVG rim with chase-light bulbs. See `app/components/daily-spin-modal.tsx`.

### Combo multiplier
`combo-overlay.tsx` tracks consecutive completions in a 90s rolling window. Auto-grants combo badges at 5× and 10× via `recordCombo`. **Combo claim is server-validated** against the completion ledger (see Anti-exploit).

### Hall of Achievements (`/achievements`)
Sticker book + trophy shelf view of unlocked rewards.

### Admin (`/admin`)
- User table with 10 columns (hidden via `:nth-child` at 720/430px breakpoints — pure CSS).
- Per-user actions: Sticker, Badge, Dice, Flips, Spin (force/reset), Event (fast-forward/reset for Spring Sprint or High Roller), Spectate, Pause/unpause, **Mode toggle** (playful ↔ pro).
- Spectator mode at `/admin/spectate/[userId]`.
- Audit trail at `/admin/audit` (top 50 actions).
- All actions go through `app/api/admin/actions/route.ts`.

### Pro mode preference
Per-user toggle (`playful` default | `pro` for older users / less cartoony UI). Set on signup, admin-toggleable. Reflected globally via `<html data-mode="...">` (set in `app/layout.tsx`) + React Context (`mode-provider.tsx`) for client components. Mode-aware copy lives in `app/lib/preferred-mode.ts` `COPY` map — call `t(key, mode)` to swap strings.

**Important:** the `dashboardLede` playful copy was deliberately changed by the user to *"Check your week, jump into your board, or just have fun."* — do not revert it back to the original "peek at admin analytics" line.

### Notifications
Bell icon polls `/api/notifications` every 30s. New unread items pop a toast (one at a time, 6.5s auto-dismiss). Toast kicker text and emoji are mode-aware via `useMode()`. Persistent dismiss tracking in `localStorage` key `sidequest_notifications_seen_v1`.

### Parties
DB-backed (`sidequest_parties` + `sidequest_party_members`). Invite code format `SQ-<TITLE>-<SUFFIX>`. `reconcilePartyBoards()` migrates legacy local-only party boards into real party rows on first load. `propagatePartyEdits()` syncs party-board edits back to authoritative rows.

### Remotion videos (in `remotion/`)
- `SideQuestFeatureReel` — landing-page feature reels (variants: create / party / reward).
- `SideQuestAdReel` — 10s click-sound ad reel.
- `SideQuestSpringReel` / `SideQuestSpringLoudReel` — 30s Spring Sprint reels (with/without VO).
- `SideQuestTutorialReel` — first-visit board tutorial.
- `SideQuestBoardTutorialReel` — first-visit personal-board tutorial.
- `SideQuestHighRollerTutorialReel` — first-visit High Roller tutorial.
- `SideQuestIntroReel` — High Roller intro.
- `SideQuestMorphLoop` — 5s ticket→star morph for `/404`.

`remotion/Root.tsx` registers all compositions. `tutorial-player.tsx` is the custom in-page player with **synced dismiss animation** — listens to `timeupdate` and triggers a CSS scale+fade so the radial/iris collapse at the end of the video matches the player closing.

Audio is generated by pure-Node `scripts/generate-audio.mjs` (WAV binary math, no ffmpeg dep). To add a new sound, append a generator there.

## Anti-exploit hardening (the recently shipped pass)

The board client trusts the user with state, so the server has to be paranoid. The pipeline:

1. **Reward scrub on `saveSideQuestBoard`** — when called without `{ trusted: true }`, the incoming `rewards[]` is filtered against the previous state. A reward survives only if (a) it was already in the user's prior shelf (carried forward unchanged from the prior row), or (b) its id matches `reward-<questId>` where the questId was *just* completed in this save and the reward shape gets recomputed server-side via `serverRewardForQuest()`. Anything else is silently dropped.
2. **Server-side completion ledger** — `sidequest_quest_completions(user_id, quest_id)` PK is the canonical "did this quest just complete" signal. `observeCompletionsAndGrant()` diffs prev→next state, INSERTs each newly-completed quest with `ON CONFLICT DO NOTHING RETURNING quest_id`, and grants exactly one event token per *fresh* row via `grantTokenForActiveEvent()` (which picks Spring Sprint while open, then High Roller, then nothing — same logic as the dashboard banner).
3. **Token grants are no longer client-driven** — `/api/gameboard` and `/api/highroller` `action: "grant"` are now idempotent no-ops (still return the current run for client back-compat). This removes the client's ability to spam the grant endpoint.
4. **Combo clamp** — `recordCombo` clamps the claimed combo down to `COUNT(*) FROM sidequest_quest_completions WHERE completed_at > now() - interval '90 seconds'`. A bot can't fake a combo it didn't actually earn through real (ledger-recorded) completions.
5. **Daily-spin race fix** — `executeDailySpin` is now insert-first: `INSERT … ON CONFLICT DO NOTHING RETURNING user_id`. Concurrent POSTs collapse to one row, only the winner applies the prize. No SELECT-then-INSERT TOCTOU window.
6. **Per-endpoint rate limits** via `enforceRateLimit(userId, endpoint, maxPerMinute)`:
   - `spin`: 20/min
   - `combo`: 30/min
   - `gameboard`: 60/min
   - `highroller`: 60/min
   - `sidequest-save`: 60/min

`enforceRateLimit` reads `sidequest_rate_log` for the last 60s window, throws "Slow down" with a 400 if over, otherwise inserts a new row. 1% of requests trigger a GC of entries older than 10 minutes.

**Trusted callers** (bypass scrub): `unlockGameboardReward`, `unlockHighRollerReward`, `adminAwardSticker`, `adminAwardBadge`, daily-spin sticker/jackpot paths inside `applySpinPrize`, combo-badge unlock inside `recordCombo`, `reconcilePartyBoards` (party sync), starter-board creation in `loadSideQuestBoard`. All pass `{ trusted: true }`.

## Styling

**All** CSS is in a single file: `app/globals.css` (~7800 lines). No CSS modules, no Tailwind, no CSS-in-JS. The design is a neo-brutalist look (thick black borders, hard drop-shadows, yellow/red/mint/sky/pink palette via CSS variables on `:root`, uppercase 900-weight). Breakpoints: **1180 / 980 / 720 / 430 px**. When adding a component, append its styles to this file — don't create new ones.

Pro-mode CSS overrides hang off `html[data-mode="pro"]` selectors at the bottom of the file (calmer rotations, smaller shadows, less cartoony).

## Landing page: separate desktop and mobile markup

`app/page.tsx` renders **two** landings — the desktop `<main className="landing-shell landing-desktop-only">` and `<MobileLanding />` (from `app/components/mobile-landing.tsx`, class `landing-mobile-only`). CSS toggles them at 720px. If you change landing copy or CTAs, update both.

## Assets

`public/assets/` holds the brand kit (SVG logos, monograms, favicons, social images, `site.webmanifest`). All favicon/OG wiring is in `app/layout.tsx` metadata. Asset paths must start with `/` (e.g., `/assets/logo-primary.svg`).

Sticker SVGs (`sticker-bolt`, `sticker-leaf`, `sticker-shield`, `sticker-spark`, `sticker-star`, `sticker-spring-sprint`, `sticker-high-roller`) live at the `public/` root. Hand-drawn neobrutalist style — when adding new ones, match the existing thick-stroke + flat-color aesthetic.

## Conventions

- **Server components by default.** Add `"use client"` only when you need state, effects, or browser-only APIs.
- **No new files unless necessary.** The codebase deliberately keeps client files chunky (`sidequest-client.tsx` is ~1800 lines) — append to existing files rather than splitting.
- **Single CSS file** is the rule, not a smell.
- **Server-authoritative for anything competitive** — dice rolls, coin flips, spin wedge picks, combo validation all run on the server. The client just animates the result.
- **Schema migrations are inline** — add `ALTER TABLE … ADD COLUMN IF NOT EXISTS` to `ensureSideQuestSchema` rather than creating a migration file.
- **Audit every admin action** — `writeAudit()` + `createNotification()` together, both in `sidequest-db.ts`.
- **Use `t(key, mode)`** for any string that should differ between playful and pro modes. Add the entry to `COPY` in `app/lib/preferred-mode.ts`.

# SideQuest

**Real life. Quest mode.** A co-op quest board for homework, habits, clubs,
chores, and projects. Private boards, no public ranks, no follower counts —
just you, your party, and the clear screen.

Built for the Horizons hackathon. Next.js 16 App Router + Neon Postgres on
the backend, Remotion for marketing + tutorial videos, a neo-brutalist UI
(thick ink borders, offset shadows, cream paper backgrounds) with hand-drawn
SVG stickers.

---

## Quick start

```bash
# one-time
cp .env.example .env.local   # add your Neon DATABASE_URL (see below)

# dev
npm install
npm run dev                  # → http://localhost:3000

# verification before shipping
npm run typecheck
```

There are **no tests, no linter, and no pre-commit hooks**. `tsc --noEmit` is
the only gate before a deploy.

### Required env

| Name           | Purpose                                                            |
|----------------|--------------------------------------------------------------------|
| `DATABASE_URL` | Neon serverless Postgres connection string (required for all DB). |

Without it, every DB call throws immediately from `getSql()`. Put it in
`.env.local` for dev and in your Vercel project env vars for production.

The schema is **self-bootstrapping** — the first call to
`ensureSideQuestSchema()` creates every table via `CREATE TABLE IF NOT
EXISTS`, so there are no migration files to manage.

### Admin bootstrap

The **very first user to sign up is automatically made admin**. Everyone
after that joins as a `member`. To promote later, hit the DB directly:

```sql
UPDATE sidequest_users SET role = 'admin' WHERE username = 'yourname';
```

---

## Scripts

```bash
npm run dev         # Next.js dev server (port 3000)
npm run build       # production build
npm start           # run the built app
npm run typecheck   # tsc --noEmit — the only verification gate

# Remotion (marketing + tutorial videos)
npm run remotion:studio   # open Remotion Studio on the compositions
npm run remotion:still    # render a still PNG from the create-reel

# Audio (generates all click/pop/ding/music WAVs used by the videos)
node scripts/generate-audio.mjs
```

---

## What's in the box

### Personal + party boards
- Drop a quest → pick a lane (School / Creative / Health / Social / Life
  admin) → add steps → set XP → focus mode → clear.
- Parties are **server-authoritative** — backed by `sidequest_parties` and
  `sidequest_party_members`. Invite codes are validated against the DB, so
  joining a bad code errors out instead of silently creating a phantom
  party. Legacy local-only party boards auto-migrate to real DB-backed
  parties on next load.
- Confetti + sticker unlock on every clear. Streak bar for the week.
- **Signup enforces unique email + username** with friendly errors (both a
  pre-check and a DB unique-constraint fallback).

### Hall of achievements (`/achievements`)
- A sticker book (two-page folio, cream paper with ink stitching on the
  spine) showing all 6 master stickers — unlocked ones get a gloss ring +
  solid border + alt-tilts; locked ones get a dashed border + diagonal
  stripe background + "?" placeholder.
- A trophy shelf — every individual quest reward framed in ochre wood with
  an ink plaque underneath, sitting on wood-grain planks.
- 6 cute hand-drawn SVG stickers live in `public/`: Brain Star, Fresh Leaf,
  Squad Spark, Paint Flare, Done Shield, Spring Sprint. Replace them with
  your own art any time — keep the same filenames to avoid updating refs.

### Spring Sprint — Limited-time dice event (`/gameboard-ltd`)
- 26-tile loop on an 8×8 perimeter grid. Start/Finish banner spans 3 tiles
  at the top-middle with a pulsing yellow spotlight.
- Every quest you clear grants exactly one die roll (`POST /api/gameboard
  {action:"grant"}` fires from `completeQuest`).
- Rolls are **server-authoritative** — the server rolls 1–6, advances the
  pawn, applies jump/slip tile effects, and returns the step sequence.
  Client just animates the movement.
- Complete the loop → `sidequest_gameboard_runs.completed_at` is set,
  `reward-lte-spring-sprint` sticker is upserted into your reward shelf,
  LTE banner vanishes everywhere, page redirects to `/dashboard` for the
  rest of the event.
- Tutorial video auto-plays on first visit and can be replayed from the
  side panel's "Rewatch tutorial" button.

### Admin console (`/admin`, admin-only)
- All the analytics (quest counts, completion rate, weekly clears, XP,
  category momentum).
- **User management** — search, then per-user actions:
  - Award a sticker (pick art + kind + note)
  - Award a badge (6 curated: Bug Hunter, Early Adopter, Beta Tester,
    Community Hero, Quest Legend, Spring Sprint Champ)
  - Drop bonus dice (1–50 at a time)
  - Pause / unpause the account (sets `suspended_at`, kills sessions,
    redirects to `/suspended`)
  - Spectate → read-only view of their boards, rewards, gameboard run,
    streak, and notifications at `/admin/spectate/[userId]`
- **Audit trail** — every admin action writes to `sidequest_admin_audit`.
  The 25 most recent show up on the admin page.

### Notifications
- `sidequest_notifications` table + `NotificationBell` in every signed-in
  top-bar.
- Bell polls `/api/notifications` every 30s. When there's a new unread, a
  **toast overlay** slides in from the top-right with a cute bounce + pulse
  animation showing the award art + "Bonus rolls" / "Badge dropped" / etc.
  copy. Auto-dismisses after 6.5s.
- Clicking the bell opens a panel and marks everything read.

### Tutorial + ad reels (Remotion)
- `sidequest-tutorial` — 25s first-visit explainer for the gameboard.
- `sidequest-board-tutorial` — 25s first-visit explainer for the main board
  (different outro: venetian-blind shutter close).
- `sidequest-intro` — 25s optional product intro for the landing page
  (different outro: camera-iris close).
- `sidequest-spring` — 30s silent Spring Sprint reel designed for
  voiceover.
- `sidequest-spring-loud` — 30s Spring Sprint reel with music bed + SFX.
- `sidequest-ad` — 10s quick ad.
- `sidequest-morph` — 5s seamless loop of the ticket logo morphing into the
  star monogram, plays on the 404 page.

Each tutorial uses the shared `TutorialPlayer` component, which watches
`timeupdate` and triggers its own scale+fade dismiss in the last 1.2s in
sync with the video's outro animation.

### 404
- `app/not-found.tsx` shows the morph loop in a tilted ink-bordered frame
  with a cute "This page took a side quest" message and buttons back to the
  dashboard / board / landing.

---

## Architecture

### Stack

- **Next.js 16** App Router, **React 19**, TypeScript strict mode (only
  gate is `npm run typecheck`).
- **Neon serverless Postgres** via `@neondatabase/serverless`, accessed
  through a lazily-initialized singleton in `app/lib/sidequest-db.ts`.
- **Remotion 4** for tutorial, ad, and loop videos. Compositions live in
  `remotion/`, playback uses `@remotion/player` inside
  `app/components/feature-videos.tsx` on the landing.

### Data flow

`app/seed-data.ts` defines every shared type (`Quest`, `Reward`,
`SideQuestState`, `Category`, …) plus `makeStarterState()` and
`mergeWithStarterState()`. It is the single source of truth imported by
both client (`sidequest-client.tsx`) and server (`lib/sidequest-db.ts`, api
routes). **If you change a shape, touch both sides.**

The personal board lifecycle:
1. `app/board/page.tsx` calls `requireUser()` then renders
   `<SideQuestClient isAdmin={...} />`.
2. Client fetches `GET /api/sidequest` on mount → `loadSideQuestBoard`.
   `loadSideQuestBoard` **reconciles party boards** with the canonical
   `sidequest_parties` table (drops invalid ones, migrates orphaned
   local-only parties, appends any parties the user joined on another
   device).
3. Every client mutation optimistically updates local state then PUTs the
   full state to `/api/sidequest` with an `eventType` string.
4. `saveSideQuestBoard` **propagates party edits** by fanning each party
   board in `state.boards` out to the corresponding
   `sidequest_parties.state` row — so other members see the change on
   refresh.

### Auth

Cookie-based sessions — no Next.js auth library.

- `app/lib/auth.ts` exposes:
  - `getCurrentUser()` — returns `AuthUser | null`, no redirect
  - `requireUser()` — redirects to `/login` if anon, `/suspended` if paused
  - `requireAdmin()` — adds a `role === "admin"` check; redirects to
    `/dashboard?admin=required` otherwise
- Passwords: `pbkdf2_sha256` with 120k iterations, stored as
  `method$iter$salt$hash`. Session tokens are sha256-hashed before storage.
- Cookie name: `sidequest_session`.

### Styling

**All CSS is in one file**: `app/globals.css` (~4500 lines). No CSS
modules, no Tailwind, no CSS-in-JS. Append new component styles to this
file rather than creating a new one.

Design tokens (palette + shadow) live on `:root`:

```css
--ink: #171512;       --paper: #f8efd9;
--surface: #fffaf0;   --paper-deep: #eadbb9;
--red: #ff5a3d;       --yellow: #ffd43d;
--mint: #44d7a8;      --sky: #5fc7f2;
--pink: #ff78b7;      --blue: #4667ff;
--shadow: 5px 5px 0 var(--ink);
```

Breakpoints: `1180 / 980 / 720 / 430` px.

### Route map

| Path                              | Who             | What                                           |
|-----------------------------------|-----------------|------------------------------------------------|
| `/`                               | anyone          | Landing (desktop + mobile), optional intro    |
| `/signup`                         | anon            | Account creation                              |
| `/login`                          | anon            | Sign in                                        |
| `/dashboard`                      | signed-in       | Personal hub + stats + LTE banner             |
| `/board`                          | signed-in       | The full quest board (solo + party)           |
| `/achievements`                   | signed-in       | Hall of achievements (sticker book + trophies)|
| `/gameboard-ltd`                  | signed-in       | Spring Sprint dice event                       |
| `/suspended`                      | anyone          | Shown when your account is paused             |
| `/admin`                          | admin           | Admin console                                  |
| `/admin/spectate/[userId]`        | admin           | Read-only view of another user's state        |
| `/404` (anything unknown)         | anyone          | Morph-loop 404 page                           |

### API

| Method | Path                          | Purpose                                                |
|--------|-------------------------------|--------------------------------------------------------|
| POST   | `/api/signup`                 | Create account, set session cookie                    |
| POST   | `/api/login`                  | Sign in                                                |
| POST   | `/api/logout`                 | Sign out                                               |
| GET    | `/api/sidequest`              | Load signed-in user's board state                     |
| PUT    | `/api/sidequest`              | Save board state + fan out party edits                |
| POST   | `/api/party/create`           | Create a new party (generates unique invite code)     |
| POST   | `/api/party/join`             | Join an existing party (validates code)               |
| GET    | `/api/gameboard`              | Load Spring Sprint run                                 |
| POST   | `/api/gameboard`              | `{action: "grant" \| "roll"}` — grant or use a roll   |
| GET    | `/api/notifications`          | List user's notifications + unread count              |
| PATCH  | `/api/notifications`          | `{action: "mark-read" \| "mark-all-read"}`            |
| GET    | `/api/admin/users`            | (admin) list all users with stats                     |
| POST   | `/api/admin/actions`          | (admin) suspend / unsuspend / award sticker/badge/dice|
| GET    | `/api/admin/analytics`        | (admin) analytics snapshot                            |

### Database schema

All auto-created by `ensureSideQuestSchema(sql)` on first DB call.

| Table                          | Purpose                                                         |
|--------------------------------|-----------------------------------------------------------------|
| `sidequest_users`              | Accounts (password, role, stats, suspension fields)             |
| `sidequest_sessions`           | Cookie sessions (hashed tokens)                                 |
| `sidequest_boards`             | Each user's full state as `jsonb` keyed by `user:${userId}`     |
| `sidequest_board_events`       | Analytics event log                                             |
| `sidequest_parties`            | Canonical party: invite code PK + title + owner + state jsonb   |
| `sidequest_party_members`      | Who is in each party (+ role)                                   |
| `sidequest_gameboard_runs`     | Per-user state for the Spring Sprint event                      |
| `sidequest_gameboard_events`   | Roll / grant / completion audit                                 |
| `sidequest_notifications`      | Toasts: kind, title, body, payload, read_at                     |
| `sidequest_admin_audit`        | Every admin action (suspend, award, etc.)                       |

### Directory tour

```
hcp/
├── app/
│   ├── lib/
│   │   ├── auth.ts                 # session helpers, requireUser, requireAdmin
│   │   ├── sidequest-db.ts         # schema + every DB helper
│   │   ├── gameboard-config.ts     # Spring Sprint tile layout
│   │   └── badge-catalog.ts        # admin-awardable badges
│   ├── components/
│   │   ├── feature-videos.tsx      # landing reels via @remotion/player
│   │   ├── lte-banner.tsx          # Spring Sprint banner
│   │   ├── tutorial-player.tsx     # custom video player w/ synced dismiss
│   │   ├── notification-bell.tsx   # bell + toast animation
│   │   ├── intro-trigger.tsx       # "Watch the intro" button for landing
│   │   └── mobile-landing.tsx      # mobile-only landing markup
│   ├── api/                        # route handlers (see table above)
│   ├── sidequest-client.tsx        # the giant board client (~1800 lines)
│   ├── admin/
│   │   ├── page.tsx                # admin console
│   │   ├── admin-user-panel.tsx    # user table + action modals (client)
│   │   └── spectate/[userId]/     # read-only spectator view
│   ├── dashboard/ board/ achievements/ gameboard-ltd/ suspended/
│   ├── seed-data.ts                # shared types + starter state
│   ├── globals.css                 # the one CSS file
│   └── layout.tsx
├── remotion/
│   ├── Root.tsx                    # composition registry
│   ├── SideQuestAdReel.tsx         # 10s ad
│   ├── SideQuestSpringReel.tsx     # 30s Spring Sprint (silent, for VO)
│   ├── SideQuestSpringLoudReel.tsx # 30s Spring Sprint (music + SFX)
│   ├── SideQuestTutorialReel.tsx   # 25s gameboard tutorial
│   ├── SideQuestBoardTutorialReel.tsx   # 25s /board tutorial
│   ├── SideQuestIntroReel.tsx      # 25s landing intro
│   ├── SideQuestMorphLoop.tsx      # 5s 404 loop
│   └── SideQuestFeatureReel.tsx    # 3 short feature reels on landing
├── public/
│   ├── sticker-*.svg               # the six cute sticker designs
│   ├── assets/                     # logos, favicons, social
│   ├── sidequest-*.mp4             # rendered videos
│   ├── *.wav                       # generated audio
│   └── sidequest-map.png
├── scripts/
│   └── generate-audio.mjs          # pure-Node WAV generator
└── package.json
```

---

## Audio generation

`scripts/generate-audio.mjs` is a pure-Node WAV generator — no ffmpeg
required. Re-run any time:

```bash
node scripts/generate-audio.mjs
```

Produces:

| File                         | Use                                         |
|------------------------------|---------------------------------------------|
| `public/click.wav`           | 45ms punchy click for button presses        |
| `public/pop.wav`             | 220ms pitch-sweep pop for reveals/confetti  |
| `public/ding.wav`            | 600ms C6/E6/G6 triad chime for completions  |
| `public/whoosh.wav`          | 420ms filtered-noise sweep for transitions  |
| `public/thud.wav`            | 280ms sub-sine impact for heavy landings    |
| `public/bg-pulse.wav`        | 10s ambient loop (Am→C pad + soft kick)     |
| `public/spring-bed.wav`      | 30s Am-F-C-G progression + drop + hook      |
| `public/tutorial-bed.wav`    | 25s warm pad + heartbeat kick + chimes      |

All 16-bit PCM, 44.1 kHz, mono.

---

## Rendering videos

```bash
npm run remotion:studio     # open studio, edit in realtime

# render a single composition from the CLI
npx remotion render remotion/index.ts <composition-id> public/<name>.mp4 \
    --codec=h264 --scale=1
```

Composition IDs: `sidequest-ad`, `sidequest-spring`,
`sidequest-spring-loud`, `sidequest-tutorial`, `sidequest-board-tutorial`,
`sidequest-intro`, `sidequest-morph`, `sidequest-create-reel`,
`sidequest-party-reel`, `sidequest-reward-reel`.

All outputs land in `public/` and get served at their root URL (e.g.
`http://localhost:3000/sidequest-intro.mp4`).

---

## Deployment (Vercel)

The app lives in `hcp/` inside the monorepo root, so Vercel's project
**Root Directory must be set to `hcp`** (Settings → General → Root
Directory). If you deploy from the repo root without that, `next build`
fails with "Couldn't find any `pages` or `app` directory."

1. Import the repo into Vercel.
2. Set Root Directory = `hcp`.
3. Add `DATABASE_URL` in Environment Variables (Production + Preview).
4. Deploy.

The Neon schema bootstraps itself on first request, so there's no
pre-deploy migration step.

---

## Conventions worth knowing

- **One CSS file.** Append styles to `app/globals.css` under a new
  `=====` comment section, matching the existing neo-brutalist idioms
  (thick ink borders, offset shadows, rotations in ±2°).
- **Types live in `app/seed-data.ts`.** Client and server both import from
  it. Don't duplicate shapes.
- **Every admin action writes an audit row.** Add yours to the `action`
  switch in `app/api/admin/actions/route.ts` and call `writeAudit()`
  inside the helper in `sidequest-db.ts`.
- **Notifications are the UX hook** for any new award/suspend/etc. —
  `createNotification(userId, {kind, title, body, payload})` and the bell
  + toast pick it up automatically.
- **Asset paths start with `/`** — e.g. `/assets/logo-primary.svg`, not
  `assets/...`, or they'll break on sub-routes.
- **No tests, no linter, no pre-commit hooks.** `npm run typecheck` is the
  gate. Run it before every commit.

---

## Credits

Built for the Horizons hackathon. Neo-brutalist design system by the
SideQuest team. Hand-drawn sticker SVGs, Remotion compositions, and
Node-generated music are all in-repo — nothing is fetched at runtime.

Real life. Quest mode.

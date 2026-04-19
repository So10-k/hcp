# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where the app lives

The Next.js app is in `hcp/` — the repo root (`/Users/samuelotten/Downloads/hackclub/`) only contains that one folder. Run all commands from `hcp/`.

## Commands

```bash
npm run dev         # Next.js dev server (http://localhost:3000)
npm run build       # production build
npm start           # run built app
npm run typecheck   # tsc --noEmit — the only type-check gate; there is no ESLint or test suite
npm run remotion:studio                # open Remotion Studio on remotion/ compositions
npm run remotion:still                 # render a still PNG from the create-reel composition
```

There are no tests, no linter, and no pre-commit hooks. `npm run typecheck` is the only verification step before shipping.

## Required env

`DATABASE_URL` — Neon serverless Postgres connection string. Without it, every DB call throws immediately (`getSql()` in `app/lib/sidequest-db.ts`). Put it in `.env.local` for dev. The schema is self-bootstrapping: `ensureSideQuestSchema()` creates every table (`sidequest_boards`, `sidequest_board_events`, `sidequest_users`, `sidequest_sessions`) on first call via `CREATE TABLE IF NOT EXISTS`, so there are no migration files to manage.

## Architecture

### Stack
- **Next.js 16** App Router, **React 19**, TypeScript. All pages are Server Components except `sidequest-client.tsx` and `components/feature-videos.tsx`.
- **Neon serverless Postgres** (`@neondatabase/serverless`) — accessed via a lazily-initialized singleton in `app/lib/sidequest-db.ts`.
- **Remotion 4** — feature-reel videos. Compositions in `remotion/`, played in-browser via `@remotion/player` on the landing page.

### Data flow
`app/seed-data.ts` defines all shared types (`Quest`, `Reward`, `SideQuestState`, `Category`, …) plus `makeStarterState()` and `mergeWithStarterState()`. It is the single source of truth imported by both client (`sidequest-client.tsx`) and server (`lib/sidequest-db.ts`, api routes). If you change the shape, touch both sides.

The board lifecycle:
1. `app/board/page.tsx` (server) calls `requireUser()` then renders `<SideQuestClient />`.
2. The client fetches `GET /api/sidequest` on mount, which calls `loadSideQuestBoard(user.id)`. If no row exists, the starter state is returned.
3. Every mutation in the client (create quest, complete, focus, etc.) optimistically updates local state and PUTs the full state back to `/api/sidequest` with an `eventType` string, which calls `saveSideQuestBoard`. State is stored as `jsonb` keyed by `user.id`; events are appended to `sidequest_board_events` for analytics.
4. `app/admin/page.tsx` calls `getSideQuestAnalytics()` which aggregates across all boards and events.

Almost the entire interactive UI (~1700 lines: board, quest wizard, focus mode, rewards shelf, modals, confetti) lives in the single client component `app/sidequest-client.tsx`. When adding features, expect to edit that file.

### Auth
Cookie-based sessions — no Next.js auth library.
- `app/lib/auth.ts` exposes `getCurrentUser()`, `requireUser()` (redirects to `/login`), `requireAdmin()` (redirects to `/dashboard?admin=required`). Use these at the top of every protected server component or route handler.
- Passwords are `pbkdf2_sha256` with 120k iterations, stored as `method$iter$salt$hash`. Session tokens are sha256-hashed before being stored.
- The cookie name is `sidequest_session` (`SESSION_COOKIE` constant).
- API routes that need the user: `app/api/{login,logout,signup,sidequest}/route.ts` and `app/api/admin/analytics/`.

### Styling
**All** CSS is in a single file: `app/globals.css` (~3700 lines). No CSS modules, no Tailwind, no CSS-in-JS. The design is a neo-brutalist look (thick black borders, hard drop-shadows, yellow/red/mint/sky/pink palette via CSS variables on `:root`). Breakpoints are `1180 / 980 / 720 / 430` px. When adding a component, append its styles to this file rather than creating a new one.

### Landing page: separate desktop and mobile markup
`app/page.tsx` renders **two** landings — the desktop `<main className="landing-shell landing-desktop-only">` and `<MobileLanding />` (from `app/components/mobile-landing.tsx`, class `landing-mobile-only`). CSS toggles them at 720px: desktop is `display: none !important` below, mobile is `display: none` above. If you change landing copy or CTAs, update both. The mobile version is scoped under `.mobile-*` class names and does not share styles with the desktop hero.

### Assets
`public/assets/` holds the brand kit: SVG logos (`logo-primary`, `logo-reverse`, `logo-boss`, `logo-cleared`, `logo-alt-pill`), monograms, a favicon set (`favicon/favicon-{16..512}.png`), social images (`social/og-1200x630.png`, banners, avatars), and `site.webmanifest`. All favicon/OG wiring is in `app/layout.tsx` metadata — add new icons there, not with `<link>` tags. Asset paths must start with `/` (e.g., `/assets/logo-primary.svg`), not `assets/…`, or they'll break on sub-routes.

Sticker PNGs (`sticker-bolt`, `sticker-leaf`, `sticker-shield`, `sticker-spark`, `sticker-star`) and `sidequest-map.png` live at the `public/` root, not under `assets/`.

### Remotion
`remotion/Root.tsx` registers three compositions (`sidequest-create-reel`, `sidequest-party-reel`, `sidequest-reward-reel`), all backed by `SideQuestFeatureReel.tsx` with a `variant` prop. The web playback uses `@remotion/player` inside `app/components/feature-videos.tsx`. `acknowledgeRemotionLicense` is set on the Player — keep it. Rendering stills/videos from CLI uses `remotion/index.ts` as the entry point.

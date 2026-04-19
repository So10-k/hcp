# SideQuest — Feature & Event Brainstorm

A running catalog of features and limited-time events that lean into the
aesthetic + addictive side of the product. Items marked **✅ shipped** are
already live; everything else is fair game for future cuts.

The bar for shipping: must look amazing in the neo-brutalist palette, must
feel slightly addictive (variable reward, FOMO, surprise, escalation), and
must have a clear admin control surface.

---

## Already shipped

- ✅ Spring Sprint dice board (LTE event with auto-banner + reward)
- ✅ High Roller coin tower (post-sprint follow-up event, pure luck)
- ✅ Hall of Achievements (sticker book + framed trophy shelf)
- ✅ Notification bell with toast animations
- ✅ Admin panel: suspend / award sticker / award badge / award dice /
  award flips / fast-forward event / reset event / spectate
- ✅ Per-event tutorial videos with synced player dismiss
- ✅ Tickets-to-star morph 404 page
- ✅ Daily Spin (this PR)
- ✅ Quest Combo Multiplier (this PR)

---

## Permanent additive features (not LTE)

### A. Daily mechanics
- **Daily Spin** ✅ — once-per-day wheel of fortune. Eight weighted wedges:
  XP boosts, dice, flips, random sticker, jackpot badge. Server-authoritative.
  Admin can force-grant a spin.
- **Daily Brief** — auto-generated short text every morning: "You cleared 3
  yesterday. Today's lane suggestion: Health." Powered by static templates
  + the user's recent activity. Cute typewriter reveal on the dashboard.
- **Login streak** — a flame icon that grows for consecutive day logins.
  At 7 / 30 / 100 days, drops a streak badge. Breaks if you skip a day —
  one "freeze token" per month to skip a single day without losing the streak.

### B. Quest-loop addictions
- **Quest Combo Multiplier** ✅ — clearing quests within a 90s window builds
  a combo. Floating Tony-Hawk-style overlay escalates with size / glow.
  Server records peak combo per user. Auto-badges at 5x and 10x.
- **Hot card aura** — when on a 5+ combo, your next quest card visually
  gets a holographic shimmer (animated CSS gradient). Pure cosmetic, very
  shareable.
- **Mystery Drops** — each quest completion has a tiny chance (~3%) of
  rolling a "drop" — a one-of-a-kind reward sticker with a unique glyph.
  Server-side drop table; rarities color-coded.
- **XP → Levels** — accumulating XP gives you levels (slow curve). Each
  level unlocks a new board-frame color or pawn skin. Visible "LV 12"
  badge in the topbar.
- **Quest cards as collectible loot** — each completed quest mints a
  loot card (common/uncommon/rare/holo) into your binder. The binder is
  a separate page that pages through your collection like a Pokemon card
  album.

### C. Co-op / social
- **Rivalries (Duels)** — pick a party member, set a 24h duel. First to
  clear N quests wins a unique trophy. Loser gets a consolation sticker.
  Daily limit of one open duel per user.
- **Quest pen pals** — leave a short handwritten-style note on a friend's
  cleared quest. Notes show up in the recipient's activity feed.
- **Squad emblem** — a party can vote on a 3-emoji emblem that appears on
  every party member's profile chip.
- **Co-op clear bonus** — if two party members clear quests within 5 min
  of each other, both get a small reward.

### D. Customization / vanity
- **Pawn skins** — unlock new pawn looks (rocket, dog, ghost, robot)
  via specific badges. Set your active skin from a profile menu.
- **Board themes** — change the cream/ink palette of your board to
  named themes (Sunset, Mint, Midnight). Themes drop from special events.
- **Card stickers** — drag stickers onto your quest cards as decoration.
  Pure cosmetic, encourages collection.
- **Profile frames** — your dashboard avatar gets a frame (gold / mint /
  pink / etc) tied to your level or current event status.

### E. Pet companion (long-term play)
- **Quest pal** — adopt a tamagotchi-style mascot that hatches from an
  egg. Each completed quest feeds it. Evolves through stages: Seed →
  Sprout → Bloom → Mythic. Different outcomes based on lane mix.
- **Pet trades** — late-stage pets can leave gifts on your party board.

---

## Limited-time events

Each LTE follows the same shape: server table for state, banner that
auto-surfaces, completion drops a unique badge, admin can fast-forward /
reset / award tokens.

### Already in the codebase
- ✅ Spring Sprint (dice board, 26 tiles)
- ✅ High Roller (coin tower, 10 rungs, soft-bust)

### Seasonal events to build
- **Halloween Boss Battle** (October) — community goal: clear N collective
  quests to defeat the Pumpkin King. Each user contributes; a giant boss
  HP bar drops to 0 by end of month. Personal reward for participation,
  collective reward if the boss falls. Spooky orange/purple palette.
- **Winter Snow Day** (December) — collect snowflake stickers from random
  drops. Build your snowman by combining 7 unique flakes. Rare snowflake
  drops at low odds. Cool blue palette.
- **Valentine Quest Crush** (February) — opt in with a partner. Both
  partners clear quests synchronously to fill a heart meter. Couple
  badge for the duo when full.
- **Summer Solstice Bonfire** (June) — feed quest completions to a
  bonfire to keep it lit through the longest day of the year. Visual:
  a literal fire sprite that grows / shrinks. Bonfire goes out if no
  one feeds it for 6h.
- **April Fools Mystery Box** — every Friday in April, a mystery box
  drops at log-in. Could be: legitimate prize, joke prize ("you won a
  thumbs-up emoji!"), or a real rare badge.

### Mini-event templates (admins create on demand)
- **Weekend Boost** — 2× XP from clearing quests in a specific lane.
  Admin sets which lane and which weekend.
- **Bug Hunter Bounty** — admin posts a custom challenge ("Find an issue
  in our docs"). First N to claim and prove get the Bug Hunter badge.
- **Surprise Sticker Drop** — admin drops a custom sticker into every
  active user's shelf at once. Visual: a wave of toast notifications
  rippling through the user base.
- **Triple Roll Day** — 24h window where every quest completion grants
  3 rolls instead of 1. Admin can pin to a specific date.

---

## Admin meta-features (powering all of the above)

- **Event scheduler** — generic table `sidequest_lte_events` with
  start/end timestamps, payload jsonb, status. Admin creates a new event
  from the panel, picks a template (boss-battle, mystery-drop, etc),
  fills in the parameters. Replaces the current hardcoded event configs.
- **Reward presets** — admin saves frequently-used custom stickers as
  "presets" so they don't have to retype the title/note/art each time.
- **Targeting** — every admin action gets an optional "target group"
  picker: all users, party members of X, users active in last N days,
  users with role X, etc.
- **Schedule push** — schedule a one-shot admin action to fire at a
  specific datetime ("everyone gets +1 dice at 9am Friday"). Stored in
  `sidequest_admin_schedule` with a tiny serverless cron picking it up.
- **Per-event leaderboard (private)** — admins can see who finished
  fastest for any LTE. Not public — just gives admins a sense of the
  difficulty curve and who to spotlight.
- **Audit search** — filter the admin audit log by action / date / target
  user. Currently shows the last 25 unfiltered.

---

## What ships in this cut

1. **Daily Spin** — full feature. Wheel of fortune with 8 weighted prize
   wedges. Once per day per user. Banner auto-appears on dashboard if
   today's spin is unclaimed. Admin can force a spin or reset the daily
   counter.
2. **Quest Combo Multiplier** — clear quests within 90s to build a combo.
   Floating overlay escalates with size + glow. Server records peak combo;
   auto-unlocks "Combo King" badge at 5x and 10x. Admin can reset peak.
3. **Admin controls** — new "Spin" and "Combo" buttons in the admin user
   panel. Spin status column in the user table.

Future cuts can pull directly from this doc. Order roughly by impact:
**login streak → Halloween boss → mystery drops → loot binder → pawn skins**.

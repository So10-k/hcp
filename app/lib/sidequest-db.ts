import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  categoryMeta,
  categoryOptions,
  makeStarterState,
  mergeWithStarterState,
  PERSONAL_BOARD_ID,
  type Category,
  type Reward,
  type SideQuestBoard,
  type SideQuestState,
  type SideQuestUser
} from "../seed-data";
import {
  GAMEBOARD_EVENT_ID,
  GAMEBOARD_LENGTH,
  GAMEBOARD_REWARD_ID,
  GAMEBOARD_REWARD_IMAGE,
  GAMEBOARD_REWARD_NOTE,
  GAMEBOARD_REWARD_TITLE,
  GAMEBOARD_TILES
} from "./gameboard-config";
import {
  HIGHROLLER_EVENT_ID,
  HIGHROLLER_REWARD_ID,
  HIGHROLLER_REWARD_IMAGE,
  HIGHROLLER_REWARD_NOTE,
  HIGHROLLER_REWARD_TITLE,
  HIGHROLLER_RUNG_COUNT,
  HIGHROLLER_SOFT_BUST_DROP,
  HIGHROLLER_SOFT_BUST_THRESHOLD
} from "./highroller-config";
import {
  COMBO_BADGE_THRESHOLDS,
  pickRandomSpinSticker,
  pickSpinPrize,
  SPIN_BADGE_JACKPOT,
  SPIN_PRIZES,
  todayKey,
  type SpinPrize
} from "./daily-spin-config";

type Sql = NeonQueryFunction<false, false>;

export type BoardLoadResult = {
  databaseReady: true;
  state: SideQuestState;
  updatedAt: string;
};

export type CategoryAnalytics = {
  category: Category;
  label: string;
  total: number;
  completed: number;
  xp: number;
  averageProgress: number;
};

export type AnalyticsSnapshot = {
  databaseReady: true;
  updatedAt: string;
  totalQuests: number;
  activeQuests: number;
  completedQuests: number;
  completionRate: number;
  averageProgress: number;
  totalXp: number;
  weeklyClears: number;
  rewardsUnlocked: number;
  partyMembers: number;
  totalUsers: number;
  adminUsers: number;
  teenUsers: number;
  userInfo: SideQuestUser[];
  categoryBreakdown: CategoryAnalytics[];
  recentActivity: SideQuestState["activity"];
  streak: SideQuestState["streak"];
};

export const DEFAULT_BOARD_ID = "primary-party-board";

let sqlClient: Sql | null = null;
let schemaPromise: Promise<void> | null = null;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "member" | "admin";
  favoriteCategory: Category;
  suspendedAt: string | null;
  suspendedReason: string | null;
};

export type SignUpInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  favoriteCategory: Category;
};

export type LoginInput = {
  usernameOrEmail: string;
  password: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  password_hash?: string | null;
  role: string;
  age_range: string;
  school_year: string;
  favorite_category: string;
  board_role: string;
  quests_created: number;
  quests_completed: number;
  joined_at: Date | string;
  last_active_at: Date | string;
  suspended_at?: Date | string | null;
  suspended_reason?: string | null;
  suspended_by?: string | null;
};

export function getSql() {
  if (sqlClient) {
    return sqlClient;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for SideQuest. Add your Neon connection string to .env.local and Vercel env vars.");
  }

  sqlClient = neon(databaseUrl);
  return sqlClient;
}

export async function ensureSideQuestSchema(sql: Sql = getSql()) {
  schemaPromise ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_boards (
        id text PRIMARY KEY,
        state jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_board_events (
        id bigserial PRIMARY KEY,
        board_id text NOT NULL,
        event_type text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_users (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        username text,
        password_hash text,
        role text NOT NULL DEFAULT 'member',
        age_range text NOT NULL DEFAULT '13-18',
        school_year text NOT NULL DEFAULT 'student',
        favorite_category text NOT NULL DEFAULT 'school',
        board_role text NOT NULL DEFAULT 'quester',
        quests_created integer NOT NULL DEFAULT 0,
        quests_completed integer NOT NULL DEFAULT 0,
        joined_at timestamptz NOT NULL DEFAULT now(),
        last_active_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE sidequest_users ADD COLUMN IF NOT EXISTS username text`;
    await sql`ALTER TABLE sidequest_users ADD COLUMN IF NOT EXISTS password_hash text`;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS sidequest_users_username_unique
      ON sidequest_users (lower(username))
      WHERE username IS NOT NULL
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_sessions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES sidequest_users(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS sidequest_sessions_user_id_idx
      ON sidequest_sessions (user_id)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_gameboard_runs (
        user_id text NOT NULL REFERENCES sidequest_users(id) ON DELETE CASCADE,
        event_id text NOT NULL,
        position integer NOT NULL DEFAULT 0,
        rolls_earned integer NOT NULL DEFAULT 0,
        rolls_used integer NOT NULL DEFAULT 0,
        laps integer NOT NULL DEFAULT 0,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, event_id)
      )
    `;
    await sql`
      ALTER TABLE sidequest_gameboard_runs
        ADD COLUMN IF NOT EXISTS peak_position integer NOT NULL DEFAULT 0
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_gameboard_events (
        id bigserial PRIMARY KEY,
        user_id text NOT NULL,
        event_id text NOT NULL,
        event_type text NOT NULL,
        payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS sidequest_gameboard_events_user_idx
      ON sidequest_gameboard_events (user_id, event_id)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_parties (
        invite_code text PRIMARY KEY,
        title text NOT NULL,
        owner_id text NOT NULL REFERENCES sidequest_users(id) ON DELETE CASCADE,
        state jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_party_members (
        invite_code text NOT NULL REFERENCES sidequest_parties(invite_code) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES sidequest_users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'member',
        joined_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (invite_code, user_id)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS sidequest_party_members_user_idx
      ON sidequest_party_members (user_id)
    `;
    await sql`
      ALTER TABLE sidequest_users ADD COLUMN IF NOT EXISTS suspended_at timestamptz
    `;
    await sql`
      ALTER TABLE sidequest_users ADD COLUMN IF NOT EXISTS suspended_reason text
    `;
    await sql`
      ALTER TABLE sidequest_users ADD COLUMN IF NOT EXISTS suspended_by text
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_notifications (
        id bigserial PRIMARY KEY,
        user_id text NOT NULL REFERENCES sidequest_users(id) ON DELETE CASCADE,
        kind text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        payload jsonb,
        awarded_by text,
        created_at timestamptz NOT NULL DEFAULT now(),
        read_at timestamptz
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS sidequest_notifications_user_idx
      ON sidequest_notifications (user_id, created_at DESC)
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_admin_audit (
        id bigserial PRIMARY KEY,
        admin_id text NOT NULL,
        target_user_id text,
        action text NOT NULL,
        payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sidequest_daily_spins (
        user_id text NOT NULL REFERENCES sidequest_users(id) ON DELETE CASCADE,
        date_key text NOT NULL,
        prize_id text NOT NULL,
        prize_kind text NOT NULL,
        prize_amount integer NOT NULL DEFAULT 0,
        spun_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, date_key)
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS sidequest_daily_spins_user_idx
      ON sidequest_daily_spins (user_id, spun_at DESC)
    `;
    await sql`
      ALTER TABLE sidequest_users
        ADD COLUMN IF NOT EXISTS peak_combo integer NOT NULL DEFAULT 0
    `;
    await sql`
      ALTER TABLE sidequest_users
        ADD COLUMN IF NOT EXISTS total_combos integer NOT NULL DEFAULT 0
    `;
  })();

  return schemaPromise;
}

export type GameboardRun = {
  userId: string;
  eventId: string;
  position: number;
  rollsEarned: number;
  rollsUsed: number;
  rollsAvailable: number;
  laps: number;
  peakPosition: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GameboardRollResult = {
  run: GameboardRun;
  value: number;
  steps: number[];
  effect: "forward" | "back" | null;
  reachedFinish: boolean;
  newlyCompleted: boolean;
  rewardId: string | null;
};

type GameboardRunRow = {
  user_id: string;
  event_id: string;
  position: number;
  rolls_earned: number;
  rolls_used: number;
  laps: number;
  peak_position: number;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function toGameboardRun(row: GameboardRunRow): GameboardRun {
  return {
    userId: row.user_id,
    eventId: row.event_id,
    position: row.position,
    rollsEarned: row.rolls_earned,
    rollsUsed: row.rolls_used,
    rollsAvailable: Math.max(0, row.rolls_earned - row.rolls_used),
    laps: row.laps,
    peakPosition: row.peak_position ?? row.position ?? 0,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

async function ensureGameboardRun(userId: string, eventId: string): Promise<GameboardRun> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  await sql`
    INSERT INTO sidequest_gameboard_runs (user_id, event_id)
    VALUES (${userId}, ${eventId})
    ON CONFLICT (user_id, event_id) DO NOTHING
  `;
  const rows = (await sql`
    SELECT user_id, event_id, position, rolls_earned, rolls_used, laps,
           peak_position, completed_at, created_at, updated_at
    FROM sidequest_gameboard_runs
    WHERE user_id = ${userId} AND event_id = ${eventId}
    LIMIT 1
  `) as GameboardRunRow[];
  return toGameboardRun(rows[0]);
}

export async function getGameboardRun(userId: string, eventId: string = GAMEBOARD_EVENT_ID): Promise<GameboardRun> {
  return ensureGameboardRun(userId, eventId);
}

export async function grantGameboardRoll(userId: string, eventId: string = GAMEBOARD_EVENT_ID): Promise<GameboardRun> {
  const sql = getSql();
  const current = await ensureGameboardRun(userId, eventId);
  if (current.completedAt) {
    return current;
  }
  const rows = (await sql`
    UPDATE sidequest_gameboard_runs
    SET rolls_earned = rolls_earned + 1, updated_at = now()
    WHERE user_id = ${userId} AND event_id = ${eventId} AND completed_at IS NULL
    RETURNING user_id, event_id, position, rolls_earned, rolls_used, laps,
              peak_position, completed_at, created_at, updated_at
  `) as GameboardRunRow[];
  await sql`
    INSERT INTO sidequest_gameboard_events (user_id, event_id, event_type)
    VALUES (${userId}, ${eventId}, 'roll-granted')
  `;
  return rows[0] ? toGameboardRun(rows[0]) : current;
}

async function unlockGameboardReward(userId: string) {
  const board = await loadSideQuestBoard(userId);
  if (board.state.rewards.some((item) => item.id === GAMEBOARD_REWARD_ID)) {
    return;
  }
  const reward: Reward = {
    id: GAMEBOARD_REWARD_ID,
    title: GAMEBOARD_REWARD_TITLE,
    kind: "sticker",
    image: GAMEBOARD_REWARD_IMAGE,
    unlocked: true,
    note: GAMEBOARD_REWARD_NOTE
  };
  const nextState: SideQuestState = {
    ...board.state,
    rewards: [reward, ...board.state.rewards]
  };
  await saveSideQuestBoard(userId, nextState, "lte-reward-unlocked");
}

export async function executeGameboardRoll(userId: string, eventId: string = GAMEBOARD_EVENT_ID): Promise<GameboardRollResult> {
  const sql = getSql();
  const current = await ensureGameboardRun(userId, eventId);

  if (current.completedAt) {
    throw new Error("You have already completed this event.");
  }
  if (current.rollsAvailable <= 0) {
    throw new Error("No rolls available — complete a quest to earn one.");
  }

  const value = 1 + Math.floor(Math.random() * 6);
  const steps: number[] = [];
  let pos = current.position;
  let laps = current.laps;

  for (let i = 0; i < value; i += 1) {
    pos = (pos + 1) % GAMEBOARD_LENGTH;
    if (pos === 0) laps += 1;
    steps.push(pos);
  }

  const landed = GAMEBOARD_TILES[pos];
  let effect: "forward" | "back" | null = null;
  if (landed.kind === "forward") {
    pos = (pos + 1) % GAMEBOARD_LENGTH;
    if (pos === 0) laps += 1;
    steps.push(pos);
    effect = "forward";
  } else if (landed.kind === "back") {
    pos = (pos - 1 + GAMEBOARD_LENGTH) % GAMEBOARD_LENGTH;
    steps.push(pos);
    effect = "back";
  }

  const reachedFinish = steps.includes(0);

  await sql`
    UPDATE sidequest_gameboard_runs
    SET position = ${pos},
        rolls_used = rolls_used + 1,
        laps = ${laps},
        updated_at = now()
    WHERE user_id = ${userId} AND event_id = ${eventId}
  `;

  let newlyCompleted = false;
  if (reachedFinish) {
    const completionRows = (await sql`
      UPDATE sidequest_gameboard_runs
      SET completed_at = now()
      WHERE user_id = ${userId} AND event_id = ${eventId} AND completed_at IS NULL
      RETURNING user_id
    `) as Array<{ user_id: string }>;
    newlyCompleted = completionRows.length > 0;
  }

  await sql`
    INSERT INTO sidequest_gameboard_events (user_id, event_id, event_type, payload)
    VALUES (
      ${userId},
      ${eventId},
      ${reachedFinish ? "roll-finish" : "roll"},
      ${JSON.stringify({ value, steps, effect })}::jsonb
    )
  `;

  if (newlyCompleted) {
    await unlockGameboardReward(userId);
  }

  const updated = await ensureGameboardRun(userId, eventId);

  return {
    run: updated,
    value,
    steps,
    effect,
    reachedFinish,
    newlyCompleted,
    rewardId: newlyCompleted ? GAMEBOARD_REWARD_ID : null
  };
}

// ===========================================================================
// High Roller — pure-luck Coin Tower mechanic. Reuses sidequest_gameboard_runs
// with event_id = "high-roller". See app/lib/highroller-config.ts for the
// column→meaning mapping.
// ===========================================================================

export type HighRollerFlipResult = {
  run: GameboardRun;
  outcome: "heads" | "tails";
  fromRung: number;
  toRung: number;
  busted: boolean;
  softBust: boolean;
  reachedTop: boolean;
  newlyCompleted: boolean;
  rewardId: string | null;
};

async function unlockHighRollerReward(userId: string) {
  const board = await loadSideQuestBoard(userId);
  if (board.state.rewards.some((item) => item.id === HIGHROLLER_REWARD_ID)) {
    return;
  }
  const reward: Reward = {
    id: HIGHROLLER_REWARD_ID,
    title: HIGHROLLER_REWARD_TITLE,
    kind: "badge",
    image: HIGHROLLER_REWARD_IMAGE,
    unlocked: true,
    note: HIGHROLLER_REWARD_NOTE
  };
  const nextState: SideQuestState = {
    ...board.state,
    rewards: [reward, ...board.state.rewards]
  };
  await saveSideQuestBoard(userId, nextState, "high-roller-reward-unlocked");
}

export async function executeHighRollerFlip(userId: string): Promise<HighRollerFlipResult> {
  const sql = getSql();
  const current = await ensureGameboardRun(userId, HIGHROLLER_EVENT_ID);

  if (current.completedAt) {
    throw new Error("You have already topped the tower.");
  }
  if (current.rollsAvailable <= 0) {
    throw new Error("No flip tokens — complete a quest to earn one.");
  }

  const heads = Math.random() < 0.5;
  const fromRung = current.position;
  let toRung = fromRung;
  let busts = current.laps;
  let busted = false;
  let softBust = false;

  if (heads) {
    toRung = Math.min(HIGHROLLER_RUNG_COUNT, fromRung + 1);
  } else {
    busted = true;
    if (fromRung >= HIGHROLLER_SOFT_BUST_THRESHOLD) {
      softBust = true;
      toRung = Math.max(0, fromRung - HIGHROLLER_SOFT_BUST_DROP);
    } else {
      toRung = 0;
    }
    busts += 1;
  }

  const reachedTop = toRung >= HIGHROLLER_RUNG_COUNT;
  const peak = Math.max(current.peakPosition, toRung);

  await sql`
    UPDATE sidequest_gameboard_runs
    SET position = ${toRung},
        rolls_used = rolls_used + 1,
        laps = ${busts},
        peak_position = ${peak},
        updated_at = now()
    WHERE user_id = ${userId} AND event_id = ${HIGHROLLER_EVENT_ID}
  `;

  let newlyCompleted = false;
  if (reachedTop) {
    const completionRows = (await sql`
      UPDATE sidequest_gameboard_runs
      SET completed_at = now()
      WHERE user_id = ${userId} AND event_id = ${HIGHROLLER_EVENT_ID} AND completed_at IS NULL
      RETURNING user_id
    `) as Array<{ user_id: string }>;
    newlyCompleted = completionRows.length > 0;
  }

  await sql`
    INSERT INTO sidequest_gameboard_events (user_id, event_id, event_type, payload)
    VALUES (
      ${userId},
      ${HIGHROLLER_EVENT_ID},
      ${reachedTop ? "flip-top" : busted ? "flip-bust" : "flip-climb"},
      ${JSON.stringify({ outcome: heads ? "heads" : "tails", fromRung, toRung, softBust })}::jsonb
    )
  `;

  if (newlyCompleted) {
    await unlockHighRollerReward(userId);
    await createNotification(userId, {
      kind: "high-roller-completed",
      title: "Tower cleared!",
      body: "You climbed the Coin Tower clean. High Roller badge pinned to your shelf.",
      payload: { image: HIGHROLLER_REWARD_IMAGE, title: HIGHROLLER_REWARD_TITLE }
    });
  } else if (busted && fromRung >= HIGHROLLER_SOFT_BUST_THRESHOLD) {
    // Only ping on meaningful busts (from the upper half) — silent on
    // routine resets from the lower half so the bell doesn't get spammy.
    await createNotification(userId, {
      kind: "high-roller-bust",
      title: "Bust.",
      body: `Tails. Dropped to rung ${toRung}.`,
      payload: { fromRung, toRung }
    });
  }

  const updated = await ensureGameboardRun(userId, HIGHROLLER_EVENT_ID);

  return {
    run: updated,
    outcome: heads ? "heads" : "tails",
    fromRung,
    toRung,
    busted,
    softBust,
    reachedTop,
    newlyCompleted,
    rewardId: newlyCompleted ? HIGHROLLER_REWARD_ID : null
  };
}

function normalizeState(value: unknown): SideQuestState {
  if (value && typeof value === "object") {
    return mergeWithStarterState(value as Partial<SideQuestState>);
  }

  return makeStarterState();
}

function toUser(row: UserRow): SideQuestUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username ?? row.email.split("@")[0] ?? "quester",
    role: row.role === "admin" ? "admin" : "member",
    ageRange: row.age_range,
    schoolYear: row.school_year,
    favoriteCategory: categoryOptions.includes(row.favorite_category as Category)
      ? (row.favorite_category as Category)
      : "school",
    boardRole: row.board_role,
    questsCreated: row.quests_created,
    questsCompleted: row.quests_completed,
    joinedAt: new Date(row.joined_at).toISOString(),
    lastActiveAt: new Date(row.last_active_at).toISOString()
  };
}

function toAuthUser(row: UserRow): AuthUser {
  const favoriteCategory = categoryOptions.includes(row.favorite_category as Category)
    ? (row.favorite_category as Category)
    : "school";

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username ?? row.email.split("@")[0] ?? "quester",
    role: row.role === "admin" ? "admin" : "member",
    favoriteCategory,
    suspendedAt: row.suspended_at ? new Date(row.suspended_at).toISOString() : null,
    suspendedReason: row.suspended_reason ?? null
  };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) {
    return false;
  }

  const [method, iterations, salt, expected] = stored.split("$");

  if (method !== "pbkdf2_sha256" || !iterations || !salt || !expected) {
    return false;
  }

  const actual = pbkdf2Sync(password, salt, Number(iterations), 32, "sha256");
  const expectedBuffer = Buffer.from(expected, "hex");

  return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cleanUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

export async function signUpSideQuestUser(input: SignUpInput) {
  const sql = getSql();
  await ensureSideQuestSchema(sql);

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || input.username.trim() || "Quest captain";
  const username = cleanUsername(input.username);
  const safeCategory = categoryOptions.includes(input.favoriteCategory) ? input.favoriteCategory : "school";

  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required.");
  }

  if (!username || username.length < 3) {
    throw new Error("Username must be at least 3 letters or numbers.");
  }

  validatePassword(input.password);

  // Friendly pre-checks for duplicate email/username. The DB also has unique
  // constraints (email column + lower(username) partial index) as a safety
  // net for races, but these give a human-readable error first.
  const existingEmailRows = (await sql`
    SELECT id FROM sidequest_users WHERE lower(email) = ${email} LIMIT 1
  `) as Array<{ id: string }>;
  if (existingEmailRows.length > 0) {
    throw new Error("An account with that email already exists. Try logging in instead.");
  }
  const existingUsernameRows = (await sql`
    SELECT id FROM sidequest_users WHERE lower(username) = ${username} LIMIT 1
  `) as Array<{ id: string }>;
  if (existingUsernameRows.length > 0) {
    throw new Error("That username is already taken — try another.");
  }

  const adminRows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM sidequest_users
    WHERE role = 'admin'
  `) as Array<{ count: number }>;
  const role = adminRows[0]?.count === 0 ? "admin" : "member";

  let rows: UserRow[];
  try {
    rows = (await sql`
      INSERT INTO sidequest_users (
        id,
        name,
        email,
        username,
        password_hash,
        role,
        age_range,
        school_year,
        favorite_category,
        board_role,
        joined_at,
        last_active_at
      )
      VALUES (
        ${randomUUID()},
        ${name},
        ${email},
        ${username},
        ${hashPassword(input.password)},
        ${role},
        '13-18',
        'student',
        ${safeCategory},
        'quester',
        now(),
        now()
      )
      RETURNING
        id,
        name,
        email,
        username,
        role,
        age_range,
        school_year,
        favorite_category,
        board_role,
        quests_created,
        quests_completed,
        joined_at,
        last_active_at
    `) as UserRow[];
  } catch (error) {
    // Translate raw unique-constraint errors from the DB into friendly copy
    // (covers the race where two signups slip past the pre-check).
    const message = error instanceof Error ? error.message : String(error);
    if (/sidequest_users_email/i.test(message) || /email/i.test(message) && /unique/i.test(message)) {
      throw new Error("An account with that email already exists. Try logging in instead.");
    }
    if (/sidequest_users_username_unique/i.test(message) || /username/i.test(message) && /unique/i.test(message)) {
      throw new Error("That username is already taken — try another.");
    }
    throw error;
  }

  await sql`
    INSERT INTO sidequest_board_events (board_id, event_type)
    VALUES (${DEFAULT_BOARD_ID}, 'signup')
  `;

  return toAuthUser(rows[0]);
}

export async function loginSideQuestUser(input: LoginInput) {
  const sql = getSql();
  await ensureSideQuestSchema(sql);

  const usernameOrEmail = input.usernameOrEmail.trim().toLowerCase();

  const rows = (await sql`
    SELECT
      id,
      name,
      email,
      username,
      password_hash,
      role,
      age_range,
      school_year,
      favorite_category,
      board_role,
      quests_created,
      quests_completed,
      joined_at,
      last_active_at,
      suspended_at,
      suspended_reason,
      suspended_by
    FROM sidequest_users
    WHERE lower(email) = ${usernameOrEmail}
      OR lower(username) = ${usernameOrEmail}
    LIMIT 1
  `) as UserRow[];

  const user = rows[0];

  if (!user || !verifyPassword(input.password, user.password_hash)) {
    throw new Error("Username/email or password is incorrect.");
  }

  await sql`
    UPDATE sidequest_users
    SET last_active_at = now()
    WHERE id = ${user.id}
  `;

  return toAuthUser(user);
}

export async function createSideQuestSession(userId: string) {
  const sql = getSql();
  await ensureSideQuestSchema(sql);

  const token = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await sql`
    INSERT INTO sidequest_sessions (id, user_id, token_hash, expires_at)
    VALUES (${sessionId}, ${userId}, ${hashToken(token)}, ${expiresAt.toISOString()}::timestamptz)
  `;

  return {
    token,
    expiresAt
  };
}

export async function getUserBySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const sql = getSql();
  await ensureSideQuestSchema(sql);

  const rows = (await sql`
    SELECT
      users.id,
      users.name,
      users.email,
      users.username,
      users.role,
      users.age_range,
      users.school_year,
      users.favorite_category,
      users.board_role,
      users.quests_created,
      users.quests_completed,
      users.joined_at,
      users.last_active_at,
      users.suspended_at,
      users.suspended_reason,
      users.suspended_by
    FROM sidequest_sessions sessions
    INNER JOIN sidequest_users users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${hashToken(token)}
      AND sessions.expires_at > now()
    LIMIT 1
  `) as UserRow[];

  return rows[0] ? toAuthUser(rows[0]) : null;
}

export async function deleteSideQuestSession(token: string | undefined) {
  if (!token) {
    return;
  }

  const sql = getSql();
  await ensureSideQuestSchema(sql);

  await sql`
    DELETE FROM sidequest_sessions
    WHERE token_hash = ${hashToken(token)}
  `;
}

function boardIdForUser(userId: string) {
  return `user:${userId}`;
}

export async function loadSideQuestBoard(userId: string): Promise<BoardLoadResult> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const boardId = boardIdForUser(userId);

  const rows = (await sql`
    SELECT state, updated_at
    FROM sidequest_boards
    WHERE id = ${boardId}
    LIMIT 1
  `) as Array<{ state: unknown; updated_at: Date | string }>;

  if (rows[0]) {
    const base = normalizeState(rows[0].state);
    const { state: reconciled, changed } = await reconcilePartyBoards(userId, base);
    if (changed) {
      // Persist the cleaned-up jsonb so the fix sticks for future loads.
      return saveSideQuestBoard(userId, reconciled, "party-sync");
    }
    return {
      databaseReady: true,
      state: reconciled,
      updatedAt: new Date(rows[0].updated_at).toISOString()
    };
  }

  const starter = makeStarterState();
  const { state: reconciled } = await reconcilePartyBoards(userId, starter);
  return saveSideQuestBoard(userId, reconciled, "starter-board-created");
}

export async function saveSideQuestBoard(userId: string, state: SideQuestState, eventType = "save"): Promise<BoardLoadResult> {
  const sql = getSql();
  const normalized = mergeWithStarterState(state);
  const boardId = boardIdForUser(userId);

  await ensureSideQuestSchema(sql);
  // Fan any local edits on party boards out to the authoritative party
  // rows first so other members see the change on their next refresh.
  await propagatePartyEdits(userId, normalized);
  const rows = (await sql`
    INSERT INTO sidequest_boards (id, state, updated_at)
    VALUES (${boardId}, ${JSON.stringify(normalized)}::jsonb, now())
    ON CONFLICT (id)
    DO UPDATE SET state = EXCLUDED.state, updated_at = now()
    RETURNING updated_at
  `) as Array<{ updated_at: Date | string }>;

  await sql`
    INSERT INTO sidequest_board_events (board_id, event_type)
    VALUES (${boardId}, ${eventType})
  `;

  return {
    databaseReady: true,
    state: normalized,
    updatedAt: rows[0] ? new Date(rows[0].updated_at).toISOString() : new Date().toISOString()
  };
}

export async function getSideQuestAnalytics(): Promise<AnalyticsSnapshot> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);

  const rows = (await sql`
    SELECT state, updated_at
    FROM sidequest_boards
    ORDER BY updated_at DESC
    LIMIT 1
  `) as Array<{ state: unknown; updated_at: Date | string }>;
  const board = rows[0]
    ? {
        state: normalizeState(rows[0].state),
        updatedAt: new Date(rows[0].updated_at).toISOString()
      }
    : await saveSideQuestBoard("admin-seed", makeStarterState(), "admin-starter-board-created");
  const userRows = (await sql`
    SELECT
      id,
      name,
      email,
      username,
      role,
      age_range,
      school_year,
      favorite_category,
      board_role,
      quests_created,
      quests_completed,
      joined_at,
      last_active_at,
      suspended_at,
      suspended_reason,
      suspended_by
    FROM sidequest_users
    ORDER BY last_active_at DESC
    LIMIT 24
  `) as UserRow[];

  const users = userRows.map(toUser);
  const boards = board.state.boards.length > 0 ? board.state.boards : [];
  const quests = boards.flatMap((item) => item.quests);
  const completed = quests.filter((quest) => quest.completed);
  const totalProgress = quests.reduce((sum, quest) => sum + quest.progress, 0);
  const totalXp = completed.reduce((sum, quest) => sum + quest.xp, 0);
  const recentActivity = boards
    .flatMap((item: SideQuestBoard) =>
      item.activity.map((activity) => ({
        ...activity,
        actor: item.kind === "personal" ? activity.actor : `${activity.actor} · ${item.title}`
      }))
    )
    .slice(0, 6);

  return {
    databaseReady: true,
    updatedAt: board.updatedAt,
    totalQuests: quests.length,
    activeQuests: quests.length - completed.length,
    completedQuests: completed.length,
    completionRate: quests.length === 0 ? 0 : Math.round((completed.length / quests.length) * 100),
    averageProgress: quests.length === 0 ? 0 : Math.round(totalProgress / quests.length),
    totalXp,
    weeklyClears: board.state.streak.reduce((sum, day) => sum + day.completed, 0),
    rewardsUnlocked: board.state.rewards.filter((reward) => reward.unlocked).length,
    partyMembers: boards
      .filter((item) => item.kind === "party")
      .reduce((sum, item) => sum + item.members.length, 0),
    totalUsers: users.length,
    adminUsers: users.filter((user) => user.role === "admin").length,
    teenUsers: users.filter((user) => user.role === "member").length,
    userInfo: users,
    categoryBreakdown: categoryOptions.map((category) => {
      const categoryQuests = quests.filter((quest) => quest.category === category);
      const categoryCompleted = categoryQuests.filter((quest) => quest.completed);
      const progress = categoryQuests.reduce((sum, quest) => sum + quest.progress, 0);

      return {
        category,
        label: categoryMeta[category].label,
        total: categoryQuests.length,
        completed: categoryCompleted.length,
        xp: categoryCompleted.reduce((sum, quest) => sum + quest.xp, 0),
        averageProgress: categoryQuests.length === 0 ? 0 : Math.round(progress / categoryQuests.length)
      };
    }),
    recentActivity,
    streak: board.state.streak
  };
}

// ===========================================================================
// Parties — server-authoritative co-op boards keyed by invite code.
// ===========================================================================

const PARTY_MEMBER_COLORS = [
  "#ff5a3d",
  "#ffd43d",
  "#44d7a8",
  "#5fc7f2",
  "#ff78b7",
  "#4667ff",
  "#f8efd9",
  "#eadbb9"
];

type PartyState = {
  members: SideQuestBoard["members"];
  quests: SideQuestBoard["quests"];
  activity: SideQuestBoard["activity"];
  createdAt: string;
};

type PartyRow = {
  invite_code: string;
  title: string;
  owner_id: string;
  state: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};

function initialsFrom(name: string) {
  const clean = (name || "").trim();
  if (!clean) return "QQ";
  return clean
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "QQ";
}

function colorForIndex(index: number) {
  return PARTY_MEMBER_COLORS[index % PARTY_MEMBER_COLORS.length];
}

function boardIdForParty(code: string) {
  return `party:${code}`;
}

function randomInviteCode(title = "CREW") {
  const slug = title.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "CREW";
  const suffix = randomBytes(3).toString("base64").replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase();
  return `SQ-${slug}-${suffix || "CREW"}`;
}

async function ensureUniqueInviteCode(sql: Sql, title: string) {
  for (let i = 0; i < 24; i += 1) {
    const code = randomInviteCode(title);
    const rows = (await sql`
      SELECT 1 FROM sidequest_parties WHERE invite_code = ${code} LIMIT 1
    `) as Array<{ "?column?": number }>;
    if (rows.length === 0) return code;
  }
  throw new Error("Could not allocate a free invite code. Try again.");
}

function normalizePartyState(raw: unknown, fallback: PartyState): PartyState {
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<PartyState>;
  return {
    members: Array.isArray(value.members) ? value.members : fallback.members,
    quests: Array.isArray(value.quests) ? value.quests : fallback.quests,
    activity: Array.isArray(value.activity) ? value.activity : fallback.activity,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : fallback.createdAt
  };
}

async function composePartyMembers(sql: Sql, code: string) {
  const rows = (await sql`
    SELECT
      u.id,
      u.name,
      u.username,
      u.favorite_category,
      m.role,
      m.joined_at
    FROM sidequest_party_members m
    INNER JOIN sidequest_users u ON u.id = m.user_id
    WHERE m.invite_code = ${code}
    ORDER BY m.joined_at ASC
  `) as Array<{
    id: string;
    name: string;
    username: string | null;
    favorite_category: string;
    role: string;
    joined_at: Date | string;
  }>;
  return rows.map((row, index) => ({
    id: row.id,
    name: row.name || row.username || "Quester",
    role: row.role === "owner" ? "party captain" : "party member",
    initials: initialsFrom(row.name || row.username || "Quester"),
    color: colorForIndex(index)
  }));
}

async function partyRowToBoard(sql: Sql, row: PartyRow): Promise<SideQuestBoard> {
  const fallback: PartyState = {
    members: [],
    quests: [],
    activity: [],
    createdAt: new Date(row.created_at).toISOString()
  };
  const state = normalizePartyState(row.state, fallback);
  // Always rebuild members from the canonical membership table so the
  // displayed party matches who's actually joined.
  const members = await composePartyMembers(sql, row.invite_code);
  return {
    id: boardIdForParty(row.invite_code),
    title: row.title,
    kind: "party",
    inviteCode: row.invite_code,
    members,
    quests: state.quests,
    activity: state.activity,
    createdAt: state.createdAt
  };
}

export async function createPartyForUser(userId: string, titleInput: string): Promise<SideQuestBoard> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const title = (titleInput || "").trim().slice(0, 48) || "New party board";
  const code = await ensureUniqueInviteCode(sql, title);

  const now = new Date().toISOString();
  const initialState: PartyState = {
    members: [],
    quests: [],
    activity: [
      {
        id: `activity-${code}-start`,
        actor: "You",
        text: `opened ${title} for co-op quests.`,
        time: "Just now"
      }
    ],
    createdAt: now
  };

  await sql`
    INSERT INTO sidequest_parties (invite_code, title, owner_id, state)
    VALUES (${code}, ${title}, ${userId}, ${JSON.stringify(initialState)}::jsonb)
  `;
  await sql`
    INSERT INTO sidequest_party_members (invite_code, user_id, role)
    VALUES (${code}, ${userId}, 'owner')
  `;

  const rows = (await sql`
    SELECT invite_code, title, owner_id, state, created_at, updated_at
    FROM sidequest_parties WHERE invite_code = ${code}
  `) as PartyRow[];
  return partyRowToBoard(sql, rows[0]);
}

export async function joinPartyForUser(userId: string, codeInput: string): Promise<SideQuestBoard> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const code = (codeInput || "").trim().toUpperCase();
  if (!code || code === "PERSONAL") {
    throw new Error("Enter a valid invite code.");
  }

  const rows = (await sql`
    SELECT invite_code, title, owner_id, state, created_at, updated_at
    FROM sidequest_parties WHERE invite_code = ${code} LIMIT 1
  `) as PartyRow[];
  if (rows.length === 0) {
    throw new Error("We couldn't find a party with that code.");
  }

  await sql`
    INSERT INTO sidequest_party_members (invite_code, user_id, role)
    VALUES (${code}, ${userId}, 'member')
    ON CONFLICT (invite_code, user_id) DO NOTHING
  `;

  const board = await partyRowToBoard(sql, rows[0]);

  // Append a small join activity event without stomping the party state.
  const userRows = (await sql`
    SELECT name, username FROM sidequest_users WHERE id = ${userId} LIMIT 1
  `) as Array<{ name: string; username: string | null }>;
  const actor = userRows[0]?.name || userRows[0]?.username || "A quester";
  const next = {
    members: board.members,
    quests: board.quests,
    activity: [
      {
        id: `activity-${code}-join-${Date.now()}`,
        actor,
        text: `joined the party.`,
        time: "Just now"
      },
      ...board.activity
    ].slice(0, 8),
    createdAt: board.createdAt
  } satisfies PartyState;
  await sql`
    UPDATE sidequest_parties
    SET state = ${JSON.stringify(next)}::jsonb, updated_at = now()
    WHERE invite_code = ${code}
  `;
  return { ...board, activity: next.activity };
}

export async function getUserPartyBoards(userId: string): Promise<SideQuestBoard[]> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const rows = (await sql`
    SELECT p.invite_code, p.title, p.owner_id, p.state, p.created_at, p.updated_at
    FROM sidequest_parties p
    INNER JOIN sidequest_party_members m ON m.invite_code = p.invite_code
    WHERE m.user_id = ${userId}
    ORDER BY p.updated_at DESC
  `) as PartyRow[];
  const boards: SideQuestBoard[] = [];
  for (const row of rows) {
    boards.push(await partyRowToBoard(sql, row));
  }
  return boards;
}

export async function savePartyState(userId: string, code: string, board: SideQuestBoard): Promise<void> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const memberRows = (await sql`
    SELECT 1 FROM sidequest_party_members
    WHERE invite_code = ${code} AND user_id = ${userId} LIMIT 1
  `) as Array<{ "?column?": number }>;
  if (memberRows.length === 0) return;

  const next: PartyState = {
    members: board.members,
    quests: board.quests,
    activity: board.activity,
    createdAt: board.createdAt
  };
  await sql`
    UPDATE sidequest_parties
    SET
      state = ${JSON.stringify(next)}::jsonb,
      title = ${board.title},
      updated_at = now()
    WHERE invite_code = ${code}
  `;
}

/**
 * Merge the server-authoritative party boards into the user's jsonb state
 * and drop any stale/invalid party boards that only existed locally. Also
 * migrates legacy local-only party boards: if a user's state.boards[] has
 * a `party:...` entry whose code has no backing party row, we create the
 * party server-side with this user as owner so their quests aren't lost.
 *
 * Returns the reconciled state + a flag noting whether anything changed
 * (so callers can persist the cleanup back to the jsonb blob).
 */
async function reconcilePartyBoards(
  userId: string,
  state: SideQuestState
): Promise<{ state: SideQuestState; changed: boolean }> {
  const sql = getSql();
  const realBoards = await getUserPartyBoards(userId);
  const realByCode = new Map(realBoards.map((b) => [b.inviteCode.toUpperCase(), b]));

  let changed = false;
  const nextBoards: SideQuestBoard[] = [];

  for (const board of state.boards) {
    if (board.kind === "personal" || board.id === PERSONAL_BOARD_ID) {
      nextBoards.push(board);
      continue;
    }
    const code = (board.inviteCode || "").toUpperCase();
    if (!code || code === "PERSONAL") {
      // Malformed party board — drop it.
      changed = true;
      continue;
    }
    const real = realByCode.get(code);
    if (real) {
      // Replace the user's cached copy with the server snapshot so the
      // title, members, quests, and activity all agree.
      nextBoards.push(real);
      realByCode.delete(code);
      continue;
    }

    // No server record for this code. Try to migrate the user's local-only
    // board into a real party with them as owner, preserving their quests.
    try {
      const existingRows = (await sql`
        SELECT 1 FROM sidequest_parties WHERE invite_code = ${code} LIMIT 1
      `) as Array<{ "?column?": number }>;
      if (existingRows.length > 0) {
        // Party exists but user isn't a member — drop the cached board.
        changed = true;
        continue;
      }
      const migratedState: PartyState = {
        members: [],
        quests: Array.isArray(board.quests) ? board.quests : [],
        activity: Array.isArray(board.activity) ? board.activity : [],
        createdAt: board.createdAt || new Date().toISOString()
      };
      await sql`
        INSERT INTO sidequest_parties (invite_code, title, owner_id, state)
        VALUES (${code}, ${board.title || "Party board"}, ${userId}, ${JSON.stringify(migratedState)}::jsonb)
      `;
      await sql`
        INSERT INTO sidequest_party_members (invite_code, user_id, role)
        VALUES (${code}, ${userId}, 'owner')
        ON CONFLICT (invite_code, user_id) DO NOTHING
      `;
      const reloaded = (await sql`
        SELECT invite_code, title, owner_id, state, created_at, updated_at
        FROM sidequest_parties WHERE invite_code = ${code} LIMIT 1
      `) as PartyRow[];
      nextBoards.push(await partyRowToBoard(sql, reloaded[0]));
      changed = true;
    } catch {
      // Migration failed — safest to drop the stale entry than surface a broken one.
      changed = true;
    }
  }

  // Any real party the user is a member of that wasn't in their cached
  // state yet (e.g. they joined on a different device) — append it.
  for (const extra of realByCode.values()) {
    nextBoards.push(extra);
    changed = true;
  }

  // Ensure activeBoardId still resolves; otherwise fall back to personal.
  const activeExists = nextBoards.some((b) => b.id === state.activeBoardId);
  const nextActive = activeExists ? state.activeBoardId : PERSONAL_BOARD_ID;

  return {
    state: {
      ...state,
      boards: nextBoards,
      activeBoardId: nextActive
    },
    changed: changed || nextActive !== state.activeBoardId
  };
}

/**
 * Sync any in-state party boards that the user edited (e.g. added a quest,
 * completed a quest) back into the server-authoritative sidequest_parties
 * rows. Runs on every save so remote members see fresh state after a refresh.
 */
async function propagatePartyEdits(userId: string, state: SideQuestState): Promise<void> {
  for (const board of state.boards) {
    if (board.kind !== "party") continue;
    const code = (board.inviteCode || "").toUpperCase();
    if (!code || code === "PERSONAL") continue;
    try {
      await savePartyState(userId, code, { ...board, inviteCode: code });
    } catch {
      // Non-fatal — persisting the user's personal state should not fail
      // because a party sync had trouble.
    }
  }
}

// ===========================================================================
// Notifications — admin-triggered events surface as toasts on the recipient's
// next page load or notification poll.
// ===========================================================================

export type NotificationKind =
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

export type NotificationRecord = {
  id: number;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  awardedBy: string | null;
  createdAt: string;
  readAt: string | null;
};

type NotificationRow = {
  id: number;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  payload: unknown;
  awarded_by: string | null;
  created_at: Date | string;
  read_at: Date | string | null;
};

function toNotification(row: NotificationRow): NotificationRecord {
  return {
    id: Number(row.id),
    userId: row.user_id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    awardedBy: row.awarded_by,
    createdAt: new Date(row.created_at).toISOString(),
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null
  };
}

export async function createNotification(
  userId: string,
  input: { kind: NotificationKind; title: string; body: string; payload?: Record<string, unknown>; awardedBy?: string }
): Promise<NotificationRecord> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const rows = (await sql`
    INSERT INTO sidequest_notifications (user_id, kind, title, body, payload, awarded_by)
    VALUES (
      ${userId},
      ${input.kind},
      ${input.title},
      ${input.body},
      ${input.payload ? JSON.stringify(input.payload) : null}::jsonb,
      ${input.awardedBy ?? null}
    )
    RETURNING id, user_id, kind, title, body, payload, awarded_by, created_at, read_at
  `) as NotificationRow[];
  return toNotification(rows[0]);
}

export async function listNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<NotificationRecord[]> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const rows = options.unreadOnly
    ? ((await sql`
        SELECT id, user_id, kind, title, body, payload, awarded_by, created_at, read_at
        FROM sidequest_notifications
        WHERE user_id = ${userId} AND read_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as NotificationRow[])
    : ((await sql`
        SELECT id, user_id, kind, title, body, payload, awarded_by, created_at, read_at
        FROM sidequest_notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `) as NotificationRow[]);
  return rows.map(toNotification);
}

export async function markNotificationsRead(userId: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  await sql`
    UPDATE sidequest_notifications
    SET read_at = now()
    WHERE user_id = ${userId} AND id = ANY(${ids}::bigint[]) AND read_at IS NULL
  `;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  await sql`
    UPDATE sidequest_notifications
    SET read_at = now()
    WHERE user_id = ${userId} AND read_at IS NULL
  `;
}

// ===========================================================================
// Admin actions — suspend/unsuspend, award sticker/badge/dice, list users,
// spectate state. Every action writes to sidequest_admin_audit for a trail.
// ===========================================================================

async function writeAudit(
  adminId: string,
  targetUserId: string | null,
  action: string,
  payload: Record<string, unknown> | null = null
) {
  const sql = getSql();
  await sql`
    INSERT INTO sidequest_admin_audit (admin_id, target_user_id, action, payload)
    VALUES (
      ${adminId},
      ${targetUserId},
      ${action},
      ${payload ? JSON.stringify(payload) : null}::jsonb
    )
  `;
}

export type AdminUserSummary = {
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
  peakCombo: number;
  totalCombos: number;
  spunToday: boolean;
};

export async function listUsersForAdmin(): Promise<AdminUserSummary[]> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const rows = (await sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u.username,
      u.role,
      u.joined_at,
      u.last_active_at,
      u.quests_created,
      u.quests_completed,
      u.suspended_at,
      u.suspended_reason,
      COALESCE(jsonb_array_length(b.state -> 'rewards'), 0) AS rewards_count,
      COALESCE(gr.position, 0) AS gameboard_position,
      (gr.completed_at IS NOT NULL) AS gameboard_completed,
      COALESCE(hr.position, 0) AS high_roller_rung,
      COALESCE(hr.peak_position, 0) AS high_roller_peak,
      COALESCE(hr.laps, 0) AS high_roller_busts,
      (hr.completed_at IS NOT NULL) AS high_roller_completed,
      COALESCE(u.peak_combo, 0) AS peak_combo,
      COALESCE(u.total_combos, 0) AS total_combos,
      (ds.user_id IS NOT NULL) AS spun_today
    FROM sidequest_users u
    LEFT JOIN sidequest_boards b ON b.id = CONCAT('user:', u.id)
    LEFT JOIN sidequest_gameboard_runs gr ON gr.user_id = u.id AND gr.event_id = ${GAMEBOARD_EVENT_ID}
    LEFT JOIN sidequest_gameboard_runs hr ON hr.user_id = u.id AND hr.event_id = ${HIGHROLLER_EVENT_ID}
    LEFT JOIN sidequest_daily_spins ds ON ds.user_id = u.id AND ds.date_key = ${todayKey()}
    ORDER BY u.last_active_at DESC
    LIMIT 200
  `) as Array<{
    id: string;
    name: string;
    email: string;
    username: string | null;
    role: string;
    joined_at: Date | string;
    last_active_at: Date | string;
    quests_created: number;
    quests_completed: number;
    suspended_at: Date | string | null;
    suspended_reason: string | null;
    rewards_count: number;
    gameboard_position: number;
    gameboard_completed: boolean;
    high_roller_rung: number;
    high_roller_peak: number;
    high_roller_busts: number;
    high_roller_completed: boolean;
    peak_combo: number;
    total_combos: number;
    spun_today: boolean;
  }>;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username ?? row.email.split("@")[0] ?? "quester",
    email: row.email,
    role: row.role === "admin" ? "admin" : "member",
    joinedAt: new Date(row.joined_at).toISOString(),
    lastActiveAt: new Date(row.last_active_at).toISOString(),
    questsCreated: row.quests_created,
    questsCompleted: row.quests_completed,
    suspendedAt: row.suspended_at ? new Date(row.suspended_at).toISOString() : null,
    suspendedReason: row.suspended_reason,
    rewardsCount: row.rewards_count,
    gameboardPosition: row.gameboard_position,
    gameboardCompleted: row.gameboard_completed,
    highRollerRung: row.high_roller_rung,
    highRollerPeak: row.high_roller_peak,
    highRollerBusts: row.high_roller_busts,
    highRollerCompleted: row.high_roller_completed,
    peakCombo: row.peak_combo,
    totalCombos: row.total_combos,
    spunToday: row.spun_today
  }));
}

export async function adminSuspendUser(
  adminId: string,
  userId: string,
  reason: string
): Promise<void> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  if (userId === adminId) {
    throw new Error("Admins cannot suspend themselves.");
  }
  await sql`
    UPDATE sidequest_users
    SET suspended_at = now(), suspended_reason = ${reason || null}, suspended_by = ${adminId}
    WHERE id = ${userId}
  `;
  // Invalidate sessions so the suspended user is signed out immediately.
  await sql`DELETE FROM sidequest_sessions WHERE user_id = ${userId}`;
  await writeAudit(adminId, userId, "suspend", { reason });
  await createNotification(userId, {
    kind: "account-suspended",
    title: "Account paused",
    body: reason || "An admin paused your account. Reach out if you think this was a mistake.",
    awardedBy: adminId
  });
}

export async function adminUnsuspendUser(adminId: string, userId: string): Promise<void> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  await sql`
    UPDATE sidequest_users
    SET suspended_at = NULL, suspended_reason = NULL, suspended_by = NULL
    WHERE id = ${userId}
  `;
  await writeAudit(adminId, userId, "unsuspend", null);
  await createNotification(userId, {
    kind: "account-unsuspended",
    title: "You're back in.",
    body: "Your account was restored. Welcome back — your board missed you.",
    awardedBy: adminId
  });
}

export async function adminAwardSticker(
  adminId: string,
  userId: string,
  sticker: { title: string; image: string; note: string; kind?: "badge" | "sticker" }
): Promise<void> {
  const board = await loadSideQuestBoard(userId);
  const id = `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const reward: Reward = {
    id,
    title: sticker.title,
    kind: sticker.kind ?? "sticker",
    image: sticker.image,
    unlocked: true,
    note: sticker.note
  };
  const nextState: SideQuestState = {
    ...board.state,
    rewards: [reward, ...board.state.rewards]
  };
  await saveSideQuestBoard(userId, nextState, "admin-award-sticker");
  await writeAudit(adminId, userId, "award-sticker", { reward });
  await createNotification(userId, {
    kind: "award-sticker",
    title: `New ${reward.kind}: ${reward.title}`,
    body: sticker.note,
    payload: { image: reward.image, title: reward.title },
    awardedBy: adminId
  });
}

export async function adminAwardBadge(
  adminId: string,
  userId: string,
  badge: { id: string; title: string; image: string; note: string; vibe: string }
): Promise<void> {
  const board = await loadSideQuestBoard(userId);
  const alreadyHas = board.state.rewards.some((r) => r.id === badge.id || r.title === badge.title);
  if (alreadyHas) {
    throw new Error(`${board.state.rewards.find((r) => r.title === badge.title) ? "User already has" : "Badge conflict:"} ${badge.title}.`);
  }
  const reward: Reward = {
    id: badge.id,
    title: badge.title,
    kind: "badge",
    image: badge.image,
    unlocked: true,
    note: badge.note
  };
  const nextState: SideQuestState = {
    ...board.state,
    rewards: [reward, ...board.state.rewards]
  };
  await saveSideQuestBoard(userId, nextState, "admin-award-badge");
  await writeAudit(adminId, userId, "award-badge", { badgeId: badge.id });
  await createNotification(userId, {
    kind: "award-badge",
    title: `Badge unlocked: ${badge.title}`,
    body: badge.vibe,
    payload: { image: badge.image, title: badge.title, badgeId: badge.id },
    awardedBy: adminId
  });
}

export type GameboardEventId = typeof GAMEBOARD_EVENT_ID | typeof HIGHROLLER_EVENT_ID;

function eventLabel(eventId: string): string {
  if (eventId === HIGHROLLER_EVENT_ID) return "High Roller";
  if (eventId === GAMEBOARD_EVENT_ID) return "Spring Sprint";
  return eventId;
}

function tokenWord(eventId: string, plural: boolean): string {
  if (eventId === HIGHROLLER_EVENT_ID) return plural ? "flip tokens" : "flip token";
  return plural ? "die rolls" : "die roll";
}

export async function adminAwardEventTokens(
  adminId: string,
  userId: string,
  eventId: string,
  count: number
): Promise<void> {
  const amount = Math.max(1, Math.min(50, Math.round(count)));
  for (let i = 0; i < amount; i += 1) {
    await grantGameboardRoll(userId, eventId);
  }
  await writeAudit(adminId, userId, "award-event-tokens", { eventId, count: amount });
  const isFlip = eventId === HIGHROLLER_EVENT_ID;
  await createNotification(userId, {
    kind: isFlip ? "award-flip-tokens" : "award-dice",
    title: `+${amount} ${tokenWord(eventId, amount !== 1)}`,
    body: `An admin dropped ${amount} bonus ${tokenWord(eventId, amount !== 1)} on your ${eventLabel(eventId)} run.`,
    payload: { count: amount, eventId },
    awardedBy: adminId
  });
}

// Back-compat shim — older callers (and the legacy admin "Dice" button)
// still hit this. New code should use adminAwardEventTokens directly.
export async function adminAwardDice(
  adminId: string,
  userId: string,
  count: number
): Promise<void> {
  await adminAwardEventTokens(adminId, userId, GAMEBOARD_EVENT_ID, count);
}

export async function adminCompleteGameboardEvent(
  adminId: string,
  userId: string,
  eventId: string
): Promise<void> {
  const sql = getSql();
  await ensureGameboardRun(userId, eventId);
  // Move the run to its terminal state. For Spring Sprint we leave position
  // at 0 (the start/finish tile) since that's where a real lap-completer
  // lands. For High Roller we lock the rung at the top of the tower.
  const terminal = eventId === HIGHROLLER_EVENT_ID ? HIGHROLLER_RUNG_COUNT : 0;
  await sql`
    UPDATE sidequest_gameboard_runs
    SET position = ${terminal},
        peak_position = GREATEST(peak_position, ${terminal}),
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
    WHERE user_id = ${userId} AND event_id = ${eventId}
  `;
  await writeAudit(adminId, userId, "fast-forward-event", { eventId });

  // Spring Sprint completion drops its sticker so the user keeps the loot.
  // High Roller completion does NOT drop the badge — admins must still
  // earn the badge through the actual flip flow when testing.
  if (eventId === GAMEBOARD_EVENT_ID) {
    await unlockGameboardReward(userId);
  }

  await createNotification(userId, {
    kind: "event-fast-forwarded",
    title: `${eventLabel(eventId)} marked complete`,
    body: `An admin closed out your ${eventLabel(eventId)} run for testing.`,
    payload: { eventId },
    awardedBy: adminId
  });
}

export async function adminResetGameboardEvent(
  adminId: string,
  userId: string,
  eventId: string
): Promise<void> {
  const sql = getSql();
  await ensureGameboardRun(userId, eventId);
  await sql`
    UPDATE sidequest_gameboard_runs
    SET position = 0,
        rolls_earned = 0,
        rolls_used = 0,
        laps = 0,
        peak_position = 0,
        completed_at = NULL,
        updated_at = now()
    WHERE user_id = ${userId} AND event_id = ${eventId}
  `;
  await writeAudit(adminId, userId, "reset-event", { eventId });
  // No user-facing notification — this is an admin testing tool, not a
  // user achievement event.
}

export async function getSpectatorSnapshot(targetUserId: string) {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const userRows = (await sql`
    SELECT
      id, name, email, username, role, age_range, school_year, favorite_category,
      board_role, quests_created, quests_completed, joined_at, last_active_at,
      suspended_at, suspended_reason, suspended_by
    FROM sidequest_users WHERE id = ${targetUserId} LIMIT 1
  `) as UserRow[];
  if (userRows.length === 0) throw new Error("User not found.");
  const board = await loadSideQuestBoard(targetUserId);
  const [run, highRollerRun] = await Promise.all([
    getGameboardRun(targetUserId).catch(() => null),
    getGameboardRun(targetUserId, HIGHROLLER_EVENT_ID).catch(() => null)
  ]);
  const notifications = await listNotifications(targetUserId, { limit: 10 });
  return {
    user: toUser(userRows[0]),
    authUser: toAuthUser(userRows[0]),
    state: board.state,
    updatedAt: board.updatedAt,
    gameboardRun: run,
    highRollerRun,
    notifications
  };
}

export async function listRecentAdminAudit(limit = 50) {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const rows = (await sql`
    SELECT a.id, a.admin_id, a.target_user_id, a.action, a.payload, a.created_at,
           admin_u.username AS admin_username, target_u.username AS target_username
    FROM sidequest_admin_audit a
    LEFT JOIN sidequest_users admin_u ON admin_u.id = a.admin_id
    LEFT JOIN sidequest_users target_u ON target_u.id = a.target_user_id
    ORDER BY a.created_at DESC
    LIMIT ${Math.min(200, Math.max(1, limit))}
  `) as Array<{
    id: number;
    admin_id: string;
    target_user_id: string | null;
    action: string;
    payload: unknown;
    created_at: Date | string;
    admin_username: string | null;
    target_username: string | null;
  }>;
  return rows.map((row) => ({
    id: Number(row.id),
    adminId: row.admin_id,
    adminUsername: row.admin_username,
    targetUserId: row.target_user_id,
    targetUsername: row.target_username,
    action: row.action,
    payload: row.payload as Record<string, unknown> | null,
    createdAt: new Date(row.created_at).toISOString()
  }));
}

// ===========================================================================
// Daily Spin — once-per-day wheel of fortune.
// ===========================================================================

export type DailySpinStatus = {
  todayKey: string;
  available: boolean;
  prize:
    | null
    | {
        id: string;
        label: string;
        kind: "xp" | "dice" | "flips" | "sticker" | "jackpot";
        amount: number;
        spunAt: string;
        short: string;
      };
  recent: Array<{ dateKey: string; prizeId: string; spunAt: string }>;
  prizes: Array<{
    id: string;
    label: string;
    kind: "xp" | "dice" | "flips" | "sticker" | "jackpot";
    amount: number;
    color: string;
    textColor: string;
    short: string;
    weight: number;
  }>;
};

export type DailySpinResult = {
  status: DailySpinStatus;
  prize: SpinPrize;
  prizeIndex: number;
  rewardId: string | null;
};

function spinPrizeRow(prize: SpinPrize) {
  return {
    id: prize.id,
    label: prize.label,
    kind: prize.kind,
    amount: prize.amount,
    short: prize.short
  };
}

export async function getDailySpinStatus(userId: string): Promise<DailySpinStatus> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const key = todayKey();
  const rows = (await sql`
    SELECT date_key, prize_id, prize_kind, prize_amount, spun_at
    FROM sidequest_daily_spins
    WHERE user_id = ${userId}
    ORDER BY spun_at DESC
    LIMIT 14
  `) as Array<{
    date_key: string;
    prize_id: string;
    prize_kind: string;
    prize_amount: number;
    spun_at: Date | string;
  }>;
  const today = rows.find((r) => r.date_key === key);
  return {
    todayKey: key,
    available: !today,
    prize: today
      ? {
          id: today.prize_id,
          label: SPIN_PRIZES.find((p) => p.id === today.prize_id)?.label ?? today.prize_id,
          kind: today.prize_kind as "xp" | "dice" | "flips" | "sticker" | "jackpot",
          amount: today.prize_amount,
          spunAt: new Date(today.spun_at).toISOString(),
          short: SPIN_PRIZES.find((p) => p.id === today.prize_id)?.short ?? today.prize_id
        }
      : null,
    recent: rows.map((r) => ({
      dateKey: r.date_key,
      prizeId: r.prize_id,
      spunAt: new Date(r.spun_at).toISOString()
    })),
    prizes: SPIN_PRIZES.map((p) => ({
      id: p.id,
      label: p.label,
      kind: p.kind,
      amount: p.amount,
      color: p.color,
      textColor: p.textColor,
      short: p.short,
      weight: p.weight
    }))
  };
}

async function applySpinPrize(
  userId: string,
  prize: SpinPrize,
  attribution: { adminId?: string; awardedBy?: string }
): Promise<string | null> {
  let rewardId: string | null = null;

  if (prize.kind === "xp") {
    // XP boost: simple bump — we just record the gain via the reward shelf
    // as a small celebratory entry. (No global XP table yet.)
    await createNotification(userId, {
      kind: "daily-spin-won",
      title: `Daily spin · +${prize.amount} XP`,
      body: `Today's spin landed on +${prize.amount} XP. Nice.`,
      payload: { kind: prize.kind, amount: prize.amount },
      awardedBy: attribution.awardedBy
    });
  } else if (prize.kind === "dice") {
    for (let i = 0; i < prize.amount; i += 1) {
      await grantGameboardRoll(userId, GAMEBOARD_EVENT_ID);
    }
    await createNotification(userId, {
      kind: "daily-spin-won",
      title: `Daily spin · +${prize.amount} dice`,
      body: `Today's spin dropped ${prize.amount} bonus dice on your Spring Sprint board.`,
      payload: { kind: prize.kind, amount: prize.amount },
      awardedBy: attribution.awardedBy
    });
  } else if (prize.kind === "flips") {
    for (let i = 0; i < prize.amount; i += 1) {
      await grantGameboardRoll(userId, HIGHROLLER_EVENT_ID);
    }
    await createNotification(userId, {
      kind: "daily-spin-won",
      title: `Daily spin · +${prize.amount} flips`,
      body: `Today's spin dropped ${prize.amount} bonus flip tokens on your Coin Tower.`,
      payload: { kind: prize.kind, amount: prize.amount },
      awardedBy: attribution.awardedBy
    });
  } else if (prize.kind === "sticker") {
    const sticker = pickRandomSpinSticker();
    rewardId = `daily-spin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const board = await loadSideQuestBoard(userId);
    const reward: Reward = {
      id: rewardId,
      title: sticker.title,
      kind: "sticker",
      image: sticker.image,
      unlocked: true,
      note: "Won on the daily spin."
    };
    await saveSideQuestBoard(
      userId,
      { ...board.state, rewards: [reward, ...board.state.rewards] },
      "daily-spin-sticker"
    );
    await createNotification(userId, {
      kind: "daily-spin-won",
      title: `Daily spin · ${sticker.title}`,
      body: "A random sticker dropped from the wheel. It's pinned to your shelf.",
      payload: { kind: prize.kind, image: sticker.image, title: sticker.title },
      awardedBy: attribution.awardedBy
    });
  } else if (prize.kind === "jackpot") {
    const board = await loadSideQuestBoard(userId);
    const already = board.state.rewards.some((r) => r.id === SPIN_BADGE_JACKPOT.id);
    if (!already) {
      const reward: Reward = {
        id: SPIN_BADGE_JACKPOT.id,
        title: SPIN_BADGE_JACKPOT.title,
        kind: "badge",
        image: SPIN_BADGE_JACKPOT.image,
        unlocked: true,
        note: SPIN_BADGE_JACKPOT.note
      };
      await saveSideQuestBoard(
        userId,
        { ...board.state, rewards: [reward, ...board.state.rewards] },
        "daily-spin-jackpot"
      );
      rewardId = SPIN_BADGE_JACKPOT.id;
    }
    await createNotification(userId, {
      kind: "daily-spin-won",
      title: "JACKPOT.",
      body: SPIN_BADGE_JACKPOT.vibe,
      payload: { kind: prize.kind, image: SPIN_BADGE_JACKPOT.image, title: SPIN_BADGE_JACKPOT.title },
      awardedBy: attribution.awardedBy
    });
  }

  if (attribution.adminId) {
    await writeAudit(attribution.adminId, userId, "force-daily-spin", {
      prizeId: prize.id,
      kind: prize.kind,
      amount: prize.amount
    });
  }

  return rewardId;
}

export async function executeDailySpin(userId: string): Promise<DailySpinResult> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const key = todayKey();
  const existing = (await sql`
    SELECT 1 FROM sidequest_daily_spins
    WHERE user_id = ${userId} AND date_key = ${key} LIMIT 1
  `) as Array<{ "?column?": number }>;
  if (existing.length > 0) {
    throw new Error("You've already spun the wheel today. Come back tomorrow.");
  }
  const prize = pickSpinPrize();
  await sql`
    INSERT INTO sidequest_daily_spins (user_id, date_key, prize_id, prize_kind, prize_amount)
    VALUES (${userId}, ${key}, ${prize.id}, ${prize.kind}, ${prize.amount})
    ON CONFLICT (user_id, date_key) DO NOTHING
  `;
  const rewardId = await applySpinPrize(userId, prize, {});
  const status = await getDailySpinStatus(userId);
  const prizeIndex = SPIN_PRIZES.findIndex((p) => p.id === prize.id);
  return { status, prize, prizeIndex, rewardId };
}

/**
 * Admin: clear today's spin lock so the user can spin again. Used to
 * give someone a do-over (e.g. they got a bad prize on launch day).
 */
export async function adminResetDailySpin(adminId: string, userId: string): Promise<void> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const key = todayKey();
  await sql`
    DELETE FROM sidequest_daily_spins
    WHERE user_id = ${userId} AND date_key = ${key}
  `;
  await writeAudit(adminId, userId, "reset-daily-spin", { dateKey: key });
  await createNotification(userId, {
    kind: "daily-spin-won",
    title: "Daily spin reset",
    body: "An admin reset today's spin — go grab another go.",
    awardedBy: adminId
  });
}

/**
 * Admin: force-grant a spin to a user. Picks a prize server-side and
 * applies it just like a normal spin. If they already spun today, this
 * still runs (admin override) — we wipe today's lock first.
 */
export async function adminForceDailySpin(
  adminId: string,
  userId: string
): Promise<{ prizeId: string; prizeKind: string; amount: number }> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const key = todayKey();
  await sql`
    DELETE FROM sidequest_daily_spins
    WHERE user_id = ${userId} AND date_key = ${key}
  `;
  const prize = pickSpinPrize();
  await sql`
    INSERT INTO sidequest_daily_spins (user_id, date_key, prize_id, prize_kind, prize_amount)
    VALUES (${userId}, ${key}, ${prize.id}, ${prize.kind}, ${prize.amount})
  `;
  await applySpinPrize(userId, prize, { adminId, awardedBy: adminId });
  return { prizeId: prize.id, prizeKind: prize.kind, amount: prize.amount };
}

// ===========================================================================
// Combo multiplier — server-side peak tracking + auto-badge unlocks.
// ===========================================================================

const COMBO_BADGES: Record<number, { id: string; title: string; image: string; note: string; vibe: string }> = {
  5: {
    id: "badge-combo-5x",
    title: "Combo Streak — 5×",
    image: "/sticker-bolt.svg",
    note: "Cleared 5 quests in a 90-second window. The flow state is real.",
    vibe: "Five in a row. Feeling it."
  },
  10: {
    id: "badge-combo-10x",
    title: "Combo Streak — 10×",
    image: "/sticker-spark.svg",
    note: "Cleared 10 quests in a single combo window. Untouchable.",
    vibe: "Ten clean. Locked in."
  }
};

export type ComboReport = {
  peakCombo: number;
  totalCombos: number;
  newBadge: string | null;
};

export async function recordCombo(userId: string, combo: number): Promise<ComboReport> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  const safe = Math.max(1, Math.min(100, Math.floor(combo)));
  const rows = (await sql`
    UPDATE sidequest_users
    SET peak_combo = GREATEST(peak_combo, ${safe}),
        total_combos = total_combos + 1
    WHERE id = ${userId}
    RETURNING peak_combo, total_combos
  `) as Array<{ peak_combo: number; total_combos: number }>;

  const peak = rows[0]?.peak_combo ?? safe;
  const total = rows[0]?.total_combos ?? 1;

  // Auto-unlock combo badges on first cross of each threshold.
  let newBadge: string | null = null;
  for (const threshold of COMBO_BADGE_THRESHOLDS) {
    if (safe >= threshold) {
      const badge = COMBO_BADGES[threshold];
      if (!badge) continue;
      const board = await loadSideQuestBoard(userId);
      if (!board.state.rewards.some((r) => r.id === badge.id)) {
        const reward: Reward = {
          id: badge.id,
          title: badge.title,
          kind: "badge",
          image: badge.image,
          unlocked: true,
          note: badge.note
        };
        await saveSideQuestBoard(
          userId,
          { ...board.state, rewards: [reward, ...board.state.rewards] },
          `combo-badge-${threshold}`
        );
        await createNotification(userId, {
          kind: "combo-milestone",
          title: badge.title,
          body: badge.vibe,
          payload: { image: badge.image, title: badge.title, threshold, combo: safe }
        });
        newBadge = badge.id;
      }
    }
  }

  return { peakCombo: peak, totalCombos: total, newBadge };
}

export async function adminResetCombo(adminId: string, userId: string): Promise<void> {
  const sql = getSql();
  await ensureSideQuestSchema(sql);
  await sql`
    UPDATE sidequest_users
    SET peak_combo = 0, total_combos = 0
    WHERE id = ${userId}
  `;
  await writeAudit(adminId, userId, "reset-combo", null);
}

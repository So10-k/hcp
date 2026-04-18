import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  categoryMeta,
  categoryOptions,
  makeStarterState,
  mergeWithStarterState,
  type Category,
  type SideQuestBoard,
  type SideQuestState,
  type SideQuestUser
} from "../seed-data";

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
  })();

  return schemaPromise;
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
    favoriteCategory
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

  const adminRows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM sidequest_users
    WHERE role = 'admin'
  `) as Array<{ count: number }>;
  const role = adminRows[0]?.count === 0 ? "admin" : "member";

  const rows = (await sql`
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
      last_active_at
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
      users.last_active_at
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
    return {
      databaseReady: true,
      state: normalizeState(rows[0].state),
      updatedAt: new Date(rows[0].updated_at).toISOString()
    };
  }

  const starter = makeStarterState();
  return saveSideQuestBoard(userId, starter, "starter-board-created");
}

export async function saveSideQuestBoard(userId: string, state: SideQuestState, eventType = "save"): Promise<BoardLoadResult> {
  const sql = getSql();
  const normalized = mergeWithStarterState(state);
  const boardId = boardIdForUser(userId);

  await ensureSideQuestSchema(sql);
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
      last_active_at
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

export type Category = "school" | "creative" | "health" | "social" | "life admin";

export type Quest = {
  id: string;
  title: string;
  category: Category;
  dueLabel: string;
  xp: number;
  progress: number;
  completed: boolean;
  party: string[];
  steps: string[];
  focusPrompt: string;
  rewardTitle: string;
};

export type Reward = {
  id: string;
  title: string;
  kind: "badge" | "sticker";
  image: string;
  unlocked: boolean;
  note: string;
};

export type PartyMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
};

export type ActivityItem = {
  id: string;
  actor: string;
  text: string;
  time: string;
};

export type StreakDay = {
  day: string;
  completed: number;
  target: number;
};

export type BoardKind = "personal" | "party";

export type SideQuestBoard = {
  id: string;
  title: string;
  kind: BoardKind;
  inviteCode: string;
  members: PartyMember[];
  quests: Quest[];
  activity: ActivityItem[];
  createdAt: string;
};

export type SideQuestState = {
  quests: Quest[];
  rewards: Reward[];
  party: {
    inviteCode: string;
    members: PartyMember[];
  };
  activity: ActivityItem[];
  streak: StreakDay[];
  boards: SideQuestBoard[];
  activeBoardId: string;
};

export type SideQuestUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "member" | "admin";
  ageRange: string;
  schoolYear: string;
  favoriteCategory: Category;
  boardRole: string;
  questsCreated: number;
  questsCompleted: number;
  joinedAt: string;
  lastActiveAt: string;
};

export const categoryMeta: Record<
  Category,
  {
    label: string;
    short: string;
    className: string;
  }
> = {
  school: {
    label: "School",
    short: "SCH",
    className: "category-school"
  },
  creative: {
    label: "Creative",
    short: "ART",
    className: "category-creative"
  },
  health: {
    label: "Health",
    short: "FIT",
    className: "category-health"
  },
  social: {
    label: "Social",
    short: "SOC",
    className: "category-social"
  },
  "life admin": {
    label: "Life admin",
    short: "LIFE",
    className: "category-life"
  }
};

export const categoryOptions = Object.keys(categoryMeta) as Category[];

export const PERSONAL_BOARD_ID = "personal-board";

function makePersonalBoard(quests: Quest[] = [], activity: ActivityItem[] = []): SideQuestBoard {
  return {
    id: PERSONAL_BOARD_ID,
    title: "Personal board",
    kind: "personal",
    inviteCode: "PERSONAL",
    members: [],
    quests,
    activity:
      activity.length > 0
        ? activity
        : [
            {
              id: "activity-board-ready",
              actor: "SideQuest",
              text: "created your solo board.",
              time: "Now"
            }
          ],
    createdAt: "starter"
  };
}

function isBoardKind(value: unknown): value is BoardKind {
  return value === "personal" || value === "party";
}

function normalizeBoards(saved: Partial<SideQuestState>): SideQuestBoard[] {
  if (Array.isArray(saved.boards) && saved.boards.length > 0) {
    const boards = saved.boards
      .map((board, index) => {
        const safeKind = isBoardKind(board.kind) ? board.kind : index === 0 ? "personal" : "party";
        const safeId = typeof board.id === "string" && board.id.trim() ? board.id : `${safeKind}-${index}`;
        const safeTitle =
          typeof board.title === "string" && board.title.trim()
            ? board.title
            : safeKind === "personal"
              ? "Personal board"
              : "Party board";

        return {
          id: safeId,
          title: safeTitle,
          kind: safeId === PERSONAL_BOARD_ID ? "personal" : safeKind,
          inviteCode:
            typeof board.inviteCode === "string" && board.inviteCode.trim()
              ? board.inviteCode
              : safeKind === "personal"
                ? "PERSONAL"
                : "SQ-PARTY",
          members: Array.isArray(board.members) ? board.members : [],
          quests: Array.isArray(board.quests) ? board.quests : [],
          activity: Array.isArray(board.activity) ? board.activity : [],
          createdAt: typeof board.createdAt === "string" ? board.createdAt : "saved"
        } satisfies SideQuestBoard;
      })
      .filter((board) => board.id && board.title);

    return boards.some((board) => board.kind === "personal") ? boards : [makePersonalBoard(), ...boards];
  }

  return [makePersonalBoard(Array.isArray(saved.quests) ? saved.quests : [], Array.isArray(saved.activity) ? saved.activity : [])];
}

export function makeStarterState(): SideQuestState {
  const personalBoard = makePersonalBoard();

  return {
    quests: personalBoard.quests,
    rewards: [
      {
        id: "reward-first-clear",
        title: "First Clear",
        kind: "badge",
        image: "/sticker-star.svg",
        unlocked: false,
        note: "Clear a quest to unlock your first badge."
      },
      {
        id: "reward-party-spark",
        title: "Party Spark",
        kind: "sticker",
        image: "/sticker-bolt.svg",
        unlocked: false,
        note: "Invite someone into a shared quest."
      },
      {
        id: "reward-focus-flame",
        title: "Focus Flame",
        kind: "sticker",
        image: "/sticker-leaf.svg",
        unlocked: false,
        note: "Use focus mode and finish a sprint."
      },
      {
        id: "reward-boss-clear",
        title: "Boss Clear",
        kind: "badge",
        image: "/sticker-shield.svg",
        unlocked: false,
        note: "Clear a quest that has been sitting around too long."
      }
    ],
    party: {
      inviteCode: personalBoard.inviteCode,
      members: personalBoard.members
    },
    activity: personalBoard.activity,
    streak: [
      { day: "Mon", completed: 0, target: 1 },
      { day: "Tue", completed: 0, target: 1 },
      { day: "Wed", completed: 0, target: 1 },
      { day: "Thu", completed: 0, target: 1 },
      { day: "Fri", completed: 0, target: 1 },
      { day: "Sat", completed: 0, target: 1 },
      { day: "Sun", completed: 0, target: 1 }
    ],
    boards: [personalBoard],
    activeBoardId: PERSONAL_BOARD_ID
  };
}

export function mergeWithStarterState(saved: Partial<SideQuestState>): SideQuestState {
  const starter = makeStarterState();
  const boards = normalizeBoards(saved);
  const activeBoardId =
    typeof saved.activeBoardId === "string" && boards.some((board) => board.id === saved.activeBoardId)
      ? saved.activeBoardId
      : boards[0]?.id ?? PERSONAL_BOARD_ID;
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0] ?? starter.boards[0];

  return {
    quests: activeBoard.quests,
    rewards: Array.isArray(saved.rewards) ? saved.rewards : starter.rewards,
    party: {
      inviteCode: activeBoard.inviteCode,
      members: activeBoard.members
    },
    activity: activeBoard.activity,
    streak: Array.isArray(saved.streak) ? saved.streak : starter.streak,
    boards,
    activeBoardId
  };
}

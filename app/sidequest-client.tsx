"use client";

import Image from "next/image";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LteBanner } from "./components/lte-banner";
import { TutorialPlayer } from "./components/tutorial-player";
import { GAMEBOARD_LENGTH } from "./lib/gameboard-config";

const BOARD_TUTORIAL_SEEN_KEY = "sidequest_board_tutorial_seen_v1";
import {
  categoryMeta,
  categoryOptions,
  makeStarterState,
  mergeWithStarterState,
  PERSONAL_BOARD_ID,
  type Category,
  type Quest,
  type Reward,
  type SideQuestBoard,
  type SideQuestState
} from "./seed-data";

type LteRun = {
  position: number;
  rollsEarned: number;
  rollsUsed: number;
  rollsAvailable: number;
  laps: number;
  completedAt: string | null;
};

const defaultDraft = {
  title: "",
  category: "school" as Category,
  dueLabel: "This week",
  xp: 75,
  party: "Solo",
  steps: "Open the assignment\nMake the first draft\nShip the final version"
};

const questWizardSteps = [
  {
    id: "name",
    number: "01",
    label: "Name",
    title: "Name the quest",
    hint: "Make it sound like something worth clearing."
  },
  {
    id: "lane",
    number: "02",
    label: "Lane",
    title: "Pick the lane",
    hint: "Each lane gives the quest its color, reward, and board energy."
  },
  {
    id: "moves",
    number: "03",
    label: "Moves",
    title: "Break it down",
    hint: "Tiny checkpoints beat giant scary tasks every time."
  },
  {
    id: "party",
    number: "04",
    label: "Party",
    title: "Tune the co-op",
    hint: "Choose the crew and the XP weight."
  },
  {
    id: "launch",
    number: "05",
    label: "Launch",
    title: "Ready to post",
    hint: "One last check before it hits your board."
  }
] as const;

const duePresets = ["Today", "Tomorrow", "This week", "Weekend", "Next club meet"];
const xpPresets = [50, 75, 100, 125, 150];
const partyPresets = ["Solo", "Ava, Jay", "Mia, Leo", "Study squad"];

const categoryFlavor: Record<Category, string> = {
  school: "Homework, tests, applications, study sprints.",
  creative: "Art, music, videos, writing, builds.",
  health: "Movement, sleep, meals, sports, reset time.",
  social: "Clubs, events, hangouts, team plans.",
  "life admin": "Chores, inbox, errands, room resets."
};

const suggestedSteps: Record<Category, string[]> = {
  school: ["Open the rubric", "Do a 20 minute sprint", "Turn it in"],
  creative: ["Make the rough sketch", "Share a messy draft", "Polish the final"],
  health: ["Set up your gear", "Start the timer", "Log the win"],
  social: ["Ping the group", "Pick the meeting time", "Post the recap"],
  "life admin": ["Clear the first pile", "Send the message", "Check it off"]
};

type SyncStatus = "loading" | "live" | "saving" | "saved" | "error";

const confettiPieces = Array.from({ length: 24 }, (_, index) => ({
  id: `confetti-${index}`,
  x: 8 + ((index * 37) % 84),
  delay: (index % 7) * 55,
  rotation: (index * 41) % 240,
  color: ["#ff5a3d", "#ffd43d", "#44d7a8", "#5fc7f2", "#ff78b7"][index % 5]
}));

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function rewardForQuest(quest: Quest): Reward {
  return {
    id: `reward-${quest.id}`,
    title: quest.rewardTitle,
    kind: quest.category === "school" || quest.category === "social" ? "badge" : "sticker",
    image:
      quest.category === "health"
        ? "/sticker-leaf.png"
        : quest.category === "creative"
          ? "/sticker-spark.png"
          : quest.category === "social"
            ? "/sticker-bolt.png"
            : quest.category === "life admin"
              ? "/sticker-shield.png"
              : "/sticker-star.png",
    unlocked: true,
    note: `Unlocked by finishing "${quest.title}".`
  };
}

function bumpToday(streak: SideQuestState["streak"]) {
  const today = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];

  return streak.map((day) => {
    if (day.day !== today) {
      return day;
    }

    return {
      ...day,
      completed: Math.min(day.target, day.completed + 1)
    };
  });
}

function parseSteps(value: string) {
  const steps = value
    .split(/\n|,/)
    .map((step) => step.trim())
    .filter(Boolean)
    .slice(0, 5);

  return steps.length > 0 ? steps : ["Pick the first move", "Make progress", "Call it cleared"];
}

function syncBoardFields(state: SideQuestState, boards: SideQuestBoard[], activeBoardId: string): SideQuestState {
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? boards[0];

  return {
    ...state,
    boards,
    activeBoardId: activeBoard?.id ?? PERSONAL_BOARD_ID,
    quests: activeBoard?.quests ?? [],
    party: {
      inviteCode: activeBoard?.inviteCode ?? "PERSONAL",
      members: activeBoard?.members ?? []
    },
    activity: activeBoard?.activity ?? []
  };
}

export default function SideQuestClient() {
  const [state, setState] = useState<SideQuestState>(() => makeStarterState());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [focusQuestId, setFocusQuestId] = useState<string | null>(null);
  const [draft, setDraft] = useState(defaultDraft);
  const [confettiTitle, setConfettiTitle] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [partyNote, setPartyNote] = useState("");
  const [boardTitleDraft, setBoardTitleDraft] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showTutorial, setShowTutorial] = useState(true);
  const [lteRun, setLteRun] = useState<LteRun | null>(null);
  const [boardTutorialOpen, setBoardTutorialOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Auto-open the board tutorial the first time this user lands on /board.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(BOARD_TUTORIAL_SEEN_KEY);
      if (!seen) {
        setBoardTutorialOpen(true);
        window.localStorage.setItem(BOARD_TUTORIAL_SEEN_KEY, new Date().toISOString());
      }
    } catch {
      setBoardTutorialOpen(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gameboard", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { run?: LteRun } | null) => {
        if (cancelled || !data?.run) return;
        setLteRun(data.run);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function grantLteRoll() {
    if (!lteRun || lteRun.completedAt) return;
    fetch("/api/gameboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grant" })
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { run?: LteRun } | null) => {
        if (data?.run) setLteRun(data.run);
      })
      .catch(() => {});
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadBoard() {
      try {
        const response = await fetch("/api/sidequest", { cache: "no-store" });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;

          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }

          throw new Error(body?.detail ?? body?.error ?? "Board API did not respond cleanly.");
        }

        const board = (await response.json()) as {
          state: Partial<SideQuestState>;
          updatedAt: string;
        };

        if (isCancelled) {
          return;
        }

        setState(mergeWithStarterState(board.state));
        setUpdatedAt(board.updatedAt);
        setSyncStatus("live");
        setSyncError(null);
        setHasHydrated(true);
      } catch (error) {
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "SideQuest could not reach Neon.");
      }
    }

    void loadBoard();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(async () => {
      try {
        setSyncStatus("saving");
        const response = await fetch("/api/sidequest", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            state,
            eventType: "client-save"
          })
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;

          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }

          throw new Error(body?.detail ?? body?.error ?? "Board API did not save cleanly.");
        }

        const board = (await response.json()) as {
          updatedAt: string;
        };

        setUpdatedAt(board.updatedAt);
        setSyncStatus("saved");
        setSyncError(null);
      } catch (error) {
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "SideQuest could not save to Neon.");
      }
    }, 500);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [hasHydrated, state]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        setIsCreateOpen(false);
        setFocusQuestId(null);
        return;
      }

      if (isTyping) {
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setIsCreateOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!confettiTitle) {
      return;
    }

    const timer = window.setTimeout(() => setConfettiTitle(null), 2300);
    return () => window.clearTimeout(timer);
  }, [confettiTitle]);

  const activeBoard = useMemo(
    () =>
      state.boards.find((board) => board.id === state.activeBoardId) ??
      state.boards[0] ?? {
        id: PERSONAL_BOARD_ID,
        title: "Personal board",
        kind: "personal" as const,
        inviteCode: "PERSONAL",
        members: [],
        quests: [],
        activity: [],
        createdAt: "fallback"
      },
    [state.activeBoardId, state.boards]
  );
  const boardQuests = activeBoard.quests;
  const isPersonalBoard = activeBoard.kind === "personal";

  const filteredQuests = useMemo(() => {
    if (selectedCategory === "all") {
      return boardQuests;
    }

    return boardQuests.filter((quest) => quest.category === selectedCategory);
  }, [boardQuests, selectedCategory]);

  const activeCount = useMemo(() => boardQuests.filter((quest) => !quest.completed).length, [boardQuests]);
  const completedCount = boardQuests.length - activeCount;
  const totalXp = useMemo(
    () => boardQuests.reduce((sum, quest) => sum + (quest.completed ? quest.xp : 0), 0),
    [boardQuests]
  );
  const weeklyClears = useMemo(
    () => state.streak.reduce((sum, day) => sum + day.completed, 0),
    [state.streak]
  );
  const focusQuest = focusQuestId ? boardQuests.find((quest) => quest.id === focusQuestId) ?? null : null;

  function updateActiveBoard(updater: (board: SideQuestBoard) => SideQuestBoard) {
    setState((current) => {
      const activeId = current.boards.some((board) => board.id === current.activeBoardId)
        ? current.activeBoardId
        : current.boards[0]?.id ?? PERSONAL_BOARD_ID;
      const boards = current.boards.map((board) => (board.id === activeId ? updater(board) : board));

      return syncBoardFields(current, boards, activeId);
    });
  }

  function chooseBoard(boardId: string) {
    setSelectedCategory("all");
    setFocusQuestId(null);
    setPartyNote("");
    setState((current) => syncBoardFields(current, current.boards, boardId));
  }

  async function createPartyBoardFromTitle(titleInput: string) {
    const title = titleInput.trim() || "New party board";
    try {
      const response = await fetch("/api/party/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = (await response.json().catch(() => null)) as
        | { board?: SideQuestBoard; error?: string }
        | null;
      if (!response.ok || !data?.board) {
        setSyncError(data?.error || "Could not create party.");
        return;
      }
      const board = data.board;
      setState((current) => {
        const without = current.boards.filter((b) => b.inviteCode.toUpperCase() !== board.inviteCode.toUpperCase());
        return syncBoardFields(current, [...without, board], board.id);
      });
      setBoardTitleDraft("");
      setSelectedCategory("all");
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Could not create party.");
    }
  }

  function createPartyBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createPartyBoardFromTitle(boardTitleDraft);
  }

  async function joinPartyBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();

    if (!cleanCode || cleanCode === "PERSONAL") {
      setSyncError("Enter a valid invite code.");
      return;
    }

    const existing = state.boards.find((board) => board.inviteCode.toUpperCase() === cleanCode);
    if (existing) {
      chooseBoard(existing.id);
      setJoinCode("");
      setSyncError(null);
      return;
    }

    try {
      const response = await fetch("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode })
      });
      const data = (await response.json().catch(() => null)) as
        | { board?: SideQuestBoard; error?: string }
        | null;
      if (!response.ok || !data?.board) {
        setSyncError(data?.error || "We couldn't find a party with that code.");
        return;
      }
      const board = data.board;
      setState((current) => {
        const without = current.boards.filter((b) => b.inviteCode.toUpperCase() !== board.inviteCode.toUpperCase());
        return syncBoardFields(current, [...without, board], board.id);
      });
      setJoinCode("");
      setSelectedCategory("all");
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Could not join party.");
    }
  }

  function addProgress(questId: string, amount: number) {
    const quest = boardQuests.find((item) => item.id === questId);

    if (!quest || quest.completed) {
      return;
    }

    if (quest.progress + amount >= 100) {
      completeQuest(questId);
      return;
    }

    updateActiveBoard((board) => ({
      ...board,
      quests: board.quests.map((item) =>
        item.id === questId ? { ...item, progress: Math.min(100, item.progress + amount) } : item
      )
    }));
  }

  function completeQuest(questId: string) {
    const quest = boardQuests.find((item) => item.id === questId);

    if (!quest || quest.completed) {
      return;
    }

    const reward = rewardForQuest(quest);

    setState((current) => {
      const activeId = current.activeBoardId;
      const boards = current.boards.map((board) => {
        if (board.id !== activeId) {
          return board;
        }

        return {
          ...board,
          quests: board.quests.map((item) =>
            item.id === questId ? { ...item, progress: 100, completed: true } : item
          ),
          activity: [
            {
              id: makeId("activity"),
              actor: "You",
              text: `cleared "${quest.title}" and unlocked ${quest.rewardTitle}.`,
              time: "Just now"
            },
            ...board.activity
          ].slice(0, 8)
        };
      });

      return syncBoardFields(
        {
          ...current,
          rewards: current.rewards.some((item) => item.id === reward.id) ? current.rewards : [reward, ...current.rewards],
          streak: bumpToday(current.streak)
        },
        boards,
        activeId
      );
    });
    setConfettiTitle(quest.title);
    grantLteRoll();
  }

  function createQuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();

    if (!title) {
      return;
    }

    const steps = parseSteps(draft.steps);
    const party = draft.party
      .split(",")
      .map((member) => member.trim())
      .filter(Boolean);
    const questParty = isPersonalBoard ? ["Solo"] : party.length > 0 ? party : ["You"];

    const quest: Quest = {
      id: makeId("quest"),
      title,
      category: draft.category,
      dueLabel: draft.dueLabel.trim() || "This week",
      xp: Math.min(250, Math.max(10, Number.isFinite(draft.xp) ? draft.xp : 75)),
      progress: 0,
      completed: false,
      party: questParty,
      steps,
      focusPrompt: `Start with this: ${steps[0]}.`,
      rewardTitle: `${categoryMeta[draft.category].label} Clear`
    };

    updateActiveBoard((board) => ({
      ...board,
      quests: [quest, ...board.quests],
      activity: [
        {
          id: makeId("activity"),
          actor: "You",
          text:
            board.kind === "personal"
              ? `posted "${quest.title}" to the personal board.`
              : `posted "${quest.title}" to ${board.title}.`,
          time: "Just now"
        },
        ...board.activity
      ].slice(0, 8)
    }));
    setDraft(defaultDraft);
    setSelectedCategory("all");
    setIsCreateOpen(false);
  }

  async function refreshBoard() {
    setSyncStatus("loading");
    setSyncError(null);

    try {
      const response = await fetch("/api/sidequest", { cache: "no-store" });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        throw new Error(body?.detail ?? body?.error ?? "Board API did not respond cleanly.");
      }

      const board = (await response.json()) as { state: Partial<SideQuestState>; updatedAt: string };
      setState(mergeWithStarterState(board.state));
      setUpdatedAt(board.updatedAt);
      setSyncStatus("live");
      setHasHydrated(true);
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "SideQuest could not reach Neon.");
    }
  }

  async function copyInvite() {
    if (activeBoard.kind === "personal") {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeBoard.inviteCode);
    } catch {
      // The visible confirmation still helps when clipboard access is blocked.
    }

    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1600);
  }

  function postActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = partyNote.trim();

    if (!note) {
      return;
    }

    updateActiveBoard((board) => ({
      ...board,
      activity: [
        {
          id: makeId("activity"),
          actor: "You",
          text: note,
          time: "Just now"
        },
        ...board.activity
      ].slice(0, 8)
    }));
    setPartyNote("");
  }

  return (
    <main className="app-shell board-shell">
      <nav className="topbar" aria-label="Primary">
        <a className="brand-lockup" href="/dashboard" aria-label="SideQuest dashboard">
          <span className="brand-mark">SQ</span>
          <span>SideQuest</span>
        </a>
        <div className="nav-actions">
          <a href="/dashboard">Dashboard</a>
          <a href="#quests">Board</a>
          <a href="#party">Party</a>
          <a href="/admin">Admin</a>
          <SyncPill status={syncStatus} updatedAt={updatedAt} />
          <button type="button" className="ghost-button" onClick={refreshBoard}>
            Refresh
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setBoardTutorialOpen(true)}
            aria-label="Rewatch board tutorial"
          >
            ▶ Tutorial
          </button>
        </div>
      </nav>

      {lteRun && !lteRun.completedAt ? (
        <LteBanner
          rollsAvailable={lteRun.rollsAvailable}
          position={lteRun.position}
          length={GAMEBOARD_LENGTH}
        />
      ) : null}

      <section className="dashboard-shell" id="quests" aria-labelledby="dashboard-title">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">{isPersonalBoard ? "Solo board" : "Party board"}</p>
            <h2 id="dashboard-title">{activeBoard.title}</h2>
            {syncError ? <p className="sync-error">{syncError}</p> : null}
          </div>
          <div className="hud-strip" aria-label="Board stats">
            <span>
              <strong>{activeCount}</strong> active
            </span>
            <span>
              <strong>{completedCount}</strong> cleared
            </span>
            <span>
              <strong>{totalXp}</strong> XP
            </span>
            <span>
              <strong>{state.boards.length}</strong> boards
            </span>
          </div>
        </div>

        <BoardDock
          activeBoardId={activeBoard.id}
          boardTitleDraft={boardTitleDraft}
          boards={state.boards}
          joinCode={joinCode}
          onBoardTitleChange={setBoardTitleDraft}
          onChooseBoard={chooseBoard}
          onCreatePartyBoard={createPartyBoard}
          onJoinCodeChange={setJoinCode}
          onJoinPartyBoard={joinPartyBoard}
        />

        <div className="category-rail" aria-label="Quest categories">
          <button
            type="button"
            className={`category-tile category-all ${selectedCategory === "all" ? "is-active" : ""}`}
            data-mark="SQ"
            onClick={() => setSelectedCategory("all")}
            aria-pressed={selectedCategory === "all"}
          >
            <span>ALL</span>
            <strong>All quests</strong>
            <small>{boardQuests.length} total</small>
          </button>
          {categoryOptions.map((category) => {
            const meta = categoryMeta[category];
            const count = boardQuests.filter((quest) => quest.category === category).length;

            return (
              <button
                type="button"
                key={category}
                className={`category-tile ${meta.className} ${selectedCategory === category ? "is-active" : ""}`}
                data-mark={meta.short}
                onClick={() => setSelectedCategory(category)}
                aria-pressed={selectedCategory === category}
              >
                <span>{meta.short}</span>
                <strong>{meta.label}</strong>
                <small>{count} quests</small>
              </button>
            );
          })}
        </div>

        <div className="workspace-grid">
          <section className="quest-board" aria-label="Quest cards">
            <div className="section-heading">
              <div>
                <h2>
                  {selectedCategory === "all"
                    ? isPersonalBoard
                      ? "Today solo board"
                      : "Today party board"
                    : `${categoryMeta[selectedCategory].label} quests`}
                </h2>
                <p>
                  {isPersonalBoard
                    ? "This board stays private and solo. Make or join a party board when you want co-op."
                    : "Co-op space for shared quests. No public ranks, no follower counts."}
                </p>
              </div>
              <button type="button" className="primary-button small" onClick={() => setIsCreateOpen(true)}>
                New quest
              </button>
            </div>

            {showTutorial ? (
              <TutorialPanel
                activeBoard={activeBoard}
                boardCount={state.boards.length}
                onClose={() => setShowTutorial(false)}
                onCreateParty={() => {
                  createPartyBoardFromTitle("Study party");
                }}
                onCreateQuest={() => setIsCreateOpen(true)}
              />
            ) : null}

            {filteredQuests.length > 0 ? (
              <div className="quest-grid">
                {filteredQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onComplete={completeQuest}
                    onFocus={setFocusQuestId}
                    onProgress={addProgress}
                  />
                ))}
              </div>
            ) : (
              <EmptyState onCreate={() => setIsCreateOpen(true)} />
            )}
          </section>

          <aside className="side-panel-stack">
            <PartyPanel
              activeBoard={activeBoard}
              copied={inviteCopied}
              note={partyNote}
              onCopyInvite={copyInvite}
              onCreatePartyBoard={createPartyBoard}
              boardTitleDraft={boardTitleDraft}
              joinCode={joinCode}
              onBoardTitleChange={setBoardTitleDraft}
              onJoinCodeChange={setJoinCode}
              onJoinPartyBoard={joinPartyBoard}
              onNoteChange={setPartyNote}
              onPostActivity={postActivity}
            />
            <StreakPanel streak={state.streak} weeklyClears={weeklyClears} />
            <RewardShelf rewards={state.rewards} />
          </aside>
        </div>
      </section>

      {isCreateOpen ? (
        <CreateQuestModal
          draft={draft}
          boardKind={activeBoard.kind}
          boardTitle={activeBoard.title}
          onChange={setDraft}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={createQuest}
        />
      ) : null}

      {focusQuest ? (
        <FocusMode
          quest={focusQuest}
          onAddProgress={addProgress}
          onClose={() => setFocusQuestId(null)}
          onComplete={completeQuest}
        />
      ) : null}

      {confettiTitle ? <Confetti title={confettiTitle} /> : null}

      <TutorialPlayer
        open={boardTutorialOpen}
        onClose={() => setBoardTutorialOpen(false)}
        src="/sidequest-board-tutorial.mp4"
      />
    </main>
  );
}

function BoardDock({
  activeBoardId,
  boards,
  boardTitleDraft,
  joinCode,
  onBoardTitleChange,
  onChooseBoard,
  onCreatePartyBoard,
  onJoinCodeChange,
  onJoinPartyBoard
}: {
  activeBoardId: string;
  boards: SideQuestBoard[];
  boardTitleDraft: string;
  joinCode: string;
  onBoardTitleChange: (value: string) => void;
  onChooseBoard: (boardId: string) => void;
  onCreatePartyBoard: (event: FormEvent<HTMLFormElement>) => void;
  onJoinCodeChange: (value: string) => void;
  onJoinPartyBoard: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="board-dock" aria-label="Your SideQuest boards">
      <div className="board-tabs" role="list">
        {boards.map((board) => (
          <button
            type="button"
            role="listitem"
            key={board.id}
            className={`board-tab ${board.id === activeBoardId ? "is-active" : ""} ${
              board.kind === "personal" ? "is-personal" : "is-party"
            }`}
            onClick={() => onChooseBoard(board.id)}
            aria-pressed={board.id === activeBoardId}
          >
            <span>{board.kind === "personal" ? "Solo" : "Party"}</span>
            <strong>{board.title}</strong>
            <small>{board.kind === "personal" ? "No party tools" : board.inviteCode}</small>
          </button>
        ))}
      </div>

      <div className="board-join-console" aria-label="Create or join party boards">
        <form onSubmit={onCreatePartyBoard}>
          <label htmlFor="party-board-name">Create party board</label>
          <div>
            <input
              id="party-board-name"
              value={boardTitleDraft}
              onChange={(event) => onBoardTitleChange(event.target.value)}
              placeholder="Study party"
            />
            <button type="submit" className="primary-button small">
              Create
            </button>
          </div>
        </form>
        <form onSubmit={onJoinPartyBoard}>
          <label htmlFor="party-board-code">Join with code</label>
          <div>
            <input
              id="party-board-code"
              value={joinCode}
              onChange={(event) => onJoinCodeChange(event.target.value)}
              placeholder="SQ-CLUB-1234"
            />
            <button type="submit" className="secondary-button small">
              Join
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function TutorialPanel({
  activeBoard,
  boardCount,
  onClose,
  onCreateParty,
  onCreateQuest
}: {
  activeBoard: SideQuestBoard;
  boardCount: number;
  onClose: () => void;
  onCreateParty: () => void;
  onCreateQuest: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    {
      title: "Pick your board",
      text:
        activeBoard.kind === "personal"
          ? "You are on the solo board. Party tools stay off here."
          : `You are in ${activeBoard.title}. Everyone here works from the same quest list.`,
      done: activeBoard.kind === "personal" || boardCount > 1,
      action: "Switch above"
    },
    {
      title: "Build one tiny quest",
      text: "Press N or use the button. The builder walks you through name, lane, moves, XP, and launch.",
      done: activeBoard.quests.length > 0,
      action: "Open builder"
    },
    {
      title: "Go co-op when ready",
      text: "Create a party board or join with a code. Your personal board never gets party chat.",
      done: boardCount > 1,
      action: "Prep party"
    },
    {
      title: "Clear it",
      text: "Use Focus, add progress, complete the quest, and let the reward shelf wake up.",
      done: activeBoard.quests.some((quest) => quest.completed),
      action: "Use Focus"
    }
  ];
  const current = steps[activeStep];

  return (
    <section className="tutorial-panel" aria-labelledby="tutorial-title">
      <div>
        <p className="eyebrow">Interactive tutorial</p>
        <h3 id="tutorial-title">{current.title}</h3>
        <p>{current.text}</p>
      </div>
      <div className="tutorial-steps" aria-label="Tutorial steps">
        {steps.map((step, index) => (
          <button
            type="button"
            key={step.title}
            className={`${index === activeStep ? "is-active" : ""} ${step.done ? "is-done" : ""}`}
            onClick={() => setActiveStep(index)}
          >
            <span>{step.done ? "Done" : `0${index + 1}`}</span>
            <strong>{step.title}</strong>
          </button>
        ))}
      </div>
      <div className="tutorial-actions">
        {activeStep === 1 ? (
          <button type="button" className="primary-button small" onClick={onCreateQuest}>
            {current.action}
          </button>
        ) : null}
        {activeStep === 2 ? (
          <button type="button" className="primary-button small" onClick={onCreateParty}>
            {current.action}
          </button>
        ) : null}
        <button type="button" className="secondary-button small" onClick={() => setActiveStep((activeStep + 1) % steps.length)}>
          Next tip
        </button>
        <button type="button" className="ghost-button small" onClick={onClose}>
          Hide
        </button>
      </div>
    </section>
  );
}

function QuestCard({
  quest,
  onComplete,
  onFocus,
  onProgress
}: {
  quest: Quest;
  onComplete: (questId: string) => void;
  onFocus: (questId: string) => void;
  onProgress: (questId: string, amount: number) => void;
}) {
  const meta = categoryMeta[quest.category];

  return (
    <article className={`quest-card ${meta.className} ${quest.completed ? "is-complete" : ""}`}>
      <div className="quest-card-top">
        <span className="quest-chip">{meta.short}</span>
        <span>{quest.dueLabel}</span>
      </div>
      <div className="quest-card-art" aria-hidden="true">
        <span>{meta.short}</span>
        <i />
        <b />
      </div>
      <h3>{quest.title}</h3>
      <p className="quest-xp">{quest.xp} XP reward</p>

      <div className="progress-label">
        <span>Progress</span>
        <strong>{quest.progress}%</strong>
      </div>
      <div className="progress-meter" aria-hidden="true">
        <span style={{ width: `${quest.progress}%` }} />
      </div>

      <ul className="step-list">
        {quest.steps.slice(0, 3).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>

      <div className="party-row" aria-label="Quest party">
        {quest.party.slice(0, 4).map((member) => (
          <span key={member}>{member}</span>
        ))}
      </div>

      <div className="quest-actions">
        <button type="button" className="secondary-button small" onClick={() => onFocus(quest.id)}>
          Focus
        </button>
        <button type="button" className="ghost-button small" onClick={() => onProgress(quest.id, 25)} disabled={quest.completed}>
          +25%
        </button>
        <button type="button" className="primary-button small" onClick={() => onComplete(quest.id)} disabled={quest.completed}>
          {quest.completed ? "Cleared" : "Complete"}
        </button>
      </div>
    </article>
  );
}

function SyncPill({ status, updatedAt }: { status: SyncStatus; updatedAt: string | null }) {
  const copy: Record<SyncStatus, string> = {
    loading: "Loading sync",
    live: "Neon live",
    saving: "Saving",
    saved: "Saved",
    error: "Sync error"
  };

  const title = updatedAt ? `Last database save: ${new Date(updatedAt).toLocaleString()}` : "Waiting for Neon.";

  return (
    <span className={`sync-pill sync-${status}`} title={title}>
      {copy[status]}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-state">
      <Image src="/sticker-spark.png" alt="" width={92} height={92} />
      <h3>No quests in this lane yet.</h3>
      <p>Drop one tiny quest here and give your party something easy to rally around.</p>
      <button type="button" className="primary-button small" onClick={onCreate}>
        Create a quest
      </button>
    </div>
  );
}

function PartyPanel({
  activeBoard,
  boardTitleDraft,
  copied,
  joinCode,
  note,
  onBoardTitleChange,
  onCopyInvite,
  onCreatePartyBoard,
  onJoinCodeChange,
  onJoinPartyBoard,
  onNoteChange,
  onPostActivity
}: {
  activeBoard: SideQuestBoard;
  boardTitleDraft: string;
  copied: boolean;
  joinCode: string;
  note: string;
  onBoardTitleChange: (value: string) => void;
  onCopyInvite: () => void;
  onCreatePartyBoard: (event: FormEvent<HTMLFormElement>) => void;
  onJoinCodeChange: (value: string) => void;
  onJoinPartyBoard: (event: FormEvent<HTMLFormElement>) => void;
  onNoteChange: (value: string) => void;
  onPostActivity: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isPersonal = activeBoard.kind === "personal";

  return (
    <section className="info-panel party-panel" id="party" aria-labelledby="party-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{isPersonal ? "Solo safe zone" : "Co-op board"}</p>
          <h2 id="party-title">{isPersonal ? "Party tools" : "Party"}</h2>
        </div>
        {isPersonal ? null : (
          <button type="button" className="secondary-button small" onClick={onCopyInvite}>
            {copied ? "Copied" : "Copy invite"}
          </button>
        )}
      </div>

      {isPersonal ? (
        <div className="solo-party-note">
          <strong>Personal boards are solo only.</strong>
          <p>Create or join a party board when a quest needs friends, clubmates, or a study squad.</p>
        </div>
      ) : (
        <div className="invite-code" aria-label="Party invite code">
          {activeBoard.inviteCode}
        </div>
      )}

      <div className="party-board-actions">
        <form onSubmit={onCreatePartyBoard}>
          <label htmlFor="side-party-name">New party board</label>
          <div>
            <input
              id="side-party-name"
              value={boardTitleDraft}
              onChange={(event) => onBoardTitleChange(event.target.value)}
              placeholder="Club sprint"
            />
            <button type="submit" className="primary-button small">
              Create
            </button>
          </div>
        </form>
        <form onSubmit={onJoinPartyBoard}>
          <label htmlFor="side-party-code">Join party</label>
          <div>
            <input
              id="side-party-code"
              value={joinCode}
              onChange={(event) => onJoinCodeChange(event.target.value)}
              placeholder="SQ-..."
            />
            <button type="submit" className="secondary-button small">
              Join
            </button>
          </div>
        </form>
      </div>

      {!isPersonal ? (
        <div className="member-list">
          {activeBoard.members.map((member) => (
          <div className="member-row" key={member.id}>
            <span className="member-avatar" style={{ "--avatar": member.color } as CSSProperties}>
              {member.initials}
            </span>
            <span>
              <strong>{member.name}</strong>
              <small>{member.role}</small>
            </span>
          </div>
          ))}
        </div>
      ) : null}

      <div className="activity-panel" aria-label="Party activity">
        <h3>{isPersonal ? "Solo activity" : "Party activity"}</h3>
        {activeBoard.activity.map((item) => (
          <p key={item.id}>
            <strong>{item.actor}</strong> {item.text} <span>{item.time}</span>
          </p>
        ))}
      </div>

      {!isPersonal ? (
        <form className="party-note" onSubmit={onPostActivity}>
          <label htmlFor="party-note">Party chat placeholder</label>
          <div>
            <input
              id="party-note"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Drop a quick update"
            />
            <button type="submit" className="primary-button small">
              Post
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function StreakPanel({
  streak,
  weeklyClears
}: {
  streak: SideQuestState["streak"];
  weeklyClears: number;
}) {
  return (
    <section className="info-panel streak-panel" aria-labelledby="streak-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Weekly streak</p>
          <h2 id="streak-title">{weeklyClears} clears</h2>
        </div>
        <span className="mini-hud">7 day view</span>
      </div>
      <div className="week-grid">
        {streak.map((day) => {
          const fill = day.target === 0 ? 0 : Math.min(100, Math.round((day.completed / day.target) * 100));

          return (
            <div className="streak-day" key={day.day}>
              <div className="streak-bar" aria-label={`${day.day}: ${day.completed} of ${day.target} quests cleared`}>
                <span style={{ height: `${fill}%` }} />
              </div>
              <strong>{day.day}</strong>
              <small>
                {day.completed}/{day.target}
              </small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RewardShelf({ rewards }: { rewards: Reward[] }) {
  return (
    <section className="info-panel reward-panel" aria-labelledby="reward-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reward shelf</p>
          <h2 id="reward-title">Badges and stickers</h2>
        </div>
      </div>
      <div className="reward-grid">
        {rewards.map((reward) => (
          <article className={`reward-item ${reward.unlocked ? "" : "is-locked"}`} key={reward.id}>
            <Image src={reward.image} alt={`${reward.title} ${reward.kind}`} width={92} height={92} />
            <strong>{reward.title}</strong>
            <small>{reward.unlocked ? reward.note : "Locked until a matching quest is cleared."}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function CreateQuestModal({
  boardKind,
  boardTitle,
  draft,
  onChange,
  onClose,
  onSubmit
}: {
  boardKind: SideQuestBoard["kind"];
  boardTitle: string;
  draft: typeof defaultDraft;
  onChange: (draft: typeof defaultDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = questWizardSteps[stepIndex];
  const lastStepIndex = questWizardSteps.length - 1;
  const meta = categoryMeta[draft.category];
  const steps = parseSteps(draft.steps);
  const party = draft.party
    .split(",")
    .map((member) => member.trim())
    .filter(Boolean);
  const displayParty = party.length > 0 ? party : ["Solo"];
  const previewParty = boardKind === "personal" ? ["Solo"] : displayParty;
  const displayTitle = draft.title.trim() || "Untitled side quest";
  const displayDue = draft.dueLabel.trim() || "This week";
  const canAdvance = stepIndex > 0 || draft.title.trim().length > 0;

  function goToStep(index: number) {
    if (index > 0 && !draft.title.trim()) {
      return;
    }

    setStepIndex(index);
  }

  function goNext() {
    if (!canAdvance) {
      return;
    }

    setStepIndex((current) => Math.min(lastStepIndex, current + 1));
  }

  function addSuggestedStep(step: string) {
    const existingSteps = parseSteps(draft.steps).map((item) => item.toLowerCase());

    if (existingSteps.includes(step.toLowerCase())) {
      return;
    }

    onChange({
      ...draft,
      steps: `${draft.steps.trim() ? `${draft.steps.trim()}\n` : ""}${step}`
    });
  }

  function handleWizardKeyDown(event: ReactKeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement | null;
    const isTextArea = target?.tagName === "TEXTAREA";

    if (event.key === "Enter" && !isTextArea && stepIndex < lastStepIndex) {
      event.preventDefault();
      goNext();
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel quest-wizard-panel" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <form className="quest-wizard" onSubmit={onSubmit} onKeyDown={handleWizardKeyDown}>
          <header className="wizard-topline">
            <div>
              <p className="eyebrow">New side quest · {boardTitle}</p>
              <h2 id="create-title">Quest builder</h2>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close create quest">
              X
            </button>
          </header>

          <div className="wizard-body">
            <aside className="wizard-rail" aria-label="Quest setup steps">
              {questWizardSteps.map((step, index) => (
                <button
                  type="button"
                  key={step.id}
                  className={`wizard-step-button ${index === stepIndex ? "is-active" : ""} ${
                    index < stepIndex ? "is-complete" : ""
                  }`}
                  onClick={() => goToStep(index)}
                  aria-current={index === stepIndex ? "step" : undefined}
                >
                  <span>{step.number}</span>
                  <strong>{step.label}</strong>
                  <small>{step.hint}</small>
                </button>
              ))}
              <div className="wizard-keys" aria-label="Keyboard shortcut reminder">
                <span>N</span>
                <strong>opens builder</strong>
                <small>Enter moves ahead. Esc closes.</small>
              </div>
            </aside>

            <section className={`wizard-stage ${meta.className}`} aria-label={`${currentStep.label} step`}>
              <div className="wizard-screen">
                <p className="eyebrow">{currentStep.number} / 05</p>
                <h3>{currentStep.title}</h3>
                <p>{currentStep.hint}</p>

                {stepIndex === 0 ? (
                  <div className="wizard-step-content">
                    <label className="wizard-big-field">
                      <span>Quest name</span>
                      <input
                        autoFocus
                        value={draft.title}
                        onChange={(event) => onChange({ ...draft, title: event.target.value })}
                        placeholder="Crush biology packet"
                      />
                    </label>

                    <div className="wizard-chip-row" aria-label="Due date presets">
                      <strong>Due</strong>
                      {duePresets.map((due) => (
                        <button
                          type="button"
                          key={due}
                          className={draft.dueLabel === due ? "is-active" : ""}
                          onClick={() => onChange({ ...draft, dueLabel: due })}
                        >
                          {due}
                        </button>
                      ))}
                    </div>

                    <label className="wizard-compact-field">
                      <span>Custom due text</span>
                      <input
                        value={draft.dueLabel}
                        onChange={(event) => onChange({ ...draft, dueLabel: event.target.value })}
                        placeholder="Before Friday practice"
                      />
                    </label>
                  </div>
                ) : null}

                {stepIndex === 1 ? (
                  <div className="wizard-category-grid">
                    {categoryOptions.map((category) => {
                      const optionMeta = categoryMeta[category];

                      return (
                        <button
                          type="button"
                          key={category}
                          className={`wizard-category-tile ${optionMeta.className} ${
                            draft.category === category ? "is-active" : ""
                          }`}
                          onClick={() => onChange({ ...draft, category })}
                        >
                          <span>{optionMeta.short}</span>
                          <strong>{optionMeta.label}</strong>
                          <small>{categoryFlavor[category]}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {stepIndex === 2 ? (
                  <div className="wizard-step-content">
                    <div className="wizard-moves-grid">
                      <label className="wizard-big-field">
                        <span>Checkpoint list</span>
                        <textarea
                          value={draft.steps}
                          onChange={(event) => onChange({ ...draft, steps: event.target.value })}
                          rows={7}
                        />
                      </label>
                      <div className="wizard-live-list">
                        <strong>Preview</strong>
                        <ol>
                          {steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="wizard-chip-row" aria-label="Suggested checkpoint buttons">
                      <strong>Quick adds</strong>
                      {suggestedSteps[draft.category].map((step) => (
                        <button type="button" key={step} onClick={() => addSuggestedStep(step)}>
                          {step}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {stepIndex === 3 ? (
                  <div className="wizard-step-content">
                    {boardKind === "personal" ? (
                      <div className="wizard-solo-lock">
                        <strong>Solo locked</strong>
                        <p>Personal board quests stay private. Create or join a party board to add teammates.</p>
                      </div>
                    ) : (
                      <>
                        <label className="wizard-big-field">
                          <span>Party crew</span>
                          <input
                            value={draft.party}
                            onChange={(event) => onChange({ ...draft, party: event.target.value })}
                            placeholder="Ava, Jay"
                          />
                        </label>

                        <div className="wizard-chip-row" aria-label="Party presets">
                          <strong>Presets</strong>
                          {partyPresets.map((preset) => (
                            <button
                              type="button"
                              key={preset}
                              className={draft.party === preset ? "is-active" : ""}
                              onClick={() => onChange({ ...draft, party: preset })}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="wizard-xp-options" aria-label="XP reward presets">
                      {xpPresets.map((xp) => (
                        <button
                          type="button"
                          key={xp}
                          className={draft.xp === xp ? "is-active" : ""}
                          onClick={() => onChange({ ...draft, xp })}
                        >
                          <span>{xp}</span>
                          <strong>XP</strong>
                        </button>
                      ))}
                    </div>

                    <label className="wizard-compact-field">
                      <span>Custom XP</span>
                      <input
                        type="number"
                        min="10"
                        max="250"
                        value={draft.xp}
                        onChange={(event) => onChange({ ...draft, xp: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                ) : null}

                {stepIndex === 4 ? (
                  <div className="wizard-review">
                    <div className="wizard-review-card">
                      <span>{meta.short}</span>
                      <strong>{displayTitle}</strong>
                      <small>{displayDue}</small>
                    </div>
                    <div>
                      <h4>Launch check</h4>
                      <ul>
                        <li>{meta.label} lane selected</li>
                        <li>{steps.length} checkpoints ready</li>
                        <li>{previewParty.join(", ")} on the quest</li>
                        <li>{draft.xp} XP reward</li>
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <aside className={`wizard-preview ${meta.className}`} aria-label="Live quest card preview">
              <div className="wizard-preview-top">
                <span>{meta.short}</span>
                <strong>{displayDue}</strong>
              </div>
              <div className="wizard-preview-art" aria-hidden="true">
                <span>{meta.label}</span>
                <i />
                <b />
              </div>
              <h3>{displayTitle}</h3>
              <p>{draft.xp} XP reward</p>
              <div className="progress-label">
                <span>Ready</span>
                <strong>0%</strong>
              </div>
              <div className="progress-meter" aria-hidden="true">
                <span style={{ width: "12%" }} />
              </div>
              <ol>
                {steps.slice(0, 4).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="party-row" aria-label="Preview party members">
                {previewParty.slice(0, 4).map((member) => (
                  <span key={member}>{member}</span>
                ))}
              </div>
            </aside>
          </div>

          <footer className="wizard-controls">
            <button
              type="button"
              className="secondary-button"
              onClick={stepIndex === 0 ? onClose : () => setStepIndex((current) => Math.max(0, current - 1))}
            >
              {stepIndex === 0 ? "Cancel" : "Back"}
            </button>
            <div className="wizard-dots" aria-label="Wizard progress">
              {questWizardSteps.map((step, index) => (
                <span key={step.id} className={index <= stepIndex ? "is-active" : ""} />
              ))}
            </div>
            {stepIndex < lastStepIndex ? (
              <button type="button" className="primary-button" onClick={goNext} disabled={!canAdvance}>
                Next
              </button>
            ) : (
              <button type="submit" className="primary-button" disabled={!draft.title.trim()}>
                Launch quest
              </button>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}

function FocusMode({
  quest,
  onAddProgress,
  onClose,
  onComplete
}: {
  quest: Quest;
  onAddProgress: (questId: string, amount: number) => void;
  onClose: () => void;
  onComplete: (questId: string) => void;
}) {
  const meta = categoryMeta[quest.category];

  return (
    <div className="modal-backdrop focus-backdrop" role="presentation">
      <section className={`focus-panel ${meta.className}`} role="dialog" aria-modal="true" aria-labelledby="focus-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{meta.label} focus mode</p>
            <h2 id="focus-title">{quest.title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close focus mode">
            X
          </button>
        </div>

        <p className="focus-prompt">{quest.focusPrompt}</p>

        <div className="focus-progress">
          <span>{quest.progress}%</span>
          <div className="progress-meter" aria-hidden="true">
            <span style={{ width: `${quest.progress}%` }} />
          </div>
        </div>

        <ol className="focus-steps">
          {quest.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={() => onAddProgress(quest.id, 20)} disabled={quest.completed}>
            Add checkpoint
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              onComplete(quest.id);
              onClose();
            }}
            disabled={quest.completed}
          >
            Clear quest
          </button>
        </div>
      </section>
    </div>
  );
}

function Confetti({ title }: { title: string }) {
  return (
    <div className="confetti-layer" aria-live="polite" aria-label={`Quest cleared: ${title}`}>
      <div className="confetti-toast">Quest cleared: {title}</div>
      {confettiPieces.map((piece) => (
        <span
          key={piece.id}
          style={
            {
              "--x": `${piece.x}%`,
              "--delay": `${piece.delay}ms`,
              "--rotation": `${piece.rotation}deg`,
              "--confetti-color": piece.color
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

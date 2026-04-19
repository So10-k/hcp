export type GameboardTileKind = "start" | "corner" | "forward" | "back" | "plain";

export type GameboardTile = {
  kind: GameboardTileKind;
  label: string;
  glyph: string;
  row: number;
  col: number | string;
};

export const GAMEBOARD_EVENT_ID = "spring-sprint";
export const GAMEBOARD_EVENT_TITLE = "Spring Sprint";
export const GAMEBOARD_EVENT_SUBTITLE = "Limited time event";
export const GAMEBOARD_REWARD_ID = `reward-lte-${GAMEBOARD_EVENT_ID}`;
export const GAMEBOARD_REWARD_TITLE = "Spring Sprint Sticker";
export const GAMEBOARD_REWARD_IMAGE = "/sticker-star.png";
export const GAMEBOARD_REWARD_NOTE = "Looped the Spring Sprint board.";

// 26 tiles on an 8x8 perimeter. Tile 0 is a spotlighted Start/Finish banner that
// spans columns 4-6 of row 1.
const PATH: Array<[number, number | string]> = [
  [1, "4 / span 3"],                                              // 0 start/finish
  [1, 7], [1, 8],                                                  // 1-2
  [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8],          // 3-9
  [8, 7], [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1],          // 10-16
  [7, 1], [6, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1],          // 17-23
  [1, 2], [1, 3]                                                   // 24-25
];

const CORNERS = new Set([2, 9, 16, 23]);
const FORWARDS = new Set([4, 8, 13, 18]);
const BACKS = new Set([6, 11, 15, 20]);

export const GAMEBOARD_TILES: GameboardTile[] = PATH.map(([row, col], i) => {
  if (i === 0) return { kind: "start", label: "Start · Finish", glyph: "🏁", row, col };
  if (CORNERS.has(i)) return { kind: "corner", label: "Check", glyph: "◆", row, col };
  if (FORWARDS.has(i)) return { kind: "forward", label: "Jump", glyph: "→", row, col };
  if (BACKS.has(i)) return { kind: "back", label: "Slip", glyph: "←", row, col };
  return { kind: "plain", label: "", glyph: "", row, col };
});

export const GAMEBOARD_LENGTH = GAMEBOARD_TILES.length;

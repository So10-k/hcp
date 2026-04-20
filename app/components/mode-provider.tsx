"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PreferredMode } from "../lib/preferred-mode";

const ModeContext = createContext<PreferredMode>("playful");

export function ModeProvider({
  mode,
  children
}: {
  mode: PreferredMode;
  children: ReactNode;
}) {
  return <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>;
}

export function useMode(): PreferredMode {
  return useContext(ModeContext);
}

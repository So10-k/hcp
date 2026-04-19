"use client";

import { useState } from "react";
import { TutorialPlayer } from "./tutorial-player";

type Props = {
  variant?: "primary" | "pill";
  children?: React.ReactNode;
};

export function IntroTrigger({ variant = "primary", children }: Props) {
  const [open, setOpen] = useState(false);

  const label = children ?? (
    <>
      <span className="intro-trigger-icon" aria-hidden="true">▶</span>
      Watch the 25s intro
    </>
  );

  return (
    <>
      <button
        type="button"
        className={`intro-trigger intro-trigger-${variant}`}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <TutorialPlayer
        open={open}
        onClose={() => setOpen(false)}
        src="/sidequest-intro.mp4"
      />
    </>
  );
}

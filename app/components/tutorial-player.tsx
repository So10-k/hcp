"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  src?: string;
  duration?: number;
  /**
   * Seconds before the end of the video that the player should begin its
   * synchronized dismiss animation. Should match the composition's own
   * radial-collapse outro length. Tutorial reel ends with a 1.2s fade.
   */
  syncTail?: number;
};

export function TutorialPlayer({
  open,
  onClose,
  src = "/sidequest-tutorial.mp4",
  syncTail = 1.2
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Enter animation — mount → paint → add "is-open" next frame so the CSS
  // transition animates from the small/hidden state.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Autoplay on open. Try with sound first, fall back to muted if the
  // browser rejects the sound-enabled autoplay.
  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    setMuted(false);
    const tryPlay = v.play();
    if (tryPlay && typeof tryPlay.catch === "function") {
      tryPlay.catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    }
  }, [open]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
    if (v.duration - v.currentTime <= syncTail && !closing) {
      setClosing(true);
    }
  }, [closing, syncTail]);

  const handleEnded = useCallback(() => {
    // Let the sync-dismiss CSS finish before unmounting
    setTimeout(() => {
      setMounted(false);
      onClose();
    }, 120);
  }, [onClose]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const skip = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setClosing(true);
    setTimeout(() => {
      setMounted(false);
      onClose();
    }, 360);
  }, [onClose]);

  // Keyboard: Space toggles play, Escape skips
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") {
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, togglePlay, skip]);

  if (!open && !mounted) return null;

  return (
    <div
      className={`tutorial-overlay${mounted && open ? " is-visible" : ""}${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Spring Sprint tutorial"
    >
      <div className="tutorial-frame">
        <div className="tutorial-frame-head">
          <span className="tutorial-eyebrow">
            <span className="tutorial-dot" aria-hidden="true" />
            Tutorial · 25s
          </span>
          <button type="button" className="tutorial-skip" onClick={skip} aria-label="Skip tutorial">
            Skip ✕
          </button>
        </div>
        <div className="tutorial-video-wrap">
          <video
            ref={videoRef}
            src={src}
            className="tutorial-video"
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>
        <div className="tutorial-controls">
          <button
            type="button"
            className="tutorial-ctl tutorial-ctl-primary"
            onClick={togglePlay}
            aria-label={playing ? "Pause tutorial" : "Play tutorial"}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <div className="tutorial-progress" aria-hidden="true">
            <div className="tutorial-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <button
            type="button"
            className="tutorial-ctl"
            onClick={toggleMute}
            aria-label={muted ? "Unmute tutorial" : "Mute tutorial"}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "cc-lens-onboarded";

export function WelcomeOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      /* localStorage unavailable — skip overlay */
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* localStorage unavailable */
    }
    setShow(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to cc-lens"
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md mx-4 p-8 space-y-5">
        <h2 className="text-xl font-bold text-foreground font-mono">
          Welcome to cc-lens
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A real-time monitoring dashboard for{" "}
          <span className="font-semibold text-foreground">Claude Code</span>.
          Visualize your token usage, costs, sessions, and projects — all from
          your local{" "}
          <code className="text-xs bg-muted px-1 rounded">~/.claude/</code>{" "}
          directory.
        </p>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <span className="font-medium text-foreground">Zero cloud.</span>{" "}
            Your data never leaves this machine.
          </p>
          <p>
            <span className="font-medium text-foreground">Auto-refresh.</span>{" "}
            Dashboard updates every 5 seconds while open.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          autoFocus
        >
          Got it
        </button>
      </div>
    </div>
  );
}

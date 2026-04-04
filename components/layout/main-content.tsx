"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "cc-lens-sidebar";

export function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "collapsed") setCollapsed(true);

    function onToggle(e: Event) {
      const detail = (e as CustomEvent).detail;
      setCollapsed(detail.collapsed);
    }
    window.addEventListener("sidebar-toggle", onToggle);
    return () => window.removeEventListener("sidebar-toggle", onToggle);
  }, []);

  return (
    <main
      className={[
        "flex-1 min-h-screen overflow-x-hidden bg-background pb-16 md:pb-0 transition-all duration-200",
        collapsed ? "md:ml-14" : "md:ml-56",
      ].join(" ")}
    >
      {children}
    </main>
  );
}

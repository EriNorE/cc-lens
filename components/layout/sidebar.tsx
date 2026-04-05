"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  DollarSign,
  Wrench,
  Activity,
  History,
  ListTodo,
  FileText,
  Brain,
  Settings,
  Download,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const NAV = [
  { href: "/", label: "overview", icon: LayoutDashboard },
  { href: "/projects", label: "projects", icon: FolderOpen },
  { href: "/sessions", label: "sessions", icon: MessageSquare },
  { href: "/costs", label: "costs", icon: DollarSign },
  { href: "/tools", label: "tools", icon: Wrench },
  { href: "/activity", label: "activity", icon: Activity },
  { href: "/history", label: "history", icon: History },
  { href: "/todos", label: "todos", icon: ListTodo },
  { href: "/plans", label: "plans", icon: FileText },
  { href: "/memory", label: "memory", icon: Brain },
  { href: "/settings", label: "settings", icon: Settings },
  { href: "/export", label: "export", icon: Download },
];

const STORAGE_KEY = "cc-lens-sidebar";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "collapsed") setCollapsed(true); // eslint-disable-line react-hooks/set-state-in-effect -- hydration sync from localStorage
  }, []);

  function handleToggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
    // Notify layout to adjust margin
    window.dispatchEvent(
      new CustomEvent("sidebar-toggle", { detail: { collapsed: next } }),
    );
  }

  return (
    <aside
      className={[
        "hidden md:flex fixed left-0 top-0 h-screen flex-col border-r border-sidebar-border bg-sidebar z-40 transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      ].join(" ")}
    >
      <div className="px-3 pt-5 pb-4 border-b border-sidebar-border flex items-center justify-between min-h-[57px]">
        {!collapsed && (
          <span
            className="text-[#c2703a] text-[12px] leading-none whitespace-nowrap"
            style={{
              fontFamily: "var(--font-press-start)",
              WebkitTextStroke: "0.5px #c2703a",
              textShadow: "1px 1px 0 #7a3a1a",
            }}
          >
            Claude Code Lens
          </span>
        )}
        <button
          onClick={handleToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1.5 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-5 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={[
                "flex items-center gap-2.5 rounded-r text-base font-mono transition-colors relative",
                collapsed ? "justify-center px-2 py-3" : "px-4 py-3",
                active
                  ? "text-sidebar-primary bg-sidebar-accent border-l-2 border-l-sidebar-primary"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/80",
              ].join(" ")}
            >
              <Icon
                className={[
                  "w-4 h-4 shrink-0",
                  active
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/40",
                ].join(" ")}
              />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <p className="text-sm text-sidebar-foreground/50 font-mono">
            Made by Arindam
          </p>
        )}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="p-1.5 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

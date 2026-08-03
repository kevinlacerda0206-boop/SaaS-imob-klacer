"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface ColorTokens {
  bg: string;
  panel: string;
  ink: string;
  inkSoft: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  urgent: string;
  urgentSoft: string;
}

// Klacer.ia — tinta-azul-noite + latão. As duas variantes assumem a mesma
// identidade (mesmo hue de acento), só invertendo qual extremo é fundo.
const DARK: ColorTokens = {
  bg: "#0E1420",
  panel: "#161D2C",
  ink: "#EDEEF2",
  inkSoft: "#B9C0D4",
  muted: "#8891A6",
  border: "#232B3D",
  accent: "#C9A227",
  accentSoft: "rgba(201, 162, 39, 0.16)",
  onAccent: "#12172B",
  urgent: "#E0654A",
  urgentSoft: "rgba(224, 101, 74, 0.16)",
};

const LIGHT: ColorTokens = {
  bg: "#F4F3EF",
  panel: "#FFFFFF",
  ink: "#12172B",
  inkSoft: "#3B4258",
  muted: "#6B7280",
  border: "#E1E1DC",
  accent: "#A17915",
  accentSoft: "#F3E9CC",
  onAccent: "#FFFFFF",
  urgent: "#B3402E",
  urgentSoft: "#F6E3DE",
};

type Mode = "light" | "dark" | "system";
const STORAGE_KEY = "closer-theme-mode";

interface ThemeContextValue {
  colors: ColorTokens;
  resolved: "light" | "dark";
  mode: Mode;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("system");
  const [systemDark, setSystemDark] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Mode | null;
    if (stored === "light" || stored === "dark" || stored === "system") setModeState(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    setReady(true);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setMode = (m: Mode) => {
    setModeState(m);
    window.localStorage.setItem(STORAGE_KEY, m);
  };

  const colors = resolved === "dark" ? DARK : LIGHT;

  const value = useMemo(() => ({ colors, resolved, mode, setMode }), [colors, resolved, mode]);

  // Evita flash de tema errado no primeiro paint enquanto lê localStorage/matchMedia.
  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}

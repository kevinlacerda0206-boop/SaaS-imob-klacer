import type { ReactNode, CSSProperties } from "react";
import { useTheme } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";

export function useAuthStyles() {
  const { colors } = useTheme();

  const authInputStyle: CSSProperties = {
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "'Archivo', sans-serif",
    outline: "none",
    background: colors.panel,
    color: colors.ink,
  };

  const authButtonStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Archivo', sans-serif",
    background: colors.accent,
    color: colors.onAccent,
    cursor: "pointer",
  };

  return { colors, authInputStyle, authButtonStyle };
}

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <div
      style={{
        fontFamily: "'Archivo', sans-serif",
        background: colors.bg,
        color: colors.ink,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle />
      </div>
      <div style={{ width: "100%", maxWidth: 380, background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 24 }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, letterSpacing: 0.5, color: colors.accent }}>KLACER.IA</span>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 400, fontSize: 22, margin: "6px 0 18px" }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

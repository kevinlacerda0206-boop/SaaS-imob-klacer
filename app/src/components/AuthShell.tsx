import type { ReactNode, CSSProperties } from "react";
import { COLORS } from "@/lib/colors";

export const authInputStyle: CSSProperties = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "'Inter', sans-serif",
  outline: "none",
};

export const authButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 6,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'Inter', sans-serif",
  background: COLORS.emerald,
  color: "#fff",
  cursor: "pointer",
};

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: COLORS.bg,
        color: COLORS.ink,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, margin: "0 0 18px" }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

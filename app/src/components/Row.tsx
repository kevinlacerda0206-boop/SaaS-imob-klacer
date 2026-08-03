import { COLORS } from "@/lib/colors";
import type { ReactNode } from "react";

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 14 }}>
      <span
        style={{
          width: 68,
          flexShrink: 0,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: COLORS.muted,
          textTransform: "uppercase",
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <span style={{ color: COLORS.ink, lineHeight: 1.4, flex: 1 }}>{children}</span>
    </div>
  );
}

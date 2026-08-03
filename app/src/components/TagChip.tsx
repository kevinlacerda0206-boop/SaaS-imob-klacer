import { COLORS } from "@/lib/colors";

type Tone = "brass" | "emerald" | "urgent";

export function TagChip({
  label,
  tone = "brass",
  onClick,
  active = true,
}: {
  label: string;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}) {
  const palette: Record<Tone, { bg: string; fg: string }> = {
    brass: { bg: COLORS.brassSoft, fg: "#7A5F35" },
    emerald: { bg: COLORS.emeraldSoft, fg: COLORS.emerald },
    urgent: { bg: COLORS.urgentSoft, fg: COLORS.urgent },
  };
  const p = palette[tone];
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        padding: "3px 8px",
        borderRadius: 20,
        background: active ? p.bg : "transparent",
        color: active ? p.fg : COLORS.muted,
        border: active ? "none" : `1px dashed ${COLORS.border}`,
        textDecoration: active ? "none" : "line-through",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {label}
    </span>
  );
}

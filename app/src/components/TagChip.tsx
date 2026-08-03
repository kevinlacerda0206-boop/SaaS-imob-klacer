import { useTheme } from "@/lib/theme";

type Tone = "accent" | "urgent";

export function TagChip({
  label,
  tone = "accent",
  onClick,
  active = true,
}: {
  label: string;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}) {
  const { colors: COLORS } = useTheme();
  const palette: Record<Tone, { bg: string; fg: string }> = {
    accent: { bg: COLORS.accentSoft, fg: COLORS.accent },
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
        fontFamily: "'Roboto Mono', monospace",
        padding: "3px 8px",
        borderRadius: 4,
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

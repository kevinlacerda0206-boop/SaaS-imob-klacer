"use client";

import { Sun, Moon, MonitorSmartphone } from "lucide-react";
import { useTheme } from "@/lib/theme";

const OPTIONS = [
  { mode: "light" as const, icon: Sun, label: "Claro" },
  { mode: "system" as const, icon: MonitorSmartphone, label: "Automático" },
  { mode: "dark" as const, icon: Moon, label: "Escuro" },
];

export function ThemeToggle() {
  const { colors, mode, setMode } = useTheme();

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: 2,
      }}
    >
      {OPTIONS.map((o) => {
        const active = mode === o.mode;
        return (
          <button
            key={o.mode}
            onClick={() => setMode(o.mode)}
            title={o.label}
            aria-label={o.label}
            aria-pressed={active}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "none",
              background: active ? colors.accent : "transparent",
              color: active ? colors.onAccent : colors.muted,
              cursor: "pointer",
            }}
          >
            <o.icon size={13} />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { MessageCircle, Clock, LayoutGrid, User, Users, LifeBuoy, LogOut, X } from "lucide-react";
import { useTheme } from "@/lib/theme";

export type ViewId = "conversa" | "atencao" | "funil" | "perfil" | "equipe" | "suporte";

const MAIN_ITEMS: { id: ViewId; label: string; icon: typeof MessageCircle }[] = [
  { id: "conversa", label: "Conversa", icon: MessageCircle },
  { id: "atencao", label: "Precisa de atenção", icon: Clock },
  { id: "funil", label: "Funil de leads", icon: LayoutGrid },
];

const ACCOUNT_ITEMS: { id: ViewId; label: string; icon: typeof MessageCircle }[] = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "suporte", label: "Suporte", icon: LifeBuoy },
];

export function NavDrawer({
  open,
  onClose,
  view,
  onNavigate,
  attentionBadge,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  attentionBadge: number;
  onLogout: () => void;
}) {
  const { colors } = useTheme();

  const itemStyle = (active: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: 12,
    padding: "10px 10px",
    borderRadius: 8,
    border: "none",
    background: active ? colors.accentSoft : "transparent",
    color: active ? colors.accent : colors.ink,
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    fontFamily: "'Archivo', sans-serif",
    cursor: "pointer" as const,
    textAlign: "left" as const,
    position: "relative" as const,
  });

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s",
          zIndex: 40,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          width: 260,
          background: colors.panel,
          borderRight: `1px solid ${colors.border}`,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .22s ease",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          padding: "18px 14px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, paddingLeft: 6 }}>
          <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 0.2, color: colors.ink }}>KLACER.IA</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer", display: "flex" }} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {MAIN_ITEMS.map((item) => (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={itemStyle(view === item.id)}>
              <item.icon size={17} />
              {item.label}
              {item.id === "atencao" && attentionBadge > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: colors.urgent,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: "1px 7px",
                  }}
                >
                  {attentionBadge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ height: 1, background: colors.border, margin: "14px 6px" }} />

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ACCOUNT_ITEMS.map((item) => (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={itemStyle(view === item.id)}>
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <button
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 10px",
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: colors.muted,
            fontSize: 14,
            fontFamily: "'Archivo', sans-serif",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <LogOut size={17} />
          Sair
        </button>
      </aside>
    </>
  );
}

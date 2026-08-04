"use client";

import { STAGES } from "@/lib/colors";
import { fmtDate } from "@/lib/intent";
import { useTheme } from "@/lib/theme";
import type { Lead, Note } from "@/lib/types";
import { TagChip } from "./TagChip";

export function LeadDetailView({
  lead,
  notes,
  onChangeStage,
}: {
  lead: Lead;
  notes: Note[];
  onChangeStage: (leadId: string, stage: Lead["stage"]) => void;
}) {
  const { colors: COLORS } = useTheme();

  const selectStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "9px 12px",
    fontSize: 14,
    fontFamily: "'Archivo', sans-serif",
    outline: "none",
    background: COLORS.panel,
    color: COLORS.ink,
    width: "100%",
  };

  const labelStyle = {
    fontFamily: "'Roboto Mono', monospace",
    fontSize: 11,
    color: COLORS.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
    display: "block",
  };

  const leadNotes = notes.filter((n) => n.leadId === lead.id).slice().reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        {lead.phone && <div style={{ fontSize: 13.5, color: COLORS.inkSoft }}>{lead.phone}</div>}
        {lead.property && <div style={{ fontSize: 13.5, color: COLORS.inkSoft, marginTop: 2 }}>{lead.property}</div>}
        {!!(lead.tags || []).length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {lead.tags.map((t) => (
              <TagChip key={t} label={t} tone={t === "Aguardando retorno" ? "urgent" : "accent"} />
            ))}
          </div>
        )}
      </div>

      <div>
        <label style={labelStyle}>Estágio</label>
        <select value={lead.stage} onChange={(e) => onChangeStage(lead.id, e.target.value as Lead["stage"])} style={selectStyle}>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Histórico e notas</label>
        {leadNotes.length === 0 && <div style={{ fontSize: 13.5, color: COLORS.muted }}>Nenhum registro ainda.</div>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {leadNotes.map((n) => (
            <div key={n.id} style={{ fontSize: 13.5, padding: "10px 0", borderBottom: `1px solid ${COLORS.border}`, lineHeight: 1.5 }}>
              <span style={{ color: COLORS.muted, fontSize: 11.5, fontFamily: "'Roboto Mono', monospace", display: "block", marginBottom: 3 }}>
                {fmtDate(n.createdAt)}
              </span>
              {n.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

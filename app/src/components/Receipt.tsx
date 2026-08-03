"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { CADENCE_DAYS } from "@/lib/colors";
import { fmtDate, daysFromNow } from "@/lib/intent";
import { useTheme } from "@/lib/theme";
import type { Lead, WriteDraft, ConfirmPayload } from "@/lib/types";
import { TagChip } from "./TagChip";
import { Row } from "./Row";

export function Receipt({
  draft,
  leads,
  onConfirm,
  onCancel,
}: {
  draft: WriteDraft;
  leads: Lead[];
  onConfirm: (payload: ConfirmPayload) => void;
  onCancel: () => void;
}) {
  const { colors: COLORS } = useTheme();
  const inputStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: "5px 8px",
    fontSize: 14,
    fontFamily: "'Archivo', sans-serif",
    outline: "none",
    background: COLORS.panel,
    color: COLORS.ink,
  };

  const btnBase = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "9px 14px",
    borderRadius: 4,
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Archivo', sans-serif",
  };

  const lead = leads.find((l) => l.id === draft.matched_lead_id);
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState(draft.note_text || "");
  const [addTags, setAddTags] = useState(draft.tags_to_add || []);
  const [reminderOn, setReminderOn] = useState(!!draft.reminder?.create);
  const [days, setDays] = useState(draft.reminder?.due_in_days ?? 3);
  const [cadenceOn, setCadenceOn] = useState(!!draft.cadence);

  const toggleTag = (t: string) =>
    setAddTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div style={{ background: COLORS.panel, border: `1px dashed ${COLORS.accent}`, borderRadius: 4, padding: "18px 18px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, letterSpacing: 1, color: COLORS.accent, textTransform: "uppercase" }}>
          Confirmar registro
        </span>
        <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: COLORS.muted }}>
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, marginBottom: 12 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Row label="Lead">
          {lead ? (
            <span style={{ fontWeight: 600 }}>
              {lead.name} <span style={{ color: COLORS.muted, fontWeight: 400 }}>· {lead.property}</span>
            </span>
          ) : (
            <span style={{ color: COLORS.urgent }}>não identificado ({draft.lead_name_mentioned || "—"})</span>
          )}
        </Row>

        <Row label="Nota">
          {editing ? (
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ ...inputStyle, width: "100%", minHeight: 50, fontFamily: "'Archivo', sans-serif", resize: "vertical" }}
            />
          ) : (
            <span>{noteText}</span>
          )}
        </Row>

        {(addTags.length > 0 || (draft.tags_to_remove || []).length > 0) && (
          <Row label="Etiquetas">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {addTags.map((t) => (
                <TagChip key={t} label={`+ ${t}`} tone="accent" onClick={editing ? () => toggleTag(t) : undefined} />
              ))}
              {(draft.tags_to_remove || []).map((t) => (
                <TagChip key={t} label={`− ${t}`} tone="urgent" />
              ))}
            </div>
          </Row>
        )}

        {draft.visit && (
          <Row label="Visita">
            <span style={{ fontWeight: 600 }}>
              {new Date(draft.visit.dueAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} às{" "}
              {new Date(draft.visit.dueAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ color: COLORS.muted }}> — vai direto pro card do lead e pra agenda</span>
          </Row>
        )}

        <Row label="Follow-up">
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={cadenceOn}
                  onChange={(e) => {
                    setCadenceOn(e.target.checked);
                    if (e.target.checked) setReminderOn(false);
                  }}
                />
                cadência automática (sem retorno) — {CADENCE_DAYS.join(", ")} dias
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={reminderOn}
                  onChange={(e) => {
                    setReminderOn(e.target.checked);
                    if (e.target.checked) setCadenceOn(false);
                  }}
                  disabled={cadenceOn}
                />
                lembrete único em
                <input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  style={{ ...inputStyle, width: 46, padding: "3px 6px" }}
                  disabled={!reminderOn}
                />
                dias
              </label>
            </div>
          ) : cadenceOn ? (
            <span>Cadência automática — cobranças em {CADENCE_DAYS.join(", ")} dias</span>
          ) : reminderOn ? (
            <span>
              Lembrete único em {days} {days === 1 ? "dia" : "dias"} ({fmtDate(daysFromNow(days))})
            </span>
          ) : (
            <span style={{ color: COLORS.muted }}>nenhum</span>
          )}
        </Row>
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0 12px" }} />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={!lead}
          onClick={() =>
            onConfirm({
              leadId: lead?.id,
              noteText,
              tagsToAdd: addTags,
              tagsToRemove: draft.tags_to_remove || [],
              reminder: reminderOn ? { days } : null,
              cadence: cadenceOn,
              visit: draft.visit,
            })
          }
          style={{ ...btnBase, background: lead ? COLORS.accent : COLORS.border, color: lead ? COLORS.onAccent : COLORS.muted, cursor: lead ? "pointer" : "not-allowed", flex: 1 }}
        >
          <Check size={15} /> Confirmar
        </button>
        <button onClick={() => setEditing((v) => !v)} style={{ ...btnBase, background: COLORS.accentSoft, color: COLORS.ink }}>
          <Pencil size={15} /> {editing ? "Ok" : "Editar"}
        </button>
        <button onClick={onCancel} style={{ ...btnBase, background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}` }}>
          <X size={15} />
        </button>
      </div>
      {!lead && <p style={{ fontSize: 12, color: COLORS.urgent, marginTop: 10 }}>Não consegui identificar o lead com certeza — edite ou mencione o nome completo.</p>}
    </div>
  );
}

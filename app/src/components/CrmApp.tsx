"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Send, Check, Clock, ChevronRight, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { STAGES, CADENCE_DAYS } from "@/lib/colors";
import { uid, fmtDate, fmtTime, daysFromNow, extractIntent } from "@/lib/intent";
import type { Lead, Note, Reminder, ChatMessage, WriteDraft, ConfirmPayload } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { leadFromRow, noteFromRow, reminderFromRow } from "@/lib/supabase/mappers";
import { useTheme } from "@/lib/theme";
import { TagChip } from "./TagChip";
import { Receipt } from "./Receipt";
import { ThemeToggle } from "./ThemeToggle";
import { NavDrawer, type ViewId } from "./NavDrawer";

const TITLES: Record<ViewId, string> = {
  conversa: "Conversa",
  atencao: "Precisa de atenção",
  funil: "Funil de leads",
};

export default function CrmApp({
  initialLeads,
  initialNotes,
  initialReminders,
}: {
  initialLeads: Lead[];
  initialNotes: Note[];
  initialReminders: Reminder[];
}) {
  const { colors: COLORS } = useTheme();
  const supabase = createClient();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [view, setView] = useState<ViewId>("conversa");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadOrigin, setNewLeadOrigin] = useState("");
  const [newLeadProperty, setNewLeadProperty] = useState("");

  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<WriteDraft | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, draft]);

  const navigate = (v: ViewId) => {
    setView(v);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const changeStage = async (leadId: string, stage: Lead["stage"]) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));
    const { error } = await supabase.from("leads").update({ stage }).eq("id", leadId);
    if (error) setErrorMsg(`Falha ao atualizar estágio: ${error.message}`);
  };

  const toggleReminderDone = async (id: string) => {
    setReminders((prev) => prev.map((x) => (x.id === id ? { ...x, done: true } : x)));
    const { error } = await supabase.from("reminders").update({ done: true }).eq("id", id);
    if (error) setErrorMsg(`Falha ao concluir lembrete: ${error.message}`);
  };

  const createLead = async () => {
    if (!newLeadName.trim()) return;
    const { data, error } = await supabase
      .from("leads")
      .insert({
        name: newLeadName.trim(),
        phone: newLeadPhone.trim() || null,
        origin: newLeadOrigin.trim() || null,
        property_interest: newLeadProperty.trim() || null,
      })
      .select()
      .single();
    if (error || !data) {
      setErrorMsg(`Falha ao criar lead: ${error?.message}`);
      return;
    }
    setLeads((prev) => [leadFromRow(data), ...prev]);
    setNewLeadName("");
    setNewLeadPhone("");
    setNewLeadOrigin("");
    setNewLeadProperty("");
    setShowNewLead(false);
  };

  const handleSend = async () => {
    if (!input.trim() || processing) return;
    const message = input.trim();
    setChatLog((prev) => [...prev, { role: "user", text: message, id: uid("m"), time: fmtTime(Date.now()) }]);
    setInput("");
    setProcessing(true);
    setErrorMsg("");
    try {
      const result = await extractIntent(message, leads, notes, chatLog);
      if (result.mode === "answer") {
        setChatLog((prev) => [...prev, { role: "system", id: uid("s"), text: result.text, time: fmtTime(Date.now()) }]);
      } else {
        setDraft(result);
      }
    } catch (e) {
      setErrorMsg(`Não consegui interpretar agora. Detalhe técnico: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProcessing(false);
    }
  };

  const confirmDraft = async ({ leadId, noteText, tagsToAdd, tagsToRemove, reminder, cadence, visit }: ConfirmPayload) => {
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    const nextTags = (() => {
      const current = new Set(lead?.tags || []);
      tagsToRemove.forEach((t) => current.delete(t));
      tagsToAdd.forEach((t) => current.add(t));
      return [...current];
    })();

    const remindersToInsert: { lead_id: string; kind: Reminder["kind"]; text: string; due_at: string }[] = [];
    if (visit) {
      remindersToInsert.push({ lead_id: leadId, kind: "visita", text: "Visita agendada", due_at: new Date(visit.dueAt).toISOString() });
    }
    if (cadence) {
      remindersToInsert.push(
        ...CADENCE_DAYS.map((d) => ({
          lead_id: leadId,
          kind: "followup" as const,
          text: `Follow-up automático — sem retorno há ${d} dias`,
          due_at: new Date(daysFromNow(d)).toISOString(),
        }))
      );
    } else if (reminder) {
      remindersToInsert.push({ lead_id: leadId, kind: "followup", text: "Cobrar retorno", due_at: new Date(daysFromNow(reminder.days)).toISOString() });
    }

    const [{ data: noteRow, error: noteError }, { error: leadError }, { data: reminderRows, error: reminderError }] = await Promise.all([
      supabase.from("notes").insert({ lead_id: leadId, text: noteText }).select().single(),
      supabase.from("leads").update({ tags: nextTags }).eq("id", leadId),
      remindersToInsert.length
        ? supabase.from("reminders").insert(remindersToInsert).select()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (noteError || leadError || reminderError) {
      setErrorMsg(`Falha ao gravar: ${noteError?.message || leadError?.message || reminderError?.message}`);
      return;
    }

    if (noteRow) setNotes((prev) => [...prev, noteFromRow(noteRow)]);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, tags: nextTags } : l)));
    if (reminderRows?.length) setReminders((prev) => [...prev, ...reminderRows.map(reminderFromRow)]);

    const tagPart = tagsToAdd.length ? ` Etiquetas: ${tagsToAdd.join(", ")}.` : "";
    const visitPart = visit
      ? ` Visita agendada para ${fmtDate(visit.dueAt)} às ${fmtTime(visit.dueAt)} — já está no card e na agenda.`
      : "";
    const followPart = cadence
      ? ` Cadência de follow-up ativada (${CADENCE_DAYS.join(", ")} dias).`
      : reminder
      ? ` Lembrete criado para ${fmtDate(daysFromNow(reminder.days))}.`
      : "";
    setChatLog((prev) => [
      ...prev,
      { role: "system", id: uid("s"), text: `✓ Registrado com ${lead?.name}.${tagPart}${visitPart}${followPart}`, time: fmtTime(Date.now()) },
    ]);
    setDraft(null);
  };

  const todayFollowups = reminders
    .filter((r) => !r.done && r.kind !== "visita" && r.dueAt <= Date.now() + 86400000)
    .sort((a, b) => a.dueAt - b.dueAt);
  const upcomingVisits = reminders.filter((r) => !r.done && r.kind === "visita").sort((a, b) => a.dueAt - b.dueAt);
  const todayList = [...todayFollowups, ...upcomingVisits.filter((r) => r.dueAt <= Date.now() + 86400000)];

  return (
    <div
      style={{
        fontFamily: "'Archivo', sans-serif",
        background: COLORS.bg,
        color: COLORS.ink,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <NavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        view={view}
        onNavigate={navigate}
        attentionBadge={todayList.length}
        onLogout={handleLogout}
      />

      <header style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setMenuOpen(true)}
              style={{ background: "none", border: "none", color: COLORS.ink, cursor: "pointer", display: "flex", padding: 4 }}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, letterSpacing: 0.2 }}>KLACER.IA</span>
          </div>
          <ThemeToggle />
        </div>
        <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 400, fontSize: 22, margin: 0, letterSpacing: -0.2 }}>
          {TITLES[view]}
        </h1>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {view === "conversa" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {chatLog.length === 0 && !draft && (
              <div style={{ textAlign: "center", padding: "48px 12px 26px" }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 28, letterSpacing: -0.3, color: COLORS.ink }}>
                  KLACER.IA
                </div>
                <div style={{ fontSize: 13.5, color: COLORS.accent, marginTop: 6, marginBottom: 24 }}>A IA do corretor de imóveis</div>
                <div style={{ color: COLORS.muted, fontSize: 13.5, lineHeight: 1.6 }}>
                  Digite como se estivesse narrando pra alguém o que aconteceu — ou faça uma pergunta.
                  <div style={{ marginTop: 10, textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontStyle: "italic" }}>&quot;Fernanda é tráfego, procura casa mobiliada e iluminada, com vista pra mata&quot;</span>
                    <span style={{ fontStyle: "italic" }}>&quot;Ainda não tive retorno da Fernanda&quot;</span>
                    <span style={{ fontStyle: "italic" }}>&quot;Agendei visita com a Fernanda pra sexta às 15h&quot;</span>
                    <span style={{ fontStyle: "italic" }}>&quot;Quais as notas da Fernanda?&quot;</span>
                    <span style={{ fontStyle: "italic" }}>&quot;Quem eu preciso enviar opções?&quot;</span>
                  </div>
                </div>
              </div>
            )}
            {chatLog.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "46px 1fr",
                  gap: 10,
                  padding: "9px 0",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  borderLeft: m.role === "user" ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                  paddingLeft: m.role === "user" ? 10 : 0,
                  marginLeft: m.role === "user" ? -2 : 0,
                  color: m.role === "user" ? COLORS.ink : COLORS.inkSoft,
                }}
              >
                <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10.5, color: COLORS.muted, paddingTop: 2 }}>
                  {m.role === "system" ? "→" : m.time}
                </span>
                <span style={{ whiteSpace: "pre-line" }}>{m.text}</span>
              </div>
            ))}
            {processing && <div style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic", padding: "9px 0" }}>interpretando…</div>}
            {errorMsg && <div style={{ fontSize: 13, color: COLORS.urgent, padding: "9px 0" }}>{errorMsg}</div>}
            {draft && (
              <div style={{ paddingTop: 6 }}>
                <Receipt draft={draft} leads={leads} onConfirm={confirmDraft} onCancel={() => setDraft(null)} />
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        )}

        {view === "atencao" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Hoje e atrasados
              </div>
              {todayFollowups.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 16px", color: COLORS.muted, fontSize: 13.5 }}>Nada pendente por enquanto.</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayFollowups.map((r) => {
                  const lead = leads.find((l) => l.id === r.leadId);
                  const overdue = r.dueAt < Date.now() - 43200000;
                  return (
                    <div
                      key={r.id}
                      style={{ background: COLORS.panel, border: `1px solid ${overdue ? COLORS.urgent : COLORS.border}`, borderRadius: 6, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}
                    >
                      <Clock size={16} color={overdue ? COLORS.urgent : COLORS.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{lead?.name || "Lead"}</div>
                        <div style={{ fontSize: 13, color: COLORS.inkSoft, margin: "2px 0 4px" }}>{r.text}</div>
                        <div style={{ fontSize: 11.5, fontFamily: "'Roboto Mono', monospace", color: overdue ? COLORS.urgent : COLORS.muted }}>
                          {overdue ? "Atrasado · " : ""}
                          {fmtDate(r.dueAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleReminderDone(r.id)}
                        style={{ ...btnBase, background: COLORS.accentSoft, color: COLORS.accent, padding: "6px 10px" }}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Próximos compromissos
              </div>
              {upcomingVisits.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 16px", color: COLORS.muted, fontSize: 13.5 }}>Nenhuma visita agendada ainda.</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingVisits.map((r) => {
                  const lead = leads.find((l) => l.id === r.leadId);
                  return (
                    <div key={r.id} style={{ background: COLORS.accentSoft, borderRadius: 6, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Clock size={16} color={COLORS.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.accent }}>{lead?.name || "Lead"}</div>
                        <div style={{ fontSize: 13, color: COLORS.accent, margin: "2px 0 4px" }}>{r.text}</div>
                        <div style={{ fontSize: 11.5, fontFamily: "'Roboto Mono', monospace", color: COLORS.accent }}>
                          {new Date(r.dueAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} às {fmtTime(r.dueAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleReminderDone(r.id)}
                        style={{ ...btnBase, background: COLORS.panel, color: COLORS.accent, padding: "6px 10px" }}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === "funil" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {showNewLead ? (
              <div style={{ background: COLORS.panel, border: `1px dashed ${COLORS.accent}`, borderRadius: 6, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <input placeholder="Nome" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} style={inputStyle} />
                <input placeholder="Telefone" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} style={inputStyle} />
                <input placeholder="Origem (Tráfego, Indicação…)" value={newLeadOrigin} onChange={(e) => setNewLeadOrigin(e.target.value)} style={inputStyle} />
                <input placeholder="Imóvel de interesse" value={newLeadProperty} onChange={(e) => setNewLeadProperty(e.target.value)} style={inputStyle} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={createLead} style={{ ...btnBase, background: COLORS.accent, color: COLORS.onAccent, flex: 1 }}>
                    Adicionar
                  </button>
                  <button onClick={() => setShowNewLead(false)} style={{ ...btnBase, background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}` }}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewLead(true)}
                style={{ ...btnBase, background: COLORS.accentSoft, color: COLORS.accent, alignSelf: "flex-start" }}
              >
                + Novo lead
              </button>
            )}
            {STAGES.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage === stage.id);
              if (!stageLeads.length) return null;
              return (
                <div key={stage.id}>
                  <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, paddingLeft: 2 }}>
                    {stage.label} · {stageLeads.length}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead.id === selectedLead ? null : lead.id)}
                        style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 12, cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</div>
                            <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 1 }}>{lead.property}</div>
                            {!!(lead.tags || []).length && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                                {lead.tags.map((t) => (
                                  <TagChip key={t} label={t} tone={t === "Aguardando retorno" ? "urgent" : "accent"} />
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronRight
                            size={16}
                            color={COLORS.muted}
                            style={{ transform: selectedLead === lead.id ? "rotate(90deg)" : "none", transition: "transform .15s" }}
                          />
                        </div>

                        {selectedLead === lead.id && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }} onClick={(e) => e.stopPropagation()}>
                            <select
                              value={lead.stage}
                              onChange={(e) => changeStage(lead.id, e.target.value as Lead["stage"])}
                              style={{ ...inputStyle, width: "100%", marginBottom: 10 }}
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10.5, color: COLORS.muted, textTransform: "uppercase", marginBottom: 6 }}>
                              Histórico e notas
                            </div>
                            {notes.filter((n) => n.leadId === lead.id).length === 0 && (
                              <div style={{ fontSize: 13, color: COLORS.muted }}>Nenhum registro ainda.</div>
                            )}
                            {notes
                              .filter((n) => n.leadId === lead.id)
                              .slice()
                              .reverse()
                              .map((n) => (
                                <div key={n.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                                  <span style={{ color: COLORS.muted, fontSize: 11.5, fontFamily: "'Roboto Mono', monospace" }}>{fmtDate(n.createdAt)} — </span>
                                  {n.text}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {view === "conversa" && (
        <div style={{ padding: "10px 16px 16px" }}>
          <div style={{ display: "flex", gap: 8, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 24, padding: "6px 6px 6px 16px", alignItems: "center" }}>
            <button style={{ background: "none", border: "none", color: COLORS.accent, display: "flex", cursor: "pointer" }} title="Entrada por voz (ainda não implementada)">
              <Mic size={18} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite o que aconteceu ou pergunte algo…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "'Archivo', sans-serif", background: "transparent", color: COLORS.ink }}
            />
            <button
              onClick={handleSend}
              disabled={processing || !input.trim()}
              style={{ ...btnBase, borderRadius: "50%", width: 34, height: 34, padding: 0, background: COLORS.accent, color: COLORS.onAccent, opacity: processing || !input.trim() ? 0.5 : 1 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

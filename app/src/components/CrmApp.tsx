"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, Check, Clock, LayoutGrid, MessageCircle, ChevronRight, Building2 } from "lucide-react";
import { COLORS, STAGES, CADENCE_DAYS } from "@/lib/colors";
import { SEED_LEADS } from "@/lib/seed";
import { uid, fmtDate, daysFromNow, extractIntent, buildAnswer } from "@/lib/intent";
import type { Lead, Note, Reminder, ChatMessage, WriteDraft, ConfirmPayload } from "@/lib/types";
import { TagChip } from "./TagChip";
import { Receipt } from "./Receipt";

const STORAGE_KEY = "crm-data-v2";

const inputStyle = {
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  padding: "5px 8px",
  fontSize: 14,
  fontFamily: "'Inter', sans-serif",
  outline: "none",
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
  fontFamily: "'Inter', sans-serif",
};

type Tab = "conversa" | "atencao" | "funil";

export default function CrmApp() {
  const [leads, setLeads] = useState<Lead[]>(SEED_LEADS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tab, setTab] = useState<Tab>("conversa");
  const [loaded, setLoaded] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<WriteDraft | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLeads(parsed.leads?.length ? parsed.leads : SEED_LEADS);
        setNotes(parsed.notes || []);
        setReminders(parsed.reminders || []);
      }
    } catch {
      // sem dado salvo ainda — segue com o seed
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((nextLeads: Lead[], nextNotes: Note[], nextReminders: Reminder[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ leads: nextLeads, notes: nextNotes, reminders: nextReminders }));
    } catch (e) {
      console.error("Falha ao salvar", e);
    }
  }, []);

  useEffect(() => {
    if (loaded) persist(leads, notes, reminders);
  }, [leads, notes, reminders, loaded, persist]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, draft]);

  const changeStage = (leadId: string, stage: Lead["stage"]) =>
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));

  const handleSend = async () => {
    if (!input.trim() || processing) return;
    const message = input.trim();
    setChatLog((prev) => [...prev, { role: "user", text: message, id: uid("m") }]);
    setInput("");
    setProcessing(true);
    setErrorMsg("");
    try {
      const result = await extractIntent(message, leads);
      if (result.mode === "query") {
        const answer = buildAnswer(result, leads, notes);
        setChatLog((prev) => [...prev, { role: "system", id: uid("s"), text: answer }]);
      } else {
        setDraft(result);
      }
    } catch (e) {
      setErrorMsg(`Não consegui interpretar agora. Detalhe técnico: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProcessing(false);
    }
  };

  const confirmDraft = ({ leadId, noteText, tagsToAdd, tagsToRemove, reminder, cadence, visit }: ConfirmPayload) => {
    if (!leadId) return;
    const note: Note = { id: uid("n"), leadId, text: noteText, createdAt: Date.now() };
    setNotes((prev) => [...prev, note]);

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const current = new Set(l.tags || []);
        tagsToRemove.forEach((t) => current.delete(t));
        tagsToAdd.forEach((t) => current.add(t));
        return { ...l, tags: [...current] };
      })
    );

    const createdReminders: Reminder[] = [];
    if (visit) {
      createdReminders.push({ id: uid("r"), leadId, dueAt: visit.dueAt, text: "Visita agendada", done: false, kind: "visita" });
    }
    if (cadence) {
      createdReminders.push(
        ...CADENCE_DAYS.map((d) => ({
          id: uid("r"),
          leadId,
          dueAt: daysFromNow(d),
          text: `Follow-up automático — sem retorno há ${d} dias`,
          done: false,
          kind: "followup" as const,
        }))
      );
    } else if (reminder) {
      createdReminders.push({ id: uid("r"), leadId, dueAt: daysFromNow(reminder.days), text: "Cobrar retorno", done: false, kind: "followup" });
    }
    if (createdReminders.length) setReminders((prev) => [...prev, ...createdReminders]);

    const lead = leads.find((l) => l.id === leadId);
    const tagPart = tagsToAdd.length ? ` Etiquetas: ${tagsToAdd.join(", ")}.` : "";
    const visitPart = visit
      ? ` Visita agendada para ${fmtDate(visit.dueAt)} às ${new Date(visit.dueAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} — já está no card e na agenda.`
      : "";
    const followPart = cadence
      ? ` Cadência de follow-up ativada (${CADENCE_DAYS.join(", ")} dias).`
      : reminder
      ? ` Lembrete criado para ${fmtDate(daysFromNow(reminder.days))}.`
      : "";
    setChatLog((prev) => [...prev, { role: "system", id: uid("s"), text: `✓ Registrado com ${lead?.name}.${tagPart}${visitPart}${followPart}` }]);
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
        fontFamily: "'Inter', sans-serif",
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
      <header style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <Building2 size={18} color={COLORS.emerald} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.brass, letterSpacing: 1.5, textTransform: "uppercase" }}>
            MVP · etiquetas, notas e consultas
          </span>
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24, margin: 0, letterSpacing: -0.3 }}>
          {tab === "funil" && "Funil de leads"}
          {tab === "atencao" && "Precisa de atenção"}
          {tab === "conversa" && "Conversa"}
        </h1>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 90 }}>
        {tab === "funil" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STAGES.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage === stage.id);
              if (!stageLeads.length) return null;
              return (
                <div key={stage.id}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, paddingLeft: 2 }}>
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
                                  <TagChip key={t} label={t} tone={t === "Aguardando retorno" ? "urgent" : "brass"} />
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
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.muted, textTransform: "uppercase", marginBottom: 6 }}>
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
                                  <span style={{ color: COLORS.muted, fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtDate(n.createdAt)} — </span>
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

        {tab === "atencao" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
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
                      <Clock size={16} color={overdue ? COLORS.urgent : COLORS.brass} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{lead?.name || "Lead"}</div>
                        <div style={{ fontSize: 13, color: COLORS.inkSoft, margin: "2px 0 4px" }}>{r.text}</div>
                        <div style={{ fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: overdue ? COLORS.urgent : COLORS.muted }}>
                          {overdue ? "Atrasado · " : ""}
                          {fmtDate(r.dueAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, done: true } : x)))}
                        style={{ ...btnBase, background: COLORS.emeraldSoft, color: COLORS.emerald, padding: "6px 10px" }}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Próximos compromissos
              </div>
              {upcomingVisits.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 16px", color: COLORS.muted, fontSize: 13.5 }}>Nenhuma visita agendada ainda.</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingVisits.map((r) => {
                  const lead = leads.find((l) => l.id === r.leadId);
                  return (
                    <div key={r.id} style={{ background: COLORS.emeraldSoft, borderRadius: 6, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Clock size={16} color={COLORS.emerald} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.emerald }}>{lead?.name || "Lead"}</div>
                        <div style={{ fontSize: 13, color: COLORS.emerald, margin: "2px 0 4px" }}>{r.text}</div>
                        <div style={{ fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: COLORS.emerald }}>
                          {new Date(r.dueAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} às{" "}
                          {new Date(r.dueAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <button
                        onClick={() => setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, done: true } : x)))}
                        style={{ ...btnBase, background: COLORS.panel, color: COLORS.emerald, padding: "6px 10px" }}
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

        {tab === "conversa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {chatLog.length === 0 && !draft && (
              <div style={{ textAlign: "center", padding: "26px 12px", color: COLORS.muted, fontSize: 13.5, lineHeight: 1.6 }}>
                Digite como se estivesse narrando pra alguém o que aconteceu — ou faça uma pergunta.
                <div style={{ marginTop: 10, textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontStyle: "italic" }}>&quot;Fernanda é tráfego, procura casa mobiliada e iluminada, com vista pra mata&quot;</span>
                  <span style={{ fontStyle: "italic" }}>&quot;Ainda não tive retorno da Fernanda&quot;</span>
                  <span style={{ fontStyle: "italic" }}>&quot;Agendei visita com a Fernanda pra sexta às 15h&quot;</span>
                  <span style={{ fontStyle: "italic" }}>&quot;Quais as notas da Fernanda?&quot;</span>
                  <span style={{ fontStyle: "italic" }}>&quot;Quem eu preciso enviar opções?&quot;</span>
                </div>
              </div>
            )}
            {chatLog.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  background: m.role === "user" ? COLORS.emerald : COLORS.emeraldSoft,
                  color: m.role === "user" ? "#fff" : COLORS.emerald,
                  padding: "9px 13px",
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.4,
                  whiteSpace: "pre-line",
                }}
              >
                {m.text}
              </div>
            ))}
            {processing && <div style={{ alignSelf: "flex-start", fontSize: 13, color: COLORS.muted, fontStyle: "italic" }}>interpretando…</div>}
            {errorMsg && <div style={{ fontSize: 13, color: COLORS.urgent }}>{errorMsg}</div>}
            {draft && <Receipt draft={draft} leads={leads} onConfirm={confirmDraft} onCancel={() => setDraft(null)} />}
            <div ref={logEndRef} />
          </div>
        )}
      </main>

      {tab === "conversa" && (
        <div style={{ position: "sticky", bottom: 58, padding: "10px 16px", background: `linear-gradient(${COLORS.bg}00, ${COLORS.bg} 30%)` }}>
          <div style={{ display: "flex", gap: 8, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 24, padding: "6px 6px 6px 16px", alignItems: "center" }}>
            <button style={{ background: "none", border: "none", color: COLORS.brass, display: "flex", cursor: "pointer" }} title="Entrada por voz (ainda não implementada)">
              <Mic size={18} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite o que aconteceu ou pergunte algo…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "'Inter', sans-serif", background: "transparent" }}
            />
            <button
              onClick={handleSend}
              disabled={processing || !input.trim()}
              style={{ ...btnBase, borderRadius: "50%", width: 34, height: 34, padding: 0, background: COLORS.emerald, color: "#fff", opacity: processing || !input.trim() ? 0.5 : 1 }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <nav style={{ position: "sticky", bottom: 0, display: "flex", borderTop: `1px solid ${COLORS.border}`, background: COLORS.panel }}>
        {(
          [
            { id: "conversa", label: "Conversa", icon: MessageCircle, badge: 0 },
            { id: "atencao", label: "Atenção", icon: Clock, badge: todayList.length },
            { id: "funil", label: "Funil", icon: LayoutGrid, badge: 0 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 0 12px", background: "none", border: "none", color: tab === t.id ? COLORS.emerald : COLORS.muted, cursor: "pointer", position: "relative" }}
          >
            <t.icon size={19} />
            <span style={{ fontSize: 10.5, fontWeight: tab === t.id ? 600 : 500 }}>{t.label}</span>
            {!!t.badge && (
              <span style={{ position: "absolute", top: 4, right: "30%", background: COLORS.urgent, color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 8, padding: "1px 5px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

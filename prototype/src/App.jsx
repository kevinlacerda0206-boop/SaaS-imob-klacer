import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Send, Check, Pencil, X, Clock, LayoutGrid, MessageCircle, ChevronRight, Building2, Tag } from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

const COLORS = {
  bg: "#FBFAF6",
  panel: "#FFFFFF",
  ink: "#20241F",
  inkSoft: "#4B5148",
  border: "#E4E0D6",
  emerald: "#2F4A3B",
  emeraldSoft: "#E7EDE7",
  brass: "#B4915B",
  brassSoft: "#F3EAD6",
  success: "#4F7A5B",
  urgent: "#B15A3B",
  urgentSoft: "#F5E6DE",
  muted: "#8A8577",
};

const STAGES = [
  { id: "novo", label: "Novo" },
  { id: "atendimento", label: "Em atendimento" },
  { id: "proposta", label: "Proposta" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
];

const CADENCE_DAYS = [3, 5, 7, 30];

const SEED_LEADS = [
  { id: "l1", name: "João Marques", phone: "(11) 9xxxx-2210", property: "Alphaville 9", stage: "atendimento", tags: ["Tráfego", "Compra", "PV 5M"], createdAt: Date.now() - 86400000 * 6 },
  { id: "l2", name: "Fernanda Costa", phone: "(11) 9xxxx-4471", property: "Tamboré 4", stage: "novo", tags: ["Tráfego", "Locação"], createdAt: Date.now() - 86400000 * 2 },
  { id: "l3", name: "Ricardo Alves", phone: "(11) 9xxxx-8830", property: "Residencial Itahyê", stage: "proposta", tags: ["Indicação", "Compra", "PV 8M"], createdAt: Date.now() - 86400000 * 12 },
];

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function daysFromNow(n) {
  return Date.now() + n * 86400000;
}

function findLead(message, leads) {
  const lower = message.toLowerCase();
  let matched = null;
  let bestScore = 0;
  for (const lead of leads) {
    const parts = lead.name.toLowerCase().split(" ");
    for (const part of parts) {
      if (part.length > 2 && lower.includes(part) && part.length > bestScore) {
        bestScore = part.length;
        matched = lead;
      }
    }
  }
  return matched;
}

const WEEKDAYS = { domingo: 0, segunda: 1, terça: 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6, sabado: 6 };
const HOUR_WORDS = { uma: 1, duas: 2, dois: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, meio: 12 };

// Interpreta referências de dia/hora em português ("amanhã às 15h", "sexta às 10h30", "dia 12 às 14h")
// e devolve um timestamp, ou null se a mensagem não mencionar data/hora nenhuma.
function parseVisitDateTime(message) {
  const lower = message.toLowerCase();
  let base = new Date();
  let dayFound = false;

  if (/amanh[ãa]/.test(lower)) {
    base.setDate(base.getDate() + 1);
    dayFound = true;
  } else if (/\bhoje\b/.test(lower)) {
    dayFound = true;
  } else {
    for (const name of Object.keys(WEEKDAYS)) {
      if (lower.includes(name)) {
        const now = new Date();
        const diff = (WEEKDAYS[name] - now.getDay() + 7) % 7;
        base = new Date(now);
        base.setDate(now.getDate() + diff);
        dayFound = true;
        break;
      }
    }
  }

  const dayNumMatch = lower.match(/dia (\d{1,2})\b/);
  if (dayNumMatch) {
    const now = new Date();
    const n = parseInt(dayNumMatch[1], 10);
    base = new Date(now.getFullYear(), now.getMonth(), n);
    if (base < now) base.setMonth(base.getMonth() + 1);
    dayFound = true;
  }

  let hour = 9, minute = 0, timeFound = false;
  const timeMatch = lower.match(/(\d{1,2})h(\d{2})?/) || lower.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    timeFound = true;
  } else {
    for (const word of Object.keys(HOUR_WORDS)) {
      const re = new RegExp(`\\b${word}\\b`, "i");
      if (re.test(lower)) {
        hour = HOUR_WORDS[word];
        timeFound = true;
        if (/e meia/.test(lower)) minute = 30;
        break;
      }
    }
    if (timeFound && /tarde|noite/.test(lower) && hour < 12) hour += 12;
  }

  if (!dayFound && !timeFound) return null;

  base.setHours(hour, minute, 0, 0);
  return base.getTime();
}

// ————————————————————————————————————————————————————————————————
// SIMULADOR LOCAL — reproduz o comportamento da IA sem depender de chamada de
// rede, pra visualizar o fluxo completo mesmo no ambiente de teste do
// navegador. No app final essa classificação roda de verdade via IA no
// servidor — o que está aqui é um conjunto de regras simples só pra
// demonstrar a experiência ponta a ponta.
// ————————————————————————————————————————————————————————————————

function detectTagFromQuery(lower) {
  if (/enviar op[cç][õo]es|mandar op[cç][õo]es/.test(lower)) return "Enviar opções";
  if (/agendar visita|marcar visita/.test(lower)) return "Agendar visita";
  if (/sem retorno|aguardando retorno|n[aã]o retornou|n[aã]o respondeu/.test(lower)) return "Aguardando retorno";
  if (/tr[aá]fego/.test(lower)) return "Tráfego";
  if (/loca[cç][aã]o/.test(lower)) return "Locação";
  if (/compra/.test(lower)) return "Compra";
  return null;
}

function buildQueryDraft(message, leads) {
  const lower = message.toLowerCase();
  const matched = findLead(message, leads);

  if (matched && /(nota|prefere|procura|busca|o que.*quer)/i.test(message)) {
    return { mode: "query", queryKind: "notes", leadId: matched.id, leadName: matched.name };
  }

  const tag = detectTagFromQuery(lower);
  if (tag) {
    return { mode: "query", queryKind: "tag", tag };
  }

  return { mode: "query", queryKind: "unknown", raw: message };
}

function buildWriteDraft(message, leads) {
  const lower = message.toLowerCase();
  const matched = findLead(message, leads);

  const tagsToAdd = [];
  const tagsToRemove = [];

  // sem retorno → entra em cadência automática de follow-up
  const noResponse = /n[aã]o tive retorno|sem retorno|n[aã]o retornou|n[aã]o respondeu/i.test(message);
  if (noResponse) tagsToAdd.push("Aguardando retorno");

  // pendências de tarefa (enviar opções / agendar visita)
  const pendingEnviar = /(enviar op[cç][õo]es|mandar op[cç][õo]es)/i.test(message) && !/enviei|mandei/i.test(message);
  const completeEnviar = /(enviei|mandei)[^.]*op[cç][õo]es/i.test(message);
  if (pendingEnviar) tagsToAdd.push("Enviar opções");
  if (completeEnviar) tagsToRemove.push("Enviar opções");

  const pendingVisita = /(agendar visita|marcar visita)/i.test(message) && !/(agendei|marquei)/i.test(message);
  const completeVisita = /(agendei|marquei)[^.]*visita|visita (agendada|marcada)/i.test(message);
  if (pendingVisita) tagsToAdd.push("Agendar visita");

  let visit = null;
  if (completeVisita) {
    tagsToRemove.push("Agendar visita", "Enviar opções");
    const visitAt = parseVisitDateTime(message);
    if (visitAt) {
      tagsToAdd.push("Visita agendada");
      visit = { dueAt: visitAt };
    }
  }

  // etiquetas de origem / tipo / faixa de valor
  if (/tr[aá]fego/i.test(message)) tagsToAdd.push("Tráfego");
  if (/indica[cç][aã]o/i.test(message)) tagsToAdd.push("Indicação");
  if (/loca[cç][aã]o|aluguel/i.test(message)) tagsToAdd.push("Locação");
  if (/compra/i.test(message) && !completeEnviar) tagsToAdd.push("Compra");

  const valueMatch = message.match(/(\d+)\s*milh/i);
  if (valueMatch && /(pv|perfil valida)/i.test(message)) {
    tagsToAdd.push(`PV ${valueMatch[1]}M`);
  }

  // lembrete pontual (fora do fluxo de cadência por falta de retorno)
  const hasReminder = !noResponse && /lembr|cobr|retorno|follow/i.test(message);
  let days = null;
  const numMatch = message.match(/(\d+)\s*dia/);
  if (numMatch) days = parseInt(numMatch[1], 10);
  else if (/amanh[ãa]/i.test(message)) days = 1;
  else if (hasReminder) days = 3;

  // resumo/nota: a mensagem em si, cortando o trecho de lembrete quando identificável
  let noteText = message.trim();
  const splitIdx = message.search(/me lembr|lembra de|lembrete/i);
  if (splitIdx > 10) noteText = message.slice(0, splitIdx).trim().replace(/[,;]$/, "");

  return {
    mode: "write",
    matched_lead_id: matched ? matched.id : null,
    lead_name_mentioned: matched ? matched.name : "não identificado",
    note_text: noteText,
    tags_to_add: [...new Set(tagsToAdd)],
    tags_to_remove: [...new Set(tagsToRemove)],
    cadence: noResponse,
    visit,
    reminder: { create: hasReminder, due_in_days: hasReminder ? days : null, text: hasReminder ? "Cobrar retorno" : null },
  };
}

function classifyMessage(message, leads) {
  const trimmed = message.trim();
  const isQuestion = /\?\s*$/.test(trimmed) || /^(quem|quais|me (d[êe]|fala|mostra)|liste|mostra)/i.test(trimmed);
  return isQuestion ? buildQueryDraft(trimmed, leads) : buildWriteDraft(trimmed, leads);
}

async function extractIntent(message, leads) {
  await new Promise((r) => setTimeout(r, 450)); // simula tempo de processamento
  return classifyMessage(message, leads);
}

function buildAnswer(draft, leads, notes) {
  if (draft.queryKind === "notes") {
    const leadNotes = notes.filter((n) => n.leadId === draft.leadId);
    if (!leadNotes.length) return `Ainda não tenho nada registrado sobre ${draft.leadName}.`;
    return `O que já sei sobre ${draft.leadName}:\n` + leadNotes.slice().reverse().map((n) => `• ${n.text}`).join("\n");
  }
  if (draft.queryKind === "tag") {
    const matches = leads.filter((l) => (l.tags || []).includes(draft.tag));
    if (!matches.length) return `Nenhum lead com a etiqueta "${draft.tag}" no momento.`;
    return `Com a etiqueta "${draft.tag}":\n` + matches.map((l) => `• ${l.name} · ${l.property}`).join("\n");
  }
  return `Não entendi bem a pergunta. Tenta algo como "quais as notas da Fernanda" ou "quem eu preciso enviar opções".`;
}

// unused, mantida como referência pra reativar a chamada real de IA depois de
// validar em outro navegador (ver conversa sobre o erro no Safari/WebKit)
async function extractIntentViaAPI_unused(message, leads) {
  const leadList = leads.map((l) => `${l.id}: ${l.name} (${l.property})`).join("\n");
  const today = new Date().toISOString().slice(0, 10);
  const system = `Extraia da mensagem do corretor: lead mencionado, resumo da ação, etiquetas a adicionar/remover, e lembrete. Responda em JSON. Data: ${today}. Leads: ${leadList}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 500, system, messages: [{ role: "user", content: message }] }),
  });
  if (!res.ok) throw new Error(`Falha na API (status ${res.status})`);
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

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

function TagChip({ label, tone = "brass", onClick, active = true }) {
  const palette = {
    brass: { bg: COLORS.brassSoft, fg: "#7A5F35" },
    emerald: { bg: COLORS.emeraldSoft, fg: COLORS.emerald },
    urgent: { bg: COLORS.urgentSoft, fg: COLORS.urgent },
  }[tone];
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
        background: active ? palette.bg : "transparent",
        color: active ? palette.fg : COLORS.muted,
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

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 14 }}>
      <span style={{ width: 68, flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.muted, textTransform: "uppercase", paddingTop: 2 }}>
        {label}
      </span>
      <span style={{ color: COLORS.ink, lineHeight: 1.4, flex: 1 }}>{children}</span>
    </div>
  );
}

function Receipt({ draft, leads, onConfirm, onCancel }) {
  const lead = leads.find((l) => l.id === draft.matched_lead_id);
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState(draft.note_text || "");
  const [addTags, setAddTags] = useState(draft.tags_to_add || []);
  const [reminderOn, setReminderOn] = useState(!!draft.reminder?.create);
  const [days, setDays] = useState(draft.reminder?.due_in_days ?? 3);
  const [cadenceOn, setCadenceOn] = useState(!!draft.cadence);

  const toggleTag = (t) => setAddTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div style={{ background: COLORS.panel, border: `1px dashed ${COLORS.brass}`, borderRadius: 4, padding: "18px 18px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 1, color: COLORS.brass, textTransform: "uppercase" }}>
          Confirmar registro
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.muted }}>
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, marginBottom: 12 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Row label="Lead">
          {lead ? (
            <span style={{ fontWeight: 600 }}>{lead.name} <span style={{ color: COLORS.muted, fontWeight: 400 }}>· {lead.property}</span></span>
          ) : (
            <span style={{ color: COLORS.urgent }}>não identificado ({draft.lead_name_mentioned || "—"})</span>
          )}
        </Row>

        <Row label="Nota">
          {editing ? (
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} style={{ ...inputStyle, width: "100%", minHeight: 50, fontFamily: "'Inter', sans-serif", resize: "vertical" }} />
          ) : (
            <span>{noteText}</span>
          )}
        </Row>

        {(addTags.length > 0 || (draft.tags_to_remove || []).length > 0) && (
          <Row label="Etiquetas">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {addTags.map((t) => (
                <TagChip key={t} label={`+ ${t}`} tone="emerald" onClick={editing ? () => toggleTag(t) : undefined} />
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
                <input type="checkbox" checked={cadenceOn} onChange={(e) => { setCadenceOn(e.target.checked); if (e.target.checked) setReminderOn(false); }} />
                cadência automática (sem retorno) — {CADENCE_DAYS.join(", ")} dias
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={reminderOn} onChange={(e) => { setReminderOn(e.target.checked); if (e.target.checked) setCadenceOn(false); }} disabled={cadenceOn} />
                lembrete único em
                <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...inputStyle, width: 46, padding: "3px 6px" }} disabled={!reminderOn} />
                dias
              </label>
            </div>
          ) : cadenceOn ? (
            <span>Cadência automática — cobranças em {CADENCE_DAYS.join(", ")} dias</span>
          ) : reminderOn ? (
            <span>Lembrete único em {days} {days === 1 ? "dia" : "dias"} ({fmtDate(daysFromNow(days))})</span>
          ) : (
            <span style={{ color: COLORS.muted }}>nenhum</span>
          )}
        </Row>
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0 12px" }} />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={!lead}
          onClick={() => onConfirm({ leadId: lead?.id, noteText, tagsToAdd: addTags, tagsToRemove: draft.tags_to_remove || [], reminder: reminderOn ? { days } : null, cadence: cadenceOn, visit: draft.visit })}
          style={{ ...btnBase, background: lead ? COLORS.emerald : COLORS.border, color: lead ? "#fff" : COLORS.muted, cursor: lead ? "pointer" : "not-allowed", flex: 1 }}
        >
          <Check size={15} /> Confirmar
        </button>
        <button onClick={() => setEditing((v) => !v)} style={{ ...btnBase, background: COLORS.brassSoft, color: COLORS.ink }}>
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

export default function App() {
  const [leads, setLeads] = useState(SEED_LEADS);
  const [notes, setNotes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [tab, setTab] = useState("conversa");
  const [loaded, setLoaded] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const [chatLog, setChatLog] = useState([]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const logEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("crm-data-v2");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setLeads(parsed.leads?.length ? parsed.leads : SEED_LEADS);
          setNotes(parsed.notes || []);
          setReminders(parsed.reminders || []);
        }
      } catch (e) {
        // sem dado salvo ainda — segue com o seed
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (nextLeads, nextNotes, nextReminders) => {
    try {
      await window.storage.set("crm-data-v2", JSON.stringify({ leads: nextLeads, notes: nextNotes, reminders: nextReminders }));
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

  const changeStage = (leadId, stage) => setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));

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
      setErrorMsg(`Não consegui interpretar agora. Detalhe técnico: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const confirmDraft = ({ leadId, noteText, tagsToAdd, tagsToRemove, reminder, cadence, visit }) => {
    const note = { id: uid("n"), leadId, text: noteText, createdAt: Date.now() };
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

    let createdReminders = [];
    if (visit) {
      const v = { id: uid("r"), leadId, dueAt: visit.dueAt, text: "Visita agendada", done: false, kind: "visita" };
      createdReminders.push(v);
    }
    if (cadence) {
      createdReminders.push(...CADENCE_DAYS.map((d) => ({ id: uid("r"), leadId, dueAt: daysFromNow(d), text: `Follow-up automático — sem retorno há ${d} dias`, done: false, kind: "followup" })));
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

  const todayFollowups = reminders.filter((r) => !r.done && r.kind !== "visita" && r.dueAt <= Date.now() + 86400000).sort((a, b) => a.dueAt - b.dueAt);
  const upcomingVisits = reminders.filter((r) => !r.done && r.kind === "visita").sort((a, b) => a.dueAt - b.dueAt);
  const todayList = [...todayFollowups, ...upcomingVisits.filter((r) => r.dueAt <= Date.now() + 86400000)];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: COLORS.bg, color: COLORS.ink, minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{FONT_IMPORT}</style>

      <header style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <Building2 size={18} color={COLORS.emerald} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.brass, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Protótipo · etiquetas, notas e consultas
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
                          <ChevronRight size={16} color={COLORS.muted} style={{ transform: selectedLead === lead.id ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                        </div>

                        {selectedLead === lead.id && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }} onClick={(e) => e.stopPropagation()}>
                            <select value={lead.stage} onChange={(e) => changeStage(lead.id, e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 10 }}>
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.muted, textTransform: "uppercase", marginBottom: 6 }}>
                              Histórico e notas
                            </div>
                            {notes.filter((n) => n.leadId === lead.id).length === 0 && <div style={{ fontSize: 13, color: COLORS.muted }}>Nenhum registro ainda.</div>}
                            {notes.filter((n) => n.leadId === lead.id).slice().reverse().map((n) => (
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
                    <div key={r.id} style={{ background: COLORS.panel, border: `1px solid ${overdue ? COLORS.urgent : COLORS.border}`, borderRadius: 6, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Clock size={16} color={overdue ? COLORS.urgent : COLORS.brass} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{lead?.name || "Lead"}</div>
                        <div style={{ fontSize: 13, color: COLORS.inkSoft, margin: "2px 0 4px" }}>{r.text}</div>
                        <div style={{ fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: overdue ? COLORS.urgent : COLORS.muted }}>
                          {overdue ? "Atrasado · " : ""}{fmtDate(r.dueAt)}
                        </div>
                      </div>
                      <button onClick={() => setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, done: true } : x)))} style={{ ...btnBase, background: COLORS.emeraldSoft, color: COLORS.emerald, padding: "6px 10px" }}>
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
                          {new Date(r.dueAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} às {new Date(r.dueAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <button onClick={() => setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, done: true } : x)))} style={{ ...btnBase, background: COLORS.panel, color: COLORS.emerald, padding: "6px 10px" }}>
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
                  <span style={{ fontStyle: "italic" }}>"Fernanda é tráfego, procura casa mobiliada e iluminada, com vista pra mata"</span>
                  <span style={{ fontStyle: "italic" }}>"Ainda não tive retorno da Fernanda"</span>
                  <span style={{ fontStyle: "italic" }}>"Agendei visita com a Fernanda pra sexta às 15h"</span>
                  <span style={{ fontStyle: "italic" }}>"Quais as notas da Fernanda?"</span>
                  <span style={{ fontStyle: "italic" }}>"Quem eu preciso enviar opções?"</span>
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
            <button style={{ background: "none", border: "none", color: COLORS.brass, display: "flex", cursor: "pointer" }} title="Entrada por voz (demonstração em texto)">
              <Mic size={18} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite o que aconteceu ou pergunte algo…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "'Inter', sans-serif", background: "transparent" }}
            />
            <button onClick={handleSend} disabled={processing || !input.trim()} style={{ ...btnBase, borderRadius: "50%", width: 34, height: 34, padding: 0, background: COLORS.emerald, color: "#fff", opacity: processing || !input.trim() ? 0.5 : 1 }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <nav style={{ position: "sticky", bottom: 0, display: "flex", borderTop: `1px solid ${COLORS.border}`, background: COLORS.panel }}>
        {[
          { id: "conversa", label: "Conversa", icon: MessageCircle },
          { id: "atencao", label: "Atenção", icon: Clock, badge: todayList.length },
          { id: "funil", label: "Funil", icon: LayoutGrid },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 0 12px", background: "none", border: "none", color: tab === t.id ? COLORS.emerald : COLORS.muted, cursor: "pointer", position: "relative" }}>
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

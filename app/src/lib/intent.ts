import type { Lead, Note, Draft, WriteDraft, QueryDraft } from "./types";

// ————————————————————————————————————————————————————————————————
// SIMULADOR LOCAL — reproduz por regras de texto o comportamento que, no
// backend real, deve ser feito por um modelo de linguagem (ver
// /api/intent). Serve pra validar o fluxo de UI sem depender da API ainda.
// ————————————————————————————————————————————————————————————————

export function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function daysFromNow(n: number): number {
  return Date.now() + n * 86400000;
}

function findLead(message: string, leads: Lead[]): Lead | null {
  const lower = message.toLowerCase();
  let matched: Lead | null = null;
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

const WEEKDAYS: Record<string, number> = {
  domingo: 0, segunda: 1, terça: 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6, sabado: 6,
};
const HOUR_WORDS: Record<string, number> = {
  uma: 1, duas: 2, dois: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, meio: 12,
};

// Interpreta referências de dia/hora em português ("amanhã às 15h", "sexta às 10h30",
// "dia 12 às 14h") e devolve um timestamp, ou null se a mensagem não mencionar data/hora.
function parseVisitDateTime(message: string): number | null {
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

  let hour = 9;
  let minute = 0;
  let timeFound = false;
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

function detectTagFromQuery(lower: string): string | null {
  if (/enviar op[cç][õo]es|mandar op[cç][õo]es/.test(lower)) return "Enviar opções";
  if (/agendar visita|marcar visita/.test(lower)) return "Agendar visita";
  if (/sem retorno|aguardando retorno|n[aã]o retornou|n[aã]o respondeu/.test(lower)) return "Aguardando retorno";
  if (/tr[aá]fego/.test(lower)) return "Tráfego";
  if (/loca[cç][aã]o/.test(lower)) return "Locação";
  if (/compra/.test(lower)) return "Compra";
  return null;
}

function buildQueryDraft(message: string, leads: Lead[]): QueryDraft {
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

function buildWriteDraft(message: string, leads: Lead[]): WriteDraft {
  const matched = findLead(message, leads);

  const tagsToAdd: string[] = [];
  const tagsToRemove: string[] = [];

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

  let visit: { dueAt: number } | null = null;
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
  let days: number | null = null;
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

function classifyMessage(message: string, leads: Lead[]): Draft {
  const trimmed = message.trim();
  const isQuestion = /\?\s*$/.test(trimmed) || /^(quem|quais|me (d[êe]|fala|mostra)|liste|mostra)/i.test(trimmed);
  return isQuestion ? buildQueryDraft(trimmed, leads) : buildWriteDraft(trimmed, leads);
}

async function extractIntentLocal(message: string, leads: Lead[]): Promise<Draft> {
  await new Promise((r) => setTimeout(r, 450)); // simula tempo de processamento
  return classifyMessage(message, leads);
}

// Chama a extração real via Claude no servidor (/api/intent). Se a rota não
// estiver disponível ainda (ex: ANTHROPIC_API_KEY não configurada), cai de
// volta pro simulador local por regras, sem quebrar a experiência.
export async function extractIntent(message: string, leads: Lead[]): Promise<Draft> {
  try {
    const res = await fetch("/api/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        leads: leads.map((l) => ({ id: l.id, name: l.name, property: l.property })),
      }),
    });
    if (!res.ok) throw new Error(`API respondeu ${res.status}`);
    return (await res.json()) as Draft;
  } catch {
    return extractIntentLocal(message, leads);
  }
}

export function buildAnswer(draft: QueryDraft, leads: Lead[], notes: Note[]): string {
  if (draft.queryKind === "notes") {
    const leadNotes = notes.filter((n) => n.leadId === draft.leadId);
    if (!leadNotes.length) return `Ainda não tenho nada registrado sobre ${draft.leadName}.`;
    return (
      `O que já sei sobre ${draft.leadName}:\n` +
      leadNotes.slice().reverse().map((n) => `• ${n.text}`).join("\n")
    );
  }
  if (draft.queryKind === "tag") {
    const matches = leads.filter((l) => (l.tags || []).includes(draft.tag as string));
    if (!matches.length) return `Nenhum lead com a etiqueta "${draft.tag}" no momento.`;
    return `Com a etiqueta "${draft.tag}":\n` + matches.map((l) => `• ${l.name} · ${l.property}`).join("\n");
  }
  return `Não entendi bem a pergunta. Tenta algo como "quais as notas da Fernanda" ou "quem eu preciso enviar opções".`;
}

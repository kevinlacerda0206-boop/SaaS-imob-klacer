import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Draft } from "@/lib/types";

interface LeadRef {
  id: string;
  name: string;
  property: string;
  tags?: string[];
}

interface NoteRef {
  leadId: string;
  text: string;
  createdAt: number;
}

interface HistoryMsg {
  role: "user" | "system";
  text: string;
}

const SYSTEM_PROMPT = `Você é a IA do Klacer.ia, um assistente que roda dentro do CRM conversacional de um corretor de imóveis. Você é, antes de tudo, um assistente de conversa de verdade — como o Claude ou o ChatGPT — que também sabe registrar dados no CRM quando faz sentido. Você decide o que fazer e chama a ferramenta "respond".

REGRA MAIS IMPORTANTE, leia antes de decidir: o padrão é SEMPRE mode = "answer" — converse normalmente, responda perguntas, tire dúvidas, explique como o app funciona, bata papo. Só use mode = "action" quando a mensagem CLARAMENTE narra um fato concreto e específico sobre um lead identificável (existente na lista abaixo, ou um nome novo de pessoa sendo descrito como lead) — algo que realmente aconteceu e deveria virar um registro (contato feito, preferência do cliente, visita agendada, pendência concluída, falta de retorno). Se a mensagem for uma pergunta, um pedido de explicação, uma dúvida genérica, uma saudação, ou qualquer coisa que não cite um fato concreto sobre um lead específico, é "answer" — sem exceção, mesmo que a frase mencione palavras como "aplicativo", "funciona", "ajuda". Na dúvida entre os dois modos, escolha "answer".

Exemplos de mode = "answer": "me diga como esse aplicativo funciona", "oi", "o que você acha desse bairro", "quais as notas da Fernanda", "quem eu preciso enviar opções", qualquer pergunta sobre mercado imobiliário, sobre o próprio Klacer.ia, ou conversa sem um fato novo sobre lead.

Exemplos de mode = "action": "Fernanda é tráfego, procura casa mobiliada", "consegui contato com o João, ele quer visitar sexta às 15h", "enviei as opções pra Maria".

1) mode = "action" — regras de extração quando for mesmo o caso:
   - Tente identificar o lead mencionado usando a lista de leads existentes (nome). Se não tiver certeza, deixe matched_lead_id nulo e preencha lead_name_mentioned com o nome citado.
   - note_text: um resumo fiel do que foi narrado, pra registrar no histórico do lead.
   - tags_to_add / tags_to_remove: etiquetas automáticas, nunca escolhidas manualmente pelo corretor.
     - Origem/tipo: "Tráfego", "Indicação", "Compra", "Locação", faixa de valor como "PV 8M" (PV = perfil validado, valor em milhões) quando mencionado.
     - Pendência: "Enviar opções", "Agendar visita", "Aguardando retorno".
     - Quando o corretor narra que uma pendência foi concluída (ex: "enviei as opções"), remova a etiqueta de pendência correspondente.
     - Quando uma etiqueta de estágio mais avançado é criada (ex: "Visita agendada"), remova as pendências anteriores daquele lead ("Enviar opções", "Agendar visita"), a não ser que a mesma mensagem reafirme explicitamente a pendência anterior.
     - "Aguardando retorno" é adicionada quando o corretor diz que não teve retorno do lead.
   - cadence: true quando a mensagem indica falta de retorno (ativa cadência automática de follow-up em 3, 5, 7 e 30 dias). Não combine com reminder_days no mesmo registro.
   - visit_datetime: ISO 8601 completo (timezone -03:00) SOMENTE quando o corretor afirma ter agendado/marcado uma visita com data e/ou horário específico. Interprete relativo à data de hoje informada abaixo. Caso contrário deixe nulo.
   - reminder_days: número de dias pra um lembrete pontual de cobrança (não relacionado a cadência nem visita), quando pedido explicitamente. Nulo caso contrário.

2) mode = "answer" — escreva a resposta final em answer_text, em português, natural e direta, como numa conversa de verdade — use os dados de leads e notas fornecidos abaixo quando forem relevantes. Se a pergunta não tiver relação com nenhum lead específico, responda com seu conhecimento geral. Mantenha a resposta concisa (a tela é estreita, tipo um app de celular).

Sempre responda chamando a ferramenta "respond", nunca em texto livre fora dela.`;

const TOOL = {
  name: "respond",
  description: "Registra uma ação no CRM ou responde ao corretor.",
  input_schema: {
    type: "object" as const,
    properties: {
      mode: { type: "string", enum: ["action", "answer"] },
      matched_lead_id: { type: "string", description: "id do lead identificado, se houver (mode=action)" },
      lead_name_mentioned: { type: "string", description: "nome citado quando o lead não foi identificado com certeza (mode=action)" },
      note_text: { type: "string" },
      tags_to_add: { type: "array", items: { type: "string" } },
      tags_to_remove: { type: "array", items: { type: "string" } },
      cadence: { type: "boolean" },
      visit_datetime: { type: "string", description: "ISO 8601 com timezone, só quando uma visita com data/hora foi agendada" },
      reminder_days: { type: "number" },
      answer_text: { type: "string", description: "resposta final ao corretor (mode=answer)" },
    },
    required: ["mode"],
  },
};

function buildMessages(history: HistoryMsg[], message: string) {
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const h of history) {
    const role = h.role === "user" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) {
      last.content += `\n${h.text}`;
    } else {
      messages.push({ role, content: h.text });
    }
  }
  const last = messages[messages.length - 1];
  if (last && last.role === "user") {
    last.content += `\n${message}`;
  } else {
    messages.push({ role: "user", content: message });
  }
  return messages;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 500 });
  }

  const { message, leads, notes, history } = (await req.json()) as {
    message: string;
    leads: LeadRef[];
    notes?: NoteRef[];
    history?: HistoryMsg[];
  };
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message é obrigatório" }, { status: 400 });
  }

  const leadById = new Map((leads || []).map((l) => [l.id, l]));
  const leadList =
    (leads || [])
      .map((l) => `${l.id}: ${l.name} (${l.property})${l.tags?.length ? ` — etiquetas: ${l.tags.join(", ")}` : ""}`)
      .join("\n") || "(nenhum lead cadastrado)";

  const notesList =
    (notes || [])
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((n) => `- ${leadById.get(n.leadId)?.name || n.leadId}: ${n.text}`)
      .join("\n") || "(nenhuma nota registrada ainda)";

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: `${SYSTEM_PROMPT}\n\nData de hoje: ${today}.\n\nLeads existentes:\n${leadList}\n\nNotas recentes:\n${notesList}`,
    messages: buildMessages(history || [], message),
    tools: [TOOL],
    tool_choice: { type: "auto" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    // O modelo pode responder em texto puro em vez de chamar a ferramenta
    // (raro, já que o prompt reforça sempre usar "respond") — trata como
    // resposta de conversa em vez de quebrar a experiência do corretor.
    const textBlock = response.content.find((b) => b.type === "text");
    const fallback: Draft = {
      mode: "answer",
      text: textBlock && textBlock.type === "text" ? textBlock.text : "Não consegui formular uma resposta agora.",
    };
    return NextResponse.json(fallback);
  }

  const input = toolUse.input as {
    mode: "action" | "answer";
    matched_lead_id?: string;
    lead_name_mentioned?: string;
    note_text?: string;
    tags_to_add?: string[];
    tags_to_remove?: string[];
    cadence?: boolean;
    visit_datetime?: string;
    reminder_days?: number;
    answer_text?: string;
  };

  if (input.mode === "answer") {
    const draft: Draft = { mode: "answer", text: input.answer_text || "Não consegui formular uma resposta agora." };
    return NextResponse.json(draft);
  }

  const visitAt = input.visit_datetime ? new Date(input.visit_datetime).getTime() : null;
  const draft: Draft = {
    mode: "write",
    matched_lead_id: input.matched_lead_id || null,
    lead_name_mentioned: input.lead_name_mentioned || "não identificado",
    note_text: input.note_text || message,
    tags_to_add: [...new Set(input.tags_to_add || [])],
    tags_to_remove: [...new Set(input.tags_to_remove || [])],
    cadence: !!input.cadence,
    visit: visitAt && !Number.isNaN(visitAt) ? { dueAt: visitAt } : null,
    reminder: {
      create: !!input.reminder_days,
      due_in_days: input.reminder_days ?? null,
      text: input.reminder_days ? "Cobrar retorno" : null,
    },
  };
  return NextResponse.json(draft);
}

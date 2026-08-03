import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Draft } from "@/lib/types";

interface LeadRef {
  id: string;
  name: string;
  property: string;
}

const SYSTEM_PROMPT = `Você é o motor de extração de intenção de um CRM imobiliário conversacional.
O corretor narra em linguagem natural o que aconteceu, ou faz uma pergunta. Sua tarefa é
classificar a mensagem e chamar a ferramenta "extract_intent" com os campos corretos.

Regras de negócio:
- Se a mensagem é uma pergunta (ex: "quais as notas da Fernanda?", "quem eu preciso enviar opções?"),
  mode = "query". "notes" quando pede o histórico/preferências de um lead específico (preencha
  query_lead_id). "tag" quando pede a lista de leads com determinada etiqueta de pendência ou
  origem (preencha query_tag com o texto exato da etiqueta, ex: "Enviar opções", "Aguardando
  retorno", "Agendar visita"). "unknown" se não conseguir mapear.
- Senão, mode = "action". Tente identificar o lead mencionado usando a lista de leads existentes
  (nome). Se não tiver certeza, deixe matched_lead_id nulo e preencha lead_name_mentioned com o
  nome citado na mensagem.
- note_text: um resumo fiel do que foi narrado, para registrar no histórico do lead.
- tags_to_add / tags_to_remove: etiquetas automáticas, nunca escolhidas manualmente pelo corretor.
  Categorias possíveis:
  - Origem/tipo: "Tráfego", "Indicação", "Compra", "Locação", faixa de valor como "PV 8M" (PV =
    perfil validado, valor em milhões) quando mencionado.
  - Pendência: "Enviar opções", "Agendar visita", "Aguardando retorno".
  - Quando o corretor narra que uma pendência foi concluída (ex: "enviei as opções"), remova a
    etiqueta de pendência correspondente.
  - Quando uma etiqueta de estágio mais avançado é criada (ex: "Visita agendada" ao narrar que
    agendou visita com data/hora), remova as pendências anteriores daquele lead ("Enviar opções",
    "Agendar visita"), a não ser que a mesma mensagem reafirme explicitamente a pendência anterior.
  - "Aguardando retorno" é adicionada quando o corretor diz que não teve retorno do lead.
- cadence: true quando a mensagem indica falta de retorno (ativa cadência automática de
  follow-up em 3, 5, 7 e 30 dias). Não combine com reminder_days no mesmo registro.
- visit_datetime: preencha com um ISO 8601 completo (com timezone -03:00) SOMENTE quando o
  corretor afirma ter agendado/marcado uma visita com data e/ou horário específico (ex: "agendei
  visita com a Fernanda sexta às 15h"). Interprete dias da semana e horários relativos à data de
  hoje informada abaixo. Caso contrário deixe nulo.
- reminder_days: número de dias para um lembrete pontual de cobrança (não relacionado a
  cadência nem visita), quando o corretor pede explicitamente para ser lembrado. Nulo caso
  contrário.

Sempre responda chamando a ferramenta, nunca em texto livre.`;

const TOOL = {
  name: "extract_intent",
  description: "Classifica a mensagem do corretor em uma ação a registrar ou uma pergunta a responder.",
  input_schema: {
    type: "object" as const,
    properties: {
      mode: { type: "string", enum: ["action", "query"] },
      matched_lead_id: { type: "string", description: "id do lead identificado, se houver" },
      lead_name_mentioned: { type: "string", description: "nome citado na mensagem quando o lead não foi identificado com certeza" },
      note_text: { type: "string" },
      tags_to_add: { type: "array", items: { type: "string" } },
      tags_to_remove: { type: "array", items: { type: "string" } },
      cadence: { type: "boolean" },
      visit_datetime: { type: "string", description: "ISO 8601 com timezone, só quando uma visita com data/hora foi agendada" },
      reminder_days: { type: "number" },
      query_kind: { type: "string", enum: ["notes", "tag", "unknown"] },
      query_lead_id: { type: "string" },
      query_tag: { type: "string" },
    },
    required: ["mode"],
  },
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 500 });
  }

  const { message, leads } = (await req.json()) as { message: string; leads: LeadRef[] };
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message é obrigatório" }, { status: 400 });
  }

  const leadList = (leads || []).map((l) => `${l.id}: ${l.name} (${l.property})`).join("\n") || "(nenhum lead cadastrado)";
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\nData de hoje: ${today}.\nLeads existentes:\n${leadList}`,
    messages: [{ role: "user", content: message }],
    tools: [TOOL],
    tool_choice: { type: "tool", name: "extract_intent" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "Não foi possível interpretar a mensagem." }, { status: 502 });
  }

  const input = toolUse.input as {
    mode: "action" | "query";
    matched_lead_id?: string;
    lead_name_mentioned?: string;
    note_text?: string;
    tags_to_add?: string[];
    tags_to_remove?: string[];
    cadence?: boolean;
    visit_datetime?: string;
    reminder_days?: number;
    query_kind?: "notes" | "tag" | "unknown";
    query_lead_id?: string;
    query_tag?: string;
  };

  if (input.mode === "query") {
    const lead = (leads || []).find((l) => l.id === input.query_lead_id);
    const draft: Draft = {
      mode: "query",
      queryKind: input.query_kind || "unknown",
      leadId: input.query_lead_id,
      leadName: lead?.name,
      tag: input.query_tag,
      raw: message,
    };
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

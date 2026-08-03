export interface Lead {
  id: string;
  name: string;
  phone: string;
  property: string;
  stage: "novo" | "atendimento" | "proposta" | "fechado" | "perdido";
  tags: string[];
  createdAt: number;
}

export interface Note {
  id: string;
  leadId: string;
  text: string;
  createdAt: number;
}

export interface Reminder {
  id: string;
  leadId: string;
  dueAt: number;
  text: string;
  done: boolean;
  kind: "followup" | "visita";
}

export interface ChatMessage {
  id: string;
  role: "user" | "system";
  text: string;
}

export interface Visit {
  dueAt: number;
}

export interface WriteDraft {
  mode: "write";
  matched_lead_id: string | null;
  lead_name_mentioned: string;
  note_text: string;
  tags_to_add: string[];
  tags_to_remove: string[];
  cadence: boolean;
  visit: Visit | null;
  reminder: { create: boolean; due_in_days: number | null; text: string | null };
}

export interface QueryDraft {
  mode: "query";
  queryKind: "notes" | "tag" | "unknown";
  leadId?: string;
  leadName?: string;
  tag?: string;
  raw?: string;
}

export type Draft = WriteDraft | QueryDraft;

export interface ConfirmPayload {
  leadId: string | undefined;
  noteText: string;
  tagsToAdd: string[];
  tagsToRemove: string[];
  reminder: { days: number } | null;
  cadence: boolean;
  visit: Visit | null;
}

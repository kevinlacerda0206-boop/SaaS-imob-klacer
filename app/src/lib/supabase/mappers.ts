import type { Lead, Note, Reminder } from "@/lib/types";

export interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  property_interest: string | null;
  stage: Lead["stage"];
  tags: string[];
  created_at: string;
}

export interface NoteRow {
  id: string;
  lead_id: string;
  text: string;
  created_at: string;
}

export interface ReminderRow {
  id: string;
  lead_id: string;
  kind: Reminder["kind"];
  text: string;
  due_at: string;
  done: boolean;
}

export function leadFromRow(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    property: row.property_interest || "",
    stage: row.stage,
    tags: row.tags || [],
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function noteFromRow(row: NoteRow): Note {
  return {
    id: row.id,
    leadId: row.lead_id,
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function reminderFromRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    leadId: row.lead_id,
    dueAt: new Date(row.due_at).getTime(),
    text: row.text,
    done: row.done,
    kind: row.kind,
  };
}

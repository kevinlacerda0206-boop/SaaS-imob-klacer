import CrmApp from "@/components/CrmApp";
import { createClient } from "@/lib/supabase/server";
import { leadFromRow, noteFromRow, reminderFromRow } from "@/lib/supabase/mappers";
import type { LeadRow, NoteRow, ReminderRow } from "@/lib/supabase/mappers";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: leadRows }, { data: noteRows }, { data: reminderRows }] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("notes").select("*").order("created_at", { ascending: true }),
    supabase.from("reminders").select("*"),
  ]);

  const leads = ((leadRows as LeadRow[]) || []).map(leadFromRow);
  const notes = ((noteRows as NoteRow[]) || []).map(noteFromRow);
  const reminders = ((reminderRows as ReminderRow[]) || []).map(reminderFromRow);

  return <CrmApp initialLeads={leads} initialNotes={notes} initialReminders={reminders} />;
}

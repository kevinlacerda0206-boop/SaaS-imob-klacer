"use client";

import { useRef, useState } from "react";
import { Upload, Check, FileSpreadsheet } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { CADENCE_DAYS } from "@/lib/colors";
import {
  TARGET_FIELDS,
  guessMapping,
  normalizePhone,
  guessTypeTag,
  parseFlexibleDate,
  type ColumnMapping,
} from "@/lib/import";

interface MappedRow {
  name: string;
  phone: string;
  phoneNormalized: string;
  typeTag: string | null;
  property: string;
  lastContact: number | null;
  duplicateOf: { id: string; name: string } | null;
  action: "create" | "update" | "skip";
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export function ImportView({ onImported }: { onImported: () => void | Promise<void> }) {
  const { colors: COLORS } = useTheme();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: "", phone: "", type: "", property: "", lastContact: "" });
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [skippedNoName, setSkippedNoName] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  const inputStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "'Archivo', sans-serif",
    outline: "none",
    background: COLORS.panel,
    color: COLORS.ink,
    width: "100%",
  };

  const labelStyle = {
    fontFamily: "'Roboto Mono', monospace",
    fontSize: 11,
    color: COLORS.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
    display: "block",
  };

  const btnPrimary = {
    border: "none",
    borderRadius: 6,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Archivo', sans-serif",
    background: COLORS.accent,
    color: COLORS.onAccent,
    cursor: "pointer",
  };

  const btnSecondary = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Archivo', sans-serif",
    background: "transparent",
    color: COLORS.muted,
    cursor: "pointer",
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({ name: "", phone: "", type: "", property: "", lastContact: "" });
    setMappedRows([]);
    setSkippedNoName(0);
    setError("");
    setResult(null);
  };

  const handleFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      setError("Envie um arquivo .csv ou .xlsx.");
      return;
    }
    setError("");
    setLoading(true);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao ler o arquivo.");
      if (!data.headers?.length) throw new Error("Não encontrei colunas nesse arquivo.");
      setHeaders(data.headers);
      setRawRows(data.rows);
      setMapping(guessMapping(data.headers));
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const buildPreview = async () => {
    if (!mapping.name) {
      setError("Escolha qual coluna é o nome do lead.");
      return;
    }
    setError("");
    setLoading(true);

    const { data: existingLeads } = await supabase.from("leads").select("id, name, phone");
    const byPhone = new Map<string, { id: string; name: string }>();
    (existingLeads || []).forEach((l) => {
      const p = normalizePhone(l.phone || "");
      if (p) byPhone.set(p, { id: l.id, name: l.name });
    });

    let noName = 0;
    const rows: MappedRow[] = [];
    for (const raw of rawRows) {
      const name = (mapping.name ? raw[mapping.name] : "")?.trim() || "";
      if (!name) {
        noName++;
        continue;
      }
      const phone = (mapping.phone ? raw[mapping.phone] : "")?.trim() || "";
      const phoneNormalized = normalizePhone(phone);
      const typeRaw = (mapping.type ? raw[mapping.type] : "")?.trim() || "";
      const property = (mapping.property ? raw[mapping.property] : "")?.trim() || "";
      const lastContactRaw = (mapping.lastContact ? raw[mapping.lastContact] : "")?.trim() || "";
      const duplicateOf = phoneNormalized ? byPhone.get(phoneNormalized) || null : null;

      rows.push({
        name,
        phone,
        phoneNormalized,
        typeTag: guessTypeTag(typeRaw),
        property,
        lastContact: parseFlexibleDate(lastContactRaw),
        duplicateOf,
        action: duplicateOf ? "update" : "create",
      });
    }

    setMappedRows(rows);
    setSkippedNoName(noName);
    setLoading(false);
    setStep("preview");
  };

  const toggleRowAction = (index: number) => {
    setMappedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, action: r.action === "skip" ? (r.duplicateOf ? "update" : "create") : "skip" } : r))
    );
  };

  const confirmImport = async () => {
    setStep("importing");
    setError("");

    const toCreate = mappedRows.filter((r) => r.action === "create");
    const toUpdate = mappedRows.filter((r) => r.action === "update");
    const skipped = mappedRows.filter((r) => r.action === "skip").length + skippedNoName;

    let created = 0;
    let updated = 0;

    for (let i = 0; i < toCreate.length; i += 100) {
      const batch = toCreate.slice(i, i + 100);
      const { data, error: insertError } = await supabase
        .from("leads")
        .insert(
          batch.map((r) => ({
            name: r.name,
            phone: r.phone || null,
            property_interest: r.property || null,
            tags: [...(r.typeTag ? [r.typeTag] : []), ...(r.lastContact ? ["Aguardando retorno"] : [])],
            last_interaction_at: new Date(r.lastContact ?? Date.now()).toISOString(),
          }))
        )
        .select("id");
      if (insertError) {
        setError(`Falha ao criar leads: ${insertError.message}`);
        setStep("preview");
        return;
      }
      created += data?.length || 0;

      const reminders: { lead_id: string; kind: "followup"; text: string; due_at: string }[] = [];
      (data || []).forEach((row, idx) => {
        const src = batch[idx];
        if (src.lastContact) {
          CADENCE_DAYS.forEach((d) => {
            reminders.push({
              lead_id: row.id,
              kind: "followup",
              text: `Follow-up automático — sem retorno há ${d} dias`,
              due_at: new Date(src.lastContact! + d * 86400000).toISOString(),
            });
          });
        }
      });
      if (reminders.length) await supabase.from("reminders").insert(reminders);
    }

    for (const r of toUpdate) {
      if (!r.duplicateOf) continue;
      const { data: existing } = await supabase.from("leads").select("tags").eq("id", r.duplicateOf.id).single();
      const nextTags = new Set<string>(existing?.tags || []);
      if (r.typeTag) nextTags.add(r.typeTag);
      if (r.lastContact) nextTags.add("Aguardando retorno");

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          property_interest: r.property || undefined,
          last_interaction_at: new Date(r.lastContact ?? Date.now()).toISOString(),
          tags: [...nextTags],
        })
        .eq("id", r.duplicateOf.id);
      if (updateError) continue;

      if (r.lastContact) {
        const reminders = CADENCE_DAYS.map((d) => ({
          lead_id: r.duplicateOf!.id,
          kind: "followup" as const,
          text: `Follow-up automático — sem retorno há ${d} dias`,
          due_at: new Date(r.lastContact! + d * 86400000).toISOString(),
        }));
        await supabase.from("reminders").insert(reminders);
      }
      updated++;
    }

    if (created > 0 || updated > 0) await onImported();

    setResult({ created, updated, skipped });
    setStep("done");
  };

  if (step === "upload") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 1.6 }}>
          Importe uma planilha de leads (de outra ferramenta ou sua própria) de uma vez só. Aceita arquivos{" "}
          <strong>.csv</strong> e <strong>.xlsx</strong>.
        </p>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          style={{
            border: `1px dashed ${COLORS.accent}`,
            borderRadius: 8,
            padding: "36px 16px",
            textAlign: "center",
            cursor: "pointer",
            color: COLORS.accent,
            background: COLORS.accentSoft,
          }}
        >
          <Upload size={22} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{loading ? "Lendo arquivo…" : "Toque pra escolher um arquivo"}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>ou arraste aqui</div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {error && <div style={{ fontSize: 13, color: COLORS.urgent }}>{error}</div>}
      </div>
    );
  }

  if (step === "mapping") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.inkSoft }}>
          <FileSpreadsheet size={16} color={COLORS.accent} />
          {fileName} · {rawRows.length} linhas encontradas
        </div>
        <p style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>
          Confira se identifiquei as colunas certas — ajuste o que precisar.
        </p>
        {TARGET_FIELDS.map((field) => (
          <div key={field.key}>
            <label style={labelStyle}>
              {field.label}
              {field.required ? " *" : ""}
            </label>
            <select
              value={mapping[field.key]}
              onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
              style={inputStyle}
            >
              <option value="">(nenhuma coluna)</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
        {error && <div style={{ fontSize: 13, color: COLORS.urgent }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={buildPreview} disabled={loading} style={{ ...btnPrimary, flex: 1, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Processando…" : "Continuar"}
          </button>
          <button onClick={reset} style={btnSecondary}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    const willCreate = mappedRows.filter((r) => r.action === "create").length;
    const willUpdate = mappedRows.filter((r) => r.action === "update").length;
    const willSkip = mappedRows.filter((r) => r.action === "skip").length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12.5 }}>
          <span style={{ background: COLORS.accentSoft, color: COLORS.accent, padding: "4px 10px", borderRadius: 20 }}>
            {willCreate} novo{willCreate === 1 ? "" : "s"}
          </span>
          {willUpdate > 0 && (
            <span style={{ background: COLORS.accentSoft, color: COLORS.accent, padding: "4px 10px", borderRadius: 20 }}>
              {willUpdate} duplicado{willUpdate === 1 ? "" : "s"} — vai atualizar
            </span>
          )}
          {willSkip > 0 && (
            <span style={{ background: COLORS.border, color: COLORS.muted, padding: "4px 10px", borderRadius: 20 }}>
              {willSkip} ignorado{willSkip === 1 ? "" : "s"}
            </span>
          )}
          {skippedNoName > 0 && (
            <span style={{ background: COLORS.urgentSoft, color: COLORS.urgent, padding: "4px 10px", borderRadius: 20 }}>
              {skippedNoName} sem nome (não importado)
            </span>
          )}
        </div>

        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {mappedRows.slice(0, 60).map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderBottom: `1px solid ${COLORS.border}`,
                  fontSize: 12.5,
                  opacity: r.action === "skip" ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div style={{ color: COLORS.muted, fontSize: 11.5 }}>
                    {[r.phone, r.property, r.typeTag].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                {r.duplicateOf ? (
                  <button
                    onClick={() => toggleRowAction(i)}
                    style={{
                      fontFamily: "'Roboto Mono', monospace",
                      fontSize: 10.5,
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: r.action === "skip" ? COLORS.border : COLORS.accentSoft,
                      color: r.action === "skip" ? COLORS.muted : COLORS.accent,
                      flexShrink: 0,
                    }}
                  >
                    {r.action === "skip" ? "Ignorar" : "Atualizar"}
                  </button>
                ) : (
                  <span style={{ fontSize: 10.5, color: COLORS.muted, flexShrink: 0 }}>
                    {r.action === "skip" ? "ignorado" : "novo"}
                  </span>
                )}
              </div>
            ))}
          </div>
          {mappedRows.length > 60 && (
            <div style={{ padding: "8px 10px", fontSize: 11.5, color: COLORS.muted, textAlign: "center" }}>
              + {mappedRows.length - 60} outras linhas
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: 13, color: COLORS.urgent }}>{error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={confirmImport} style={{ ...btnPrimary, flex: 1 }}>
            Confirmar importação
          </button>
          <button onClick={reset} style={btnSecondary}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return <div style={{ color: COLORS.muted, fontSize: 13.5, textAlign: "center", padding: "30px 0" }}>Importando…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.accent }}>
        <Check size={20} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Importação concluída</span>
      </div>
      <div style={{ fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 1.7 }}>
        {result?.created ? <div>✓ {result.created} lead{result.created === 1 ? "" : "s"} criado{result.created === 1 ? "" : "s"}</div> : null}
        {result?.updated ? <div>✓ {result.updated} lead{result.updated === 1 ? "" : "s"} atualizado{result.updated === 1 ? "" : "s"}</div> : null}
        {result?.skipped ? <div>— {result.skipped} linha{result.skipped === 1 ? "" : "s"} ignorada{result.skipped === 1 ? "" : "s"}</div> : null}
      </div>
      <button onClick={reset} style={btnPrimary}>
        Importar outro arquivo
      </button>
    </div>
  );
}

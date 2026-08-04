"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

export function ProfileView() {
  const { colors: COLORS } = useTheme();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setEmail(userData.user.email || "");
      const { data: profile } = await supabase.from("profiles").select("name, role").eq("id", userData.user.id).single();
      if (profile) {
        setName(profile.name);
        setSavedName(profile.name);
        setRole(profile.role);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const save = async () => {
    if (!name.trim() || name === savedName) return;
    setSaving(true);
    setError("");
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", userData.user?.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSavedName(name.trim());
  };

  const inputStyle = {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "9px 12px",
    fontSize: 14,
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

  if (loading) return <div style={{ color: COLORS.muted, fontSize: 13.5 }}>Carregando…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label style={labelStyle}>Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <div style={{ fontSize: 14, color: COLORS.inkSoft }}>{email || "convidado — sem conta permanente"}</div>
      </div>
      <div>
        <label style={labelStyle}>Função</label>
        <div style={{ fontSize: 14, color: COLORS.inkSoft, textTransform: "capitalize" }}>{role}</div>
      </div>
      {error && <div style={{ fontSize: 13, color: COLORS.urgent }}>{error}</div>}
      <button
        onClick={save}
        disabled={saving || !name.trim() || name === savedName}
        style={{
          border: "none",
          borderRadius: 6,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Archivo', sans-serif",
          background: COLORS.accent,
          color: COLORS.onAccent,
          cursor: "pointer",
          opacity: saving || !name.trim() || name === savedName ? 0.5 : 1,
          alignSelf: "flex-start",
        }}
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}

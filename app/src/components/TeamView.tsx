"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

export function TeamView() {
  const { colors: COLORS } = useTheme();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [role, setRole] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase.from("profiles").select("role, account_id").eq("id", userData.user.id).single();
      if (profile) {
        setRole(profile.role);
        setAccountId(profile.account_id);
        const { data: account } = await supabase.from("accounts").select("name").eq("id", profile.account_id).single();
        if (account) setTeamName(account.name);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        <label style={labelStyle}>Equipe</label>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{teamName}</div>
      </div>

      {role === "gestor" && (
        <div>
          <label style={labelStyle}>Código pra convidar corretores</label>
          <div style={{ display: "flex", gap: 8 }}>
            <code
              style={{
                flex: 1,
                background: COLORS.accentSoft,
                color: COLORS.accent,
                padding: "10px 12px",
                borderRadius: 6,
                fontSize: 12.5,
                wordBreak: "break-all",
              }}
            >
              {accountId}
            </code>
            <button
              onClick={copyCode}
              style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                background: COLORS.panel,
                color: COLORS.accent,
                width: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Copiar código"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 10, lineHeight: 1.5 }}>
            Compartilhe esse código com os corretores da sua equipe — eles usam ele na tela de cadastro pra entrar na mesma conta.
          </p>
        </div>
      )}
    </div>
  );
}

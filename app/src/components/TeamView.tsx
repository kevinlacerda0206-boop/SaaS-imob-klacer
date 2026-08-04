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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [copied, setCopied] = useState(false);

  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgradePassword, setUpgradePassword] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSent, setUpgradeSent] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setIsAnonymous(!!userData.user.is_anonymous);
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

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgrading(true);
    setUpgradeError("");
    const { error } = await supabase.auth.updateUser({
      email: upgradeEmail,
      password: upgradePassword,
    });
    setUpgrading(false);
    if (error) {
      setUpgradeError(error.message);
      return;
    }
    setUpgradeSent(true);
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

  if (loading) return <div style={{ color: COLORS.muted, fontSize: 13.5 }}>Carregando…</div>;

  if (isAnonymous) {
    if (upgradeSent) {
      return (
        <div>
          <p style={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.6 }}>
            Enviamos um link de confirmação para <strong>{upgradeEmail}</strong>. Depois de confirmar, sua conta
            passa a ser permanente — nada do que você já registrou se perde.
          </p>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.6 }}>
          Você está usando o Klacer.ia como convidado — os dados ficam só neste navegador. Crie uma conta
          permanente pra não perder nada e poder convidar corretores pra sua equipe.
        </p>
        <form onSubmit={handleUpgrade} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            required
            placeholder="Email"
            value={upgradeEmail}
            onChange={(e) => setUpgradeEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Senha (mín. 6 caracteres)"
            value={upgradePassword}
            onChange={(e) => setUpgradePassword(e.target.value)}
            style={inputStyle}
          />
          {upgradeError && <div style={{ fontSize: 13, color: COLORS.urgent }}>{upgradeError}</div>}
          <button
            type="submit"
            disabled={upgrading}
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
              opacity: upgrading ? 0.6 : 1,
            }}
          >
            {upgrading ? "Criando…" : "Criar conta permanente"}
          </button>
        </form>
      </div>
    );
  }

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

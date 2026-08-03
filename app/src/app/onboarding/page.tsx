"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, useAuthStyles } from "@/components/AuthShell";

export default function OnboardingPage() {
  const router = useRouter();
  const { colors: COLORS, authInputStyle, authButtonStyle } = useAuthStyles();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"corretor" | "gestor">("corretor");
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAccountId, setCreatedAccountId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, teamName, joinCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao concluir cadastro.");
        return;
      }
      if (role === "gestor") {
        setCreatedAccountId(data.accountId);
        return;
      }
    } catch {
      setError("Falha ao concluir cadastro. Tente novamente.");
      return;
    } finally {
      setLoading(false);
    }
    router.push("/");
    router.refresh();
  };

  if (createdAccountId) {
    return (
      <AuthShell title="Equipe criada">
        <p style={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
          Compartilhe esse código com os corretores da sua equipe — eles vão usá-lo na tela de cadastro:
        </p>
        <code
          style={{
            display: "block",
            background: COLORS.accentSoft,
            color: COLORS.accent,
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 13,
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {createdAccountId}
        </code>
        <button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          style={authButtonStyle}
        >
          Continuar
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Complete seu cadastro">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          required
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={authInputStyle}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setRole("corretor")}
            style={{
              ...authButtonStyle,
              flex: 1,
              background: role === "corretor" ? COLORS.accent : COLORS.accentSoft,
              color: role === "corretor" ? COLORS.onAccent : COLORS.accent,
            }}
          >
            Corretor
          </button>
          <button
            type="button"
            onClick={() => setRole("gestor")}
            style={{
              ...authButtonStyle,
              flex: 1,
              background: role === "gestor" ? COLORS.accent : COLORS.accentSoft,
              color: role === "gestor" ? COLORS.onAccent : COLORS.accent,
            }}
          >
            Gestor
          </button>
        </div>

        {role === "gestor" ? (
          <input
            required
            placeholder="Nome da equipe/imobiliária"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={authInputStyle}
          />
        ) : (
          <input
            required
            placeholder="Código da equipe (peça ao gestor)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={authInputStyle}
          />
        )}

        {error && <p style={{ color: COLORS.urgent, fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...authButtonStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Concluindo…" : "Concluir"}
        </button>
      </form>
      {role === "gestor" && (
        <p style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 14, lineHeight: 1.5 }}>
          Depois de criar a equipe, você verá um código pra compartilhar com os corretores.
        </p>
      )}
    </AuthShell>
  );
}

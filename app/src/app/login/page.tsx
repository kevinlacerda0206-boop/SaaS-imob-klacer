"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, useAuthStyles } from "@/components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const { colors: COLORS, authInputStyle, authButtonStyle } = useAuthStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <AuthShell title="Entrar">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={authInputStyle}
        />
        <input
          type="password"
          required
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={authInputStyle}
        />
        {error && <p style={{ color: COLORS.urgent, fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...authButtonStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 16, textAlign: "center" }}>
        Ainda não tem conta? <Link href="/signup" style={{ color: COLORS.accent, fontWeight: 600 }}>Criar conta</Link>
      </p>
    </AuthShell>
  );
}

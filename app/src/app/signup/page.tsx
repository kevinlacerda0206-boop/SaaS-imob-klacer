"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, useAuthStyles } from "@/components/AuthShell";

export default function SignupPage() {
  const router = useRouter();
  const { colors: COLORS, authInputStyle, authButtonStyle } = useAuthStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sessão de convidado (anônima) não deve interferir na criação de uma
    // conta de verdade — se existir uma, descarta antes de seguir.
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.is_anonymous) await supabase.auth.signOut();
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Confirme seu email">
        <p style={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.5 }}>
          Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, você será
          direcionado para completar seu cadastro.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Criar conta">
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
          minLength={6}
          placeholder="Senha (mín. 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={authInputStyle}
        />
        {error && <p style={{ color: COLORS.urgent, fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...authButtonStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Criando…" : "Criar conta"}
        </button>
      </form>
      <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 16, textAlign: "center" }}>
        Já tem conta? <Link href="/login" style={{ color: COLORS.accent, fontWeight: 600 }}>Entrar</Link>
      </p>
    </AuthShell>
  );
}

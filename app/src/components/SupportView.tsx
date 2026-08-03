"use client";

import { Mail } from "lucide-react";
import { useTheme } from "@/lib/theme";

const FAQ = [
  {
    q: "A conversa não entendeu o que eu narrei, o que eu faço?",
    a: "Toque em Editar no recibo antes de confirmar — você pode corrigir o lead, a nota, as etiquetas e o lembrete manualmente.",
  },
  {
    q: "Como um corretor da minha equipe entra no sistema?",
    a: "No menu, vá em Equipe pra pegar o código (se você for gestor) e passe pra ele usar na tela de cadastro.",
  },
  {
    q: "Os dados ficam salvos onde?",
    a: "Direto no banco da sua conta — nada fica só no seu celular, então você pode entrar de outro aparelho e continuar de onde parou.",
  },
];

export function SupportView() {
  const { colors: COLORS } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div
          style={{
            fontFamily: "'Roboto Mono', monospace",
            fontSize: 11,
            color: COLORS.muted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          Perguntas frequentes
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FAQ.map((item) => (
            <div key={item.q}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{item.q}</div>
              <div style={{ fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 1.5 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: "'Roboto Mono', monospace",
            fontSize: 11,
            color: COLORS.muted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          Falar com o suporte
        </div>
        <a
          href="mailto:suporte@klacer.ia"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.accent,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <Mail size={16} />
          suporte@klacer.ia
        </a>
      </div>
    </div>
  );
}

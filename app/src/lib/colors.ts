export const COLORS = {
  bg: "#FBFAF6",
  panel: "#FFFFFF",
  ink: "#20241F",
  inkSoft: "#4B5148",
  border: "#E4E0D6",
  emerald: "#2F4A3B",
  emeraldSoft: "#E7EDE7",
  brass: "#B4915B",
  brassSoft: "#F3EAD6",
  success: "#4F7A5B",
  urgent: "#B15A3B",
  urgentSoft: "#F5E6DE",
  muted: "#8A8577",
} as const;

export const STAGES = [
  { id: "novo", label: "Novo" },
  { id: "atendimento", label: "Em atendimento" },
  { id: "proposta", label: "Proposta" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
] as const;

export const CADENCE_DAYS = [3, 5, 7, 30];

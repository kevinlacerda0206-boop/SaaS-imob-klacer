export const TARGET_FIELDS = [
  { key: "name", label: "Nome", required: true },
  { key: "phone", label: "Telefone", required: false },
  { key: "type", label: "Tipo de busca (compra/locação)", required: false },
  { key: "property", label: "Imóvel de interesse", required: false },
  { key: "lastContact", label: "Última data de contato", required: false },
] as const;

export type TargetFieldKey = (typeof TARGET_FIELDS)[number]["key"];
export type ColumnMapping = Record<TargetFieldKey, string>;

const KEYWORDS: Record<TargetFieldKey, string[]> = {
  name: ["nome", "name", "cliente", "lead"],
  phone: ["telefone", "celular", "fone", "phone", "whatsapp", "contato"],
  type: ["tipo", "finalidade", "compra", "locacao", "aluguel"],
  property: ["imovel", "interesse", "property", "empreendimento", "unidade"],
  lastContact: ["ultimocontato", "ultimadata", "datacontato", "lastcontact", "data"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\u0300-\u036f]", "g"), "")
    .replace(/\s+/g, "");
}

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping = { name: "", phone: "", type: "", property: "", lastContact: "" } as ColumnMapping;
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  for (const field of TARGET_FIELDS) {
    const keywords = KEYWORDS[field.key];
    const match = normalizedHeaders.find((h) => keywords.some((k) => h.norm.includes(k)));
    if (match) mapping[field.key] = match.raw;
  }
  return mapping;
}

export function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function guessTypeTag(raw: string): string | null {
  const n = normalize(raw || "");
  if (n.includes("loca") || n.includes("aluguel")) return "Locação";
  if (n.includes("compra") || n.includes("venda")) return "Compra";
  return null;
}

export function parseFlexibleDate(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO (ex: vindo de célula de data do Excel)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const t = Date.parse(trimmed);
    if (!Number.isNaN(t)) return t;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
  const br = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    const [, d, mo, yRaw] = br;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }

  const generic = Date.parse(trimmed);
  return Number.isNaN(generic) ? null : generic;
}

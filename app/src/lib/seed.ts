import type { Lead } from "./types";

export const SEED_LEADS: Lead[] = [
  { id: "l1", name: "João Marques", phone: "(11) 9xxxx-2210", property: "Alphaville 9", stage: "atendimento", tags: ["Tráfego", "Compra", "PV 5M"], createdAt: Date.now() - 86400000 * 6 },
  { id: "l2", name: "Fernanda Costa", phone: "(11) 9xxxx-4471", property: "Tamboré 4", stage: "novo", tags: ["Tráfego", "Locação"], createdAt: Date.now() - 86400000 * 2 },
  { id: "l3", name: "Ricardo Alves", phone: "(11) 9xxxx-8830", property: "Residencial Itahyê", stage: "proposta", tags: ["Indicação", "Compra", "PV 8M"], createdAt: Date.now() - 86400000 * 12 },
];

# Briefing do MVP — SaaS Imobiliário

> Este documento resume tudo que foi validado num processo de brainstorm e prototipagem, pronto pra ser usado como instrução inicial numa sessão de desenvolvimento real.

## Hipótese central a validar
Se o corretor conseguir atualizar o CRM inteiro conversando (por voz ou texto) em uma janela nativa do app — sem preencher formulário — ele vai usar isso todo dia, e vai perder menos negócio por falta de retorno a lead ou proprietário.

Tudo no MVP existe para provar (ou derrubar) essa hipótese o mais rápido possível — não para entregar o produto completo desenhado no brainstorm (esse produto completo inclui, mais pra frente: integração com WhatsApp, hierarquia até construtora, módulo financeiro de comissões — nada disso entra agora).

## Público do MVP
Corretor de imóveis em geral — qualquer nicho do mercado imobiliário (residencial, comercial, rural, locação, lançamento etc.), não só alto padrão. Foco do produto é o corretor individual e o dia a dia dele; funcionalidades de gestor/diretor/construtora ficam pra depois. Equipe pequena como ambiente ideal de teste inicial (o ambiente ideal de teste é a própria equipe do usuário), com um só nível hierárquico por enquanto: corretor + um gestor observando o time.

---

## Decisão de UX que define o produto
**A tela inicial do app é a conversa, não o CRM.** O corretor abre o app e já está numa janela de chat — como conversar com um assistente. O funil de leads e a lista de pendências existem, mas são destinos que ele visita, não a porta de entrada. Essa inversão (conversa é o principal, dados estruturados são o apoio) é a tese central do produto.

---

## Funcionalidades do MVP

### 1. Cadastro de lead e funil básico
- Lead: nome, telefone, origem, imóvel de interesse, estágio (novo, em atendimento, proposta, fechado, perdido), etiquetas
- Kanban simples por estágio, acessível a partir da conversa

### 2. Janela de conversa nativa (o núcleo do produto)
Corretor grava áudio ou digita uma mensagem curta, em linguagem natural, narrando o que aconteceu. Uma única mensagem pode disparar **várias ações ao mesmo tempo**:
- Nota no histórico do lead
- Etiquetas automáticas adicionadas/removidas (ver seção 3)
- Lembrete de follow-up ou visita agendada na agenda

Antes de gravar qualquer coisa, o app mostra uma **tela de confirmação em formato de recibo** — resumo do que foi entendido, editável, com botão de confirmar. Isso evita erro de interpretação virar dado errado no sistema.

A janela também responde perguntas diretamente na conversa (ver seção 4) — não é só entrada de dados, é também consulta.

### 3. Etiquetas automáticas por lead
Cada lead acumula etiquetas conforme o que é narrado na conversa — sem o corretor escolher etiqueta manualmente:
- **Origem/tipo**: Tráfego, Indicação, Compra, Locação, faixa de valor (ex: "PV 8M")
- **Pendência**: Enviar opções, Agendar visita, Aguardando retorno
- Etiquetas de pendência são removidas automaticamente quando a ação correspondente é narrada como concluída (ex: "enviei as opções" remove "Enviar opções"). Quando uma etiqueta de estágio mais avançado é criada (ex: "Visita agendada"), as pendências anteriores daquele lead são removidas automaticamente também, a não ser que a mesma mensagem reafirme explicitamente a pendência anterior.

### 4. Consulta em linguagem natural
O corretor pode perguntar, na mesma janela de conversa, coisas como:
- "Quais as notas da Fernanda?" → devolve as preferências/histórico registrado daquele lead
- "Quem eu preciso enviar opções?" → devolve a lista de leads com aquela etiqueta de pendência

### 5. Notas livres por lead
Qualquer relato descritivo (preferências do cliente: tipo de imóvel, iluminação, vista, ambiente) vira nota registrada no histórico do lead, consultável depois pela própria conversa.

### 6. Agendamento de visita com atualização simultânea
Quando o corretor narra que agendou uma visita com data/horário (ex: "agendei visita com a Fernanda sexta às 15h"), isso precisa, na mesma mensagem, sem passo extra:
- Atualizar o card do lead (etiqueta + nota)
- Criar o compromisso na agenda/lista de avisos, numa seção de "próximos compromissos" que mostra visitas futuras, não só as de hoje

### 7. Motor de cadência
- Lead sem interação há X dias, ou marcado como "sem retorno", entra numa cadência automática de lembretes (ex: 3, 5, 7 e 30 dias) — sem o corretor precisar criar cada lembrete manualmente
- Tudo isso aparece numa lista "precisa de atenção hoje / atrasado"

### 8. Scripts de reativação
Biblioteca simples de scripts por tempo de inatividade, vinculada à lista de atenção.

### 9. Dashboard do gestor (mínimo)
- Lista de leads por corretor
- Quem está com follow-up atrasado

---

## Fora do escopo do MVP (fica para fase 2/3)
- Integração WhatsApp (Coexistence)
- Geração automática de conteúdo (Instagram/TikTok)
- Relatório automático ao proprietário
- Pós-venda e indicação automatizada
- Hierarquia completa (diretor, dono, construtora) e dashboards por cargo
- Quadro de disponibilidade entre imobiliárias (construtora/incorporadora)
- Módulo financeiro/comissões + termo de concordância assinado eletronicamente
- Múltiplos planos de assinatura por segmento / modelo freemium

Validar o núcleo (conversa → CRM → cadência → agenda) antes de qualquer uma dessas camadas.

---

## Telas principais do MVP
1. Login / seleção de equipe
2. **Conversa (tela inicial)** — gravação de áudio/texto, confirmação em recibo, respostas a consultas
3. Funil de leads (Kanban), com etiquetas visíveis em cada card
4. Ficha do lead (histórico, notas, etiquetas)
5. Lista de atenção: "hoje/atrasado" + "próximos compromissos" (visitas)
6. Dashboard do gestor

---

## Stack técnica sugerida
- **Frontend:** React / Next.js (web responsivo — evita construir app nativo antes de validar)
- **Backend/banco:** Supabase ou Postgres — multi-tenant desde o início (cada conta de imobiliária isolada), mesmo com uma única conta no MVP
- **Transcrição de áudio:** Whisper (ou equivalente com bom suporte a português)
- **Extração e classificação de intenção:** modelo de linguagem rodando no servidor (não no navegador do cliente — evita limitações de ambiente), com dois modos de saída: ação a registrar (JSON estruturado: lead, nota, etiquetas, lembrete/visita) ou resposta a uma pergunta
- **Hospedagem:** Vercel (frontend) + Supabase (backend/banco)

## Fluxo de dados principal

```
Áudio/texto do corretor
   → transcrição (se áudio)
   → classificação: é uma ação a registrar, ou uma pergunta?

   [ação]                                  [pergunta]
   → extração estruturada                  → busca notas/etiquetas relevantes
     (lead, nota, etiquetas,                 no banco
      lembrete ou visita)                  → resposta direto na conversa
   → recibo de confirmação
   → corretor confirma ou corrige
   → grava simultaneamente: nota no
     histórico + etiquetas + lembrete
     ou evento de agenda
```

## Referência visual e de interação
Existe um protótipo navegável (arquivo `crm-prototipo.jsx`) construído durante o brainstorm, cobrindo a janela de conversa, o recibo de confirmação, o funil com etiquetas e a lista de atenção com as duas seções (hoje/atrasado e próximos compromissos). Vale usar como referência de fluxo e interação ao construir a versão real — a lógica de extração nele é só uma simulação por regras de texto (não é IA de verdade), então essa parte deve ser refeita com um modelo de linguagem real rodando no backend.

## Critério de sucesso do MVP
- Corretores da equipe piloto usam a janela de conversa pelo menos uma vez por dia sem lembrete externo
- Taxa de acerto da extração de dados (sem precisar corrigir) acima de um patamar aceitável nos primeiros testes
- Redução perceptível de leads "esquecidos" (sem contato há mais de X dias) comparado à rotina anterior

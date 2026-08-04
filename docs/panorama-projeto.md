# Panorama do projeto — Klacer.ia

> Documento pra colar no Claude.ai e continuar evoluindo as ideias. Resume tudo que já foi decidido e construído até agora, o que falta, e os pontos abertos.

## O que é

**Klacer.ia** — CRM conversacional pra corretor de imóveis (qualquer nicho do mercado, não só alto padrão). A tese central: se o corretor conseguir atualizar o CRM inteiro *conversando* (texto ou, no futuro, voz), sem preencher formulário, ele usa todo dia e perde menos negócio por falta de retorno a lead ou proprietário.

Público do MVP: o corretor individual, no dia a dia dele. Funcionalidades de gestor/diretor/construtora ficam pra depois — hoje só existe um nível de gestão simples (gestor vê a própria equipe).

A tela inicial do app é a conversa — não o CRM. Funil e lista de pendências são destinos que o corretor visita, não a porta de entrada. Interação inspirada no Claude.ai/ChatGPT: conversa é o principal, o resto se acessa por um menu lateral (☰), sem barra de abas fixa.

## Está no ar

- **App**: https://saas-imob-klacer.vercel.app (redeploy automático a cada mudança)
- **Repositório**: github.com/kevinlacerda0206-boop/SaaS-imob-klacer
- **Banco**: Supabase (Postgres + Auth), projeto próprio
- **IA**: Claude Sonnet 5 via API Anthropic

## Funcionalidades já construídas e testadas

**Acesso**
- Login/cadastro com email e senha (Supabase Auth)
- **Acesso convidado sem login** — qualquer visitante já cai direto na conversa, com uma sessão anônima criada automaticamente por trás dos panos. Só a aba "Equipe" pede conta permanente (upgrade sem perder dados, vira a mesma conta só que com email/senha).
- Onboarding: usuário escolhe ser **Gestor** (cria uma equipe, recebe um código pra convidar) ou **Corretor** (entra com o código de uma equipe existente).

**Conversa (o núcleo do produto)**
- Roda em Claude Sonnet 5 com raciocínio estendido em nível alto de esforço.
- Tem memória da conversa (últimas ~24 mensagens) e acesso às notas/etiquetas dos leads.
- Dois modos de resposta:
  - **Resposta livre** — tira dúvida, bate papo, explica como o app funciona, responde qualquer pergunta (inclusive fora do escopo de leads), igual um assistente de verdade.
  - **Ação a registrar** — só quando o corretor narra um fato concreto sobre um lead identificável. Mostra um **recibo de confirmação** editável antes de gravar qualquer coisa.
- O que a ação registra automaticamente: nota no histórico, etiquetas (origem/tipo: Tráfego, Indicação, Compra, Locação, faixa de valor; pendência: Enviar opções, Agendar visita, Aguardando retorno — removidas automaticamente quando a pendência é concluída ou superada por uma etapa mais avançada), visita agendada (com data/hora entendida em linguagem natural, tipo "depois de amanhã às 10h"), cadência automática de follow-up (3, 5, 7, 30 dias) quando não há retorno do lead, ou lembrete pontual.
- Responde perguntas específicas sobre um lead (notas, preferências) ou sobre quem tem determinada etiqueta/pendência.

**Funil de leads**
- Kanban por estágio (novo, em atendimento, proposta, fechado, perdido), com etiquetas visíveis no card.
- Cadastro manual de lead (nome, telefone, origem, imóvel de interesse) — hoje é a única forma de criar um lead novo (a conversa só atualiza leads que já existem).
- Ficha do lead (histórico de notas, troca de estágio).

**Lista de atenção**
- "Hoje e atrasados" (follow-ups pendentes) + "Próximos compromissos" (visitas agendadas), com aviso (badge) no menu.

**Menu (☰, canto superior esquerdo)**
- Conversa, Precisa de atenção, Funil de leads, Perfil, Equipe, Suporte, Sair.
- **Perfil**: nome editável, email, função.
- **Equipe**: nome da equipe + código de convite (só gestor vê) — ou, pra convidado, formulário pra criar conta permanente.
- **Suporte**: FAQ curto + contato.

**Design**
- Nome da marca: **Klacer.ia**.
- Paleta: tinta-azul-noite (#0E1420 no escuro / #F4F3EF no claro) + latão/dourado (#C9A227 / #A17915).
- Tipografia: Archivo Black (títulos/wordmark), Archivo (corpo), Roboto Mono (horários/dados).
- **Tema claro/escuro/automático**, com seletor visível (igual iPhone/Instagram).
- Lista de mensagens em formato de transcrição (horário + texto), sem balão de chat — decisão explícita pra não parecer WhatsApp.

## Stack técnica

- **Frontend/backend**: Next.js 15.5 (App Router, TypeScript), React 19, Tailwind.
- **Banco**: Supabase (Postgres). Multi-tenant desde o início: tabelas `accounts`, `profiles` (corretor/gestor), `leads`, `notes`, `reminders`, `conversation_messages`, `reactivation_scripts` (schema pronto, funcionalidade de scripts ainda não construída). Isolamento por conta via RLS; triggers preenchem automaticamente quem é o autor/dono de cada registro.
- **IA**: Anthropic Claude Sonnet 5, chamada via tool use (uma ferramenta "respond" que decide entre resposta livre ou ação), com pensamento estendido adaptativo.
- **Deploy**: Vercel, conectado ao GitHub — todo push na branch `main` publica sozinho.

## O que falta do plano original (fase 2/3, propositalmente fora do MVP até aqui)

- Biblioteca de scripts de reativação (schema do banco já existe, tela ainda não)
- Dashboard do gestor (visão consolidada da equipe, atrasos por corretor)
- Integração com Facebook Ads (leads de formulário caindo direto no funil)
- Integração com WhatsApp (leads/conversas de lá aparecendo no app)
- Entrada por voz (o botão de microfone já existe na tela, mas ainda não grava/transcreve)
- Geração de conteúdo pra redes sociais, relatório automático ao proprietário, módulo financeiro/comissões, múltiplos planos — tudo isso é fase mais avançada, não é MVP.

## Limitações conhecidas da IA hoje

- Cada mensagem manda **todos** os leads e notas recentes da conta pro modelo — funciona bem pra uma equipe pequena, mas não escala pra centenas/milhares de leads (custo e contexto ficam grandes demais). A evolução natural seria dar à IA ferramentas de busca reais no banco (agente com RAG) em vez de mandar tudo de uma vez — não é urgente agora.
- Raciocínio em nível alto de esforço = melhor qualidade, mas custa mais por mensagem na conta da Anthropic.
- A IA só cria/atualiza leads que já existem no Funil — ainda não cria lead novo direto pela conversa.

## Pontos abertos pra evoluir com o Claude.ai

- Se/quando abrir pra gestor e hierarquia maior (diretor, construtora).
- Prioridade entre Facebook Ads vs. WhatsApp como próxima integração.
- Se a IA deve poder criar leads novos direto pela conversa (hoje só atualiza existentes).
- Biblioteca de scripts de reativação — que conteúdo/tom eles devem ter.
- Modelo de monetização (plano único vs. níveis, o que entra em cada um).
- Entrada por voz — prioridade e provedor de transcrição.

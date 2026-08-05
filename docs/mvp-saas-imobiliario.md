# Briefing do MVP — SaaS Imobiliário

> Este documento resume tudo que foi validado num processo de brainstorm e prototipagem, pronto pra ser usado como instrução inicial numa sessão de desenvolvimento real.

## Padrão de qualidade esperado
Este não é um projeto interno ou uma prova de conceito descartável — é um produto que será lançado comercialmente. Toda tela precisa ter acabamento de produto real: visual cuidado, interações fluidas, identidade própria e marcante (não um layout genérico de SaaS). A referência de experiência é o nível de polimento de ferramentas como Claude e ChatGPT — clareza, poucos elementos na tela, hierarquia visual óbvia, transições suaves — com identidade visual própria (Klacer.ia), não uma cópia do visual dessas ferramentas.

> **Nota:** "alto padrão" aqui se refere ao nível de acabamento/qualidade do produto, não ao segmento de mercado atendido. Ver "Público do MVP" abaixo — o app é para qualquer nicho do setor imobiliário.

## Hipótese central a validar
Se o corretor conseguir atualizar o CRM inteiro conversando (por voz ou texto) em uma janela nativa do app — sem preencher formulário — ele vai usar isso todo dia, e vai perder menos negócio por falta de retorno a lead ou proprietário.

Tudo no MVP existe para provar (ou derrubar) essa hipótese o mais rápido possível.

## Público do MVP
O app deve ser responsivo a qualquer nicho do mercado imobiliário — do econômico/Minha Casa Minha Vida ao alto luxo — não um produto de nicho único. Isso já está refletido na cadência de follow-up (seção 7), que varia por segmento. Ambiente ideal de teste piloto: a própria equipe do usuário. Público-alvo comercial do primeiro momento: o corretor individual sobrecarregado de tarefas, que não consegue dar conta de tudo sozinho — não a imobiliária grande, que fica para uma fase posterior.

---

## Decisão de UX que define o produto
**A tela inicial do app é a conversa, não o CRM.** O corretor abre o app e já está numa janela de chat — como conversar com um assistente. O funil de leads e a lista de pendências existem, mas são destinos que ele visita, não a porta de entrada.

**Restrição de produto importante:** o app nunca entra em contato com o cliente automaticamente. Ele só dá o lembrete de que é dia de fazer follow-up, podendo sugerir mensagens — mas o envio em si é sempre manual, feito pelo corretor.

---

## Funcionalidades do MVP

### 1. Cadastro de lead e funil básico
- Lead: nome, telefone, origem, imóvel de interesse, estágio (novo, em atendimento, proposta, fechado, perdido), etiquetas
- Kanban simples por estágio, acessível a partir da conversa

### 2. Janela de conversa nativa (o núcleo do produto)
Corretor grava áudio ou digita uma mensagem curta, em linguagem natural, narrando o que aconteceu. Uma única mensagem pode disparar várias ações ao mesmo tempo: nota no histórico, etiquetas adicionadas/removidas, lembrete de follow-up ou visita agendada.

Antes de gravar qualquer coisa, o app mostra uma tela de confirmação em formato de recibo — resumo do que foi entendido, editável, com botão de confirmar.

A janela também responde perguntas diretamente na conversa — não é só entrada de dados, é também consulta.

### 3. Etiquetas automáticas por lead
- **Origem/tipo**: Tráfego, Indicação, Compra, Locação, faixa de valor (ex: "PV 8M")
- **Pendência**: Enviar opções, Agendar visita, Aguardando retorno
- Etiquetas de pendência são removidas automaticamente quando a ação é concluída. Uma etiqueta de estágio mais avançado (ex: "Visita agendada") remove as pendências anteriores daquele lead automaticamente, a não ser que a mesma mensagem reafirme explicitamente a pendência.

### 4. Consulta em linguagem natural
- "Quais as notas da Fernanda?" → devolve o histórico registrado daquele lead
- "Quem eu preciso enviar opções?" → devolve a lista de leads com aquela etiqueta

### 5. Notas livres por lead
Qualquer relato descritivo (preferências do cliente) vira nota registrada no histórico, consultável depois pela própria conversa.

### 6. Agendamento de visita com atualização simultânea
Ao narrar "agendei visita com a Fernanda sexta às 15h", numa única mensagem: atualiza o card do lead (etiqueta + nota) E cria o compromisso na agenda, numa seção de "próximos compromissos" que mostra visitas futuras, não só as de hoje.

### 7. Motor de cadência
- Lead sem interação há X dias, ou marcado "sem retorno", entra numa cadência automática de lembretes (ex: 3, 5, 7 e 30 dias)
- Cadência varia por segmento: econômico/MCMV segue marcos do financiamento; lançamentos usam cadência decrescente (diária semana 1, semanal mês 2, quinzenal depois); alto padrão usa cadência mais espaçada com contatos de maior valor — relacionamento pesa mais que frequência

### 8. Scripts de reativação
Biblioteca de scripts por tempo de inatividade, vinculada à lista de atenção.

### 9. Dashboard do gestor (mínimo)
Lista de leads por corretor, quem está com follow-up atrasado.

### 10. Importação em massa de leads (menu, canto superior esquerdo)
1. Upload de `.csv` e `.xlsx`
2. Mapeamento automático de colunas (nome, telefone, tipo de busca, imóvel de interesse, última data de contato), confirmável/ajustável pelo corretor
3. Pré-visualização de amostra antes de confirmar
4. Checagem de duplicados (por telefone/nome) — atualizar ou ignorar
5. A "última data de contato" importada já alimenta o motor de cadência imediatamente

### 11. Match automático entre lead e carteira de imóveis
Quando um imóvel novo é cadastrado ou tem preço/condição ajustado, o sistema cruza com os leads de perfil compatível (por etiquetas, notas e faixa de valor) e avisa o corretor — prospecção ativa, não dependente da memória do corretor.

### 12. Alerta de urgência para primeiro atendimento
Lead novo sem primeiro contato deve aparecer com prioridade máxima na lista de atenção, acima até dos follow-ups de cadência, enquanto não for atendido.

### 13. Preparação para integrações futuras (não implementar agora, mas arquitetar para isso)
Não entra no MVP, mas o sistema deve ser desenhado pra essas conexões serem viáveis depois, sem reescrever a base:
- Portais imobiliários (ZAP, VivaReal, OLX) — publicação e sincronização de anúncios
- Gerenciador de Anúncios do Facebook — leads de formulário (Lead Ads) entrando automaticamente no CRM
- WhatsApp — leads de campanhas do Facebook via WhatsApp também entrando automaticamente no CRM

Isso significa desenhar a entrada de leads de forma genérica (um lead pode vir de vários canais), não amarrada só ao cadastro manual ou à voz — pra plugar uma fonte nova no futuro ser configuração, não reconstrução.

---

## Fora do escopo do MVP (fica para fase 2/3)
- Integração WhatsApp (Coexistence) e demais conexões da seção 13
- Geração automática de conteúdo (Instagram/TikTok)
- Relatório automático ao proprietário
- Pós-venda e indicação automatizada
- Hierarquia completa (diretor, dono, construtora) e dashboards por cargo
- Quadro de disponibilidade entre imobiliárias (construtora/incorporadora)
- Módulo financeiro/comissões + termo de concordância assinado eletronicamente
- Múltiplos planos de assinatura por segmento / modelo freemium

---

## Telas principais do MVP
1. Login / seleção de equipe
2. **Conversa (tela inicial)** — gravação de áudio/texto, confirmação em recibo, respostas a consultas
3. Funil de leads (Kanban), com etiquetas visíveis em cada card
4. Ficha do lead (histórico, notas, etiquetas)
5. Lista de atenção: "hoje/atrasado" + "próximos compromissos" (visitas) + alertas de primeiro atendimento urgente
6. Dashboard do gestor

---

## Stack técnica sugerida
- **Frontend:** React / Next.js (web responsivo)
- **Backend/banco:** Supabase ou Postgres — multi-tenant desde o início, com entrada de leads desenhada de forma genérica (múltiplos canais possíveis no futuro)
- **Transcrição de áudio:** Whisper (ou equivalente com bom suporte a português)
- **Extração e classificação de intenção:** modelo de linguagem rodando no servidor (não no navegador do cliente), com dois modos de saída: ação a registrar (JSON estruturado) ou resposta a uma pergunta
- **Hospedagem:** Vercel (frontend) + Supabase (backend/banco)

## Áudio real (voz funcionando de ponta a ponta) — prioridade atual
A entrada de voz ainda não está funcionando no app publicado. Falta:
1. **Captura de áudio** — acesso ao microfone do navegador/dispositivo, com botão de gravar/parar na janela de conversa
2. **Transcrição** — enviar o áudio para uma API de speech-to-text (ex: Whisper da OpenAI) antes de passar o texto pro modelo de extração

**Custo estimado (referência de agosto/2026, conferir valor atual antes de finalizar orçamento):**
- Transcrição: ~US$ 0,006 por minuto de áudio
- Interpretação (Claude Sonnet): ~US$ 0,0046 por mensagem
- Total: ~US$ 0,006 a 0,01 por mensagem de voz — cerca de US$ 4 a 6/mês por corretor de uso intenso (≈600 mensagens/mês)

## Nota final — o que a conversa de validação representou
A conversa que gerou este briefing foi, na prática, uma simulação ao vivo do comportamento esperado da IA do produto: pedidos em linguagem natural e por voz foram entendidos, organizados e registrados (nomes de clientes, valores, datas, lembretes) sem formulário nenhum — só que em lembretes de celular, não num CRM real. É essa lacuna que o app precisa fechar: o mesmo nível de compreensão gravando direto no banco de dados do CRM, de forma permanente e consultável.

## Critério de sucesso do MVP
- Corretores da equipe piloto usam a janela de conversa pelo menos uma vez por dia sem lembrete externo
- Taxa de acerto da extração de dados (sem precisar corrigir) acima de um patamar aceitável
- Redução perceptível de leads "esquecidos" comparado à rotina anterior

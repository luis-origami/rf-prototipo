# Cobrança RF — Protótipo Visual

> **Protótipo visual de alta fidelidade, navegável e clicável.**
> Este é a **fonte da verdade de UI, fluxo e conteúdo** — não de comportamento ou regra de negócio.
> Define o que aparece e como se navega. Não define o motor da régua, o agendamento real nem a sincronização.

---

## Como rodar

```bash
cd web
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — você será redirecionado para `/dashboard`.

**Requisito:** Node.js 18+, resolução ≥ 1280px (desktop only — by design).

---

## Telas disponíveis

| Rota                    | Tela                      | Descrição                                                             |
|-------------------------|---------------------------|-----------------------------------------------------------------------|
| `/dashboard`            | Dashboard                 | KPIs, aging de recebíveis, top inadimplentes, métricas operacionais   |
| `/titulos`              | Títulos                   | Tabela densa de boletos + Kanban, filtros (incl. tipo de cliente), busca |
| `/clientes/[id]`        | Detalhe do Cliente        | Timeline da régua, boletos, histórico de notificações, ações          |
| `/clientes/[id]/regua/editar` | Editar régua do cliente | Edição dedicada dos marcos da régua específica                  |
| `/processo-cobranca`    | Processo de Cobrança      | Réguas, editor de templates, preview WhatsApp, histórico, fila        |
| `/admin`                | Admin                     | Hub: Gestão de Usuários e Parametrizações                             |
| `/admin/usuarios`       | Gestão de Usuários        | CRUD de usuários e perfis                                             |
| `/admin/parametrizacoes`| Parametrizações           | Parâmetros de encargos + Integração Certtus (status, log, mapeamento) |
| `/abonos`               | Negociações               | Supervisão de negociações e abonos                                   |

---

## Onde estão os mocks

Todos os dados fictícios estão centralizados em [`mocks/index.ts`](mocks/index.ts):

- **`clientes`** — 40 clientes plausíveis (oficinas, transportadoras, frotistas, revendas, PF) do interior de MG
- **`boletos`** — 100 boletos com distribuição realista: 35 pagos, 25 a vencer, 5 vencem hoje, 22 atrasados, 13 inadimplentes
- **`notificacoes`** — histórico de 15 notificações via WhatsApp
- **`templates`** — 6 templates de mensagem (D-3 a D+30)
- **`reguas`** — 2 réguas (Padrão e Reincidente) com etapas configuráveis
- **`kpis`** — métricas pré-computadas para o dashboard

Os IDs são referencialmente consistentes: o cliente `c03` (Transportes Minas Gerais Ltda) aparece idêntico em dashboard, lista, detalhe e histórico de notificações.

---

## O que funciona (interatividade)

- Navegação entre todas as telas pela barra lateral
- Tabs, filtros e busca sobre os dados mock (client-side)
- Abrir detalhe de cliente a partir da tabela de cobranças e do dashboard
- Timeline da régua com estado simulado por nível de atraso do boleto
- Pausar/retomar régua, registrar exceção manual
- Modal de confirmação para "Negativar cliente" (ação destrutiva isolada)
- Editor visual de templates com variáveis e preview em bolha WhatsApp
- Editor de etapas da régua (ativar/desativar/remover)
- Simulação de erro de sincronização Certtus (botão "Simular erro" em Configurações › Integração)
- Toasts de feedback em todas as ações

---

## O que NÃO funciona (fora de escopo)

| Item                          | Motivo                                                      |
|-------------------------------|-------------------------------------------------------------|
| Envio real de WhatsApp        | Sem Z-API, Twilio ou Meta Cloud API                        |
| Persistência entre sessões    | Sem banco — estado vive só no React state                  |
| Motor da régua                | Sem agendamento real (pg_cron, scheduler, etc.)            |
| Sincronização real (Certtus)  | Sem conexão ao banco PostgreSQL 9.2                        |
| Autenticação real             | Sem login/sessão                                           |
| Geração de boletos            | O produto só lê — nunca cria fato financeiro               |
| Exportação de arquivos        | Toast simulado, sem arquivo gerado                         |

---

## Design system

O protótipo usa exclusivamente os tokens do **DS Cobrança RF (`ds-v3-retifica.html`)**:

- **Fontes:** Fraunces (display/KPIs), IBM Plex Sans (corpo/tabelas), IBM Plex Mono (valores, datas, IDs)
- **Cores:** tokens `--color-*`, `--status-*` do DS — nenhuma cor foi inventada
- **Componentes:** `.btn`, `.badge`, `.badge-process`, `.tag`, `.input`, `.card`, `.alert`, `.toast`, `.navitem`, `.empty`, `.skeleton`, `.modal` — todos extraídos do DS
- **Tema:** claro único (o DS proíbe dark mode)
- **Ícones:** Lucide outline, stroke 2px

---

## Separação Certtus × Cobrança RF

A distinção é explícita na interface:

- **Fato financeiro** (valor, vencimento, cliente) → origem Certtus, indicado com `tag` "Certtus" e fonte mono
- **Estado de processo** (régua, etapa, pausas) → verdade do Cobrança RF, indicado com `badge-process` (quadrado/mono)
- Campos do Certtus são `readonly` com helper "Fato financeiro · somente leitura"

---

## Decisões de comportamento em aberto (para o time de produção)

1. **Motor da régua:** qual scheduler dispara as etapas? (pg_cron, Node cron, BullMQ?)
2. **Gatilhos reais:** como o motor detecta que um boleto mudou de estado no Certtus?
3. **Idempotência:** mecanismo para evitar envio duplo (sugerido: `notification_logs` com hash boleto+etapa)
4. **Aprovação prévia:** quem aprova e por qual canal? (dashboard ou e-mail?)
5. **Régua por cliente vs. por boleto:** uma régua por cliente ou por boleto individual?
6. **Escalamento D+30:** apenas aviso interno ou ação externa (protesto, negativação automática)?
7. **Lógica de elegibilidade para exceção:** quais condições permitem ou bloqueiam disparo?
8. **API Certtus:** quando disponível, qual contrato? (REST/GraphQL/webhook?) — a camada adapter isola isso
9. **Multi-tenant:** a arquitetura suporta múltiplas empresas? Isolamento de dados por tenant?
10. **LGPD:** retenção de `notification_logs` (CPF mascarado, sem dados pessoais completos)

---

*Retífica Formiguense · Cobrança RF v0.1 · Protótipo visual · Junho 2026*

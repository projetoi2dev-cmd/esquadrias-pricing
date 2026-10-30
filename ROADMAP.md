# Roadmap — Esquadra

Base: relatório técnico de 27/10/2026, commit `17b895a`, deploy em `esquadrias-pricing.vercel.app`.
Estado: integração com Supabase homologada (9/9 telas, RLS em 15/15 tabelas, 25 verificações) e perfil visualizador validado em API, UI e Vercel (28 verificações), apta para uso controlado — não para operação irrestrita.

## Estado atual verificado no código

- Auth e papel do usuário: `src/lib/auth.tsx`, `src/lib/workspace.tsx`.
- Navegação por estado interno, sem rotas por URL: `src/App.tsx:24`.
- Gating por papel centralizado em `src/lib/permissions.ts` e aplicado em todas as telas; Configurações usa `canManage`/`isAdmin`.
- Nenhum teste versionado; CI mínimo commitado em `.github/workflows/ci.yml` (typecheck + build), falta adicionar testes unitários/RLS/E2E.
- Produtos e fornecedores existem no schema e no seed, mas não têm tela de CRUD.
- Exportação de relatórios usa `window.print()`.
- Build com chunk principal de ~509 kB (gráficos já separados).

## Fase 0 — Fechar a homologação (1–2 semanas)

Objetivo: eliminar as pendências que impedem liberar acesso a outros perfis.

1. **Gating visual por papel** — concluído no código
   - [x] Hook central `usePermissions()` com `canWrite`, `canManage`, `isAdmin` e `isViewer`.
   - [x] Ações de escrita escondidas/desabilitadas em Orçamentos, Materiais, Projetos, Equipe, Financeiro e Clientes.
   - [x] Banner global de "somente leitura" no layout e RLS mantido como última linha de defesa.
   - [x] Validar o resultado no navegador com um usuário `visualizador`.
   - Critério: usuário visualizador não vê botões de criar/editar/excluir em nenhum módulo.

2. **Teste real com papel restrito** — concluído em localhost e Vercel
   - [x] Criar segundo usuário `teste@esquadra.com` no dashboard e vinculá-lo como `visualizador`.
   - [x] API: leitura 200 em 15/15 tabelas; INSERT 403 em 10/10 tabelas; `save_quote` negado com `P0001`.
   - [x] UI: 28/28 verificações aprovadas (banner, ações ocultas, campos desabilitados).
   - [x] Repetir o smoke no domínio publicado da Vercel (28/28).
   - Critério: evidência registrada no relatório, sem resíduos no banco.

3. **Confirmar Supabase Auth** — concluído
   - [x] Site URL e Redirect URLs configurados para o domínio da Vercel.
   - [x] Registrar a evidência no relatório técnico.
   - Critério: login e recuperação de sessão funcionando no domínio publicado.

4. **Backup e retenção (mínimo viável)** — pendente
   - Ativar backup diário/PITR no Supabase e documentar o processo de restore.
   - Definir retenção de dados e rotina de expurgo LGPD.
   - Critério: um restore de teste executado e documentado.

## Fase 1 — Confiabilidade e CI (2–3 semanas)

Objetivo: parar de depender de homologação manual.

1. **Testes unitários** (Vitest): `src/lib/pricing.ts`, `src/lib/finance.ts`, `src/lib/format.ts`.
   - Cobrir a cascata de preços do relatório (R$ 942,48 / R$ 895,36) e casos-limite.
2. **Testes de schema/RLS versionados** (pgTAP ou harness PGlite):
   - Anônimo recebe 401; visualizador não escreve; `save_quote` é atômica; índice único de projeto por orçamento.
3. **Smoke test E2E** (Playwright) das 9 telas + login.
   - [x] Execução local e na Vercel do fluxo do visualizador (28 verificações aprovadas).
   - [ ] Versionar o teste em `e2e/` e rodar no CI.
4. **CI no GitHub Actions**: typecheck, testes, build e E2E em PR para `main`.
   - [x] Esqueleto com `npm ci`, `typecheck` e `build` em PR/push para `main`.
   - [ ] Adicionar testes unitários, schema/RLS e E2E ao pipeline.
5. **Monitoramento**: Sentry no frontend, alertas de erro e uptime check na Vercel.
6. **Performance**: `manualChunks` para separar React, Supabase e Recharts; meta de chunk principal < 300 kB.

Critério de saída: PR bloqueado com CI vermelho, erro de produção gerando alerta.

## Fase 2 — Completude de produto (3–5 semanas)

1. **CRUD de Produtos e Fornecedores**
   - Telas próprias, vínculo fornecedor ↔ material e uso no BOM/orçamento.
2. **Exportações reais**
   - PDF de proposta (biblioteca dedicada ou geração server-side) e Excel/CSV para relatórios e financeiro.
3. **Rotas por URL** (React Router)
   - Links profundos, histórico de navegação e rotas protegidas por papel.
4. **Gestão de membros**
   - Convite de usuário via Edge Function com service role (nunca no cliente) ou fluxo documentado no dashboard.
5. **Auditoria**
   - Tabela `audit_log` + triggers para registrar quem alterou o quê.

Critério de saída: operação diária sem SQL manual para cadastros básicos.

## Fase 3 — Operação madura (contínuo)

- Expurgo/anonimização LGPD automatizado e política de retenção formal.
- Suporte a múltiplos workspaces (hoje o app assume 1 vínculo em `workspace.tsx`).
- Permissões mais granulares (ex.: orçamentista sem acesso ao financeiro).
- Drill de restore periódico e revisão de acessos.
- Acessibilidade e revisão de performance contínuas.

## Fase 4 — Evolução de produto (backlog)

- Portal do cliente com aprovação online de orçamento.
- Envio de proposta por e-mail/WhatsApp.
- Ordens de compra geradas a partir do BOM.
- Planejamento de produção e roteirização de instalações.
- PWA/mobile para equipe de campo.

## Próximos passos imediatos (esta semana)

1. [x] Implementar `usePermissions()` e aplicar o gating em todas as telas.
2. [x] Configurar Site URL e Redirect URLs no Supabase Auth.
3. [x] Criar o usuário `visualizador` no Supabase e validar leitura + bloqueio de escrita.
4. [x] Subir o esqueleto de CI (typecheck + build) no GitHub Actions.
5. [ ] Agendar backup diário e escrever o procedimento de restore.

## Progresso

- 2026-10-30: gating visual por papel implementado; typecheck e build aprovados.
- 2026-10-30: script `supabase/bootstrap-viewer.sql` criado para vincular o usuário de teste.
- 2026-10-30: CI mínimo criado em `.github/workflows/ci.yml` (typecheck + build).
- 2026-10-30: usuário `teste@esquadra.com` vinculado como `visualizador`; API e UI validadas (15/15 leituras, 10/10 escritas bloqueadas, 28/28 checks de UI).
- 2026-10-30: commit `dab7d94` publicado na Vercel; smoke do visualizador 28/28 em produção; relatório técnico atualizado.

## Fora de escopo por agora

- Novas features de produto antes de fechar Fase 0 e Fase 1.
- Service role no cliente, em qualquer hipótese.
- Operação irrestrita sem backup, auditoria e teste do perfil restrito.

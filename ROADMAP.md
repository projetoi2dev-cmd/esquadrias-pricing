# Roadmap — Esquadra

Base: relatório técnico de 27/10/2026, commit `17b895a`, deploy em `esquadrias-pricing.vercel.app`.
Estado: integração com Supabase homologada (9/9 telas, RLS em 15/15 tabelas, 25 verificações) e perfil visualizador validado em API, UI e Vercel (28 verificações), apta para uso controlado — não para operação irrestrita.

## Estado atual verificado no código

- Auth e papel do usuário: `src/lib/auth.tsx`, `src/lib/workspace.tsx`.
- Navegação por estado interno, sem rotas por URL: `src/App.tsx:24`.
- Gating por papel centralizado em `src/lib/permissions.ts` e aplicado em todas as telas; Configurações usa `canManage`/`isAdmin`.
- Testes unitários versionados com Vitest (25 casos em `src/lib/*.test.ts`); harness de schema/RLS com PGlite em `supabase/tests/schema-rls.mjs`; smoke E2E versionado em `e2e/` (viewer + admin simulado); workflow `.github/workflows/e2e.yml` roda em PR e manual, com secrets configurados; CI em PR/push roda typecheck, testes unitários, schema/RLS e build.
- Produtos e fornecedores existem no schema e no seed, mas não têm tela de CRUD.
- Exportação de relatórios usa `window.print()`.
- Build com chunk principal de ~31 kB; vendors separados (React ~219 kB, Supabase ~214 kB, Recharts ~343 kB).

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

4. **Backup e retenção (mínimo viável)** — runbook e backup gratuito prontos; primeiro run e restore de teste pendentes
   - [x] Runbook em `docs/backup-restore.md`, script `scripts/backup-supabase.ps1` e verificação `supabase/tests/verify-restore.sql` testada no harness.
   - [x] Workflow `.github/workflows/backup.yml` com dump diário do schema `public`, criptografia GPG, `SHA256SUMS`, manifesto e artifact de 30 dias.
   - [ ] Configurar secrets `SUPABASE_DB_URL`/`BACKUP_PASSPHRASE` e variable `BACKUP_ENABLED=true`; executar o workflow com sucesso.
   - [ ] Executar restore de teste em projeto separado e registrar a evidência.
   - [ ] Definir retenção de dados e rotina de expurgo LGPD.
   - Nota: o plano Free não oferece backup automático/PITR; não exigir ativação no dashboard. O dump cobre `public`, não o Auth.
   - Critério: um restore de teste executado e documentado.

## Fase 1 — Confiabilidade e CI (2–3 semanas)

Objetivo: parar de depender de homologação manual.

1. **Testes unitários** (Vitest): `src/lib/pricing.ts`, `src/lib/finance.ts`, `src/lib/format.ts` — concluído
   - [x] Cascata de preços (R$ 942,48 / R$ 895,36), parcelas, arredondamentos e casos-limite.
   - [x] Buckets diário/semanal/mensal e saldo acumulado em `finance.ts`.
   - [x] Parsing e formatação pt-BR em `format.ts`.
   - [x] 25 testes passando em `npm run test`.
2. **Testes de schema/RLS versionados** (harness PGlite) — concluído
   - [x] Stubs de `auth.users`/`auth.uid()` e roles `anon`/`authenticated`.
   - [x] Anônimo bloqueado; visualizador lê mas não escreve; `save_quote` atômica e substitui itens sem duplicar; um projeto por orçamento; escopo entre workspaces; idempotência de schema/bootstrap/seed.
   - [x] `npm run test:schema` no CI.
3. **Smoke test E2E** (Playwright) das 9 telas + login — concluído
   - [x] Fluxo do visualizador (28 verificações) e admin simulado (novo orçamento + save flow) executados localmente e na Vercel.
   - [x] Versionar em `e2e/` com `playwright.config.ts` e scripts `test:e2e`/`test:e2e:ui`.
   - [x] Rodar automaticamente em PR; secrets `VIEWER_EMAIL`, `VIEWER_PASS`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` configurados; workflow validado no GitHub Actions.
4. **CI no GitHub Actions**: typecheck, testes, build e E2E em PR para `main` — concluído
   - [x] `npm ci`, `typecheck`, `test`, `test:schema` e `build` em PR/push para `main`.
   - [x] E2E automático em PR com secrets; execução manual também disponível.
5. **Monitoramento**: Sentry no frontend, alertas de erro e uptime check na Vercel.
6. **Performance**: `codeSplitting` para separar React, Supabase, TanStack Query e ícones; Recharts já em chunk próprio — concluído
   - [x] Chunk principal caiu de ~509 kB para ~31 kB; sem aviso de chunk > 500 kB.
   - [x] E2E 3/3 no preview do build com os chunks separados.

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
5. [x] Versionar testes unitários (Vitest), schema/RLS (PGlite) e E2E; CI roda typecheck, testes unitários, schema/RLS e build.
6. [x] Configurar secrets do E2E no GitHub.
7. [x] Documentar backup/restore e verificação pós-restore.
8. [ ] Configurar secrets do backup, rodar o workflow `backup.yml` e executar restore de teste (Free; sem PITR).
9. [x] Separar vendors no build; chunk principal < 300 kB.
10. [x] Criar workflow de backup gratuito com artifact criptografado.

## Progresso

- 2026-10-30: gating visual por papel implementado; typecheck e build aprovados.
- 2026-10-30: script `supabase/bootstrap-viewer.sql` criado para vincular o usuário de teste.
- 2026-10-30: CI mínimo criado em `.github/workflows/ci.yml` (typecheck + build).
- 2026-10-30: usuário `teste@esquadra.com` vinculado como `visualizador`; API e UI validadas (15/15 leituras, 10/10 escritas bloqueadas, 28/28 checks de UI).
- 2026-10-30: commit `dab7d94` publicado na Vercel; smoke do visualizador 28/28 em produção; relatório técnico atualizado.
- 2026-10-30: commit `4c9af07` corrige o fluxo de novo orçamento (abre o mais recente e confirma a criação); admin 7/7 e viewer 28/28 na Vercel.
- 2026-10-31: commit `b8b561d` rola até o formulário e fixa as ações de salvar no topo; hint "Adicione produtos para salvar"; admin 7/7, save flow 3/3 (validação + RPC) e viewer 28/28 na Vercel; layout 1024/1280/1440 com salvar visível após o clique.
- 2026-10-31: Vitest com 25 testes em pricing/finance/format; E2E versionado em `e2e/` (viewer 28 checks + admin/save flow) validado em localhost e Vercel; CI passou a rodar `npm run test`; workflow manual `e2e.yml` criado.
- 2026-10-31: harness PGlite versionado em `supabase/tests/schema-rls.mjs` (anon/viewer bloqueados, `save_quote` atômica, um projeto por orçamento, escopo entre workspaces, idempotência); `npm run test:schema` adicionado ao CI.
- 2026-10-31: `codeSplitting` no `vite.config.ts` separa React, Supabase, TanStack Query e ícones; chunk principal caiu de ~509 kB para ~31 kB; E2E 3/3 no preview do build.
- 2026-10-31: CI success no commit `3d4bf7b`; Vercel publicou os chunks separados (`index-BO9JgQW6.js`, 31 kB) e o E2E 3/3 passou na URL publicada.
- 2026-10-31: secrets do E2E configurados; workflow `e2e.yml` passou a rodar em PR e a execução manual no GitHub Actions terminou com sucesso (3/3).
- 2026-10-31: runbook de backup/restore em `docs/backup-restore.md`, script `scripts/backup-supabase.ps1` e verificação `supabase/tests/verify-restore.sql` (executada no harness PGlite).
- 2026-10-31: workflow `.github/workflows/backup.yml` criado para backup diário gratuito no GitHub Actions: dump do `public`, GPG AES256, checksums/manifesto e artifact de 30 dias; secrets e primeiro run pendentes.

## Fora de escopo por agora

- Novas features de produto antes de fechar Fase 0 e Fase 1.
- Service role no cliente, em qualquer hipótese.
- Operação irrestrita sem backup, auditoria e teste do perfil restrito.

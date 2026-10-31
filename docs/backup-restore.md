# Backup e restore — Esquadra

Este runbook cobre o banco PostgreSQL do Supabase usado pelo Esquadra. O aplicativo não usa
Supabase Storage; portanto, o escopo é o schema `public`, as funções/RLS e os usuários do Auth.

## Objetivo e metas

- **RPO (perda máxima aceitável):** até 24 horas no backup diário; até 5–15 minutos se o PITR
  estiver contratado.
- **RTO (tempo alvo de recuperação):** até 2 horas para um restore completo em projeto separado.
- **Frequência:** backup gerenciado diário + backup lógico semanal e antes de migrações.
- **Retenção sugerida:** 7 diários, 4 semanais e 12 mensais; PITR conforme o plano.
- **Regra de ouro:** nunca restaurar primeiro em produção. Todo ensaio usa um projeto separado.

## Pré-requisitos

- Acesso de owner ao projeto no dashboard do Supabase.
- Supabase CLI: `npm install -g supabase` (confirme com `supabase --version`).
- Cliente PostgreSQL (`psql`, `pg_dump`, `pg_restore`): no Windows, `winget install PostgreSQL.PostgreSQL.17`.
- Connection string do projeto: **Project Settings → Database → Connection string**. Prefira a
  conexão direta ou o session pooler na porta 5432; inclua `sslmode=require`.
- Guarde a URL em uma variável de ambiente da sessão, nunca em arquivo versionado:

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres.<ref>:<senha>@<host>:5432/postgres?sslmode=require'
```

Nunca cole a URL em issues, commits, prints ou no `relatorio.html`. Se ela vazar, rotacione a senha
do banco no dashboard.

## Estratégia recomendada

1. **Produção:** ativar backup diário e, se o plano permitir, PITR no dashboard
   (**Database → Backups**). Essa é a via preferencial para recuperar Auth + banco no mesmo estado.
2. **Backup lógico semanal:** gerar dump do schema `public` com a CLI e guardar fora do repositório.
3. **Antes de migrações:** gerar um dump adicional e registrar o commit do deploy no manifesto.
4. **Auth:** usuários e senhas são gerenciados pelo Supabase Auth. O dump lógico do `public` não
   substitui o backup gerenciado/PITR para recuperar usuários; use o restore do dashboard para
   recuperação completa ou recrie os usuários e remapeie os vínculos em um procedimento à parte.

## Backup pelo dashboard

1. Abra **Database → Backups**.
2. Confirme a política ativa (diário/PITR) e a retenção exibida no plano.
3. Antes de uma migração, use a opção de backup sob demanda, se disponível no plano.
4. Para restore, siga o fluxo do dashboard e escolha um projeto de destino separado quando a opção
   existir. Registre data/hora, commit e responsável.
5. Se o plano não oferecer restore para outro projeto, use o restore lógico abaixo para o schema
   `public` e trate o Auth separadamente.

## Backup lógico com Supabase CLI

Crie a pasta local (ignorada pelo Git) e gere os arquivos:

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = "backups/esquadra-$stamp"
New-Item -ItemType Directory -Path $target -Force | Out-Null

supabase db dump --db-url $env:SUPABASE_DB_URL -f "$target/schema.sql" --schema public
supabase db dump --db-url $env:SUPABASE_DB_URL -f "$target/data.sql" --data-only --schema public
supabase db dump --db-url $env:SUPABASE_DB_URL -f "$target/roles.sql" --role-only
```

Notas:

- Confirme os parâmetros disponíveis na sua versão com `supabase db dump --help`.
- O dump do schema `public` contém tabelas, índices, funções, triggers e políticas RLS.
- O dump de dados é destinado a um projeto que já tenha o schema aplicado (por exemplo,
  `supabase/schema.sql`).
- O arquivo de roles é opcional para este app; não o restaure sobre um projeto gerenciado sem
  revisar as roles existentes.

## Backup com pg_dump (alternativa)

Formato customizado, útil para restore seletivo:

```powershell
pg_dump --dbname "$env:SUPABASE_DB_URL" `
  --schema=public `
  --format=custom `
  --no-owner `
  --no-privileges `
  --file "backups/esquadra-public.dump"
```

Verifique o conteúdo sem restaurar:

```powershell
pg_restore --list "backups/esquadra-public.dump" | Select-Object -First 40
```

Para um dump de dados em texto:

```powershell
pg_dump --dbname "$env:SUPABASE_DB_URL" --schema=public --data-only --format=plain --file "backups/esquadra-data.sql"
```

## Manifesto e integridade

Para cada backup, registre em `manifest.txt`:

- data/hora UTC;
- commit do deploy (`git rev-parse HEAD`);
- projeto Supabase e ambiente;
- arquivos gerados e tamanho;
- SHA-256 de cada arquivo;
- contagens das tabelas principais (veja a seção de verificação).

No Windows:

```powershell
Get-FileHash -Algorithm SHA256 "$target/schema.sql", "$target/data.sql", "$target/roles.sql"
```

Guarde o manifesto junto do backup, fora do repositório. O script
`scripts/backup-supabase.ps1` automatiza dump + manifesto.

## Ensaio de restore (projeto separado)

1. Crie um projeto Supabase novo e vazio, por exemplo `esquadra-restore-drill`.
2. Configure a URL de destino na sessão:

```powershell
$env:RESTORE_DB_URL = 'postgresql://postgres.<ref>:<senha>@<host>:5432/postgres?sslmode=require'
```

3. Aplique o schema e restaure os dados do `public`:

```powershell
psql "$env:RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql "$env:RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f "backups/esquadra-<stamp>/data.sql"
```

4. Se estiver usando o dump customizado:

```powershell
pg_restore --dbname "$env:RESTORE_DB_URL" --data-only --schema=public --no-owner --no-privileges "backups/esquadra-public.dump"
```

5. Para validar o Auth e os vínculos de workspace, prefira o restore gerenciado/PITR. Se o ensaio
   for apenas do `public`, recrie os usuários no Auth e ajuste `workspace_members.user_id` antes de
   testar login; caso contrário, as FKs de `auth.users` falham.
6. Rode a verificação:

```powershell
psql "$env:RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/verify-restore.sql
```

7. Aponte um ambiente local para o projeto restaurado e execute o smoke:

```powershell
$env:VITE_SUPABASE_URL = 'https://<ref-do-restore>.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = '<publishable-key-do-restore>'
npm run dev
```

Faça login com admin e viewer, abra as 9 telas e execute `npm run test:e2e` com
`BASE_URL=http://127.0.0.1:8443`. O E2E não deve ser apontado para produção durante o ensaio.

## Verificação pós-restore

O script `supabase/tests/verify-restore.sql` é somente leitura e falha com `RAISE EXCEPTION` quando
encontra inconsistência. Ele verifica:

- tabelas e funções essenciais;
- RLS habilitado e políticas presentes;
- `save_quote` como `security definer`;
- índice único de projeto por orçamento;
- triggers de escopo entre workspaces e de histórico de materiais;
- vínculo entre `auth.users` e `public.profiles`;
- pelo menos um admin no workspace;
- contagens das tabelas principais.

Rode no SQL Editor do projeto restaurado ou via `psql`. Compare as contagens com o manifesto do
backup e registre o resultado.

## Retenção, segurança e LGPD

- Mantenha backups fora do repositório, em armazenamento criptografado e com acesso restrito.
- Aplique a retenção acordada e exclua cópias expiradas; registre a exclusão.
- Não use dados de produção em ambiente de demonstração sem anonimização.
- Para solicitações LGPD, defina o procedimento de exportação/exclusão e o prazo de resposta.
- Rotacione a senha do banco e as chaves se um backup ou connection string for exposto.
- O backup não substitui auditoria: mantenha logs de acesso e revisão periódica de membros.

## Checklist de incidente

- [ ] Declarar o incidente e pausar escritas/aplicação, se necessário.
- [ ] Identificar a janela de perda e escolher o backup/PITR.
- [ ] Conferir o SHA-256 do backup escolhido.
- [ ] Restaurar em projeto separado e rodar `verify-restore.sql`.
- [ ] Conferir contagens, login admin/viewer e fluxo de salvar orçamento.
- [ ] Rodar o E2E 3/3 contra o ambiente restaurado.
- [ ] Trocar as variáveis da Vercel para o projeto restaurado, se for promover.
- [ ] Registrar data, commit, backup, responsável e lições aprendidas.

## Checklist de ensaio

- [ ] Backup gerenciado/PITR ativo e retenção conferida no dashboard.
- [ ] Dump lógico gerado com hash e manifesto.
- [ ] Restore executado em projeto separado.
- [ ] `verify-restore.sql` sem erros.
- [ ] Contagens conferem com o manifesto.
- [ ] Login admin e viewer funcionando.
- [ ] `save_quote` e RLS validados.
- [ ] E2E 3/3 no ambiente restaurado.
- [ ] Evidência registrada no relatório técnico.

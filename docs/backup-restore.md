# Backup e restore — Esquadra

Este runbook cobre o banco PostgreSQL do Supabase usado pelo Esquadra. O aplicativo não usa
Supabase Storage; portanto, o escopo é o schema `public`, as funções/RLS e os usuários do Auth.

> **Plano Free:** o Supabase não inclui backup automático diário. Backups gerenciados e PITR são
> recursos dos planos Pro/Team/Enterprise. A automação sem custo deste projeto é o workflow
> `.github/workflows/backup.yml`, que gera um dump lógico criptografado e o publica como artifact
> do GitHub Actions. O dump cobre o schema `public`; usuários do Auth precisam ser recriados em um
> restore lógico.

## Objetivo e metas

- **RPO (perda máxima aceitável):** até 24 horas com o backup diário do GitHub Actions em dia;
  até 5–15 minutos somente se o PITR pago estiver contratado.
- **RTO (tempo alvo de recuperação):** até 2 horas para um restore completo em projeto separado.
- **Frequência:** backup lógico diário no GitHub Actions + cópia local semanal e antes de migrações.
  Se houver plano pago, o backup gerenciado/PITR é a via preferencial para o Auth.
- **Retenção sugerida:** 30 dias de artifacts + download mensal para armazenamento local; 7 diários,
  4 semanais e 12 mensais na cópia local; PITR conforme o plano.
- **Regra de ouro:** nunca restaurar primeiro em produção. Todo ensaio usa um projeto separado.

## Pré-requisitos

- Acesso de owner ao projeto no dashboard do Supabase e permissão de admin no repositório GitHub
  para criar secrets/variáveis.
- Para o backup automático: nenhuma instalação local; o runner `ubuntu-latest` já tem Docker e o
  workflow instala a Supabase CLI.
- Para o backup local: Supabase CLI (`npm install -g supabase`) e Docker Desktop, pois
  `supabase db dump` executa `pg_dump` em um contêiner.
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

1. **Produção no Free:** manter o workflow `backup.yml` verde diariamente, com artifact criptografado.
   Essa é a via gratuita e cobre o schema `public`.
2. **Cópia local semanal:** baixar o artifact mais recente e/ou gerar um dump com o script local;
   guardar fora do repositório.
3. **Antes de migrações:** disparar o workflow manualmente e registrar o commit do deploy no manifesto.
4. **Auth:** usuários e senhas são gerenciados pelo Supabase Auth. O dump lógico do `public` não
   contém `auth.users` nem hashes de senha. Em um restore lógico, recrie os usuários no dashboard e
   remapeie `workspace_members` com os scripts de bootstrap. Somente o backup gerenciado/PITR
   (planos pagos) recupera o Auth junto com o banco.
5. **Se o projeto migrar para um plano pago:** ative o backup diário/PITR no dashboard e use-o como
   via preferencial; mantenha o dump lógico como cópia adicional.

## Backup gerenciado (planos pagos)

> No plano Free não há backup automático no dashboard. Não use esta seção como garantia de
> recuperação sem antes confirmar o plano e a retenção em **Database → Backups**.

1. Abra **Database → Backups**.
2. Confirme a política ativa (diário/PITR), o plano e a retenção exibida.
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

- `supabase db dump` executa `pg_dump` em um contêiner; Docker Desktop precisa estar rodando.
- Confirme os parâmetros disponíveis na sua versão com `supabase db dump --help`.
- O dump do schema `public` contém tabelas, índices, funções, triggers e políticas RLS.
- O dump de dados é destinado a um projeto que já tenha o schema aplicado (por exemplo,
  `supabase/schema.sql`).
- O arquivo de roles é opcional para este app; não o restaure sobre um projeto gerenciado sem
  revisar as roles existentes.

## Backup automático gratuito no GitHub Actions

O workflow `.github/workflows/backup.yml` automatiza o backup lógico sem depender do plano pago:

- **Agenda:** todos os dias às 03:17 UTC (`workflow_dispatch` também disponível).
- **Gate:** a execução agendada só ocorre com a variable `BACKUP_ENABLED=true`; execuções manuais
  sempre rodam.
- **Secrets:** `SUPABASE_DB_URL` e `BACKUP_PASSPHRASE`.
- **Fluxo:** dump do schema `public`, dump de dados, criptografia GPG AES256, `SHA256SUMS`,
  `manifest.txt` e upload do artifact por 30 dias.
- **Custo:** usa os minutos e o armazenamento de artifacts incluídos no GitHub. Confira os limites
  do plano/repositório; um dump deste projeto é pequeno.

### Ativar

1. Em **Settings → Secrets and variables → Actions**, crie `SUPABASE_DB_URL` com a connection string
   do banco (session pooler/direta na 5432, `sslmode=require`, URL percent-encoded).
2. Crie `BACKUP_PASSPHRASE` com uma frase longa e aleatória. Guarde-a no gerenciador de senhas:
   sem ela, o artifact é irrecuperável.
3. Crie a variable `BACKUP_ENABLED=true`.
4. Rode **Actions → Backup → Run workflow** e confirme o job verde. O primeiro run valida os secrets
   antes de gerar o dump.

### Baixar e descriptografar

Baixe o artifact pela página do run ou pela API/`gh`. No PowerShell:

```powershell
$stamp = '<stamp-do-manifest>'
$dir = "backups/gh-$stamp"
New-Item -ItemType Directory -Path $dir -Force | Out-Null
# copie os arquivos do artifact para $dir

gpg --batch --yes --passphrase $env:BACKUP_PASSPHRASE `
  --decrypt "$dir/schema-$stamp.sql.gpg" > "$dir/schema.sql"
gpg --batch --yes --passphrase $env:BACKUP_PASSPHRASE `
  --decrypt "$dir/data-$stamp.sql.gpg" > "$dir/data.sql"

Get-FileHash -Algorithm SHA256 "$dir/schema-$stamp.sql.gpg", "$dir/data-$stamp.sql.gpg"
```

Confira os hashes com `SHA256SUMS` e o commit em `manifest.txt`. Baixe o artifact mensalmente se
precisar de retenção maior que 30 dias.

### Restaurar o artifact

1. Crie um projeto Supabase separado para o ensaio.
2. Aplique o schema versionado do commit registrado no manifesto:
   `psql "$env:RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql`.
3. Restaure os dados descriptografados:
   `psql "$env:RESTORE_DB_URL" -v ON_ERROR_STOP=1 -f "$dir/data.sql"`.
4. Recrie os usuários do Auth e rode os scripts de bootstrap para remapear `workspace_members`.
5. Rode `supabase/tests/verify-restore.sql` e o smoke/E2E do runbook.

O `schema-*.sql` do artifact serve para conferência; prefira o `supabase/schema.sql` versionado para
aplicar o schema, porque ele é o mesmo artefato revisado no Git.

### Limitações

- O dump cobre somente o schema `public`; não inclui `auth.users`, senhas ou Storage.
- Em repositório público, qualquer pessoa com leitura pode baixar artifacts; o conteúdo está
  criptografado, mas proteja a passphrase.
- Artifacts expiram em 30 dias; a cópia local mensal é parte da retenção.
- Se o workflow falhar, o RPO de 24 horas não está garantido. Monitore o run e mantenha o backup
  local como contingência.

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
`scripts/backup-supabase.ps1` automatiza dump + manifesto. O workflow do GitHub Actions gera
`SHA256SUMS` e `manifest.txt` com commit, run, timestamp, tamanhos e hashes dentro do artifact.

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

Se o backup vier do GitHub Actions, descriptografe primeiro o artifact conforme a seção acima e use
o `data.sql` resultante. O `schema.sql` deve ser o do commit registrado no manifesto.

4. Se estiver usando o dump customizado:

```powershell
pg_restore --dbname "$env:RESTORE_DB_URL" --data-only --schema=public --no-owner --no-privileges "backups/esquadra-public.dump"
```

5. Para validar o Auth e os vínculos de workspace, use o restore gerenciado/PITR se o plano
   oferecer. No Free, recrie os usuários no Auth e ajuste `workspace_members.user_id` antes de
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
- [ ] Identificar a janela de perda e escolher o backup/PITR disponível.
- [ ] No Free, usar o artifact criptografado e recriar os usuários do Auth.
- [ ] Conferir o SHA-256 do backup escolhido.
- [ ] Restaurar em projeto separado e rodar `verify-restore.sql`.
- [ ] Conferir contagens, login admin/viewer e fluxo de salvar orçamento.
- [ ] Rodar o E2E 3/3 contra o ambiente restaurado.
- [ ] Trocar as variáveis da Vercel para o projeto restaurado, se for promover.
- [ ] Registrar data, commit, backup, responsável e lições aprendidas.

## Checklist de ensaio

- [ ] Backup gratuito do GitHub Actions executado com sucesso (ou backup local equivalente).
- [ ] Se houver plano pago, backup gerenciado/PITR conferido no dashboard.
- [ ] Dump lógico gerado com hash e manifesto.
- [ ] Artifact baixado e descriptografado; SHA-256 confere.
- [ ] Restore executado em projeto separado.
- [ ] Usuários do Auth recriados e vínculos de workspace remapeados.
- [ ] `verify-restore.sql` sem erros.
- [ ] Contagens conferem com o manifesto.
- [ ] Login admin e viewer funcionando.
- [ ] `save_quote` e RLS validados.
- [ ] E2E 3/3 no ambiente restaurado.
- [ ] Evidência registrada no relatório técnico.

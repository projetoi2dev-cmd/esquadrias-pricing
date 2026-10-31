import { PGlite } from '@electric-sql/pglite'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const schemaSql = fs
  .readFileSync(path.join(repo, 'supabase/schema.sql'), 'utf8')
  .replace(/create extension if not exists pgcrypto;\s*/i, '')
const seedSql = fs.readFileSync(path.join(repo, 'supabase/seed.sql'), 'utf8')
const bootstrapSql = fs.readFileSync(path.join(repo, 'supabase/bootstrap-admin.sql'), 'utf8')

const db = new PGlite()

async function run(label, sql) {
  try {
    await db.exec(sql)
    console.log(`OK ${label}`)
  } catch (error) {
    console.error(`FAIL ${label}: ${error.message}`)
    throw error
  }
}

async function scalar(sql, params) {
  const result = await db.query(sql, params)
  return Number(Object.values(result.rows[0])[0])
}

await run(
  'supabase stubs',
  `
  create role anon nologin;
  create role authenticated nologin;

  create schema auth;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table auth.context (uid uuid);
  insert into auth.context (uid) values (null);

  create function auth.uid()
  returns uuid
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select uid from auth.context limit 1
  $$;

  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;

  insert into auth.users (id, email, raw_user_meta_data, created_at)
  values (
    '11111111-1111-4111-8111-111111111111',
    'admin@example.com',
    '{"full_name":"Admin Teste"}'::jsonb,
    now()
  );
  `,
)

await run('schema.sql', schemaSql)
assert.equal(await scalar('select count(*) from public.profiles'), 1, 'schema backfill should create admin profile')
console.log('OK schema backfill profile')

await run('seed.sql', seedSql)

const counts = {
  workspaces: 1,
  suppliers: 8,
  clients: 8,
  team_members: 6,
  materials: 9,
  products: 5,
  quotes: 11,
  quote_items: 33,
  projects: 10,
  installations: 8,
}
for (const [table, expected] of Object.entries(counts)) {
  const actual = await scalar(`select count(*) from public.${table}`)
  assert.equal(actual, expected, `${table}: expected ${expected}, got ${actual}`)
  console.log(`OK seed ${table} = ${actual}`)
}

assert.equal(await scalar("select count(*) from public.client_activities where activity_at::date = current_date"), 3)
console.log('OK seed current-day activities')
assert.equal(await scalar("select count(*) from public.transactions where paid_at = current_date and amount = 18400"), 1)
console.log('OK seed current-day receipt')

const materialHistory = await scalar('select count(*) from public.material_price_history')
assert.equal(materialHistory, 63, `material_price_history: expected 63, got ${materialHistory}`)
console.log('OK material price history triggers')

const quoteTotals = await db.query(
  "select code, material_total, labor_total, total, cash_total from public.quotes where code = 'ORC-1047'",
)
assert.equal(quoteTotals.rows.length, 1)
const baseTotal = Number(quoteTotals.rows[0].material_total) + Number(quoteTotals.rows[0].labor_total)
assert.ok(baseTotal > 0, 'quote base total should be recalculated')
assert.ok(Number(quoteTotals.rows[0].total) > baseTotal, 'quote total should include margin/tax')
console.log('OK quote total triggers', quoteTotals.rows[0])

await run('anon RLS context', 'reset role; set role anon;')
let anonReadBlocked = false
try {
  await db.query('select count(*) from public.workspaces')
} catch (error) {
  anonReadBlocked = /permission denied|row-level security/i.test(error.message)
  if (!anonReadBlocked) throw error
}
assert.equal(anonReadBlocked, true, 'anon should not read workspace data')
await run('reset anon', 'reset role;')
console.log('OK anon read blocked')

await run('bootstrap-admin.sql', bootstrapSql)
assert.equal(await scalar("select count(*) from public.workspace_members where role = 'admin'"), 1)
console.log('OK bootstrap admin membership')

await run(
  'viewer user + membership',
  `
  insert into auth.users (id, email, raw_user_meta_data, created_at)
  values (
    '22222222-2222-4222-8222-222222222222',
    'viewer@example.com',
    '{"full_name":"Viewer Teste"}'::jsonb,
    now() + interval '1 minute'
  );

  insert into public.workspace_members (workspace_id, user_id, role)
  values ('a0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'visualizador');
  `,
)
assert.equal(await scalar("select count(*) from public.profiles where id = '22222222-2222-4222-8222-222222222222'"), 1)
console.log('OK auth user trigger profile')

await run(
  'admin RLS context',
  `
  update auth.context set uid = '11111111-1111-4111-8111-111111111111';
  set role authenticated;
  `,
)
assert.equal(await scalar('select count(*) from public.workspaces'), 1)
assert.equal(await scalar('select count(*) from public.clients'), 8)
console.log('OK admin can read workspace data')

await run(
  'admin insert',
  `
  insert into public.clients (workspace_id, name, status)
  values ('a0000000-0000-4000-8000-000000000001', 'Cliente RLS Admin', 'prospect');
  `,
)
assert.equal(await scalar("select count(*) from public.clients where name = 'Cliente RLS Admin'"), 1)
console.log('OK admin can insert client')

const rpcQuote = {
  id: null,
  workspace_id: 'a0000000-0000-4000-8000-000000000001',
  client_id: 'c0000000-0000-4000-8000-000000000001',
  code: 'ORC-RPC-TEST',
  status: 'rascunho',
  issue_date: '2026-10-27',
  valid_until: null,
  delivery_days: 15,
  installation_type: 'obra',
  address: '',
  fixed_cost_pct: 12,
  margin_pct: 25,
  tax_pct: 8.5,
  retention_pct: 5,
  cash_discount_pct: 5,
  interest_rate_monthly: 1.99,
  notes: 'Teste RPC',
}
const rpcItems = [{
  product_id: null,
  description: 'Item RPC',
  width_m: 1,
  height_m: 1,
  quantity: 2,
  material_unit_cost: 100,
  labor_unit_cost: 50,
}]
const rpcResult = await db.query(
  'select public.save_quote($1::jsonb, $2::jsonb) as id',
  [JSON.stringify(rpcQuote), JSON.stringify(rpcItems)],
)
const rpcQuoteId = rpcResult.rows[0].id
assert.ok(rpcQuoteId, 'save_quote should return the quote id')
assert.equal(await scalar('select count(*) from public.quote_items where quote_id = $1', [rpcQuoteId]), 1)
assert.ok(await scalar('select total from public.quotes where id = $1', [rpcQuoteId]) > 0)
console.log('OK save_quote inserts quote and items atomically')

await db.query(
  'select public.save_quote($1::jsonb, $2::jsonb) as id',
  [
    JSON.stringify({ ...rpcQuote, id: rpcQuoteId, status: 'enviado', notes: 'Atualizado' }),
    JSON.stringify([{ ...rpcItems[0], description: 'Item RPC v2', material_unit_cost: 200, labor_unit_cost: 0 }]),
  ],
)
assert.equal(await scalar('select count(*) from public.quote_items where quote_id = $1', [rpcQuoteId]), 1)
assert.equal(await scalar('select count(*) from public.quote_items where quote_id = $1 and description = $2', [rpcQuoteId, 'Item RPC v2']), 1)
console.log('OK save_quote replaces items without duplication')

await run(
  'project unique per quote',
  `insert into public.projects (workspace_id, client_id, quote_id, title)
   values ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '${rpcQuoteId}', 'Projeto RPC');`,
)
let duplicateProjectBlocked = false
try {
  await db.exec(
    `insert into public.projects (workspace_id, client_id, quote_id, title)
     values ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', '${rpcQuoteId}', 'Projeto RPC duplicado');`,
  )
} catch (error) {
  duplicateProjectBlocked = /duplicate key|unique/i.test(error.message)
  if (!duplicateProjectBlocked) throw error
}
assert.equal(duplicateProjectBlocked, true, 'quote should have at most one project')
console.log('OK one project per quote')

let rpcAtomicBlocked = false
try {
  await db.query(
    'select public.save_quote($1::jsonb, $2::jsonb) as id',
    [
      JSON.stringify({ ...rpcQuote, id: rpcQuoteId, notes: 'Nao deve persistir' }),
      JSON.stringify([{ ...rpcItems[0], product_id: '99999999-9999-4999-8999-999999999999', description: 'Item invalido' }]),
    ],
  )
} catch (error) {
  rpcAtomicBlocked = /foreign key|violates|mesmo workspace/i.test(error.message)
  await db.exec('rollback;')
  if (!rpcAtomicBlocked) throw error
}
assert.equal(rpcAtomicBlocked, true, 'invalid item should abort save_quote')
assert.equal(
  await scalar('select count(*) from public.quote_items where quote_id = $1 and description = $2', [rpcQuoteId, 'Item RPC v2']),
  1,
  'failed save_quote should preserve previous items',
)
assert.equal(
  await scalar('select count(*) from public.quotes where id = $1 and notes = $2', [rpcQuoteId, 'Atualizado']),
  1,
  'failed save_quote should roll back quote changes',
)
console.log('OK save_quote is atomic on item failure')

await run(
  'viewer RLS context',
  `
  reset role;
  update auth.context set uid = '22222222-2222-4222-8222-222222222222';
  set role authenticated;
  `,
)
assert.equal(await scalar('select count(*) from public.workspaces'), 1)
assert.equal(await scalar('select count(*) from public.clients'), 9)
console.log('OK viewer can read workspace data')

let viewerInsertBlocked = false
try {
  await db.exec(
    `insert into public.clients (workspace_id, name, status)
     values ('a0000000-0000-4000-8000-000000000001', 'Cliente Bloqueado', 'prospect');`,
  )
} catch (error) {
  viewerInsertBlocked = /row-level security|permission denied/i.test(error.message)
  if (!viewerInsertBlocked) throw error
}
assert.equal(viewerInsertBlocked, true, 'viewer insert should be blocked by RLS')
console.log('OK viewer insert blocked')

await db.exec(
  `update public.materials
   set cost = 999
   where id = 'e0000000-0000-4000-8000-000000000001';`,
)
assert.equal(
  await scalar("select count(*) from public.materials where id = 'e0000000-0000-4000-8000-000000000001' and cost = 999"),
  0,
  'viewer update should not change rows',
)
console.log('OK viewer update blocked')

await run(
  'viewer quote insert attempt',
  'reset role; set role authenticated;',
)
let viewerQuoteBlocked = false
try {
  await db.exec(
    `insert into public.quotes (workspace_id, code, client_id, status, created_by)
     values ('a0000000-0000-4000-8000-000000000001', 'ORC-RLS', 'c0000000-0000-4000-8000-000000000001', 'rascunho', '22222222-2222-4222-8222-222222222222');`,
  )
} catch (error) {
  viewerQuoteBlocked = /row-level security|permission denied/i.test(error.message)
  if (!viewerQuoteBlocked) throw error
}
assert.equal(viewerQuoteBlocked, true, 'viewer quote insert should be blocked by RLS')
console.log('OK viewer quote insert blocked')

let viewerSaveBlocked = false
try {
  await db.query(
    'select public.save_quote($1::jsonb, $2::jsonb) as id',
    [JSON.stringify(rpcQuote), JSON.stringify(rpcItems)],
  )
} catch (error) {
  viewerSaveBlocked = /Sem permissao/i.test(error.message)
  await db.exec('rollback;')
  if (!viewerSaveBlocked) throw error
}
assert.equal(viewerSaveBlocked, true, 'viewer save_quote should be blocked')
console.log('OK viewer save_quote blocked')

await run('reset role', 'reset role; update auth.context set uid = null;')

await run('schema.sql second run', schemaSql)
assert.equal(await scalar('select count(*) from public.workspaces'), 1)
assert.equal(await scalar('select count(*) from public.clients'), 9)
console.log('OK schema idempotence')

await run('bootstrap-admin.sql second run', bootstrapSql)
assert.equal(await scalar('select count(*) from public.workspace_members'), 2)
console.log('OK bootstrap idempotence')

let seedBlocked = false
try {
  await db.exec(seedSql)
} catch (error) {
  seedBlocked = /Seed ja aplicado/.test(error.message)
  if (!seedBlocked) throw error
}
assert.equal(seedBlocked, true, 'seed should reject a second run')
await db.exec('rollback;')
console.log('OK seed duplicate guard')

await run(
  'second workspace for scope test',
  `
  insert into public.workspaces (id, name, slug)
  values ('a0000000-0000-4000-8000-000000000002', 'Oficina B', 'oficina-b');

  insert into public.clients (id, workspace_id, name)
  values ('c0000000-0000-4000-8000-000000000099', 'a0000000-0000-4000-8000-000000000002', 'Cliente B');

  insert into public.quotes (id, workspace_id, client_id, code)
  values ('30000000-0000-4000-8000-000000000099', 'a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000099', 'ORC-B');

  update auth.context set uid = '11111111-1111-4111-8111-111111111111';
  set role authenticated;
  `,
)

let crossTenantBlocked = false
try {
  await db.exec(
    `insert into public.quote_items (workspace_id, quote_id, description)
     values ('a0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000099', 'Intruso');`,
  )
} catch (error) {
  crossTenantBlocked = /mesmo workspace/i.test(error.message)
  if (!crossTenantBlocked) throw error
}
assert.equal(crossTenantBlocked, true, 'cross-workspace quote item should be rejected')
assert.equal(
  await scalar("select count(*) from public.quote_items where quote_id = '30000000-0000-4000-8000-000000000099'"),
  0,
)
console.log('OK cross-workspace reference blocked')

await run('final reset', 'reset role; update auth.context set uid = null;')

const verifyRestoreSql = fs.readFileSync(path.join(repo, 'supabase/tests/verify-restore.sql'), 'utf8')
await run('verify-restore.sql', verifyRestoreSql)

console.log('\nAll SQL checks passed.')
await db.close()

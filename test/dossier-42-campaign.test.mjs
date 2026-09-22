import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('batch radar preserves bounded external fit references without replacing Pain Score',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/admin/nestlocal/growth/leads/batch'");
  const end=server.indexOf("app.patch('/api/admin/nestlocal/growth/leads/:leadId'",start);
  const block=server.slice(start,end);
  for(const token of ['referenceFitScore','referenceClass','referenceAction','referenceSource','Math.max(0,Math.min(100,referenceFitScore))','painScore:0']) assert.ok(block.includes(token),`missing ${token}`);
});

test('client embeds the exact 42-company dossier campaign and imports it idempotently through existing batch API',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('const dossier42=[');
  const end=client.indexOf("const growthStatusIds=",start);
  const block=client.slice(start,end);
  assert.ok(start>=0);
  assert.equal((block.match(/,\d+(?:\.\d+)?,'[AB]','/g)||[]).length,42);
  for(const token of [
    "['Valuz Segurança Eletrônica'",
    "['Lavarie'",
    "['Help Casa Pequenos Reparos'",
    "['Vanco Ar Condicionado'",
    "['Ecosafe Controle de Pragas'",
    "['LondriClima'",
    "['Arluk Climatização'",
    "referenceSource:'dossier_2026_09_22'",
    "campaign:'dossier-2026-09-22'",
  ]) assert.ok(block.includes(token),`missing ${token}`);
  assert.ok(client.includes("id=\"dossier42Import\""));
  assert.ok(client.includes("body:JSON.stringify({leads:dossier42})"));
});

test('dossier score remains visibly separate from observed pain and internal fit',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("t('referenceFit')"));
  assert.ok(client.includes("t('painScore')"));
  assert.ok(client.includes("Math.max(Number(x.fitScore||0),Number(x.referenceFitScore||0))>=85"));
  assert.ok(client.includes("Pain Score continua zerado até conversa real."));
});

test('Dossier 42 campaign stays responsive',()=>{
  const css=read('../web/growth.css');
  for(const token of ['.growth-dossier','.score.reference','@media(max-width:720px)']) assert.ok(css.includes(token),`missing ${token}`);
});


test('dossier leads get a segment-safe suggested approach without claiming unverified process facts',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'function growthOutreachScript(lead)',
    "segment.includes('limpeza')",
    "segment.includes('climat')",
    "segment.includes('praga')",
    "segment.includes('port')",
    "segment.includes('eletr')",
    'data-copy="${esc(growthOutreachScript(lead))}"',
    "t('copyApproach')",
  ]) assert.ok(client.includes(token),`missing ${token}`);
  assert.equal(client.includes('sem sistema robusto aparente'),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('server exposes one product with multiple onboarding playbooks', () => {
  const server = read('../server.mjs');
  for (const token of [
    'const servicePlaybooks=',
    'climate:{services:[',
    'cleaning:{services:[',
    'pest:{services:[',
    'general:{services:[',
    "businessType:template",
    "req.body?.template||'climate'",
    "REVIEW_CATALOG_BEFORE_PUBLISH",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('non-HVAC playbooks do not invent prices', () => {
  const server = read('../server.mjs');
  for (const id of [
    "id:'higienizacao-estofados'",
    "id:'controle-pragas'",
    "id:'solicitacao-orcamento'",
  ]) {
    const start = server.indexOf(id);
    assert.ok(start >= 0, `missing ${id}`);
    const chunk = server.slice(start, start + 360);
    assert.ok(chunk.includes("mode:'review'"), `${id} should begin in review mode`);
  }
});

test('client lets the owner choose a playbook and adapts public qualifiers', () => {
  const client = read('../web/live.js');
  for (const token of [
    'bootstrap-form',
    "template:f.get('template')||'climate'",
    'const serviceName=',
    'publicServiceId',
    'id="public-service"',
    'selected?.requiresEquipmentType!==false',
    'selected?.requiresSafeAccess!==false',
    'templateClimate',
    'templateCleaning',
    'templatePest',
    'templateGeneral',
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('playbook onboarding copy remains translated in PT EN ES', () => {
  const client = read('../web/live.js');
  assert.ok(client.includes("chooseBusinessType:'Que tipo de operação vamos preparar?'"));
  assert.ok(client.includes("chooseBusinessType:'What type of operation should we prepare?'"));
  assert.ok(client.includes("chooseBusinessType:'¿Qué tipo de operación debemos preparar?'"));
});

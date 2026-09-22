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
    'electrical:{services:[',
    'repairs:{services:[',
    'security:{services:[',
    'general:{services:[',
    "businessType:template",
    "b.template||'general'",
    "REVIEW_CATALOG_BEFORE_PUBLISH",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('non-HVAC playbooks do not invent prices', () => {
  const server = read('../server.mjs');
  for (const id of [
    "id:'higienizacao-estofados'",
    "id:'controle-pragas'",
    "id:'visita-eletrica'",
    "id:'pequenos-reparos'",
    "id:'conserto-portao'",
    "id:'solicitacao-orcamento'",
  ]) {
    const start = server.indexOf(id);
    assert.ok(start >= 0, `missing ${id}`);
    const chunk = server.slice(start, start + 360);
    assert.ok(chunk.includes("mode:'review'"), `${id} should begin in review mode`);
  }
});

test('client lets the owner choose a playbook and the active public view adapts qualifiers', () => {
  const client = read('../web/live.js');
  for (const token of [
    'bootstrap-form',
    "template:f.get('template')||'general'",
    'const serviceName=',
    'publicServiceId',
    'id="public-service"',
    'templateClimate',
    'templateCleaning',
    'templatePest',
    'templateElectrical',
    'templateRepairs',
    'templateSecurity',
    'templateGeneral',
    'renderPublicIntakeFields',
    'requestIntakeSummary',
  ]) assert.ok(client.includes(token), `missing ${token}`);
  const activeView = client.slice(client.indexOf('function publicViewV2'));
  assert.ok(activeView.includes('selected?.requiresEquipmentType!==false'));
  assert.ok(activeView.includes('selected?.requiresSafeAccess!==false'));
});

test('playbook onboarding copy remains translated in PT EN ES', () => {
  const client = read('../web/live.js');
  assert.ok(client.includes("chooseBusinessType:'Que tipo de operação vamos preparar?'"));
  assert.ok(client.includes("chooseBusinessType:'What type of operation should we prepare?'"));
  assert.ok(client.includes("chooseBusinessType:'¿Qué tipo de operación debemos preparar?'"));
});


test('prospect playbooks collect the dossier-specific intake without inventing prices', () => {
  const server = read('../server.mjs');
  const client = read('../web/live.js');
  for (const token of [
    "id:'brandModel'",
    "id:'capacityBtu'",
    "id:'itemProfile'",
    "id:'material'",
    "id:'pestType'",
    "id:'propertyType'",
    "id:'areaM2'",
    "id:'urgency'",
    "id:'gateProfile'",
    'normalizeIntakeValues',
    'INVALID_INTAKE',
  ]) assert.ok(server.includes(token), `missing ${token}`);
  assert.ok(client.includes("(selected?.equipmentTypes?.length?selected.equipmentTypes:['other'])"));
  assert.ok(client.includes("key.startsWith('intake_')"));
});

test('field operations can record optional warranty data', () => {
  const server = read('../server.mjs');
  const client = read('../web/live.js');
  assert.ok(server.includes("update['warranty.until']"));
  assert.ok(server.includes("update['warranty.notes']"));
  assert.ok(server.includes('INVALID_WARRANTY_DATE'));
  assert.ok(client.includes("name=\"warrantyUntil\""));
  assert.ok(client.includes("name=\"warrantyNotes\""));
});

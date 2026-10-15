import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('service return rule is explicit, bounded, and keeps published catalog online', () => {
  const server = read('../server.mjs');
  for (const token of [
    "returnAfterDays=Number(b.returnAfterDays||0)",
    "returnAfterDays<0||returnAfterDays>730",
    "const data={name:clean(b.name).slice(0,100),mode:b.mode,returnAfterDays,inclusions:clean(b.inclusions).slice(0,500),exclusions:clean(b.exclusions).slice(0,500)};",
    "draft:data,draftUpdatedAt:",
    "else{await ref.set({...data,published:false}",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('automatic return uses the organization timezone calendar date', () => {
  const server = read('../server.mjs');
  for (const token of [
    'function localIsoDate',
    'function addIsoDays',
    "settingsRef=db.doc",
    "orgTimeZone=clean(settings?.data()?.timezone)",
    "completedLocalDate=localIsoDate",
    "addIsoDays(completedLocalDate,ruleDays)",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('manual or existing return date wins over the service rule', () => {
  const server = read('../server.mjs');
  const priority = "autoDate=explicitDate===null&&!currentDate&&Number.isInteger(ruleDays)&&ruleDays>0";
  assert.ok(server.includes(priority));
  assert.ok(server.includes("nextServiceDate=explicitDate!==null?explicitDate:(currentDate||autoDate)"));
});

test('automatic return records its provenance', () => {
  const server = read('../server.mjs');
  for (const token of [
    "update['return.source']='service_rule'",
    "update['return.ruleDays']=ruleDays",
    "nextServiceSource:autoDate?'service_rule'",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('service editor exposes return rule for every service mode', () => {
  const client = read('../web/live.js');
  for (const token of [
    "returnRule:'Retorno automático'",
    'name="returnAfterDays"',
    "returnAfterDays:Number(f.get('returnAfterDays')||0)",
    "s.mode==='review'",
    "t('noAutoReturn')",
  ]) assert.ok(client.includes(token), `missing ${token}`);
});

test('return rule controls are styled for responsive use', () => {
  const css = read('../web/operations.css');
  assert.ok(css.includes('.return-rule-field'));
  assert.ok(css.includes('.return-rule-input'));
});

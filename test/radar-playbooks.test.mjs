import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {radarServicePlaybooks} from '../src/domain/radar-playbooks.mjs';

const expected = ['solar','pools','water','gardens','appliance','technical','automotive','glass','waterproofing','roofs'];
test('Radar prospect verticals are all represented without separate applications', () => {
  assert.deepEqual(Object.keys(radarServicePlaybooks).sort(), expected.sort());
  const ids = new Set();
  for (const [vertical, playbook] of Object.entries(radarServicePlaybooks)) {
    assert.ok(playbook.services.length >= 2, vertical);
    for (const service of playbook.services) {
      assert.match(service.id, /^[a-z0-9-]+$/);
      assert.equal(ids.has(service.id), false, 'duplicate service ID '+service.id);
      ids.add(service.id);
      assert.equal(service.mode, 'review', 'no unapproved quote: '+service.id);
      assert.equal(service.unitPriceCents, undefined);
      assert.equal(service.returnAfterDays, undefined);
      assert.equal(service.published, undefined);
      assert.equal(service.requiresEquipmentType, false);
      assert.equal(service.requiresSafeAccess, false);
      for (const locale of ['pt','en','es']) {
        assert.ok(service.nameI18n[locale]?.length >= 4, locale+' '+service.id);
      }
      assert.ok(service.intakeFields.some(x=>x.required), service.id);
      for (const field of service.intakeFields) {
        assert.match(field.id,/^[a-zA-Z][a-zA-Z0-9]*$/);
        assert.equal(field.type,'text');
        assert.ok(field.maxLength<=300);
        for (const locale of ['pt','en','es'])assert.ok(field.labelI18n[locale]?.length>=4);
      }
    }
  }
});
test('every Radar vertical is wired into onboarding and additional catalog', () => {
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
  assert.match(server,/Object.assign\(servicePlaybooks, radarServicePlaybooks\)/);
  assert.match(ui,/radarTemplateChoices\.map/);
  assert.match(ui,/template-verticals/);
  assert.match(ui,/\.\.\.radarTemplateChoices\.map/);
  for(const id of expected)assert.match(ui,new RegExp("'"+id+"','templateRadar_"+id+"'"));
});

test('adding draft services never takes a published customer store offline', () => {
  const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/playbooks/:template/apply'");
  const end=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/bootstrap'",start);
  assert.ok(start>0 && end>start);
  const apply=server.slice(start,end);
  assert.match(apply,/published:false,addedFromPlaybook/);
  assert.doesNotMatch(apply,/batch\.set\(settingsRef,\{published:false/);
  assert.match(apply,/lastPlaybookApplied/);
});

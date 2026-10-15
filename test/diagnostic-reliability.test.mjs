import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteHasExpired,currentScheduleRevision,scheduleRevisionAfterPatch} from '../src/domain/operational-integrity.mjs';

test('C06: expired quotes are rejected at the exact deadline',()=>{
 const expiry='2026-10-15T12:00:00.000Z';
 assert.equal(quoteHasExpired(expiry,Date.parse(expiry)-1),false);
 assert.equal(quoteHasExpired(expiry,Date.parse(expiry)),true);
 assert.equal(quoteHasExpired('bad-date'),true);
 assert.equal(quoteHasExpired(null),false); // historic quotes without expiry remain readable
});

test('C07: schedule revision increments only for material changes',()=>{
 const existing={date:'2026-11-01',window:'morning',assignedTo:'user1'};
 assert.equal(currentScheduleRevision(existing),1);
 assert.deepEqual(scheduleRevisionAfterPatch(existing,{scheduledDate:'2026-11-01'}),{changed:false,revision:1});
 assert.deepEqual(scheduleRevisionAfterPatch(existing,{scheduledDate:'2026-11-02'}),{changed:true,revision:2});
 assert.deepEqual(scheduleRevisionAfterPatch({}, {scheduledDate:'2026-11-01'}),{changed:true,revision:1});
 assert.deepEqual(scheduleRevisionAfterPatch({...existing,revision:5}, {assignedTo:'user2'}),{changed:true,revision:6});
});

test('C01 C04 C09 C11: critical client and deployment regressions stay guarded',()=>{
 const live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const deploy=readFileSync(new URL('../.github/workflows/firebase-hosting-deploy.yml',import.meta.url),'utf8');
 assert.match(live,/<button type="submit" class="button primary wide">\$\{t\('save'\)\}<\/button><\/form>\$\{paymentSettingsCard/);
 assert.match(live,/id="capacity-settings"[\s\S]*?<button type="submit" class="button primary wide">/);
 assert.match(live,/capturePublicFormDraft\(e\.target\.form\)/);
 assert.doesNotMatch(live,/inclusions:'Incluído conforme descrição',exclusions:'Peças e serviços adicionais'/);
 assert.match(server,/if\(existing\.exists\)\{if\(intentHash/);
 assert.match(server,/draftSettings:admin\.firestore\.FieldValue\.delete\(\)/);
 assert.match(deploy,/"src\/nestai\.mjs"/);
 assert.match(deploy,/server\.mjs src\/domain src\/nestai\.mjs/);
});

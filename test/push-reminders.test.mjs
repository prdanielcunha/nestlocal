import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {taskDueAt,dueActorsForPush} from '../src/domain/push-reminders.mjs';

test('C13: reminder respects local timezone and due time',()=>{
 const before=new Date('2026-10-15T11:59:00Z'),at=new Date('2026-10-15T12:01:00Z');
 const task={status:'open',actorUid:'member1',dueDate:'2026-10-15',dueTime:'09:00',timezone:'America/Sao_Paulo'};
 assert.equal(taskDueAt(task,before),false);
 assert.equal(taskDueAt(task,at),true);
 assert.equal(taskDueAt({...task,status:'done'},at),false);
 assert.equal(taskDueAt({...task,timezone:'Invalid/Timezone'},at),false);
});
test('C13: no duplicate notification actors for many due tasks',()=>{
 const due={status:'open',dueDate:'2026-10-15',timezone:'America/Sao_Paulo'};
 const found=dueActorsForPush([{...due,actorUid:'member1'},{...due,actorUid:'member1'},
  {...due,actorUid:'member2'}, {...due,actorUid:'../invalid'},
  {...due,actorUid:'member3',dueDate:'2026-10-16'}],new Date('2026-10-15T20:00:00Z'));
 assert.deepEqual(found,[{uid:'member1',date:'2026-10-15'},{uid:'member2',date:'2026-10-15'}]);
});
test('C13: scheduler is dry-run by default with explicit tenant and secret-managed gates',()=>{
 const worker=readFileSync(new URL('../scripts/nestlocal-push-reminders.mjs',import.meta.url),'utf8');
 assert.match(worker,/send=process\.argv\.includes\('--send'\)/);
 assert.match(worker,/NESTLOCAL_PUSH_SCHEDULER_ENABLED/);
 assert.match(worker,/EXPLICIT_ORG_SCOPE_REQUIRED/);
 assert.match(worker,/PUSH_TASK_SCAN_LIMIT_REACHED/);
 assert.match(worker,/nestlocal_push_dispatch/);
 assert.match(worker,/previous\.exists\)return false/);
 assert.match(worker,/deviceDeliveryConfirmed:false/);
 assert.match(worker,/state:'needs_review'/);
});

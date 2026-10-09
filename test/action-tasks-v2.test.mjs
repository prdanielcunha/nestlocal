import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeActionTask,normalizeActionTaskPatch,publicActionTask,openTasksForDay} from '../src/domain/action-tasks.mjs';
test('creates calendar-aware task without auto notification or channel permission',()=>{
  const t=normalizeActionTask({title:'Retomar orçamento',dueDate:'2026-10-12',dueTime:'09:30',timezone:'America/Sao_Paulo',sourceDraftId:'d_123'});
  assert.equal(t.title,'Retomar orçamento');assert.equal(t.sourceDraftId,'d_123');
  assert.equal(t.sent,undefined);assert.equal(t.notificationSent,undefined);
});
test('rejects fabricated dates, hours, zones, fields and empty task',()=>{
  const good={title:'Retomar cliente',dueDate:'2026-10-09',timezone:'America/Sao_Paulo'};
  for(const change of [{dueDate:'2026-02-30'},{dueTime:'25:00'},{timezone:'Mars/Phobos'},{title:' '},{priceCents:50}])
    assert.throws(()=>normalizeActionTask({...good,...change}),/TASK/);
});
test('version, status and original source cannot be forged',()=>{
  const initial={...normalizeActionTask({title:'Retorno',dueDate:'2026-10-09',timezone:'UTC',sourceDraftId:'d_1'}),version:1,status:'open'};
  const patch=normalizeActionTaskPatch({status:'done',expectedVersion:1},initial);
  assert.equal(patch.status,'done');assert.equal(patch.sourceDraftId,'d_1');
  assert.throws(()=>normalizeActionTaskPatch({sourceDraftId:'d_2',expectedVersion:1},initial),/INVALID_TASK_FIELDS/);
  assert.throws(()=>normalizeActionTaskPatch({status:'done',expectedVersion:0},initial),/TASK_VERSION_CONFLICT/);
  assert.throws(()=>normalizeActionTaskPatch({status:'done',expectedVersion:1},{...initial,status:'done'}),/TASK_NOT_EDITABLE/);
});
test('overdue tasks exclude completed records, and PII metadata stays server-side',()=>{
  assert.equal(openTasksForDay([{status:'open',dueDate:'2026-10-08'},{status:'done',dueDate:'2026-10-07'}],'2026-10-09').length,1);
  const item=publicActionTask('task',{title:'Retorno',organizationId:'private',actorUid:'private',mutationHashes:['secret']});
  assert.equal(item.actorUid,undefined);assert.equal(item.mutationHashes,undefined);
});

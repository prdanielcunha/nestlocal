import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeOperationalRows} from '../web/operational-data.js';

test('C02: an older unresolved request is not lost behind more than 100 completed records',()=>{
  const recentlyCompleted=Array.from({length:140},(_,i)=>({id:'done-'+i,status:'completed'}));
  const oldPending={id:'old-pending',status:'accepted',customer:{name:'Test Customer'}};
  const merged=mergeOperationalRows(recentlyCompleted,[oldPending]);
  assert.equal(merged.length,141);
  assert.ok(merged.some(item=>item.id==='old-pending'&&item.status==='accepted'));
});

test('C02: targeted status query replaces a stale sampled snapshot without duplicating data',()=>{
  const old={id:'r42',status:'quoted'},latest={id:'r42',status:'accepted'};
  const rows=mergeOperationalRows([old],[latest]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].status,'accepted');
  assert.deepEqual(mergeOperationalRows(null,undefined,[{id:'good'}],['invalid'],[{}]),[{id:'good'}]);
});

test('C02: separately queried due customers survive an unrelated customer-page limit',()=>{
  const firstHundred=Array.from({length:100},(_,i)=>({id:'customer-'+i}));
  const due={id:'customer-900',nextServiceDate:'2026-10-15'};
  const all=mergeOperationalRows(firstHundred,[due]);
  assert.equal(all.length,101);
  assert.equal(all.at(-1).id,due.id);
});

test('C02: legacy scheduled work without a slot remains in the agenda view',()=>{
 const newest=Array.from({length:140},(_,i)=>({id:'finished-'+i,status:'completed'}));
 const legacy={id:'historic-booking',status:'scheduled',schedule:{date:'2026-10-20',window:'morning'}};
 const agendaSlots=[];
 const agenda=mergeOperationalRows(newest.filter(item=>['scheduled','in_progress'].includes(item.status)),
  [legacy].filter(item=>['scheduled','in_progress'].includes(item.status)),agendaSlots);
 assert.equal(agenda.length,1);
 assert.deepEqual(agenda[0],legacy);
});

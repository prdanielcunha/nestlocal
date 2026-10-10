import test from 'node:test';
import assert from 'node:assert/strict';
import {dueTaskDigest,makeTaskNotification} from '../web/task-reminders.js';
test('return due-today and tomorrow counts without customer details',()=>{
 const list=[{dueDate:'2026-10-08',status:'open',customerName:'Ana',phone:'43999999999'},
 {dueDate:'2026-10-10',status:'open',title:'private'},
 {dueDate:'2026-10-10',status:'done'},{dueDate:'2026-10-15',status:'open'}];
 const digest=dueTaskDigest(list,'2026-10-09','2026-10-10');
 assert.deepEqual(digest,{due:1,tomorrow:1});
 const notification=makeTaskNotification(digest,'pt');
 assert.ok(notification.body.includes('amanhã'));
 assert.equal(JSON.stringify(notification).includes('Ana'),false);
 assert.equal(JSON.stringify(notification).includes('43999999999'),false);
 assert.equal(notification.delivery,'active_app_only');
});
test('zero alerts means zero browser notification; PT EN ES copy exists',()=>{
 assert.equal(makeTaskNotification({due:0,tomorrow:0}),null);
 for(const lang of ['pt','en','es']){
  const msg=makeTaskNotification({due:2,tomorrow:0},lang);
  assert.ok(msg.title.includes('NestLocal'));assert.ok(msg.body.includes('2'));
 }
});

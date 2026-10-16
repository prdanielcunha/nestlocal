import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateExecutionChecklist,executionChecklistSummary} from '../src/domain/field-checklist.mjs';

test('field checklists are optional, service-specific and repeatably validated',()=>{
 assert.deepEqual(validateExecutionChecklist([]),[]);
 const tasks=[{id:'site_survey',label:'Conferir escopo',done:true},{id:'final_test',label:'Testes finais',done:false}];
 assert.deepEqual(validateExecutionChecklist(tasks),[
  {id:'site_survey',label:'Conferir escopo',done:true,order:0},
  {id:'final_test',label:'Testes finais',done:false,order:1}]);
 assert.deepEqual(executionChecklistSummary(tasks),{total:2,done:1});
 assert.deepEqual(executionChecklistSummary(null),{total:0,done:0});
});
test('field checklist rejects malformed, duplicate, huge or nonboolean tasks',()=>{
 const one={id:'step1',label:'Test equipment',done:false};
 assert.throws(()=>validateExecutionChecklist(null),{message:'INVALID_EXECUTION_CHECKLIST'});
 assert.throws(()=>validateExecutionChecklist(Array.from({length:21},(_,i)=>({...one,id:'s'+i}))),{message:'INVALID_EXECUTION_CHECKLIST'});
 assert.throws(()=>validateExecutionChecklist([one,one]),{message:'INVALID_EXECUTION_CHECKLIST'});
 assert.throws(()=>validateExecutionChecklist([{...one,id:'../other'}]),{message:'INVALID_EXECUTION_CHECKLIST'});
 assert.throws(()=>validateExecutionChecklist([{...one,label:'x'}]),{message:'INVALID_EXECUTION_CHECKLIST'});
 assert.throws(()=>validateExecutionChecklist([{...one,label:'x'.repeat(121)}]),{message:'INVALID_EXECUTION_CHECKLIST'});
 assert.throws(()=>validateExecutionChecklist([{...one,done:'false'}]),{message:'INVALID_EXECUTION_CHECKLIST'});
});
test('field checklist is stored under execution and never changes payment status or catalog',()=>{
 const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 const i=server.indexOf("app.patch('/api/organizations/:orgId/nestlocal/requests/:requestId'");
 const block=server.slice(i,server.indexOf('\napp.',i+10));
 assert.match(block,/validateExecutionChecklist\(b\.executionChecklist\)/);
 assert.match(block,/update\['execution\.checklist'\]=rows/);
 assert.match(block,/EXECUTION_CHECKLIST_LOCKED/);
 assert.match(ui,/function executionChecklistField\(request\)/);
 assert.match(ui,/S\.checklistDrafts\[requestId\]/);
 assert.match(ui,/delete S\.checklistDrafts\[id\]/);
 assert.match(ui,/data-add-checklist/);
 assert.match(ui,/payload\.executionChecklist=checklist/);
});

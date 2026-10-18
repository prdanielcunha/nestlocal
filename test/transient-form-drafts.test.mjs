import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captureTransientForm,restoreTransientForm} from '../web/transient-form-drafts.js';

function input(name,value,type='text',extras={}){return {name,value,type,disabled:false,checked:false,...extras}}
test('a 6000-character conversation excerpt survives a redraw without silent truncation',()=>{
 const value='á'.repeat(6000),saved=captureTransientForm([input('message',value,'textarea',{maxLength:6000})]);
 const after=[input('message','','textarea',{maxLength:6000})];
 restoreTransientForm(after,saved);assert.equal(after[0].value,value);
});
test('C16: restores typed operational fields and checked capacity without persisting them',()=>{
 const before=[input('executionNotes','A alteração ficou incompleta','textarea'),
   input('capacityDay','1','checkbox',{checked:true}),input('capacityDay','2','checkbox',{checked:false}),
   input('password','secret','password'),input('receipt','private-file','file'),input('name','blocked','text',{disabled:true})];
 const draft=captureTransientForm(before);
 assert.equal(draft.length,3);
 assert.ok(!JSON.stringify(draft).includes('secret'));
 assert.ok(!JSON.stringify(draft).includes('private-file'));
 const after=[input('executionNotes','', 'textarea'),input('capacityDay','1','checkbox'),
   input('capacityDay','2','checkbox',{checked:true}),input('password','','password')];
 assert.equal(restoreTransientForm(after,draft),3);
 assert.equal(after[0].value,'A alteração ficou incompleta');
 assert.equal(after[1].checked,true);
 assert.equal(after[2].checked,false);
 assert.equal(after[3].value,'');
});
test('C16: a removed service field is ignored and no hidden ID gets copied',()=>{
 const saved=captureTransientForm([input('quoteNote','Texto preservado'),input('trackingToken','private','hidden')]);
 const later=[input('quoteNote',''),input('newField',''),input('trackingToken','','hidden')];
 assert.equal(restoreTransientForm(later,saved),1);
 assert.equal(later[0].value,'Texto preservado');
 assert.equal(later[2].value,'');
});
test('C16: live app keeps ephemeral drafts across re-render, scoped per user and org',()=>{
 const live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
 assert.match(live,/unsavedFormDrafts:new Map\(\)/);
 assert.match(live,/document\.addEventListener\('input',captureTransientFormChange\)/);
 assert.match(live,/restoreUnsavedFormChanges\(\)/);
 assert.match(live,/identity\+'\|'\+S\.orgId\+'\|'\+scope/);
 assert.match(live,/S\.unsavedFormDrafts\.clear\(\)/);
 assert.match(live,/clearTransientForm\(form\);await loadData\(\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOpportunityDraft,normalizeOpportunityDraftPatch,parseOpportunityIdempotencyKey,draftPublicView} from '../src/domain/opportunity-drafts.mjs';

test('partial message works with no customer, address, price or catalog',()=>{
  const draft=normalizeOpportunityDraft({origin:'whatsapp_manual',message:'Olá, consegue verificar meu ar?'});
  assert.equal(draft.message,'Olá, consegue verificar meu ar?');
  assert.equal(draft.customerName,'');
  assert.equal(draft.schemaVersion,2);
  assert.equal(draft.price,undefined);
});
test('refuses empty, forged financial fields and unreliable contact',()=>{
  assert.throws(()=>normalizeOpportunityDraft({}),/DRAFT_CONTENT_REQUIRED/);
  assert.throws(()=>normalizeOpportunityDraft({message:'oi',price:0}),/INVALID_DRAFT_FIELDS/);
  assert.throws(()=>normalizeOpportunityDraft({message:'oi',email:'bad'}),/INVALID_DRAFT_EMAIL/);
});
test('patch is versioned and never mutates archived entries',()=>{
  const record={...normalizeOpportunityDraft({message:'Oi'}),state:'open',version:1};
  const updated=normalizeOpportunityDraftPatch({customerName:'Maria',expectedVersion:1},record);
  assert.equal(updated.message,'Oi');
  assert.equal(updated.customerName,'Maria');
  assert.throws(()=>normalizeOpportunityDraftPatch({message:'x',expectedVersion:0},record),/VERSION_CONFLICT/);
  assert.throws(()=>normalizeOpportunityDraftPatch({message:'x',expectedVersion:1},{...record,state:'archived'}),/NOT_EDITABLE/);
});
test('requires real idempotency key and strips write metadata from read',()=>{
  assert.throws(()=>parseOpportunityIdempotencyKey('x'),/IDEMPOTENCY/);
  assert.equal(parseOpportunityIdempotencyKey('nl-12345678'),'nl-12345678');
  const view=draftPublicView('id',{message:'Oi',idempotencyKey:'private',contentHash:'secret',ownerUid:'a'});
  assert.equal(view.contentHash,undefined);
  assert.equal(view.ownerUid,undefined);
});

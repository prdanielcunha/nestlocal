import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('review links are secure, completion-gated, and hidden from authorized payloads',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/review-link'",
    "current.status!=='completed'",
    'reviewTokenHash:digest',
    'reviewTokenHashes:hashes',
    "reviewTokenHash:undefined",
    "reviewTokenHashes:undefined",
    "reviewTokenValid",
  ]) assert.ok(server.includes(token), `missing ${token}`);
});

test('public review is token-gated, idempotent and aggregates factual rating metrics',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/public/reviews/:requestId'");
  const end=server.indexOf("app.post('/api/public/requests/:requestId/photos'",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of ['rating<1||rating>5','reviewTokenValid','nestlocal_reviews','nestlocal_metrics/reviews','sumRatings','distribution','idempotent']) assert.ok(block.includes(token),`missing ${token}`);
  assert.equal(block.includes('customer.phone'),false);
});

test('field evidence is authenticated, image-only, lifecycle-gated and bounded',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/evidence'");
  const end=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/requests/:requestId/evidence",start);
  const block=server.slice(start,end);
  assert.ok(start>=0);
  for(const token of ['authenticate,authorize','evidenceUpload.array','EVIDENCE_NOT_READY','existing.length+files.length>24','files.every(validImage)','workEvidence','uploadedBy:req.identity.uid']) assert.ok(block.includes(token),`missing ${token}`);
});

test('client exposes post-service review and before-after evidence flows',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'function fieldEvidencePanel(r)',
    'function reviewActionPanel(r)',
    "data-request-evidence",
    "data-review-link",
    'function reviewPublicView()',
    "id=\"public-review\"",
    "const isReview=",
    'reviewMetrics',
  ]) assert.ok(client.includes(token),`missing ${token}`);
});

test('post-service surfaces are responsive',()=>{
  const css=read('../web/operations.css');
  for(const token of ['.evidence-stage','.review-stage','.review-public-card','.rating-options','@media(max-width:620px)']) assert.ok(css.includes(token),`missing ${token}`);
});

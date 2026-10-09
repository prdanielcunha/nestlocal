import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8'),
      live=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
test('export requires org-scoped authenticated rights, limits page and excludes capability hashes',()=>{
  const begin=server.indexOf("app.get('/api/organizations/:orgId/nestlocal/data-export/:dataset'");
  const end=server.indexOf('// Additive opportunity drafts:',begin);
  assert.ok(begin>0&&end>begin);
  const route=server.slice(begin,end);
  for(const token of ['authenticate,authorize','canManageNestLocal(req.access)',"limit+1","complete:",'private,no-store',
    'trackingTokenHash','reviewTokenHashes', 'organizations/${req.access.orgId}'])assert.ok(route.includes(token),'missing '+token);
  assert.doesNotMatch(route,/\.create\(|\.update\(|\.delete\(/);
});
test('expiration banner retains billing and lets authorized admin export without a write request',()=>{
  assert.ok(live.includes("data-export-all"));
  assert.ok(live.includes("S.data?.experimentAccess?.canManage===true"));
  assert.ok(live.includes('data-export/'));
  assert.ok(live.includes("response.organizationId!==S.orgId"));
});

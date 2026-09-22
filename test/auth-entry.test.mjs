import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('direct Google login uses canonical Firebase helper domain and popup-first recovery',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "const canonicalAuthDomain='millionsnest.firebaseapp.com'",
    'browserLocalPersistence',
    'setPersistence(auth,browserLocalPersistence)',
    'signInWithPopup(auth,googleProvider())',
    'signInWithRedirect(auth,googleProvider())',
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment",
  ]) assert.ok(client.includes(token),'missing '+token);
  assert.equal(client.includes('const hostingAuthDomain='),false);
});

test('authenticated session failures do not masquerade as no-organization state',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("else if(S.error&&!S.session)root.innerHTML=sessionFailure()"));
  assert.ok(client.includes("id="retry-session""));
  assert.ok(client.includes("id="switch-account""));
  assert.ok(client.includes("userNotFoundHelp"));
});

test('session automatically prefers an eligible organization over an inaccessible remembered tenant',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "const eligible=S.session.organizations.filter(x=>x.nestlocal?.access)",
    "remembered=S.session.organizations.find(x=>x.id===S.orgId&&x.nestlocal?.access)",
    "S.orgId=remembered?.id||eligible[0]?.id||S.session.organizations[0]?.id||''",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('account switching clears local tenant preference before Google account selection',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function switchGoogleAccount()');
  const end=client.indexOf('function bind()',start);
  const block=client.slice(start,end);
  assert.ok(block.includes("localStorage.removeItem('nl_org')"));
  assert.ok(block.includes('await signOut(auth)'));
  assert.ok(block.includes('await beginGoogleLogin()'));
});

test('login and recovery copy exists in PT EN ES',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("sessionProblem:'Não foi possível abrir sua operação'"));
  assert.ok(client.includes("sessionProblem:'We could not open your operation'"));
  assert.ok(client.includes("sessionProblem:'No pudimos abrir tu operación'"));
});

test('auth recovery states have responsive premium styling',()=>{
  const css=read('../web/premium.css');
  for(const token of ['.auth-recovery','.recovery-actions','.auth-progress','prefers-reduced-motion']) assert.ok(css.includes(token),'missing '+token);
});

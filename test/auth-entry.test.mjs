import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('direct private entry reuses the canonical MillionsNest session',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "const canonicalAuthDomain='millionsnest.firebaseapp.com'",
    "const millionsNestHubOrigin='https://www.millionsnest.com'",
    "new URL('/apps/nestlocal/launch',millionsNestHubOrigin)",
    "url.searchParams.set('returnTo',nestLocalReturnPath())",
    'redirectToMillionsNest()',
    'browserLocalPersistence',
    'browserSessionPersistence',
    'inMemoryPersistence',
  ]) assert.ok(client.includes(token),'missing '+token);
  assert.equal(client.includes('signInWithPopup('),false);
  assert.equal(client.includes('signInWithRedirect('),false);
  assert.equal(client.includes('GoogleAuthProvider'),false);
});

test('authenticated session failures do not masquerade as no-organization state',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("else if(S.error&&!S.session)root.innerHTML=sessionFailure()"));
  assert.ok(client.includes('id="retry-session"'));
  assert.ok(client.includes('id="switch-account"'));
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

test('account switching clears local tenant preference and returns to central MillionsNest auth',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function switchGoogleAccount()');
  const end=client.indexOf('function bind()',start);
  const block=client.slice(start,end);
  assert.ok(block.includes("localStorage.removeItem('nl_org')"));
  assert.ok(block.includes('await signOut(auth)'));
  assert.ok(block.includes('redirectToMillionsNest()'));
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


test('handoff is consumed before any existing local Firebase session can start the app',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function startAuthBootstrap()');
  const end=client.indexOf("if(isLegal()||isRevenueXray())",start);
  const block=client.slice(start,end);
  assert.ok(start>=0,'missing auth bootstrap');
  assert.ok(block.includes('handoffResolved=!handoffExpected'),'missing handoff resolution gate');
  assert.ok(block.includes('if(handoffExpected&&!handoffResolved)return'),'auth observer must defer stale local users while handoff is pending');
  assert.ok(block.includes("consumed=await withTimeout(consumeHandoff(),15000,'AUTH_HANDOFF_TIMEOUT')"),'handoff must be consumed first');
  assert.ok(block.includes('if(consumed&&auth.currentUser)startSession(auth.currentUser)'),'session must start only from the consumed handoff');
  assert.equal(block.includes('getRedirectResult(auth)'),false,'legacy redirect auth must not race canonical Hub handoff');
  for(const token of ['AUTH_BOOT_TIMEOUT','AUTH_HANDOFF_TIMEOUT','redirectToMillionsNest()']) assert.ok(block.includes(token),'missing '+token);
});

test('session bootstrap bounds token, request and network waits',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "withTimeout(S.user.getIdToken(),6000,'AUTH_TOKEN_TIMEOUT')",
    "api('/api/session',{timeoutMs:10000})",
    "timeoutMs:12000",
    "throw Error('NETWORK_TIMEOUT')",
    'controller.abort()',
  ]) assert.ok(client.includes(token),'missing '+token);
});


test('iOS auth persistence falls back from local to session to memory',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function ensureAuthPersistence()');
  const end=client.indexOf('async function api(',start);
  const block=client.slice(start,end);
  assert.ok(start>=0,'missing persistence recovery');
  for(const token of ['browserLocalPersistence','browserSessionPersistence','inMemoryPersistence','1200','900','500']) assert.ok(block.includes(token),'missing '+token);
});

test('auth bootstrap reuses local handoff session or quickly falls back to the Hub',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function startAuthBootstrap()');
  const end=client.indexOf("if(isLegal()||isRevenueXray())",start);
  const block=client.slice(start,end);
  assert.ok(block.indexOf('onAuthStateChanged(auth') < block.indexOf('consumeHandoff()'));
  assert.ok(block.includes("const goHub=()=>"));
  assert.ok(block.includes('if(!handoffExpected){goHub();return}'));
  assert.ok(block.includes('},1500)'));
  assert.ok(block.includes('},18000)'));
});

test('root document cache-busts the production auth bundle',()=>{
  const html=read('../web/index.html');
  assert.ok(html.includes('/live.js?v=20260928-canonical-sso-6'));
});


test('app shell recovery guard remembers a handoff even after the sensitive query is removed',()=>{
  const html=read('../web/index.html');
  for(const token of ['__nestLocalBootGuard','__nestLocalHandoffExpectedAtBoot','handoffExpectedAtBoot','setTimeout(recovery, 22000)','boot-retry','location.reload()','/apps/nestlocal/launch','ecosystem_ctx','20260928-canonical-sso-6']) assert.ok(html.includes(token),'missing '+token);
});

test('iOS handoff does not wait for persistence before exchanging the custom token',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function consumeHandoff()');
  const end=client.indexOf('const requestedView',start);
  const block=client.slice(start,end);
  assert.ok(block.includes("signInWithCustomToken(auth,context.customToken),12000,'AUTH_HANDOFF_SIGNIN_TIMEOUT'"));
  assert.ok(block.includes('void ensureAuthPersistence();'));
  assert.equal(block.includes('await ensureAuthPersistence()'),false);
  assert.ok(block.indexOf('signInWithCustomToken')<block.indexOf('void ensureAuthPersistence()'));
});

test('successful handoff clears the independent boot redirect guard before session data loads',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function consumeHandoff()');
  const end=client.indexOf('const requestedView',start);
  const block=client.slice(start,end);
  for(const token of ['__nestLocalHandoffConsumed=true','clearTimeout(window.__nestLocalBootGuard)','window.__nestLocalBootGuard=null',"params.delete('ecosystem_ctx')"]) assert.ok(block.includes(token),'missing '+token);
  assert.ok(block.indexOf('clearTimeout(window.__nestLocalBootGuard)')<block.indexOf("params.delete('ecosystem_ctx')"),'boot guard must be disabled before ecosystem_ctx is removed');
});

test('resolved application state clears the independent boot guard',()=>{
  const client=read('../web/live.js');
  for(const token of ['window.__nestLocalBootGuard','clearTimeout(window.__nestLocalBootGuard)',"dataset.nlBuild='20260928-canonical-sso-6'"]) assert.ok(client.includes(token),'missing '+token);
});

test('Firebase Hosting root app shell is explicitly no-store',()=>{
  const config=JSON.parse(read('../firebase.json'));
  for(const hosting of config.hosting){
    const root=hosting.headers.find(entry=>entry.source==='/');
    assert.ok(root,'missing root cache headers for '+hosting.target);
    assert.ok(root.headers.some(header=>header.key==='Cache-Control'&&header.value.includes('no-store')));
  }
});

test('production workflow deploys Hosting before noncritical domain maintenance',()=>{
  const workflow=read('../.github/workflows/firebase-hosting-deploy.yml');
  const deploy=workflow.indexOf('Deploy NestLocal Hosting immediately');
  const authorize=workflow.indexOf('Authorize NestLocal login domains');
  const custom=workflow.indexOf('Connect official custom domain');
  assert.ok(deploy>=0&&authorize>deploy&&custom>deploy);
  assert.ok(workflow.includes('continue-on-error: true'));
  assert.ok(workflow.includes('/live.js?v=20260928-canonical-sso-6'));
});


test('direct-entry destinations preserve only known private NestLocal views',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "privateViews=new Set(['today','requests','customers','agenda','services','automation','page','growth'])",
    "return view&&privateViews.has(view)?",
  ]) assert.ok(client.includes(token),'missing '+token);
});

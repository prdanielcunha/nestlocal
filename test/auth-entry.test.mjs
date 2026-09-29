import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('direct private entry delegates identity to the canonical MillionsNest Hub',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "const millionsNestHubOrigin='https://www.millionsnest.com'",
    "new URL('/apps/nestlocal/launch',millionsNestHubOrigin)",
    "url.searchParams.set('returnTo',nestLocalReturnPath())",
    'redirectToMillionsNest()',
  ]) assert.ok(client.includes(token),'missing '+token);

  for(const forbidden of [
    'firebase-app.js',
    'firebase-auth.js',
    'initializeApp',
    'getAuth(',
    'onAuthStateChanged',
    'signInWithCustomToken',
    'GoogleAuthProvider',
    'signInWithPopup(',
    'signInWithRedirect(',
    'getIdToken()',
  ]) assert.equal(client.includes(forbidden),false,'browser auth must not contain '+forbidden);
});

test('private API requests rely on same-origin HttpOnly session cookies instead of bearer tokens',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function api(');
  const end=client.indexOf('async function openPhoto',start);
  const block=client.slice(start,end);
  assert.ok(block.includes("credentials:'same-origin'"));
  assert.ok(block.includes("cache:request.cache||'no-store'"));
  assert.equal(block.includes('Authorization:'),false);
  assert.equal(block.includes('getIdToken'),false);
});

test('backend handoff redeems a short opaque code and never places Firebase credentials in browser state',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function consumeHandoff()');
  const end=client.indexOf('const requestedView',start);
  const block=client.slice(start,end);
  for(const token of [
    "params.get('code')",
    "/^[A-Za-z0-9_-]{43}$/",
    "api('/api/auth/handoff/redeem'",
    "body:JSON.stringify({code})",
    "window.__nestLocalHandoffConsumed=true",
    "clearTimeout(window.__nestLocalBootGuard)",
    "history.replaceState",
  ]) assert.ok(block.includes(token),'missing '+token);
  for(const forbidden of ['ecosystem_ctx','customToken','atob(','signInWithCustomToken']) {
    assert.equal(block.includes(forbidden),false,'handoff consumer must not use '+forbidden);
  }
});

test('bootstrap first redeems code, then resolves the server session; direct entry reuses cookie or returns to Hub',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function startAuthBootstrap()');
  const end=client.indexOf("if(isLegal()||isRevenueXray())",start);
  const block=client.slice(start,end);
  for(const token of [
    "codeExpected=params.has('code')",
    "consumeHandoff()",
    "await loadSession()",
    "const loaded=await loadSession()",
    "['AUTH_REQUIRED','INVALID_TOKEN'].includes(S.error)",
    'redirectToMillionsNest()',
  ]) assert.ok(block.includes(token),'missing '+token);
  assert.ok(block.indexOf('consumeHandoff()')<block.indexOf('await loadSession()'));
});

test('authenticated session failures do not masquerade as no-organization state',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("else if(S.error&&!S.session)root.innerHTML=sessionFailure()"));
  assert.ok(client.includes('id="retry-session"'));
  assert.ok(client.includes('id="switch-account"'));
  assert.ok(client.includes("userNotFoundHelp"));
});

test('session projection populates the local user from the backend session',()=>{
  const client=read('../web/live.js');
  const start=client.indexOf('async function loadSession()');
  const end=client.indexOf('async function loadPublic()',start);
  const block=client.slice(start,end);
  assert.ok(block.includes("S.session=await api('/api/session'"));
  assert.ok(block.includes("S.user=S.session?.user||{uid:'nestlocal-session'}"));
  assert.ok(block.includes("const eligible=S.session.organizations.filter(x=>x.nestlocal?.access)"));
});

test('switch account and logout revoke only the NestLocal cookie session',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "api('/api/auth/session',{method:'DELETE'",
    "localStorage.removeItem('nl_org')",
    'redirectToMillionsNest()',
  ]) assert.ok(client.includes(token),'missing '+token);
  assert.equal(client.includes('signOut(auth)'),false);
});

test('server stores only an Firebase Hosting-compatible opaque cookie and validates central session version',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "const nestLocalSessionCookie='__session'",
    'HttpOnly; Secure; SameSite=Lax',
    "db.doc(`nestlocal_sessions/${sessionHash}`)",
    "normalizeEcosystemSessionVersion(userDoc.data()?.ecosystemSessionVersion)!==session.sessionVersion",
    "sessionKind:'nestlocal_cookie'",
  ]) assert.ok(server.includes(token),'missing '+token);
});

test('handoff redemption is single-use, expiring and atomically creates the local session',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf("app.post('/api/auth/handoff/redeem'");
  const end=server.indexOf("app.delete('/api/auth/session'",start);
  const block=server.slice(start,end);
  for(const token of [
    "handoff.appId!=='nestlocal'",
    "handoff.status!=='issued'",
    "handoff.consumedAt!==null",
    "handoffExpires.getTime()<=now",
    "tx.update(handoffRef,{status:'consumed'",
    "tx.create(sessionRef",
    "consumedBy:'nestlocal-backend-session-v1'",
    "res.setHeader('Set-Cookie'",
  ]) assert.ok(block.includes(token),'missing '+token);
});

test('cookie session is bound to the organization selected by the Hub',()=>{
  const server=read('../server.mjs');
  assert.ok(server.includes("if(req.identity?.sessionKind==='nestlocal_cookie'&&req.identity?.orgId!==orgId)return sendError(res,403,'SESSION_ORGANIZATION_MISMATCH')"));
  const sessionStart=server.indexOf("app.get('/api/session'");
  const sessionEnd=server.indexOf("app.get('/api/organizations/:orgId/nestlocal'",sessionStart);
  const sessionBlock=server.slice(sessionStart,sessionEnd);
  assert.ok(sessionBlock.includes("handoffAppId=clean(req.identity.appId).toLowerCase()"));
  assert.ok(sessionBlock.includes("handoffOrgId=safeId(req.identity.orgId)"));
  assert.ok(sessionBlock.includes("ids=[handoffOrgId]"));
});

test('Bearer authentication remains available for controlled compatibility',()=>{
  const server=read('../server.mjs');
  const start=server.indexOf('async function authenticate(req,res,next)');
  const end=server.indexOf('async function authorize',start);
  const block=server.slice(start,end);
  assert.ok(block.includes("value.startsWith('Bearer ')"));
  assert.ok(block.includes('admin.auth().verifyIdToken'));
  assert.ok(block.includes('resolveNestLocalCookieIdentity'));
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

test('root document cache-busts the backend SSO bundle',()=>{
  const html=read('../web/index.html');
  assert.ok(html.includes('/live.js?v=20260928-backend-sso-7'));
  assert.ok(html.includes('20260928-backend-sso-7'));
});

test('app shell recovery guard recognizes both new code handoff and stale legacy URLs',()=>{
  const html=read('../web/index.html');
  for(const token of [
    '__nestLocalBootGuard',
    '__nestLocalHandoffExpectedAtBoot',
    "bootParams.has('code')",
    "bootParams.has('ecosystem_ctx')",
    'boot-retry',
    'location.reload()',
    '/apps/nestlocal/launch',
  ]) assert.ok(html.includes(token),'missing '+token);
});

test('resolved application state clears the independent boot guard',()=>{
  const client=read('../web/live.js');
  for(const token of [
    'window.__nestLocalBootGuard',
    'clearTimeout(window.__nestLocalBootGuard)',
    "dataset.nlBuild='20260928-backend-sso-7'",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('Firebase Hosting root app shell is explicitly no-store',()=>{
  const config=JSON.parse(read('../firebase.json'));
  for(const hosting of config.hosting){
    const root=hosting.headers.find(entry=>entry.source==='/');
    assert.ok(root,'missing root cache headers for '+hosting.target);
    assert.ok(root.headers.some(header=>header.key==='Cache-Control'&&header.value.includes('no-store')));
  }
});

test('production workflow deploys backend SSO bundle and validates it on the official domain',()=>{
  const workflow=read('../.github/workflows/firebase-hosting-deploy.yml');
  const deploy=workflow.indexOf('Deploy NestLocal Hosting immediately');
  const custom=workflow.indexOf('Connect official custom domain');
  const smoke=workflow.indexOf('Smoke production endpoints');
  assert.ok(deploy>=0&&custom>deploy&&smoke>custom);
  assert.ok(workflow.includes('/live.js?v=20260928-backend-sso-7'));
  assert.ok(workflow.includes('20260928-backend-sso-7'));
});

test('direct-entry destinations preserve only known private NestLocal views',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "privateViews=new Set(['today','requests','customers','agenda','services','automation','page','growth'])",
    "return view&&privateViews.has(view)?",
  ]) assert.ok(client.includes(token),'missing '+token);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('native Firebase identity can mint a scoped NestLocal AI session only after canonical authorization',()=>{
 const server=read('../server.mjs');
 const start=server.indexOf("app.post('/api/auth/firebase/session',authenticate");
 const end=server.indexOf("app.delete('/api/auth/session'",start);
 assert.ok(start>=0&&end>start,'native exchange route must exist');
 const route=server.slice(start,end);
 for(const required of ['Bearer (?!nl_)','safeId(req.body.organizationId)','safeId(req.identity.uid)',
    'resolveNestLocalAccess({','if(!access.accessible)','NESTLOCAL_ACCESS_REQUIRED',
    'sessionVersion:normalizeEcosystemSessionVersion','accessSource:\'firebase_verified_native\'',
    'db.doc(`nestlocal_sessions/${hash(sessionToken)}`).create','sessionCookieHeader(sessionToken',
    "res.set('Cache-Control','private, no-store')"])
    assert.ok(route.includes(required),'missing security condition '+required);
 assert.equal(route.includes('admin.auth().createCustomToken'),false);
 assert.equal(route.includes("user.data()?.systemRole==='admin'"),false);
});

test('AI token is checked against request UID and tenant before any NestAI task',()=>{
 const server=read('../server.mjs');
 const start=server.indexOf('async function resolveAuthorizedNestAiToken(req,res)');
 const end=server.indexOf('async function authorize(req,res,next)',start);
 assert.ok(start>0&&end>start);
 const guard=server.slice(start,end);
 for(const condition of ['resolveNestLocalSessionIdentity(token,res,\'nestlocal_ai\')',
    'session.uid!==req.identity?.uid','session.orgId!==req.access?.orgId',
    'NESTLOCAL_NESTAI_SESSION_MISMATCH'])assert.ok(guard.includes(condition));
 const unguarded=server.split('\n').filter(x=>x.includes('readNestLocalSessionToken(req)'));
 assert.equal(unguarded.length,1,'all provider call sites must use the scoped verifier');
 assert.equal((server.match(/await resolveAuthorizedNestAiToken\(req,res\)/g)||[]).length,7);
});

test('direct Google multi-organization flow renews separate session on selected org without losing native ID',()=>{
 const ui=read('../web/live.js');
 for(const token of ['async function ensureNativeNestAiSession()',
    "api('/api/auth/firebase/session'",'response.organizationId!==S.orgId',
    'storageSet(sessionStorage,\'nl_session_token\'', 'S.directGoogleSession',
    'ensureNativeNestAiSession()','nl_direct_google', 'resumeDirectGoogle()',
    "storageRemove(localStorage,'nl_direct_google')"])
  assert.ok(ui.includes(token),'missing '+token);
 assert.ok(ui.includes("if(S.data?.features)S.data.features.opportunityAI=false"),
   'failed exchange must disable premium AI, not send a mismatched credential');
});

test('native AI connection failure is visible and manually recoverable',()=>{
 const ui=read('../web/live.js'),css=read('../web/operations.css');
 for(const token of ['function nativeAiNotice()','nativeAiSessionIssue','id="reconnect-native-ai"',
   "querySelector('#reconnect-native-ai')", "await ensureNativeNestAiSession();await loadData()",
   'NestAI precisa reconectar', 'NestAI needs to reconnect',
   'NestAI necesita reconectarse'])assert.ok(ui.includes(token),'missing '+token);
 assert.ok(css.includes('.native-ai-notice'));
});

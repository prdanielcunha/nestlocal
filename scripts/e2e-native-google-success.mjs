// Synthetic success path only: NO real Google identity, NestAI or Firestore.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const fakeToken='synthetic.firebase.id.token';
const nativeToken='nl_'+('a'.repeat(43));
const json=(value,status=200)=>({status,contentType:'application/json',body:JSON.stringify(value)});
const mockFirebaseApp=`
  export const initializeApp=()=>({});
  export const getApps=()=>[];
  export const getApp=()=>({});
`;
const mockFirebaseAuth=`
  const user={getIdToken:async()=> 'synthetic.firebase.id.token'};
  const auth={currentUser:null,authStateReady:async()=>{}};
  export const browserLocalPersistence={};
  export const getAuth=()=>auth;
  export const setPersistence=async()=>{};
  export const getRedirectResult=async()=>null;
  export class GoogleAuthProvider{setCustomParameters(){}}
  export const signInWithPopup=async()=>{auth.currentUser=user;return {user}};
  export const signInWithRedirect=async()=>{throw Error('UNEXPECTED_REDIRECT')};
  export const signOut=async()=>{auth.currentUser=null};
`;
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
  let mintCount=0,authHeaders=[],confirms=0;
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js',
    r=>r.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'text/javascript'},body:mockFirebaseApp}));
  await page.route('https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js',
    r=>r.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'text/javascript'},body:mockFirebaseAuth}));
  await page.route('**/__/firebase/init.json',r=>r.fulfill(json({
     projectId:'millionsnest',apiKey:'AIzaSyntheticNotARealKey',authDomain:'millionsnest.firebaseapp.com'
     // Deliberately NO appId: matches live secondary Firebase Hosting site.
  })));
  const sample={
    organization:{id:'demo_org',name:'Empresa fictícia'},
    features:{opportunityDrafts:false,pulseV2:false,opportunityAI:true},
    entitlement:{plan:'essential',status:'active',limits:{users:1,requestsPerMonth:100},usage:{requests:0},seats:{used:1,limit:1}},
    settings:null,setupReadiness:{ready:false,issues:[]},
    services:[],requests:[],customers:[],team:[],messageOutbox:[],
    revenueMetrics:{assistedRevenueCents:0,assistedJobs:0},reviewMetrics:{count:0,sumRatings:0,distribution:{}},
    actionOutcomeMetrics:{},guidedExperiments:[],decisionMemory:{},experimentAccess:{canManage:true}
  };
  await page.route('**/api/**',async r=>{
   const url=new URL(r.request().url()),method=r.request().method();
   const authorization=r.request().headers().authorization||'';
   if(url.pathname==='/api/session'){
     if(authorization!=='Bearer '+fakeToken)return r.fulfill(json({error:'AUTH_REQUIRED'},401));
     return r.fulfill(json({user:{uid:'native_user',systemRole:'user'},
        organizations:[{id:'demo_org',name:'Empresa fictícia',nestlocal:{access:true,status:'active',plan:'essential'}}]}));
   }
   if(url.pathname==='/api/auth/firebase/session'){
     assert.equal(method,'POST');
     assert.equal(authorization,'Bearer '+fakeToken,'native exchange must use Google ID token');
     assert.equal(r.request().postDataJSON().organizationId,'demo_org');
     mintCount++;
     return r.fulfill(json({ok:true,organizationId:'demo_org',sessionToken:nativeToken,sessionTransport:'cookie+bearer'}));
   }
   if(url.pathname==='/api/organizations/demo_org/nestlocal'){
     authHeaders.push(authorization);
     return r.fulfill(json(sample));
   }
   if(url.pathname==='/api/auth/session'&&method==='DELETE')return r.fulfill(json({ok:true}));
   if(url.pathname.endsWith('/privacy/permissions'))return r.fulfill(json({}));
   if(url.pathname.endsWith('/pulse/feedback'))return r.fulfill(json({items:[]}));
   if(url.pathname.endsWith('/calendar/feed/status'))return r.fulfill(json({active:false}));
   return r.fulfill(json({error:'SYNTHETIC_UNIMPLEMENTED'},404));
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('.entry-landing #login').waitFor({timeout:13000});
  await page.locator('#login').click();
  await page.locator('.operation-focus').waitFor({timeout:15000});
  await page.waitForFunction(()=>!!sessionStorage.getItem('nl_session_token'),{timeout:10000});
  const stored=await page.evaluate(()=>sessionStorage.getItem('nl_session_token'));
  assert.equal(stored,nativeToken,'auth bridge should store only internal NestLocal session token');
  assert.equal(mintCount,1,'native login should mint a single app session');
  assert.ok(authHeaders.length>=1&&authHeaders.every(h=>h==='Bearer '+fakeToken),'business APIs must use verified Firebase identity');
  assert.equal(await page.locator('.native-ai-notice').count(),0,'session exchange success must not show reconnect');
  const dimensions=await page.evaluate(()=>({window:innerWidth,doc:document.documentElement.scrollWidth}));
  assert.ok(dimensions.doc<=dimensions.window+1,'horizontal overflow '+width);
  assert.deepEqual(errors,[],'browser errors on '+width);
  await page.close();
 }
 console.log('Native Google -> authorized org -> NestAI session synthetic E2E PASS at 320/390/1440; no real Google/NestAI provider called');
}finally{await browser.close()}

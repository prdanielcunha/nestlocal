import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
mkdirSync('artifacts/experience',{recursive:true});
try{
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:width<450?840:960},reducedMotion:'reduce'});
    const errors=[],feedback=[],consoleErrors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
    const fakeEpoch=Math.floor((Date.now()-72*3600000)/1000);
    const sample={
      features:{pulseV2:true},
      organization:{id:'demo_org',name:'Prestador de exemplo'},
      entitlement:{plan:'essential',status:'active',limits:{requestsPerMonth:100,users:1},usage:{requests:1},seats:{used:1,limit:1}},
      settings:{businessName:'Prestador de exemplo',slug:'prestador-exemplo',communicationMode:'none',contactEmail:'example@example.test',contactPhone:'',whatsapp:'',published:false,timezone:'America/Sao_Paulo',coverageCodes:['centro'],capacity:{workingDays:[],windows:[]},messaging:{connected:false}},
      setupReadiness:{ready:true,issues:[]},
      services:[{id:'sample_service',name:'Serviço de exemplo',mode:'review',published:false}],
      requests:[{id:'sample_request',status:'quoted',organizationId:'demo_org',customer:{name:'Cliente fictício',phone:''},quote:{outcome:'priced',totalCents:30000,currency:'BRL'},commercial:{},updatedAt:{seconds:fakeEpoch},createdAt:{seconds:fakeEpoch},serviceId:'sample_service',quantity:1,preference:{date:'',window:'flexible'},address:{line:'Rua de exemplo',coverageCode:'centro'}}],
      customers:[],team:[],messageOutbox:[],customerCount:0,
      reminderReadiness:{dueCount:0,readyCount:0},revenueMetrics:{assistedRevenueCents:0,assistedJobs:0},
      reviewMetrics:{count:0,sumRatings:0,distribution:{}},
      actionOutcomeMetrics:{},guidedExperiments:[],decisionMemory:{},experimentAccess:{canManage:true}
    };
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname,method=route.request().method();
      if(path==='/api/session')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{uid:'synthetic_user',systemRole:'owner'},organizations:[{id:'demo_org',name:'Prestador de exemplo',nestlocal:{access:true,status:'active',plan:'essential'}}]})});
      if(path==='/api/organizations/demo_org/nestlocal'&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sample)});
      if(path.endsWith('/push/config')&&method==='GET')
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
          enabled:true,transport:'firebase_cloud_messaging',
          vapidPublicKey:'A'.repeat(87),messagingAppId:'1:123456789012:web:0123456789abcdef',
          messagingSenderId:'123456789012',scheduledRemindersEnabled:false
        })});
      if(path.endsWith('/privacy/permissions')&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({communicationMode:'none',manualLink:{active:false},official:{connected:false},responseChannels:{email:true,phone:false},published:false})});
      if(path.endsWith('/pulse/feedback')&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});
      if(path.endsWith('/pulse/feedback')&&method==='POST'){
        const body=route.request().postDataJSON();feedback.push(body);
        assert.equal(body.actionId,'followup:sample_request');
        assert.equal(body.outcome,'snooze');
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,...body,until:'2999-01-01'})});
      }
      return route.fulfill({status:404,contentType:'application/json',body:'{"error":"UNKNOWN_SYNTHETIC_API"}'});
    });
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    const pulse=page.locator('.pulse2-panel');
    try{await pulse.waitFor({timeout:10000})}catch(error){const debug=await page.locator('body').innerText().catch(()=>'?');throw Error('AUTHED_PANEL_NOT_SHOWN '+width+' '+JSON.stringify({url:page.url(),body:debug.slice(0,1600),errors,consoleErrors})+' '+error.message)}
    assert.ok((await pulse.textContent()).includes('Cliente fictício'));
    await page.locator('.operation-focus').waitFor();
    assert.equal(await page.locator('.operational-insights').getAttribute('open'),null,
      'Advanced tools should stay available without overwhelming the first screen');
    await page.locator('[data-push-enable]').waitFor();
    assert.equal(await page.locator('[data-push-test]').count(),1);
    assert.equal(await page.locator('[data-push-disable]').count(),1);
    assert.ok((await page.locator('.push-controls').innerText()).includes('Notificações'));
    assert.ok((await page.locator('.operation-focus').textContent()).includes('Cliente fictício'));
    const size=await page.evaluate(()=>({document:document.documentElement.scrollWidth,window:innerWidth}));
    assert.ok(size.document<=size.window+1,'Dashboard overflow at '+width+': '+JSON.stringify(size));
    await page.screenshot({path:'artifacts/experience/pulse-facts-'+width+'.png',fullPage:true});
    await page.locator('.pulse2-queue>summary').click();
    await page.locator('button[data-pulse-feedback="snooze"]').click();
    // The feedback POST and dashboard refresh are async. Wait for the user-visible
    // state transition before asserting the network side effect to avoid a race.
    await page.locator('.pulse2-empty').waitFor();
    assert.equal(feedback.length,1);
    await page.screenshot({path:'artifacts/experience/pulse-snoozed-'+width+'.png',fullPage:true});
    // C16: a synthetic customer's unsaved details survive module navigation
    // without storing the customer's text in browser storage or on the server.
    await page.evaluate(()=>document.querySelector('.sidebar button[data-nav="requests"]')?.click());
    const intakeName=page.locator('#internal-request [name="name"]');
    await page.evaluate(()=>{const details=document.querySelector('#internal-request')?.closest('details');if(details)details.open=true});
    await intakeName.waitFor();
    const unfinished='Rascunho transitório C16 — não enviar';
    await intakeName.fill(unfinished);
    await page.evaluate(()=>document.querySelector('.sidebar button[data-nav="agenda"]')?.click());
    await page.evaluate(()=>document.querySelector('.sidebar button[data-nav="requests"]')?.click());
    assert.equal(await page.locator('#internal-request [name="name"]').inputValue(),unfinished,
      'unsaved form did not survive re-render '+width);
    const leaked=await page.evaluate(text=>[localStorage,sessionStorage].some(storage=>
      Array.from({length:storage.length},(_,i)=>storage.getItem(storage.key(i))||'').join(' ').includes(text)),unfinished);
    assert.equal(leaked,false,'customer draft persisted in browser storage '+width);
    await page.screenshot({path:'artifacts/experience/request-draft-preserved-'+width+'.png',fullPage:true});
    if(width<=980)await page.locator('.bottom-nav .mobile-more > summary').click();
    await page.locator(width<=980?'.bottom-nav .mobile-more-list button[data-nav="privacy"]':'.sidebar button[data-nav="privacy"]').click();
    await page.locator('.privacy-center').waitFor();
    assert.ok((await page.locator('.privacy-center').textContent()).includes('example')===false,'contact email should not leak into privacy center');
    await page.screenshot({path:'artifacts/experience/privacy-'+width+'.png',fullPage:true});
    assert.deepEqual(errors,[],'Browser errors '+width);
    await page.close();
  }
  console.log('Synthetic authenticated UI E2E PASS: Pulse evidence + snooze + Privacy, widths 320/390/1440 (not a live Hub auth certification)');
}finally{await browser.close()}

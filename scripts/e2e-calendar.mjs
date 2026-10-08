import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('artifacts/experience',{recursive:true});
const browser=await chromium.launch({headless:true});
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const toTomorrow=()=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)};
const tomorrow=toTomorrow();
try{
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:width<500?860:960},acceptDownloads:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const calls=[],status={active:false};
    const sample={
      features:{pulseV2:false},organization:{id:'calendar_demo',name:'Empresa fictícia'},
      entitlement:{plan:'essential',status:'active',limits:{requestsPerMonth:100,users:1},usage:{requests:1},seats:{used:1,limit:1}},
      settings:{businessName:'Empresa fictícia',slug:'empresa-ficticia',timezone:'America/Sao_Paulo',published:true,coverageCodes:['centro'],communicationMode:'none',messaging:{connected:false},capacity:{workingDays:[],windows:[]}},
      setupReadiness:{ready:true,issues:[]},services:[{id:'svc1',name:'Limpeza de ar-condicionado',mode:'fixed',published:true,durationMinutes:60,unitPriceCents:30000}],
      requests:[{id:'calendar_job_1',status:'scheduled',customer:{name:'Cliente de teste',phone:''},serviceId:'svc1',quantity:1,schedule:{date:tomorrow,window:'morning',assignedTo:'synthetic_user'},createdAt:{seconds:1000000},updatedAt:{seconds:1000000},
       quote:{outcome:'priced',totalCents:30000,currency:'BRL'},commercial:{},address:{line:'Rua de teste',coverageCode:'centro'}}],
      customers:[],team:[{uid:'synthetic_user',name:'Usuário de exemplo',nestlocalEnabled:true}],messageOutbox:[],customerCount:0,
      reminderReadiness:{dueCount:0,readyCount:0},revenueMetrics:{assistedRevenueCents:0,assistedJobs:0},reviewMetrics:{count:0,sumRatings:0,distribution:{}},
      actionOutcomeMetrics:{},guidedExperiments:[],decisionMemory:{},experimentAccess:{canManage:true}
    };
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();
      if(path==='/api/session')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{uid:'synthetic_user',systemRole:'owner'},organizations:[{id:'calendar_demo',name:'Empresa fictícia',nestlocal:{access:true,status:'active',plan:'essential'}}]})});
      if(path==='/api/organizations/calendar_demo/nestlocal'&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sample)});
      if(path.endsWith('/privacy/permissions'))return route.fulfill({status:200,contentType:'application/json',body:'{"communicationMode":"none","responseChannels":{"email":true},"manualLink":{"active":false}}'});
      if(path.endsWith('/pulse/feedback'))return route.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});
      if(path.endsWith('/calendar/feed/status'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({active:status.active,mode:'one_way_subscription'})});
      if(path.endsWith('/calendar/feed')&&method==='POST'){
        status.active=true;calls.push('create');
        return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({mode:'one_way_subscription',feedUrl:'https://nestlocal.millionsnest.com/api/calendar/feeds/calendar_demo/synthetic_user.ics?key=synthetic-not-real-token'})});
      }
      if(path.endsWith('/calendar/feed')&&method==='DELETE'){
        status.active=false;calls.push('revoke');
        return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"revoked":true}'});
      }
      return route.fulfill({status:404,contentType:'application/json',body:'{"error":"SYNTHETIC_ONLY"}'});
    });
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator(width<=980?'.bottom-nav button[data-nav="agenda"]':'.sidebar button[data-nav="agenda"]').click();
    await page.locator('.calendar-connect').waitFor();
    assert.ok((await page.locator('.calendar-connect').textContent()).includes('Visitas amanhã'));
    assert.ok((await page.locator('.calendar-due').textContent()).includes('1'));
    assert.ok((await page.locator('.calendar-reminder-disclosure').textContent()).includes('1 dia antes'));
    assert.equal(await page.locator('[data-calendar-google]').count(),1);
    assert.equal(await page.locator('[data-calendar-ics]').count(),2,'due card and event row must export');
    const size=await page.evaluate(()=>({document:document.documentElement.scrollWidth,window:innerWidth}));
    assert.ok(size.document<=size.window+1,'Calendar overflow '+width+' '+JSON.stringify(size));
    await page.locator('.calendar-sync-settings summary').click();
    await page.locator('[data-calendar-feed-create]').click();
    await page.locator('.calendar-sync-settings summary').click();
    await page.locator('[data-calendar-feed-revoke]').waitFor();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-calendar-feed-revoke]').click();
    await page.locator('[data-calendar-feed-create]').waitFor();
    assert.deepEqual(calls,['create','revoke']);
    assert.deepEqual(errors,[],JSON.stringify(errors));
    await page.screenshot({path:'artifacts/experience/calendar-'+width+'.png',fullPage:true});
    await page.close();
  }
  console.log('Calendar synthetic browser E2E PASS: today/tomorrow, add to calendar, signed feed create/revoke, 320/390/1440. No real customer/Hub auth certification.');
}finally{await browser.close()}

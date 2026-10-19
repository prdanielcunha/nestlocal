// Synthetic Google HTTP contract; this does NOT certify a real Google account.
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('artifacts/experience',{recursive:true});const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,1440]){
  const request={id:'synthetic-request',status:'scheduled',schedule:{date:'2099-01-01',window:'morning',revision:1,customerConfirmation:{status:'confirmed'}},customer:{name:'Private Customer'},address:{line:'Private Road'}};
  let event=null,googleWrites=0,appWrites=0;const errors=[],page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://www.googleapis.com/calendar/v3/**',async route=>{
   const method=route.request().method(),headers=route.request().headers();assert.equal(headers.authorization,'Bearer synthetic-provider-token');
   if(method==='GET')return route.fulfill({status:event?200:404,contentType:'application/json',body:JSON.stringify(event||{})});
   const body=route.request().postDataJSON();assert.doesNotMatch(JSON.stringify(body),/Private Customer|Private Road/);
   if(method==='POST'){assert.equal(event,null);event={...body,etag:'"1"'};googleWrites++}
   else{assert.equal(headers['if-match'],event.etag);event={...event,...body,etag:'"'+(++googleWrites+10)+'"'}}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(event)});
  });
  await page.route('**/api/synthetic-request',async route=>{
   if(route.request().method()==='PATCH'){
    const body=route.request().postDataJSON();assert.equal(body.expectedScheduleRevision,request.schedule.revision);assert.equal(body.expectedScheduleStatus,request.status);
    request.schedule={...request.schedule,date:body.scheduledDate,revision:request.schedule.revision+1,customerConfirmation:null};appWrites++;
   }
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:request})});
  });
  await page.goto('http://127.0.0.1:4173/experience.html');
  await page.evaluate(async request=>{
   const {renderGoogleCalendarSync,bindGoogleCalendarSync}=await import('/google-calendar-sync.js');
   document.body.innerHTML='<main style="padding:16px;max-width:680px;margin:auto">'+renderGoogleCalendarSync({requests:[request],lang:'pt',allowed:true,esc:value=>String(value).replace(/</g,'&lt;')})+'</main>';
   document.head.innerHTML='<link rel="stylesheet" href="/operations.css">';
   bindGoogleCalendarSync({orgId:'synthetic-org',uid:'synthetic-user',lang:'pt',esc:String,isCurrent:()=>true,onSaved:async()=>{},authorize:async()=> 'synthetic-provider-token',api:async(_path,options)=>{const response=await fetch('/api/synthetic-request',options);return response.json()}});
   document.querySelector('details').open=true;
  },request);
  const review=async()=>{await page.locator('[data-google-sync-request]').selectOption(request.id);await page.locator('[data-google-sync-review]').click();await page.locator('[data-google-sync-agree]').waitFor()};
  await review();assert.equal(googleWrites,0);assert.equal(appWrites,0);await page.locator('[data-google-sync-agree]').check();
  await page.locator('[data-google-sync-push]').click();await page.waitForFunction(()=>document.querySelector('[data-google-sync-status]').textContent.includes('Alteração aplicada'));
  assert.equal(googleWrites,1);assert.equal(event.start.date,'2099-01-01');assert.equal(appWrites,0);
  event={...event,etag:'"external2"',start:{date:'2099-01-02'},end:{date:'2099-01-03'}};
  await review();await page.locator('[data-google-sync-agree]').check();await page.screenshot({path:`artifacts/experience/calendar-two-way-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('[data-google-sync-pull]').click();await page.waitForFunction(()=>document.querySelector('[data-google-sync-status]').textContent.includes('Alteração aplicada'));
  assert.equal(appWrites,1);assert.equal(request.schedule.date,'2099-01-02');assert.equal(request.schedule.window,'morning');assert.equal(request.schedule.customerConfirmation,null);assert.equal(event.extendedProperties.private.nlRevision,'2');
  // Both changed: visible conflict; a post-preview provider change must block writes.
  request.schedule={...request.schedule,date:'2099-01-04',revision:3};event={...event,etag:'"external3"',start:{date:'2099-01-03'},end:{date:'2099-01-04'}};
  await review();assert.match(await page.locator('[data-google-sync-preview]').textContent(),/alterações nos dois lados/);
  event.etag='"changed-after-review"';await page.locator('[data-google-sync-agree]').check();await page.locator('[data-google-sync-pull]').click();await page.waitForFunction(()=>document.querySelector('[data-google-sync-status]').textContent.includes('mudou'));
  assert.equal(appWrites,1);assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS synthetic Google contract: app -> calendar -> reviewed app update; conflict/ETag guards; private payload; 320/390/1440px. Real consent/provider certification still required.');
}finally{await browser.close()}

import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({headless:true});
mkdirSync('artifacts/experience',{recursive:true});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  const sample={organization:{id:'demo_org',name:'Synthetic business'},features:{},
   entitlement:{plan:'pro',status:'active',limits:{users:10,requestsPerMonth:5000},usage:{requests:0},seats:{used:1,limit:10}},
   settings:{businessName:'Synthetic business',slug:'synthetic-business',communicationMode:'none',contactEmail:'synthetic@example.test',coverageCodes:['synthetic-city'],published:false,timezone:'America/Sao_Paulo',capacity:{workingDays:[1],windows:['morning']},messaging:{}},
   canManageTeam:true,setupReadiness:{ready:true,issues:[]},services:[{id:'service',name:'Synthetic service',mode:'review',published:false}],requests:[],customers:[],dueCustomers:[],team:[{uid:'synthetic-member',name:'Synthetic member',role:'member',nestlocalEnabled:true,capabilities:{financeWrite:false,sitesWrite:false}}],messageOutbox:[],reviewMetrics:{},actionOutcomeMetrics:{},guidedExperiments:[],decisionMemory:{},experimentAccess:{canManage:true}};
  let failNext=true,projectAdmin=true;
  await page.route('**/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname,method=req.method();
   const send=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(path==='/api/session')return send(200,{user:{uid:'synthetic-owner',systemRole:projectAdmin?'ceo':'user'},organizations:[{id:'demo_org',name:'Synthetic business',nestlocal:{access:true,status:'active',plan:'pro'}}]});
   if(path==='/api/organizations/demo_org/nestlocal'&&method==='GET')return send(200,sample);
   if(path.endsWith('/settings')&&method==='PUT'){
    const body=req.postDataJSON();writes.push({kind:'settings',body});
    if(failNext){failNext=false;return send(503,{error:'SYNTHETIC_SAVE_FAILURE'})}
    Object.assign(sample.settings,body);return send(200,{ok:true});
   }
   if(path.endsWith('/capacity')&&method==='PUT'){
    const body=req.postDataJSON();writes.push({kind:'capacity',body});
    sample.settings.capacity={workingDays:body.workingDays,windows:body.windows};sample.settings.timezone=body.timezone;
    return send(200,{ok:true});
   }
   if(path.endsWith('/team/synthetic-member')&&method==='PUT'){
    const body=req.postDataJSON();writes.push({kind:'capabilities',body});sample.team[0].capabilities=body.capabilities;return send(200,{ok:true});
   }
   if(path.endsWith('/customers/batch/preview')){
    const body=req.postDataJSON();writes.push({kind:'preview',body});
    return send(200,{counts:{create:1,update:0,invalid:0,duplicate:0},canImport:true,rows:[{index:0,name:body.customers[0].name,status:'create',customerKey:'synthetic-key',recordVersion:0}]});
   }
   if(path.endsWith('/customers/batch')){
    const body=req.postDataJSON();writes.push({kind:'import',body});
    return send(201,{importedCount:1,skippedCount:0});
   }
   if(path.endsWith('/pulse/feedback'))return send(200,{items:[]});
   return send(200,{items:[],enabled:false});
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.locator('.shell').waitFor();
  await page.evaluate(()=>document.querySelector('.sidebar [data-nav="services"]').click());
  const future=page.locator('#future-improvements');await future.locator('summary').click();
  assert.ok((await future.textContent()).includes('Adiado até o projeto gerar lucro'));
  assert.equal(await future.locator('button,input,select,form,a').count(),0,'Planning must never offer an activation action');
  await future.locator('summary').click();
  const form=page.locator('#settings'),submit=form.locator('button[type="submit"]');
  await form.locator('[name="business"]').fill('Changed synthetic business');
  await submit.click();
  await form.locator('[data-form-error][role="alert"]').waitFor();
  assert.equal(await form.locator('[name="business"]').inputValue(),'Changed synthetic business');
  assert.equal(await submit.isDisabled(),false);
  // Retry the same form after a server failure. A save response reloads the UI.
  const settingsSaved=page.waitForResponse(response=>response.url().endsWith('/nestlocal/settings')&&response.request().method()==='PUT');
  await submit.click();
  assert.equal((await settingsSaved).status(),200);
  await page.waitForFunction(()=>document.querySelector('#settings [name="business"]')?.value==='Changed synthetic business'&&!document.querySelector('#settings [data-form-error]')&&!document.querySelector('#settings button[type="submit"]').disabled);
  assert.equal(writes.filter(x=>x.kind==='settings').length,2);
  const capacity=page.locator('#capacity-settings');
  await capacity.locator('[name="timezone"]').fill('UTC');
  await capacity.locator('label:has(input[name="capacityDay"][value="2"])').click();
  await capacity.locator('label:has(input[name="capacityWindow"][value="afternoon"])').click();
  const capacitySaved=page.waitForResponse(response=>response.url().endsWith('/nestlocal/capacity')&&response.request().method()==='PUT');
  await capacity.locator('button[type="submit"]').click();
  assert.equal((await capacitySaved).status(),200);
  await page.waitForFunction(()=>document.querySelector('#capacity-settings [name="timezone"]')?.value==='UTC'&&!document.querySelector('#capacity-settings button[type="submit"]').disabled);
  const saved=writes.find(x=>x.kind==='capacity');assert.equal(saved.body.timezone,'UTC');
  assert.deepEqual(saved.body.workingDays,[1,2]);assert.deepEqual(saved.body.windows,['morning','afternoon']);
  for(const selector of ['#capacity-settings [name="timezone"]','#payment-settings [name="key"]']){
   const contrast=await page.locator(selector).evaluate(el=>{
    const style=getComputedStyle(el),rgb=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
    const luminance=channels=>channels.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
    const a=luminance(rgb(style.color)),b=luminance(rgb(style.backgroundColor));
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });
   assert.ok(contrast>=4.5,`Unreadable input at ${width}px: ${selector}, contrast ${contrast}`);
  }
  await page.screenshot({path:`artifacts/experience/settings-save-${width}.png`,fullPage:true});
  const size=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,width:innerWidth,
   overflowing:Array.from(document.querySelectorAll('.main *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,class:el.className,right:Math.round(el.getBoundingClientRect().right)}))}));
  assert.ok(size.actual<=size.width+1,JSON.stringify(size));
  const permissions=page.locator('[data-member-capabilities="synthetic-member"]');
  await permissions.locator('label:has(input[name="financeWrite"])').click();
  const accessSaved=page.waitForResponse(r=>r.url().endsWith('/team/synthetic-member')&&r.request().method()==='PUT');
  await permissions.locator('button[type="submit"]').click();assert.equal((await accessSaved).status(),200);
  await page.waitForFunction(()=>document.querySelector('[data-member-capabilities] [name="financeWrite"]')?.checked&&!document.querySelector('[data-member-capabilities] button').disabled);
  assert.deepEqual(writes.find(x=>x.kind==='capabilities').body,{enabled:true,profile:'legacy',capabilities:{financeWrite:true,sitesWrite:false}});
  await page.evaluate(()=>document.querySelector('.sidebar [data-nav="customers"]').click());
  await page.locator('.customer-import-card summary').click();
  await page.locator('#customerBatchFile').setInputFiles({name:'clientes.csv',mimeType:'text/csv',buffer:Buffer.from('Nome;WhatsApp;Endereço\n"Ana, AC";5511999999999;"Rua A, 10"')});
  await page.waitForFunction(()=>document.querySelector('#customerBatchText')?.value.includes('Ana, AC'));
  await page.locator('#customerBatchImport').click();await page.locator('.customer-import-preview').waitFor();
  assert.equal(writes.filter(x=>x.kind==='import').length,0);
  assert.equal(writes.find(x=>x.kind==='preview').body.customers[0].addressLine,'Rua A, 10');
  // Editing invalidates the prior review; the next click must only review.
  await page.locator('#customerBatchText').fill('Nome;WhatsApp\nBia;5511999999999');
  assert.equal(await page.locator('.customer-import-preview').count(),0);
  await page.locator('#customerBatchImport').click();await page.locator('.customer-import-preview').waitFor();
  assert.equal(writes.filter(x=>x.kind==='import').length,0);
  await page.screenshot({path:`artifacts/experience/customer-import-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const imported=page.waitForResponse(r=>r.url().endsWith('/customers/batch')&&r.request().method()==='POST');
  await page.locator('#customerBatchImport').click();assert.equal((await imported).status(),201);
  const importedBody=writes.find(x=>x.kind==='import').body;
  assert.equal(importedBody.customers[0].name,'Bia');assert.ok(importedBody.preflightRows.length);assert.match(importedBody.requestKey,/^[a-z0-9-]{36}$/);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS settings and capacity submit, failure recovery and retry at 320/390/1440px (synthetic API)');
}finally{await browser.close()}

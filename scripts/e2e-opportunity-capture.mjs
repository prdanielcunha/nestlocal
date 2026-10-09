import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
mkdirSync('artifacts/experience',{recursive:true});
try {
  for(const width of [390,1440]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[],stored=[],orders=[];
    page.on('pageerror',error=>errors.push(error.message));
    const data={
      features:{pulseV2:false,opportunityDrafts:true},
      organization:{id:'synthetic_org',name:'Oficina de exemplo'},
      entitlement:{plan:'essential',status:'active',limits:{requestsPerMonth:null,users:1},usage:{requests:0},seats:{used:1,limit:1}},
      settings:{businessName:'Oficina de exemplo',slug:'oficina-exemplo',communicationMode:'none',published:false,
        contactEmail:'example@example.test',coverageCodes:['centro'],timezone:'America/Sao_Paulo',
        capacity:{workingDays:[],windows:[]},messaging:{connected:false}},
      services:[{id:'general',name:'Visita técnica',mode:'review',published:false}],
      requests:orders,customers:[],team:[],messageOutbox:[],customerCount:0,
      setupReadiness:{ready:true,issues:[]},reminderReadiness:{dueCount:0,readyCount:0},
      revenueMetrics:{assistedRevenueCents:0,assistedJobs:0},reviewMetrics:{count:0,sumRatings:0,distribution:{}},
      actionOutcomeMetrics:{},guidedExperiments:[],decisionMemory:{},experimentAccess:{canManage:true}
    };
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname,method=route.request().method();
      const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(path==='/api/session')return json({user:{uid:'synthetic',systemRole:'user'},organizations:[
        {id:'synthetic_org',name:'Oficina de exemplo',nestlocal:{access:true,status:'active',plan:'essential'}}]});
      if(path==='/api/organizations/synthetic_org/nestlocal'&&method==='GET')return json(data);
      if(path.endsWith('/opportunity-drafts')&&method==='GET')return json({items:stored});
      if(path.endsWith('/opportunity-drafts')&&method==='POST'){
        const body=route.request().postDataJSON();
        assert.equal(body.origin,'whatsapp_manual');
        assert.ok(route.request().headers()['idempotency-key']);
        stored.unshift({id:'synthetic-draft',state:'open',version:1,schemaVersion:2,...body});
        return json({item:stored[0]},201);
      }
      if(path.endsWith('/requests')&&method==='POST'){
        const body=route.request().postDataJSON();
        assert.equal(body.sourceDraftId,'synthetic-draft');
        assert.equal(body.phone,'43999999999');
        assert.equal(body.addressLine,'Rua Exemplo, 123');
        orders.push({id:'synthetic-order',status:'new',customer:{name:body.name,phone:body.phone},
          serviceId:body.serviceId,quote:{},createdAt:{seconds:Math.floor(Date.now()/1000)}});
        stored[0].state='converted';
        return json({requestId:'synthetic-order',status:'new'},201);
      }
      if(path.endsWith('/privacy/permissions'))return json({});
      if(path.endsWith('/pulse/feedback'))return json({items:[]});
      if(path.endsWith('/calendar/feed/status'))return json({active:false});
      return json({error:'UNEXPECTED_SYNTHETIC_API'},404);
    });
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator('#opportunity-draft textarea[name=message]').waitFor();
    assert.ok((await page.locator('.nestlocal-today-v2').textContent()).includes('O que aconteceu hoje?'));
    await page.locator('#opportunity-draft textarea[name=message]').fill('Cliente pediu orçamento para reparo.');
    await page.locator('#opportunity-draft button[type=submit]').click();
    await page.locator('[data-prepare-draft]').waitFor();
    assert.equal(stored.length,1);
    await page.screenshot({path:`artifacts/experience/opportunity-home-${width}.png`,fullPage:true});
    await page.locator('[data-prepare-draft]').click();
    await page.locator('#internal-request').waitFor();
    assert.equal(await page.locator('#internal-request textarea[name=note]').inputValue(),'Cliente pediu orçamento para reparo.');
    await page.locator('#internal-request input[name=name]').fill('Cliente Exemplo');
    await page.locator('#internal-request input[name=phone]').fill('43999999999');
    await page.locator('#internal-request input[name=addressLine]').fill('Rua Exemplo, 123');
    await page.locator('#internal-request button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('[data-request-card="synthetic-order"]')!==null);
    assert.equal(orders.length,1);
    assert.equal(stored[0].state,'converted');
    const size=await page.evaluate(()=>({document:document.documentElement.scrollWidth,window:innerWidth}));
    assert.ok(size.document<=size.window+1,'Overflow '+width+': '+JSON.stringify(size));
    await page.screenshot({path:`artifacts/experience/opportunity-order-${width}.png`,fullPage:true});
    assert.deepEqual(errors,[],'Browser exceptions at '+width);
    await page.close();
  }
  console.log('Synthetic NestLocal 2.0 E2E PASS: manual opportunity -> confirmed order, 390px and 1440px. Not a live Firestore or Stripe certification.');
} finally {
  await browser.close();
}

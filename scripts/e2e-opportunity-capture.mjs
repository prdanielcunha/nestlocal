import {chromium} from 'playwright';
import {mkdirSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
mkdirSync('artifacts/experience',{recursive:true});
try {
  for(const width of [390,1440]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});
    const errors=[],stored=[],orders=[],tasks=[];
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
      if(path.includes('/data-export/')&&method==='GET'){
        const dataset=path.split('/').at(-1);
        assert.ok(['requests','customers','services','drafts','tasks'].includes(dataset));
        return json({organizationId:'synthetic_org',dataset,items:dataset==='requests'?orders:[],
          complete:true,nextCursor:null});
      }
      if(path.endsWith('/opportunity-drafts')&&method==='GET')return json({items:stored});
      if(path.endsWith('/opportunity-drafts')&&method==='POST'){
        const body=route.request().postDataJSON();
        assert.equal(body.origin,'whatsapp_manual');
        assert.ok(route.request().headers()['idempotency-key']);
        stored.unshift({id:'synthetic-draft',state:'open',version:1,schemaVersion:2,...body});
        return json({item:stored[0]},201);
      }
      if(path.endsWith('/preview')&&method==='GET'){
        return json({draftId:'synthetic-draft',mode:'deterministic',authority:'suggestion_only',
          facts:[{evidence:stored[0]?.message||'',sourceField:'message',verified:false}],
          questions:['Qual serviço precisa ser realizado?'],
          replyDraft:'Olá! Pode confirmar a região e o serviço?',delivered:false,appointmentBooked:false});
      }
      if(path.endsWith('/action-tasks')&&method==='GET')return json({items:tasks,delivery:'in_app_only',pushEnabled:false});
      if(path.endsWith('/action-tasks')&&method==='POST'){
        const body=route.request().postDataJSON();
        assert.equal(body.sourceDraftId,'synthetic-draft');
        assert.equal(body.timezone,'America/Sao_Paulo');
        assert.ok(route.request().headers()['idempotency-key']);
        tasks.unshift({...body,id:'task-example',status:'open',version:1});
        return json({item:tasks[0]},201);
      }
      if(path.endsWith('/action-tasks/task-example')&&method==='PATCH'){
        const body=route.request().postDataJSON();
        assert.equal(body.status,'done');assert.equal(body.expectedVersion,1);
        tasks[0].status='done';tasks[0].version=2;return json({item:tasks[0]});
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
    await page.locator('[data-draft-preview]').click();
    await page.locator('.opportunity-preview').waitFor();
    assert.ok((await page.locator('.preview-evidence').textContent()).includes('Cliente pediu orçamento'));
    assert.ok((await page.locator('[data-preview-reply]').inputValue()).includes('Pode confirmar'));
    await page.locator('.followup-task summary').first().click();
    await page.locator('[data-task-create] input[name=dueDate]').fill(new Date(Date.now()+86400000).toISOString().slice(0,10));
    await page.locator('[data-task-create] input[name=dueTime]').fill('09:30');
    await page.locator('[data-task-create] button[type=submit]').click();
    await page.locator('[data-task-done]').first().waitFor();
    assert.equal(tasks.length,1);
    await page.locator('[data-task-done]').first().click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-task-done]').length===0);
    assert.equal(tasks[0].status,'done');
    await page.screenshot({path:`artifacts/experience/opportunity-followup-${width}.png`,fullPage:true});
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
    if(size.document>size.window+1){
      const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>{
        const rect=el.getBoundingClientRect();
        return {tag:el.tagName,cls:String(el.className||'').slice(0,65),right:Math.round(rect.right),left:Math.round(rect.left),width:Math.round(rect.width)};
      }).filter(x=>x.right>innerWidth+1&&x.width>0).slice(0,15));
      console.log('Overflow elements',JSON.stringify(offenders));
    }
    assert.ok(size.document<=size.window+1,'Overflow '+width+': '+JSON.stringify(size));
    await page.screenshot({path:`artifacts/experience/opportunity-order-${width}.png`,fullPage:true});
    data.entitlement.readOnly=true;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-export-all]').waitFor();
    assert.ok((await page.locator('.read-only-banner').textContent()).includes('Exportar meus dados'));
    const downloadPromise=page.waitForEvent('download');
    await page.locator('[data-export-all]').click();
    const downloaded=await downloadPromise;
    const exportData=JSON.parse(readFileSync(await downloaded.path(),'utf8'));
    assert.equal(exportData.organizationId,'synthetic_org');
    assert.equal(exportData.data.requests.length,1);
    assert.deepEqual(Object.keys(exportData.data).sort(),['requests','customers','services','drafts','tasks'].sort());
    assert.deepEqual(errors,[],'Browser exceptions at '+width);
    await page.close();
  }
  console.log('Synthetic NestLocal 2.0 E2E PASS: draft -> grounded preview -> follow-up completed -> validated order on 390/1440px; read-only export; no live Firestore/Stripe certification.');
} finally {
  await browser.close();
}

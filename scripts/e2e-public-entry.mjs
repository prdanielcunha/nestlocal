import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const html=readFileSync('web/index.html','utf8');
mkdirSync('artifacts/experience',{recursive:true});
const safeSize=async page=>{
  const size=await page.evaluate(()=>({inner:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.inner+1,'horizontal overflow '+JSON.stringify(size));
};
try{
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:width<430?830:950},reducedMotion:'reduce'});
    const failures=[];page.on('pageerror',e=>failures.push(e.message));
    // Test unauthorized visitor state without a real Hub/Google account.
    await page.route('**/api/session',route=>route.fulfill({status:401,contentType:'application/json',body:'{"error":"AUTH_REQUIRED"}'}));
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator('a[href="/experience"]').waitFor();
    const promise=await page.locator('.entry-hero').textContent();
    for(const keyword of ['WhatsApp','Instagram','NestLocal'])assert.ok(promise.includes(keyword),'first-time buyer must see '+keyword);
    assert.ok((await page.locator('.entry-trust').textContent()).includes('WhatsApp'));
    assert.ok(await page.locator('#login').isVisible());
    assert.ok(await page.locator('a[href="/raio-x"]').isVisible());
    await safeSize(page);
    await page.screenshot({path:'artifacts/experience/landing-'+width+'.png',fullPage:true});
    await page.close();
  }
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:width<430?830:950},reducedMotion:'reduce'});
    const failures=[];page.on('pageerror',e=>failures.push(e.message));
    await page.route('**/raio-x',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
    let previewCalls=0,leads=0;
    await page.route('**/api/public/growth/diagnostic/preview',async route=>{
      previewCalls++;const input=route.request().postDataJSON();
      for(const field of ['businessName','contactName','phone','email','city'])assert.equal(Object.hasOwn(input,field),false,'preview cannot carry PII '+field);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({leadCreated:false,projection:{fitScore:74,painScore:68,monthlyOpportunityCents:10000,unfollowedQuotes:5,recoveryAssumption:0.15,methodology:'Indicative model, no guaranteed result.'}})});
    });
    await page.route('**/api/public/growth/diagnostic/lead',async route=>{
      leads++;const body=route.request().postDataJSON();
      assert.equal(body.acceptedContact,true);assert.equal(body.acceptedTerms,true);
      assert.equal(body.contactChannel,'email');assert.ok(body.email.includes('@'));
      await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({leadId:'synthetic_test',created:true})});
    });
    await page.goto('http://127.0.0.1:4173/raio-x',{waitUntil:'domcontentloaded'});
    await page.locator('#xray').waitFor();
    assert.equal(await page.locator('#xray input[name="phone"]').count(),0);
    assert.equal(await page.locator('#xray input[name="contactName"]').count(),0);
    await safeSize(page);
    await page.screenshot({path:'artifacts/experience/xray-anonymous-'+width+'.png',fullPage:true});
    await page.locator('#xray button[type="submit"]').click();
    await page.locator('#xray-lead').waitFor();
    assert.equal(previewCalls,1);
    assert.equal(leads,0);
    assert.equal(await page.locator('#xray-lead input[name="acceptedContact"]').isChecked(),false);
    await page.screenshot({path:'artifacts/experience/xray-result-'+width+'.png',fullPage:true});
    await page.locator('#xray-lead input[name="businessName"]').fill('Example Service');
    await page.locator('#xray-lead input[name="contactName"]').fill('Example Person');
    await page.locator('#xray-lead input[name="city"]').fill('Example City');
    await page.locator('#xray-lead input[name="email"]').fill('example@example.test');
    await page.locator('#xray-lead input[name="acceptedContact"]').check();
    await page.locator('#xray-lead button[type="submit"]').click();
    await page.locator('.xray-optin-status').waitFor();
    assert.equal(leads,1);
    await safeSize(page);
    assert.deepEqual(failures,[],'unhandled browser errors');
    await page.close();
  }
  console.log('Public acquisition E2E PASS: landing + anonymous diagnostic + opt-in on 320/390/1440');
}finally{await browser.close()}

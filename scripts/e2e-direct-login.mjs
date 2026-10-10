import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    let configAttempts=0;
    await page.route('**/api/session',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":"AUTH_REQUIRED"}'}));
    await page.route('**/__/firebase/init.json',r=>{configAttempts++;return r.fulfill({status:503,contentType:'application/json',body:'{}'})});
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
    await page.locator('.entry-landing #login').waitFor({timeout:13000});
    assert.ok(page.url().startsWith('http://127.0.0.1:4173/'),'anonymous PWA must not force Hub navigation');
    assert.ok(configAttempts>=1,'direct identity recovery must be attempted before native login');
    const hub=page.locator('.entry-hub-cta');
    assert.ok((await hub.getAttribute('href')).startsWith('https://www.millionsnest.com/apps/nestlocal/launch'));
    await page.locator('#login').click();
    await page.locator('.toast').waitFor({timeout:13000});
    assert.ok(page.url().startsWith('http://127.0.0.1:4173/'),'Google configuration failure must keep native fallback visible');
    assert.equal(errors.length,0,'uncaught script errors at '+width+': '+errors.join(';'));
    await page.close();
  }
  console.log('Direct NestLocal anonymous entry E2E PASS: no Hub loop, Google attempt, explicit Hub fallback at 320/390/1440 (Google provider integration not certified)');
}finally{await browser.close()}

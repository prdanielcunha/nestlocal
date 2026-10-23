import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const OUT='artifacts/experience';
await mkdir(OUT,{recursive:true});
const widths=[320,360,390,430,768,1024,1280,1440],segments=['climate','cleaning','pest','electrical','general'];
try{
  let count=0;
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:width<500?820:900},deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/experience.html',{waitUntil:'domcontentloaded'});
    await page.locator('[data-sector="climate"]').waitFor();
    assert.equal(await page.locator('.tour-place').count(),0,'choose the type of business first');
    await page.locator('[data-sector="climate"]').click();
    assert.equal(await page.locator('.tour-place').count(),4,'show WhatsApp, Instagram, website and phone/referral routes');
    for(const channel of ['whatsapp','instagram','website']){
      await page.locator('[data-entry="'+channel+'"]').click();
      assert.equal(await page.locator('[data-entry="'+channel+'"]').getAttribute('aria-pressed'),'true');
    }
    await page.locator('[data-action="reset"]').first().click();
    assert.equal(await page.locator('.tour-faq details').count(),5,'answer the five buying objections');
    await page.locator('.tour-faq details').first().evaluate(el=>el.open=true);
    assert.ok((await page.locator('.tour-faq details').first().textContent()).includes('WhatsApp'));

    const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:window.innerWidth}));
    assert.ok(size.scroll<=size.view+1,'horizontal overflow '+width+': '+JSON.stringify(size));
    if([320,390,1440].includes(width))await page.screenshot({path:OUT+'/welcome-'+width+'.png',fullPage:true});
    for(const [index,segment] of segments.entries()){
      const entry=['whatsapp','instagram','website'][index%3];
      await page.locator('[data-sector="'+segment+'"]').click();
      await page.locator('[data-entry="'+entry+'"]').click();
      assert.equal(await page.locator('.tour-scene-card').count(),2,'must show customer and business perspectives');
      assert.equal(await page.locator('.tour-responsibility>div').count(),2,'automatic vs human decisions');
      if(width<=700){
        await page.locator('[data-view="customer"]').click();
        assert.equal(await page.locator('.tour-scene-grid').getAttribute('data-mobile-view'),'customer');
        await page.locator('[data-view="business"]').click();
      }

      for(let i=0;i<3;i++)await page.locator('[data-action="next"]').click();
      assert.equal(await page.locator('[data-action="next"]').isDisabled(),true,'cannot schedule without slot');
      assert.equal(await page.locator('.tour-appointment').count(),1,'honest appointment alert boundary');
      await page.locator('input[name="slot"][value="morning"]').check();
      for(let i=0;i<3;i++)await page.locator('[data-action="next"]').click();
      await page.locator('#demoSignup').waitFor();
      assert.equal(await page.locator('.summary-cols>div').count(),2,'explain what is functional vs what is not automated');

      assert.ok((await page.locator('#demoSignup').getAttribute('href')).includes('/apps/nestlocal/launch'));
      if([390,1440].includes(width)&&segment==='climate')await page.screenshot({path:OUT+'/complete-'+width+'.png',fullPage:true});
      await page.locator('[data-action="reset"]').first().click();
      await page.locator('[data-sector="'+segment+'"]').waitFor();
      count++;
    }
    if(width===390){
      for(const segment of ['solar','pools','printing','other']){
        const search=page.locator('#sectorSearch');
        await search.fill(segment==='printing'?'impressora':segment==='other'?'outro':segment);
        await page.locator('[data-sector="'+segment+'"]').click();
        assert.equal(await page.locator('.tour-place').count(),4);
        await page.locator('[data-entry="phone"]').click();
        for(let step=0;step<3;step++)await page.locator('[data-action="next"]').click();
        await page.locator('input[name="slot"][value="morning"]').check();
        for(let step=0;step<3;step++)await page.locator('[data-action="next"]').click();
        await page.locator('#demoSignup').waitFor();
        await page.locator('[data-action="reset"]').first().click();
      }
    }
    for(const lang of ['en','es','pt']){
      await page.locator('#language').selectOption(lang);
      const text=await page.locator('#demoBadge').textContent();
      assert.ok(text&&text.length>3,'fictional label is required');
    }
    assert.deepEqual(errors,[],'pageerrors at '+width);
    const after=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:window.innerWidth}));
    assert.ok(after.scroll<=after.view+1,'overflow after interactions at '+width);
    await page.close();
  }
  console.log('Experience browser E2E PASS: '+count+' completed journeys, '+widths.length+' viewport widths, PT/EN/ES');
}finally{await browser.close();}

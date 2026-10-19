// Actual same-origin OCR/PDF workers, synthetic files only. No API responses mocked.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
function pdfFixture(){
 const stream='BT /F1 22 Tf 40 750 Td (Synthetic PDF service request) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let output='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(output));output+=`${index+1} 0 obj\n${object}\nendobj\n`});
 const xref=Buffer.byteLength(output);output+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(output);
}
mkdirSync('artifacts/experience',{recursive:true});const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],outbound=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/experience.html');
  await page.evaluate(async()=>{
   const {renderMediaImport,bindMediaImport}=await import('/media-import.js');
   document.head.innerHTML='<link rel="stylesheet" href="/live.css"><link rel="stylesheet" href="/operations.css">';
   document.body.innerHTML='<main style="padding:16px;max-width:700px;margin:auto"><form id="media-test"><input name="origin" value="whatsapp_manual"><label>Mensagem<textarea name="message"></textarea></label>'+renderMediaImport('pt')+'</form></main>';
   bindMediaImport(document.querySelector('form'));document.querySelector('details').open=true;
  });
  page.on('request',request=>{const url=request.url();if(!url.startsWith('http://127.0.0.1:4173/')&&!url.startsWith('blob:')&&!url.startsWith('data:'))outbound.push(url)});
  await page.locator('[data-media-file]').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:pdfFixture()});
  await page.locator('[data-media-read]').click();await page.waitForFunction(()=>document.querySelector('[data-media-text]').value.includes('Synthetic PDF'),{},{timeout:30000});
  assert.match(await page.locator('[data-media-text]').inputValue(),/Synthetic PDF service request/);
  await page.locator('[data-media-use]').click();assert.match(await page.locator('[name=message]').inputValue(),/Synthetic PDF/);
  await page.locator('[data-media-file]').setInputFiles({name:'another.pdf',mimeType:'application/pdf',buffer:pdfFixture()});
  await page.locator('[data-media-text]').fill('Do not overwrite');await page.locator('[data-media-use]').click();assert.match(await page.locator('[name=message]').inputValue(),/Synthetic PDF/);
  await page.locator('[name=message]').fill('');
  if(width===390){
   const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=230;const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,1200,230);context.fillStyle='black';context.font='52px Arial';context.fillText('SYNTHETIC SERVICE REQUEST',40,125);return canvas.toDataURL('image/png').split(',')[1]});
   await page.locator('[data-media-file]').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('[data-media-lang]').selectOption('eng');await page.locator('[data-media-read]').click();
   await page.waitForFunction(()=>document.querySelector('[data-media-text]').value.includes('SYNTHETIC'),{},{timeout:90000});
   assert.match(await page.locator('[data-media-text]').inputValue(),/SERVICE REQUEST/);await page.screenshot({path:`artifacts/experience/media-ocr-${width}.png`,fullPage:true});
   await page.locator('[data-media-use]').click();assert.match(await page.locator('[name=message]').inputValue(),/SYNTHETIC/);await page.locator('[name=message]').fill('');
  }
  const wav=Buffer.alloc(16044);wav.write('RIFF');wav.writeUInt32LE(16036,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
  await page.locator('[data-media-file]').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:wav});assert.equal(await page.locator('audio').isVisible(),true);assert.match(await page.locator('[data-media-status]').textContent(),/Não há transcrição automática/);
  await page.locator('[data-media-text]').fill('Transcrição revisada manualmente');await page.screenshot({path:`artifacts/experience/media-review-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Media layout overflow '+width);
  await page.locator('[data-media-use]').click();assert.equal(await page.locator('[name=message]').inputValue(),'Transcrição revisada manualmente');assert.equal(await page.locator('audio').getAttribute('src'),null);
  assert.deepEqual(outbound,[],'Private files must not leave the origin');assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS real browser local PDF text, actual image OCR, manual audio review, no external requests, 320/390/1440px');
}finally{await browser.close()}

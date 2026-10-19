// Reproducible, self-hosted browser tools. Customer files never go to a CDN.
import {mkdir,copyFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=new URL('..',import.meta.url).pathname,out=resolve(root,'web/vendor/media-v1');
await mkdir(out+'/core',{recursive:true});await mkdir(out+'/languages',{recursive:true});
for(const file of ['tesseract.esm.min.js','worker.min.js','tesseract.min.js.LICENSE.txt','worker.min.js.LICENSE.txt'])await copyFile(resolve(root,'node_modules/tesseract.js/dist',file),out+'/'+file);
for(const file of await readdir(resolve(root,'node_modules/tesseract.js-core')))if(/\.wasm(?:\.js)?$/.test(file)||file==='LICENSE')await copyFile(resolve(root,'node_modules/tesseract.js-core',file),out+'/core/'+file);
for(const lang of ['por','eng','spa'])await copyFile(resolve(root,`node_modules/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`),out+`/languages/${lang}.traineddata.gz`);
for(const file of ['pdf.min.mjs','pdf.worker.min.mjs'])await copyFile(resolve(root,'node_modules/pdfjs-dist/build',file),out+'/'+file);
await copyFile(resolve(root,'node_modules/pdfjs-dist/LICENSE'),out+'/PDFJS-LICENSE');
console.log('Prepared pinned, same-origin PDF/OCR assets (no documents processed).');

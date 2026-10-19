import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaKind,mediaText,renderMediaImport} from '../web/media-import.js';
test('media rejects unsupported, empty and oversized files before reading',()=>{
 for(const name of ['x.png','x.jpeg','x.webp'])assert.equal(mediaKind({name,size:10}),'image');
 assert.equal(mediaKind({name:'x.pdf',size:10}),'pdf');assert.equal(mediaKind({name:'x.m4a',size:10}),'audio');
 for(const file of [{name:'x.zip',size:10},{name:'x.pdf',size:0},{name:'x.pdf',size:9*1024*1024},{name:'x.mp3',size:21*1024*1024}])assert.throws(()=>mediaKind(file));
});
test('review text removes control characters but never silently truncates',()=>{
 assert.equal(mediaText('Olá\r\ncliente\x00'),'Olá\ncliente');assert.throws(()=>mediaText('a'.repeat(60001)),/large/);
});
test('all locales disclose local OCR errors and manual audio transcription without upload',()=>{
 for(const lang of ['pt','en','es']){const html=renderMediaImport(lang);assert.match(html,/data-media-read/);assert.match(html,/data-media-cancel/);assert.match(html,/data-media-text/);assert.match(html,/OCR/);assert.match(html,/manual/);assert.doesNotMatch(html,/type="submit"/)}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');

test('C15/C17: premium layout loads after existing styles without deleting app structure',()=>{
 const page=read('../web/index.html'),css=read('../web/premium-system.css');
 assert.ok(page.indexOf('/operations.css')<page.indexOf('/premium-system.css'));
 assert.match(css,/--nl-ring:#7cf0bf/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/\.shell \.main/);
});
test('C15: mobile and desktop navigation explicitly announce active page',()=>{
 const live=read('../web/live.js');
 const references=[...live.matchAll(/aria-current=\\?"\$\{S\.page===id\?'page':'false'\}/g)];
 assert.ok(references.length>=2,'both navigation variants must expose aria-current');
 assert.match(live,/function mobileNav\(\)/);
});

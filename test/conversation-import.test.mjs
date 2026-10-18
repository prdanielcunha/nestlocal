import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeConversation,conversationExcerpt,renderConversationImport} from '../web/conversation-import.js';
const bytes=text=>new TextEncoder().encode(text);
test('conversation import preserves speakers, timestamps, accents and multiline content',()=>{
 const raw='\uFEFF[18/10/2026, 09:10] José: Bom dia\r\nPreciso de manutenção\r\n18/10/2026, 09:11 - Maria: Qual endereço?';
 assert.equal(decodeConversation(bytes(raw),'Conversa.TXT'),raw.slice(1).replaceAll('\r\n','\n'));
});
test('invalid encoding, binary, unsupported formats and large files are rejected without truncation',()=>{
 for(const [data,name,error] of [[bytes('abc'),'file.zip','invalid'],[new Uint8Array([0xff]),'file.txt','invalid'],[bytes('hello\0'),'file.txt','invalid'],[new Uint8Array(65537),'file.txt','large'],[bytes(' \n'),'file.txt','empty']])assert.throws(()=>decodeConversation(data,name),new RegExp(error));
});
test('long conversations require an explicit bounded selection',()=>{
 const text='a'.repeat(6001)+'Cliente: revisão';
 assert.throws(()=>conversationExcerpt(text),/limit/);
 assert.equal(conversationExcerpt(text,6001,text.length),'Cliente: revisão');
 assert.equal(conversationExcerpt('a'.repeat(6000)).length,6000);
 assert.throws(()=>conversationExcerpt('   '),/empty/);
});
test('import is review-only and localized without a nested form or implicit submission',()=>{
 for(const lang of ['pt','en','es']){
  const html=renderConversationImport(lang);
  assert.match(html,/type="button"/);assert.match(html,/aria-live="polite"/);assert.match(html,/readonly/);assert.doesNotMatch(html,/<form/);
 }
});

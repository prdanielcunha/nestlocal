import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32} from 'node:zlib';
import {zipFixture} from '../scripts/fixtures/media-archive.mjs';
import {openMediaArchive,archiveCrc32} from '../web/media-archive.js';
const open=entries=>openMediaArchive(new File([zipFixture(entries)],'synthetic.zip'));
test('ZIP supports stored, deflate and streaming descriptor members, one selected file only',async()=>{
 const archive=await open([{name:'Conversa/ação.txt',text:'Revisar antes de salvar',method:0},{name:'photo.png',text:'synthetic image'},{name:'audio.wav',text:'synthetic audio',flags:0x808},{name:'ignored.vcf'},{name:'nested.zip'}]);
 assert.equal(archive.entries.length,3);assert.equal(await (await archive.extract(0)).text(),'Revisar antes de salvar');assert.equal((await archive.extract(1)).name,'photo.png');assert.equal(await (await archive.extract(2)).text(),'synthetic audio');
 await assert.rejects(archive.extract(-1),/archiveInvalid/);await assert.rejects(archive.extract(0.5),/archiveInvalid/);
});
test('ZIP CRC matches independent Node zlib and corrupted content is rejected',async()=>{
 const data=Buffer.from('synthetic ç 123');assert.equal(archiveCrc32(data),crc32(data));const archive=await open([{name:'x.txt',crc:42}]);await assert.rejects(archive.extract(0),/archiveInvalid/);
});
test('ZIP rejects unsafe paths, symlinks, duplicate names and encrypted or exotic compression',async()=>{
 for(const name of ['../x.txt','/x.txt','C:/x.txt','a\\x.txt','a/../x.txt','a/./x.txt','a//x.txt','a\u0000.txt'])await assert.rejects(open([{name}]),/archiveInvalid/);
 for(const entry of [{name:'x.txt',attrs:0xa0000000},{name:'x.txt',flags:1},{name:'x.txt',method:99}])await assert.rejects(open([entry]),/archiveInvalid/);
 await assert.rejects(open([{name:'x.txt'},{name:'X.TXT'}]),/archiveInvalid/);
});
test('ZIP rejects oversized archives, too many members and declared expansion before inflation',async()=>{
 await assert.rejects(openMediaArchive({size:21*1024*1024,arrayBuffer(){throw Error('must not read')}}),/archiveLarge/);
 await assert.rejects(open(Array.from({length:201},(_,i)=>({name:i+'.txt'}))),/archiveInvalid/);
 await assert.rejects(open([{name:'x.bin',size:41*1024*1024}]),/archiveLarge/);
 await assert.rejects(open([{name:'x.txt',size:65537}]),/archiveEmpty/);
 await assert.rejects(open([{name:'nested.zip'}]),/archiveEmpty/);
});
test('ZIP enforces actual streamed size even when metadata lies, and abort is honored',async()=>{
 const archive=await open([{name:'x.txt',text:'x'.repeat(200000),size:10}]);await assert.rejects(archive.extract(0),/archiveLarge/);
 const valid=await open([{name:'x.txt'}]),controller=new AbortController();controller.abort();await assert.rejects(valid.extract(0,{signal:controller.signal}),{name:'AbortError'});
});
test('ZIP rejects truncation and disagreement between central and local headers',async()=>{
 const buffer=zipFixture([{name:'x.txt'}]);await assert.rejects(openMediaArchive(new File([buffer.subarray(0,-1)],'x.zip')),/archiveInvalid/);
 buffer.writeUInt32LE(123,14);await assert.rejects(openMediaArchive(new File([buffer],'x.zip')),/archiveInvalid/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {registerAudioTranscription,validateAudioFile,AUDIO_MAX_BYTES} from '../src/domain/audio-transcription.mjs';
const wav=Buffer.alloc(16044);wav.write('RIFF');wav.writeUInt32LE(16036,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
test('audio validates real signatures and bounded size before provider access',()=>{
 assert.equal(validateAudioFile({buffer:wav,mimetype:'audio/wav'}),'audio/wav');
 assert.throws(()=>validateAudioFile({buffer:Buffer.from('fake'),mimetype:'audio/wav'}),/AUDIO_FORMAT_INVALID/);
 assert.throws(()=>validateAudioFile({buffer:Buffer.alloc(AUDIO_MAX_BYTES+1),mimetype:'audio/wav'}),/AUDIO_SIZE_LIMIT/);
});
test('real multipart route gates consent, access, quotas and cross-tenant identity without saving audio',async()=>{
 const app=express(),calls=[],writes=[];let count=0,fail=false;
 const db={doc:path=>({path}),collection:path=>({doc:()=>({path:path+'/audit'})}),runTransaction:async f=>f({get:async()=>({data:()=>({count})}),set:(ref,value)=>{count=value.count;writes.push({ref,value})},create:(ref,value)=>writes.push({ref,value})})};
 registerAudioTranscription(app,{db,admin:{firestore:{FieldValue:{serverTimestamp:()=>0},Timestamp:{fromMillis:x=>x}}},authenticate:(req,res,next)=>{if(req.headers.authorization!=='Bearer synthetic')return res.sendStatus(401);req.identity={uid:'owner'};next()},authorize:(req,res,next)=>{if(req.params.orgId!=='org-a')return res.sendStatus(403);if(req.headers['x-profile']==='viewer')return res.sendStatus(403);req.access={orgId:'org-a',entitlement:{canUseAI:req.headers['x-read-only']!=='true'}};next()},rateLimit:async()=>true,resolveToken:async()=> 'synthetic',transcribe:async input=>{calls.push(input);if(fail)throw Error('provider failure');return 'Texto para revisar'}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const post=async({consent='true',org='org-a',headers={},bytes=wav}={})=>{const body=new FormData();body.append('audio',new Blob([bytes],{type:'audio/wav'}),'private-name.wav');body.append('consent',consent);body.append('locale','pt');const response=await fetch(`http://127.0.0.1:${server.address().port}/api/organizations/${org}/nestlocal/ai/audio-transcribe`,{method:'POST',headers:{authorization:'Bearer synthetic',...headers},body});return {status:response.status,body:await response.text()}};
 try{
  assert.equal((await post({consent:'false'})).status,400);assert.equal((await post({org:'org-b'})).status,403);assert.equal((await post({headers:{'x-profile':'viewer'}})).status,403);assert.equal((await post({headers:{'x-read-only':'true'}})).status,403);assert.equal((await post({bytes:Buffer.from('fake')})).status,400);assert.equal(calls.length,0);assert.equal(writes.length,0);
  const good=await post();assert.equal(good.status,200,good.body);assert.equal(JSON.parse(good.body).requiresReview,true);assert.equal(calls[0].organizationId,'org-a');assert.equal(calls[0].mimeType,'audio/wav');assert.equal(Object.hasOwn(calls[0],'fileName'),false);
  assert.doesNotMatch(JSON.stringify(writes),/private-name|audioBase64|Texto para revisar/);
  count=5;assert.equal((await post()).status,429);assert.equal(calls.length,1);
  count=0;fail=true;const failure=await post();assert.equal(failure.status,503);assert.equal(JSON.parse(failure.body).manualAvailable,true);
 }finally{await new Promise(r=>server.close(r))}
});

import multer from 'multer';
export const AUDIO_MAX_BYTES=5*1024*1024;
export function validateAudioFile(file){
 const b=file?.buffer;if(!Buffer.isBuffer(b)||!b.length||b.length>AUDIO_MAX_BYTES)throw Error('AUDIO_SIZE_LIMIT');
 const mime=file.mimetype;
 const valid=mime==='audio/wav'&&b.length>=44&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE'||
  mime==='audio/ogg'&&b.toString('ascii',0,4)==='OggS'||
  mime==='audio/mp4'&&b.length>=12&&b.toString('ascii',4,8)==='ftyp'||
  mime==='audio/webm'&&b.length>=4&&b.readUInt32BE(0)===0x1a45dfa3||
  mime==='audio/mpeg'&&b.length>=3&&(b.toString('ascii',0,3)==='ID3'||b[0]===0xff&&(b[1]&0xe0)===0xe0);
 if(!valid)throw Error('AUDIO_FORMAT_INVALID');return mime;
}
export function registerAudioTranscription(app,{db,admin,authenticate,authorize,rateLimit,resolveToken,transcribe}){
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:AUDIO_MAX_BYTES,files:1,fields:2,fieldSize:16,parts:4}}).single('audio');
 app.post('/api/organizations/:orgId/nestlocal/ai/audio-transcribe',authenticate,authorize,async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  if(req.access.entitlement?.canUseAI===false||req.access.entitlement?.readOnly===true)return res.status(403).json({error:'AI_ENTITLEMENT_REQUIRED'});
  try{
   // Validate the canonical AI identity before accepting an audio upload.
   const sessionToken=await resolveToken(req,res);
   if(!(await rateLimit(req,'audio_transcribe',req.access.orgId)))return res.status(429).json({error:'RATE_LIMITED'});
   await new Promise((resolve,reject)=>upload(req,res,error=>error?reject(error):resolve()));
   if(req.body?.consent!=='true')return res.status(400).json({error:'EXPLICIT_AI_CONSENT_REQUIRED'});
   if(Object.keys(req.body||{}).some(key=>!['consent','locale'].includes(key))||!['pt','en','es'].includes(req.body.locale))return res.status(400).json({error:'AUDIO_INPUT_INVALID'});
   const mimeType=validateAudioFile(req.file),orgId=req.access.orgId;
   const date=new Date().toISOString().slice(0,10),quota=db.doc(`organizations/${orgId}/nestlocal_ai_audio_usage/${date}`);
   const admitted=await db.runTransaction(async tx=>{
    const snapshot=await tx.get(quota),count=Number(snapshot.data()?.count)||0;if(count>=5)return false;
    const at=admin.firestore.FieldValue.serverTimestamp();
    tx.set(quota,{count:count+1,updatedAt:at,expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+4*86400000)},{merge:true});
    tx.create(db.collection(`organizations/${orgId}/nestlocal_audit`).doc(),{action:'audio_transcription.operator_consent',actorUid:req.identity.uid,at,byteCount:req.file.buffer.length,purpose:'reviewed_audio_transcription',schemaVersion:1});return true;
   });
   if(!admitted)return res.status(429).json({error:'AI_DAILY_BUDGET_REACHED',dailyLimit:5});
   const text=await transcribe({sessionToken,organizationId:orgId,locale:req.body.locale,mimeType,audioBase64:req.file.buffer.toString('base64')});
   return res.json({ok:true,text,requiresReview:true,dailyLimit:5});
  }catch(error){
   const code=String(error?.message||'');
   const status=error?.code==='LIMIT_FILE_SIZE'?413:code.startsWith('AUDIO_')||error instanceof multer.MulterError?400:code.startsWith('NESTLOCAL_NESTAI_SESSION')?401:503;
   return res.status(status).json({error:status===413?'AUDIO_SIZE_LIMIT':status===400?(code.startsWith('AUDIO_')?code:'AUDIO_INPUT_INVALID'):status===401?'AI_SESSION_REQUIRED':'AUDIO_TRANSCRIPTION_UNAVAILABLE',manualAvailable:true});
  }finally{if(req.file?.buffer){req.file.buffer.fill(0);req.file.buffer=null}}
 });
}

#!/usr/bin/env node
// Administrative GETs only. No documents, backup contents, keys or tokens are
// read into logs; this cannot create a backup, restore a database or change IAM.
import {GoogleAuth} from 'google-auth-library';
const projectId=process.env.FIREBASE_PROJECT_ID;
if(projectId!=='millionsnest'||process.env.FIRESTORE_EMULATOR_HOST)throw Error('EXPLICIT_CLOUD_PROJECT_REQUIRED');
const database=`projects/${projectId}/databases/(default)`,base='https://firestore.googleapis.com/v1/';
let stage='database_metadata';
try{
 const client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
 const get=async(path,params)=>{const response=await client.request({url:base+path,method:'GET',params,timeout:20000});return response.data};
 const metadata=await get(database);
 if(metadata.name!==database||typeof metadata.uid!=='string'||!metadata.uid)throw Error('DATABASE_IDENTITY_UNAVAILABLE');
 stage='backup_schedules';
 const schedules=await get(database+'/backupSchedules');
 stage='managed_backups';
 const backups=await get(`projects/${projectId}/locations/-/backups`,{filter:`databaseUid="${metadata.uid}"`});
 if(backups.unreachable?.length)throw Error('BACKUP_INVENTORY_INCOMPLETE');
 const rows=Array.isArray(backups.backups)?backups.backups:[];
 if(rows.some(row=>row.databaseUid!==metadata.uid))throw Error('BACKUP_SCOPE_MISMATCH');
 const ready=rows.filter(row=>row.state==='READY'&&Date.parse(row.expireTime)>Date.now()),
  latest=[...ready].sort((a,b)=>Date.parse(b.snapshotTime)-Date.parse(a.snapshotTime))[0];
 console.log(JSON.stringify({schemaVersion:1,readOnly:true,projectId,databaseId:'(default)',
  location:metadata.locationId||null,pointInTimeRecovery:metadata.pointInTimeRecoveryEnablement||'UNKNOWN',
  scheduleCount:Array.isArray(schedules.backupSchedules)?schedules.backupSchedules.length:0,
  managedBackupCount:rows.length,readyUnexpiredCount:ready.length,
  latestReadySnapshotAt:latest?.snapshotTime||null,isolatedCloudRestoreProven:false},null,2));
}catch(error){
 // Never print a GoogleAuth response/config, which may contain credentials.
 console.error('NESTLOCAL_BACKUP_INVENTORY_UNAVAILABLE',JSON.stringify({stage,
  status:Number(error?.response?.status)||null,code:error?.response?.data?.error?.status||
   (['DATABASE_IDENTITY_UNAVAILABLE','BACKUP_INVENTORY_INCOMPLETE','BACKUP_SCOPE_MISMATCH'].includes(error?.message)?error.message:'READ_FAILED')}));
 process.exitCode=2;
}

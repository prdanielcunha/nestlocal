// Runs only inside the already-authorized production deployment identity.
// No new service, subscription, scheduler, IAM grant or Secret Manager resource.
// Never print command arguments, gcloud stderr, subscriptions or private keys.
import {execFileSync} from 'node:child_process';
import webpush from 'web-push';
import {nativePushConfiguration} from '../src/domain/native-push.mjs';
if(process.env.GITHUB_REF!=='refs/heads/production')throw Error('PRODUCTION_DEPLOYMENT_ONLY');
const command=args=>execFileSync('gcloud',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:2*1024*1024});
try{
 const service=JSON.parse(command(['run','services','describe','nestlocal-api','--project','millionsnest','--region','us-central1','--format=json']));
 const rows=service.spec?.template?.spec?.containers?.[0]?.env;if(!Array.isArray(rows))throw Error('ENV_METADATA_MISSING');
 const names=['NESTLOCAL_NATIVE_PUSH_ENABLED','NESTLOCAL_NATIVE_PUSH_PUBLIC_KEY','NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY'],found=rows.filter(row=>names.includes(row.name));
 if(found.some(row=>row.valueFrom))throw Error('EXISTING_SECRET_REFERENCE_REQUIRES_EXPLICIT_MIGRATION');
 const env=Object.fromEntries(found.map(row=>[row.name,row.value]));
 if(env.NESTLOCAL_NATIVE_PUSH_ENABLED==='false'){console.log('Native push operational kill switch preserved.');process.exit(0)}
 let keys;
 if(env.NESTLOCAL_NATIVE_PUSH_PUBLIC_KEY||env.NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY){
  if(!nativePushConfiguration({...env,NESTLOCAL_NATIVE_PUSH_ENABLED:'true'}))throw Error('EXISTING_VAPID_PAIR_INVALID');
  if(env.NESTLOCAL_NATIVE_PUSH_ENABLED==='true'){console.log('Existing native push configuration preserved.');process.exit(0)}
  keys={publicKey:env.NESTLOCAL_NATIVE_PUSH_PUBLIC_KEY,privateKey:env.NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY};
 }else keys=webpush.generateVAPIDKeys();
 const values=`NESTLOCAL_NATIVE_PUSH_ENABLED=true,NESTLOCAL_NATIVE_PUSH_PUBLIC_KEY=${keys.publicKey},NESTLOCAL_NATIVE_PUSH_PRIVATE_KEY=${keys.privateKey}`;
 command(['run','services','update','nestlocal-api','--project','millionsnest','--region','us-central1','--update-env-vars',values,'--quiet']);
 console.log('Native Web Push configured on the existing API. Device opt-in and a real delivery test are still required. No scheduler provisioned.');
}catch(error){console.error('NATIVE_PUSH_CONFIGURATION_FAILED',typeof error?.status==='number'?'GCLOUD_EXIT_'+error.status:'CONFIGURATION_GUARD');process.exitCode=1}

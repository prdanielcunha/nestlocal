/**
 * Direct Google identity for the standalone NestLocal PWA.
 * Firebase identifies the person. The NestLocal server alone authorizes organizations.
 * No Firebase ID token is written to our own localStorage, URLs or logs.
 * Hub handoffs with opaque nl_ credentials remain independently supported.
 */
const APP_SDK='https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
const AUTH_SDK='https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
let contextPromise=null;
function requireTrustedConfiguration(config){
  if(!config||typeof config!=='object'||config.projectId!=='millionsnest'||
     typeof config.apiKey!=='string'||!config.apiKey.startsWith('AIza')||
     typeof config.appId!=='string'||!config.appId)throw Error('GOOGLE_CONFIG_UNAVAILABLE');
  return {...config,authDomain:'millionsnest.firebaseapp.com'};
}
async function init(){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5500);
  let config;
  try{
    const result=await fetch('/__/firebase/init.json',{signal:controller.signal,cache:'no-store',credentials:'same-origin'});
    if(!result.ok||!String(result.headers.get('content-type')||'').includes('json'))throw Error('GOOGLE_CONFIG_UNAVAILABLE');
    config=requireTrustedConfiguration(await result.json());
  }finally{clearTimeout(timeout)}
  const [{initializeApp,getApps,getApp},authSdk]=await Promise.all([
    import(APP_SDK),import(AUTH_SDK)
  ]);
  const app=getApps().length?getApp():initializeApp(config);
  const auth=authSdk.getAuth(app);
  await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
  await auth.authStateReady();
  return {auth,...authSdk};
}
const getContext=()=>contextPromise||(contextPromise=init().catch(error=>{contextPromise=null;throw error}));
export async function restoreDirectIdentity(){
  const {auth,getRedirectResult}=await getContext();
  await getRedirectResult(auth);
  return auth.currentUser?auth.currentUser.getIdToken():null;
}
export async function signInDirectGoogle(selectAccount=false){
  const {auth,GoogleAuthProvider,signInWithPopup,signInWithRedirect}=await getContext();
  const provider=new GoogleAuthProvider();
  if(selectAccount)provider.setCustomParameters({prompt:'select_account'});
  try{
    const credential=await signInWithPopup(auth,provider);
    return credential.user.getIdToken();
  }catch(error){
    if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(error?.code)){
      await signInWithRedirect(auth,provider);
      return null;
    }
    throw error;
  }
}
export async function getFreshDirectToken(){
  if(!contextPromise)return null;
  const {auth}=await contextPromise;
  return auth.currentUser?auth.currentUser.getIdToken():null;
}
export async function signOutDirectGoogle(){
  if(!contextPromise)return;
  const {auth,signOut}=await contextPromise;
  await signOut(auth);
}

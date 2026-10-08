import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../web/experience.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../web/experience.html',import.meta.url),'utf8');
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
function fixture(){
  const events=[],calls=[];
  const make=()=>({innerHTML:'',value:'pt',textContent:'',listeners:{},addEventListener(type,cb){this.listeners[type]=cb}});
  const root=make(),lang=make(),badge=make();
  const doc={documentElement:{lang:'pt'},getElementById(id){return ({experienceRoot:root,language:lang,demoBadge:badge})[id]},addEventListener(name,callback){events.push({name,callback})}};
  const context=vm.createContext({document:doc,Intl,fetch:(url,options)=>{calls.push({url,options});return Promise.resolve({ok:true})},console});
  vm.runInContext(source,context,{filename:'experience.js'});
  return {root,lang,badge,calls,context,document:doc};
}
function click(root,{action,sector}){
  root.listeners.click({target:{closest(selector){
    if(selector==='[data-sector]'&&sector)return {dataset:{sector}};
    if(selector==='[data-action]'&&action)return {dataset:{action}};
    return null;
  }}});
}
test('Experience starts without credentials, contacts, card or tenant data',()=>{
  const f=fixture();
  assert.match(f.root.innerHTML,/data-sector="climate"/);
  assert.match(f.root.innerHTML,/data-sector="electrical"/);
  assert.doesNotMatch(source.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n'),/firebase-admin|Authorization|localStorage|sessionStorage|Firestore|getAuth|creditCard|connectWhatsApp/);
  assert.ok(html.includes('id="experienceRoot"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.equal(f.calls.length,0);
});
test('All 5 synthetic sectors finish end to end, including explicit approval and schedule',()=>{
  const f=fixture();
  for(const id of ['climate','cleaning','pest','electrical','general']){
    click(f.root,{sector:id});
    assert.equal(vm.runInContext('state.step',f.context),1);
    for(let step=1;step<=3;step++)click(f.root,{action:'next'});
    assert.equal(vm.runInContext('state.step',f.context),4);
    // Cannot book without the user's own choice.
    click(f.root,{action:'next'});
    assert.equal(vm.runInContext('state.step',f.context),4);
    f.root.listeners.change({target:{name:'slot',value:'morning'}});
    for(let step=4;step<=6;step++)click(f.root,{action:'next'});
    assert.equal(vm.runInContext('state.step',f.context),7);
    assert.equal(vm.runInContext('state.completed',f.context),true);
    assert.match(f.root.innerHTML,/demoSignup/);
    click(f.root,{action:'reset'});
    assert.equal(vm.runInContext('state.step',f.context),0);
    assert.equal(vm.runInContext('state.sector',f.context),null);
  }
  assert.equal(f.calls.every(x=>x.url==='/api/public/demo/events'),true);
  assert.equal(f.calls.some(x=>x.options.credentials!=='omit'),false);
});
test('Demo UI supports PT-BR/EN/ES and keeps fiction label in every step',()=>{
  const f=fixture();
  for(const language of ['pt','en','es']){
    f.lang.listeners.change({target:{value:language}});
    assert.ok(f.root.innerHTML.includes(vm.runInContext("labels[state.language].demo",f.context)));
    click(f.root,{sector:'pest'});
    for(let i=0;i<6;i++){
      assert.ok(f.root.innerHTML.includes(vm.runInContext("labels[state.language].demo",f.context)));
      if(i===3)f.root.listeners.change({target:{name:'slot',value:'afternoon'}});
      click(f.root,{action:'next'});
    }
    click(f.root,{action:'reset'});
  }
});
test('Metrics are strictly anonymous, aggregated and not written to tenant operations',()=>{
  const start=server.indexOf("app.post('/api/public/demo/events'");
  const end=server.indexOf("app.post('/api/public/growth/diagnostic'",start);
  const api=server.slice(start,end);
  for(const field of ["new Set(['demo_started'","DEMO_PII_NOT_ALLOWED","publicGrowthRateLimit(req,'demo_event')","nestlocal_demo_metrics/",'FieldValue.increment(1)'])assert.ok(api.includes(field));
  assert.doesNotMatch(api,/nestlocal_requests|nestlocal_customers|nestlocal_growth_leads|authorization|tenant/);
});
test('Both Firebase Hosting targets expose /experience without authentication',()=>{
  const cfg=JSON.parse(readFileSync(new URL('../firebase.json',import.meta.url),'utf8'));
  for(const host of cfg.hosting){
    assert.ok(host.rewrites.some(x=>x.source==='/experience'&&x.destination==='/experience.html'));
    assert.ok(host.rewrites.findIndex(x=>x.source==='/experience')<host.rewrites.findIndex(x=>x.source==='**'));
  }
});

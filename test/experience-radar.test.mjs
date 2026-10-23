import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../web/experience.js',import.meta.url),'utf8');

function preview(){
  const nodes=new Map();
  function node(id){
    if(!nodes.has(id))nodes.set(id,{
      innerHTML:'',textContent:'',value:'',addEventListener(){},
      querySelector(){return null},querySelectorAll(){return []}
    });
    return nodes.get(id);
  }
  const document={
    documentElement:{lang:'pt-BR'},
    getElementById:node,
    addEventListener(){}
  };
  const scope={document,Intl};
  runInNewContext(source+'\n;globalThis.__demoTest={sectors,state,render,scene};',scope,{filename:'web/experience.js'});
  return {...scope.__demoTest,root:node('experienceRoot')};
}

test('Radar: selection covers different service families with a generic fallback',()=>{
  const {sectors,root}=preview();
  assert.equal(sectors.length,29);
  assert.equal(new Set(sectors.map(x=>x.id)).size,sectors.length);
  for(const key of ['climate','cleaning','pest','electrical','gates','plumbing','solar','pools','water','gardens','appliance','technical','automotive','glass','waterproof','roof','blinds','painting','fire','printing','laundry','waste','elevators','generators','industrial','beauty','clinic','other']){
    assert.ok(sectors.some(s=>s.id===key),'missing sector '+key);
  }
  for(const s of sectors){
    for(const language of ['pt','en','es']){
      assert.ok(s.name[language],s.id+' name '+language);
      assert.ok(s.service[language],s.id+' service '+language);
    }
  }
  const options=[...root.innerHTML.matchAll(/<button class="sector"[^>]+>/g)].map(x=>x[0]);
  assert.equal(options.length,29);
  assert.equal(options.filter(x=>!x.includes(' hidden')).length,6);
  assert.match(root.innerHTML,/Buscar meu serviço/);
});

test('a WhatsApp sample references the chosen job, not unrelated cleaning',()=>{
  const demo=preview();
  demo.state.sector=demo.sectors.find(s=>s.id==='electrical');
  demo.state.step=1;
  demo.state.entry='whatsapp';
  demo.render();
  assert.match(demo.root.innerHTML,/instalação de 3 luminárias/i);
  assert.doesNotMatch(demo.root.innerHTML,/preciso de uma higienização/i);
});

test('new segments use review-only language and do not invent a recurring service',()=>{
  const demo=preview();
  demo.state.sector=demo.sectors.find(s=>s.id==='solar');
  demo.state.step=2;
  demo.render();
  assert.match(demo.root.innerHTML,/não inventa valores/i);
  assert.match(demo.root.innerHTML,/Valor apenas ilustrativo/i);
  demo.state.step=6;
  demo.render();
  assert.match(demo.root.innerHTML,/Você decide se quer preparar um lembrete/i);
  assert.doesNotMatch(demo.root.innerHTML,/0 dias/i);
});

test('phone referrals and language switching preserve the selected scenario',()=>{
  const demo=preview();
  demo.state.sector=demo.sectors.find(s=>s.id==='gates');
  demo.state.step=1;
  demo.state.entry='phone';
  demo.render();
  assert.match(demo.root.innerHTML,/Por ligação ou indicação/);
  assert.match(demo.root.innerHTML,/Reparo de motor de portão/);
  demo.state.language='en';
  demo.render();
  assert.match(demo.root.innerHTML,/Gates and security/);
  assert.match(demo.root.innerHTML,/By phone or referral/);
});

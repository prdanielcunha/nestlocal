import test from 'node:test';
import assert from 'node:assert/strict';
import { growthAttackScore, growthAttackTrend, growthOutreachMessage, parseRadarRows, radarIdentityKeys, radarIsFollowUpDue, radarMatchLead, radarPhone, inferRadarChannel, segmentLearningScores } from '../src/domain/growth-radar.mjs';

const header=['Empresa','Cidade','Segmento','Site / Instagram','Telefone / contato','Canal inicial','Orçamento faz parte da venda?','WhatsApp é canal forte?','Precisa agendar serviço/equipe?','Há recorrência?','Sinais públicos de demanda?','Pequena equipe?','Dono envolvido?','Sem sistema forte aparente?','Lead Score','Classe','Dor principal','Estágio','Próxima ação','Data próximo contato','Observações','','Legenda','','','','CNPJ','Google Place ID','Fonte verificada','Data verificação'];

test('parses the canonical Prospect Radar row with enrichment and signals',()=>{
  const row=['Lavarie','Londrina','Limpeza de estofados','https://lavarie.com.br/','(43) 99694-1627','Instagram ou ligação curta',1,1,1,1,1,.75,1,1,'97,5','A','Orçamentos por foto/WhatsApp que não fecham','Pesquisado','Abrir pela pergunta sobre orçamento por foto sem resposta','17/09/2026','Site confirma orçamento por WhatsApp/fotos','','','','','','12.345.678/0001-99','place-123','Site oficial','23/09/2026'];
  const [lead]=parseRadarRows([header,row]);
  assert.equal(lead.businessName,'Lavarie');
  assert.equal(lead.phone,'43996941627');
  assert.equal(lead.leadScore,97.5);
  assert.equal(lead.verificationDate,'2026-09-23');
  assert.equal(lead.fitSignals.smallTeam,.75);
  assert.equal(lead.channel,'instagram');
  assert.equal(lead.angle,'quote_followup');
  assert.ok(lead.identityKeys.includes('place:place-123'));
  assert.ok(lead.identityKeys.includes('cnpj:12345678000199'));
  assert.equal(lead.revisionHash.length,40);
});

test('identity precedence includes stable public identifiers before name/city fallback',()=>{
  const keys=radarIdentityKeys({businessName:'ACME',city:'Londrina',phone:'(43) 99999-9999',website:'https://www.acme.com.br',cnpj:'12.345.678/0001-99',googlePlaceId:'abc'});
  assert.deepEqual(keys.slice(0,4),['place:abc','cnpj:12345678000199','phone:43999999999','domain:acme.com.br']);
  assert.ok(keys.at(-1).startsWith('namecity:'));
});

test('Attack Score separates confirmed pain from a public pain hypothesis',()=>{
  const base={status:'new',fitScore:95,painScore:0,painSignals:{},radar:{painHypothesis:'Orçamentos sem retorno',verificationDate:'2026-09-23',verifiedSource:'site',website:'https://x.test'},phone:'43999999999'};
  const hypothesis=growthAttackScore(base,{now:Date.parse('2026-09-23T18:00:00Z'),segmentScore:50});
  const confirmed=growthAttackScore({...base,painScore:90,painSignals:{quoteLoss:1},painQualifiedAt:'2026-09-23T18:00:00Z'},{now:Date.parse('2026-09-23T18:00:00Z'),segmentScore:50});
  assert.equal(hypothesis.painConfirmed,false);
  assert.equal(confirmed.painConfirmed,true);
  assert.ok(confirmed.score>hypothesis.score);
});

test('segment learning stays neutral without enough outcome evidence',()=>{
  const leads=[
    {segment:'Climatização',status:'new'},
    {segment:'Climatização',status:'customer'},
    {segment:'Limpeza',status:'new'}
  ];
  const rank={new:0,customer:6};
  const scores=segmentLearningScores(leads,l=>rank[l.status]??0);
  assert.equal(scores.length,2);
  assert.ok(scores.every(x=>x.learningScore>=0&&x.learningScore<=100));
});


test('personalized outreach stays consultative instead of asserting an unverified pain',()=>{
  const lead={businessName:'Lavarie',acquisition:{angle:'quote_followup'},radar:{recommendedAngle:'quote_followup',painHypothesis:'Orçamentos sem retorno'}};
  const message=growthOutreachMessage(lead,'pt');
  assert.ok(message.includes('Lavarie'));
  assert.ok(message.includes('?'));
  assert.ok(message.includes('vocês conseguem'));
  assert.ok(!message.includes('vocês têm'));
});

test('outreach supports pt, en and es',()=>{
  const lead={businessName:'ACME',acquisition:{angle:'customer_reactivation'}};
  assert.match(growthOutreachMessage(lead,'pt'),/clientes/);
  assert.match(growthOutreachMessage(lead,'en'),/customers/);
  assert.match(growthOutreachMessage(lead,'es'),/clientes/);
});

test('attack trend explains movement against the stored baseline',()=>{
  assert.deepEqual(growthAttackTrend({radar:{attackBaselineScore:70}},76),{delta:6,direction:'up',baseline:70});
  assert.deepEqual(growthAttackTrend({radar:{attackBaselineScore:80}},76),{delta:-4,direction:'down',baseline:80});
  assert.equal(growthAttackTrend({radar:{}},76).direction,'stable');
});

test('keeps separate phone numbers and respects the first recommended channel',()=>{
  const contacts='(43) 3333-4444 / WhatsApp +55 (43) 99999-9999';
  assert.equal(radarPhone(contacts,'whatsapp'),'43999999999');
  assert.equal(radarPhone(contacts,'phone'),'4333334444');
  assert.equal(radarPhone('1199999999943999999999'),'');
  assert.equal(inferRadarChannel('WhatsApp / telefone'),'whatsapp');
  assert.equal(inferRadarChannel('Telefone / formulário; validar WhatsApp'),'phone');
});

test('reconciles branches by company and city without treating a common CNPJ as unique',()=>{
  const first={id:'first',identityKeys:['cnpj:shared','namecity:empresa|londrina']};
  const second={id:'second',identityKeys:['cnpj:shared','namecity:empresa|cambe']};
  const byIdentity=new Map([
    ['cnpj:shared',[first,second]],
    ['namecity:empresa|londrina',[first]],
    ['namecity:empresa|cambe',[second]]
  ]);
  assert.equal(radarMatchLead(second,byIdentity,new Set()),second);
  assert.equal(radarMatchLead({identityKeys:['cnpj:shared','namecity:empresa|ibipora']},byIdentity,new Set()),null);
  assert.equal(radarMatchLead(second,byIdentity,new Set(['second','first'])),null);
  assert.ok(!radarIdentityKeys({website:'https://instagram.com/empresa'}).some(key=>key.startsWith('domain:')));
  assert.ok(!radarIdentityKeys({website:'Google Business'}).some(key=>key.startsWith('domain:')));
});

test('an initial prospect date or a future return never counts as an overdue follow-up',()=>{
  const now=Date.parse('2026-11-13T12:00:00Z'),past='2026-11-12T12:00:00Z',future='2026-11-14T12:00:00Z';
  assert.equal(radarIsFollowUpDue({status:'new',nextContactAt:past},now),false);
  assert.equal(radarIsFollowUpDue({status:'contacted',nextContactAt:past},now),true);
  assert.ok(!growthAttackScore({status:'replied',nextContactAt:future},{now}).reasons.includes('follow_up_due'));
});

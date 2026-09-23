import test from 'node:test';
import assert from 'node:assert/strict';
import { growthAttackScore, parseRadarRows, radarIdentityKeys, segmentLearningScores } from '../src/domain/growth-radar.mjs';

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

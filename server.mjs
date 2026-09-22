import express from 'express';
import crypto from 'node:crypto';
import admin from 'firebase-admin';
import multer from 'multer';
import { quote } from './src/domain/quote.mjs';
import { actionOutcomeSnapshot, updateActionMetric } from './src/domain/action-learning.mjs';
import { canCountNewExperimentSample, experimentReviewSnapshot, guidedExperimentEligibility, normalizeExperiment, updateExperimentProgress } from './src/domain/guided-experiment.mjs';

admin.initializeApp({projectId: process.env.FIREBASE_PROJECT_ID || 'millionsnest',storageBucket:process.env.FIREBASE_STORAGE_BUCKET||'millionsnest.firebasestorage.app'});
const db=admin.firestore();
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'128kb'}));

const globalRoles=new Set(['ceo','global_admin','ecosystem_owner','founder','admin']);
const activeSubscriptionStatuses=new Set(['active','trialing']);
const paymentIssueStatuses=new Set(['past_due','unpaid','incomplete','paused']);
const planLimits={essential:{users:1,requestsPerMonth:100},growth:{users:3,requestsPerMonth:500},pro:{users:10,requestsPerMonth:5000}};
const servicePlaybooks={
  climate:{services:[
    {id:'higienizacao-split',name:'Higienização de split',nameI18n:{pt:'Higienização de split',en:'Split AC cleaning',es:'Limpieza de aire split'},mode:'fixed',unitPriceCents:15000,durationMinutes:60,maxQuantity:4,equipmentTypes:['split'],requiresEquipmentType:true,requiresSafeAccess:true,intakeFields:[{id:'brandModel',labelI18n:{pt:'Marca / modelo',en:'Brand / model',es:'Marca / modelo'},type:'text',required:false,maxLength:120},{id:'capacityBtu',labelI18n:{pt:'Capacidade (BTUs)',en:'Capacity (BTU)',es:'Capacidad (BTU)'},type:'number',required:false,maxLength:8}],inclusions:'Higienização padrão do aparelho',exclusions:'Reparo, peças e acesso especial'},
    {id:'visita-tecnica',name:'Visita técnica',nameI18n:{pt:'Visita técnica',en:'Technical visit',es:'Visita técnica'},mode:'fixed',unitPriceCents:12000,durationMinutes:60,maxQuantity:1,equipmentTypes:['split','cassete','piso-teto','janela','outro'],requiresEquipmentType:true,requiresSafeAccess:true,intakeFields:[{id:'brandModel',labelI18n:{pt:'Marca / modelo',en:'Brand / model',es:'Marca / modelo'},type:'text',required:false,maxLength:120},{id:'capacityBtu',labelI18n:{pt:'Capacidade (BTUs)',en:'Capacity (BTU)',es:'Capacidad (BTU)'},type:'number',required:false,maxLength:8},{id:'issue',labelI18n:{pt:'Problema principal',en:'Main issue',es:'Problema principal'},type:'text',required:false,maxLength:180}],inclusions:'Avaliação técnica no endereço',exclusions:'Peças e execução do reparo'},
    {id:'instalacao-reparo',name:'Instalação ou reparo',nameI18n:{pt:'Instalação ou reparo',en:'Installation or repair',es:'Instalación o reparación'},mode:'review',requiresEquipmentType:true,equipmentTypes:['split','cassete','piso-teto','janela','outro'],requiresSafeAccess:true,intakeFields:[{id:'brandModel',labelI18n:{pt:'Marca / modelo',en:'Brand / model',es:'Marca / modelo'},type:'text',required:false,maxLength:120},{id:'capacityBtu',labelI18n:{pt:'Capacidade (BTUs)',en:'Capacity (BTU)',es:'Capacidad (BTU)'},type:'number',required:false,maxLength:8},{id:'issue',labelI18n:{pt:'O que precisa ser feito?',en:'What needs to be done?',es:'¿Qué se necesita hacer?'},type:'text',required:true,maxLength:180}]}
  ]},
  cleaning:{services:[
    {id:'higienizacao-estofados',name:'Higienização de estofados',nameI18n:{pt:'Higienização de estofados',en:'Upholstery cleaning',es:'Limpieza de tapicería'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'itemProfile',labelI18n:{pt:'Item / tamanho (ex.: sofá 3 lugares)',en:'Item / size (e.g. 3-seat sofa)',es:'Artículo / tamaño (ej.: sofá 3 plazas)'},type:'text',required:true,maxLength:160},{id:'material',labelI18n:{pt:'Tecido / material',en:'Fabric / material',es:'Tela / material'},type:'text',required:false,maxLength:100}]},
    {id:'impermeabilizacao',name:'Impermeabilização',nameI18n:{pt:'Impermeabilização',en:'Fabric protection',es:'Impermeabilización'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'itemProfile',labelI18n:{pt:'Item / tamanho',en:'Item / size',es:'Artículo / tamaño'},type:'text',required:true,maxLength:160},{id:'material',labelI18n:{pt:'Tecido / material',en:'Fabric / material',es:'Tela / material'},type:'text',required:false,maxLength:100}]},
    {id:'limpeza-especializada',name:'Limpeza especializada',nameI18n:{pt:'Limpeza especializada',en:'Specialized cleaning',es:'Limpieza especializada'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'itemProfile',labelI18n:{pt:'O que será limpo?',en:'What will be cleaned?',es:'¿Qué se limpiará?'},type:'text',required:true,maxLength:180},{id:'material',labelI18n:{pt:'Material / superfície',en:'Material / surface',es:'Material / superficie'},type:'text',required:false,maxLength:100}]}
  ]},
  pest:{services:[
    {id:'controle-pragas',name:'Controle de pragas',nameI18n:{pt:'Controle de pragas',en:'Pest control',es:'Control de plagas'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'pestType',labelI18n:{pt:'Tipo de praga',en:'Pest type',es:'Tipo de plaga'},type:'text',required:true,maxLength:120},{id:'propertyType',labelI18n:{pt:'Tipo de imóvel',en:'Property type',es:'Tipo de inmueble'},type:'text',required:false,maxLength:100},{id:'areaM2',labelI18n:{pt:'Área aproximada (m²)',en:'Approximate area (m²)',es:'Área aproximada (m²)'},type:'number',required:false,maxLength:8}]},
    {id:'limpeza-caixa-dagua',name:'Limpeza de caixa d’água',nameI18n:{pt:'Limpeza de caixa d’água',en:'Water tank cleaning',es:'Limpieza de tanque de agua'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'propertyType',labelI18n:{pt:'Tipo de imóvel',en:'Property type',es:'Tipo de inmueble'},type:'text',required:false,maxLength:100},{id:'capacityLiters',labelI18n:{pt:'Capacidade aproximada (litros)',en:'Approximate capacity (liters)',es:'Capacidad aproximada (litros)'},type:'number',required:false,maxLength:8}]},
    {id:'vistoria-tecnica',name:'Vistoria técnica',nameI18n:{pt:'Vistoria técnica',en:'Technical inspection',es:'Inspección técnica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'propertyType',labelI18n:{pt:'Tipo de imóvel',en:'Property type',es:'Tipo de inmueble'},type:'text',required:false,maxLength:100},{id:'issue',labelI18n:{pt:'O que precisa ser vistoriado?',en:'What needs inspection?',es:'¿Qué necesita inspección?'},type:'text',required:true,maxLength:180}]}
  ]},
  electrical:{services:[
    {id:'visita-eletrica',name:'Visita técnica elétrica',nameI18n:{pt:'Visita técnica elétrica',en:'Electrical service visit',es:'Visita técnica eléctrica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'systemArea',labelI18n:{pt:'Ponto / sistema afetado',en:'Affected point / system',es:'Punto / sistema afectado'},type:'text',required:true,maxLength:160},{id:'urgency',labelI18n:{pt:'Urgência',en:'Urgency',es:'Urgencia'},type:'text',required:false,maxLength:80}]},
    {id:'instalacao-eletrica',name:'Instalação elétrica',nameI18n:{pt:'Instalação elétrica',en:'Electrical installation',es:'Instalación eléctrica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'systemArea',labelI18n:{pt:'O que será instalado?',en:'What will be installed?',es:'¿Qué se instalará?'},type:'text',required:true,maxLength:180}]},
    {id:'reparo-eletrico',name:'Reparo elétrico',nameI18n:{pt:'Reparo elétrico',en:'Electrical repair',es:'Reparación eléctrica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'systemArea',labelI18n:{pt:'Problema / ponto afetado',en:'Issue / affected point',es:'Problema / punto afectado'},type:'text',required:true,maxLength:180},{id:'urgency',labelI18n:{pt:'Urgência',en:'Urgency',es:'Urgencia'},type:'text',required:false,maxLength:80}]},
    {id:'quadro-disjuntores',name:'Quadro e disjuntores',nameI18n:{pt:'Quadro e disjuntores',en:'Electrical panel and breakers',es:'Tablero y disyuntores'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'O que está acontecendo?',en:'What is happening?',es:'¿Qué está pasando?'},type:'text',required:true,maxLength:180}]},
    {id:'chuveiro-tomadas',name:'Chuveiro, tomadas e pontos',nameI18n:{pt:'Chuveiro, tomadas e pontos',en:'Shower, outlets and points',es:'Ducha, tomas y puntos'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'Serviço necessário',en:'Required service',es:'Servicio necesario'},type:'text',required:true,maxLength:180}]},
    {id:'automacao-eletrica',name:'Automação elétrica',nameI18n:{pt:'Automação elétrica',en:'Electrical automation',es:'Automatización eléctrica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'O que deseja automatizar?',en:'What should be automated?',es:'¿Qué desea automatizar?'},type:'text',required:true,maxLength:180}]}
  ]},
  repairs:{services:[
    {id:'pequenos-reparos',name:'Pequenos reparos',nameI18n:{pt:'Pequenos reparos',en:'Small repairs',es:'Pequeñas reparaciones'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'repairCategory',labelI18n:{pt:'Tipo de reparo',en:'Repair type',es:'Tipo de reparación'},type:'text',required:true,maxLength:140},{id:'urgency',labelI18n:{pt:'Urgência',en:'Urgency',es:'Urgencia'},type:'text',required:false,maxLength:80}]},
    {id:'eletrica',name:'Elétrica',nameI18n:{pt:'Elétrica',en:'Electrical',es:'Electricidad'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'Problema elétrico',en:'Electrical issue',es:'Problema eléctrico'},type:'text',required:true,maxLength:180}]},
    {id:'hidraulica',name:'Hidráulica',nameI18n:{pt:'Hidráulica',en:'Plumbing',es:'Plomería'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'Problema hidráulico',en:'Plumbing issue',es:'Problema de plomería'},type:'text',required:true,maxLength:180}]},
    {id:'montagem-instalacao',name:'Montagem e instalação',nameI18n:{pt:'Montagem e instalação',en:'Assembly and installation',es:'Montaje e instalación'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'O que será montado / instalado?',en:'What will be assembled / installed?',es:'¿Qué se montará / instalará?'},type:'text',required:true,maxLength:180}]},
    {id:'visita-tecnica',name:'Visita técnica',nameI18n:{pt:'Visita técnica',en:'Technical visit',es:'Visita técnica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'Descreva a necessidade',en:'Describe the need',es:'Describe la necesidad'},type:'text',required:true,maxLength:180}]}
  ]},
  security:{services:[
    {id:'conserto-portao',name:'Conserto de portão',nameI18n:{pt:'Conserto de portão',en:'Gate repair',es:'Reparación de portón'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'brandModel',labelI18n:{pt:'Marca / modelo do motor',en:'Motor brand / model',es:'Marca / modelo del motor'},type:'text',required:false,maxLength:120},{id:'issue',labelI18n:{pt:'Defeito percebido',en:'Observed issue',es:'Falla observada'},type:'text',required:true,maxLength:180}]},
    {id:'motor-portao',name:'Motor de portão',nameI18n:{pt:'Motor de portão',en:'Gate motor',es:'Motor de portón'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'brandModel',labelI18n:{pt:'Marca / modelo atual',en:'Current brand / model',es:'Marca / modelo actual'},type:'text',required:false,maxLength:120},{id:'issue',labelI18n:{pt:'O que precisa ser feito?',en:'What needs to be done?',es:'¿Qué se necesita hacer?'},type:'text',required:true,maxLength:180}]},
    {id:'interfone',name:'Interfone',nameI18n:{pt:'Interfone',en:'Intercom',es:'Interfono'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'brandModel',labelI18n:{pt:'Marca / modelo',en:'Brand / model',es:'Marca / modelo'},type:'text',required:false,maxLength:120},{id:'issue',labelI18n:{pt:'Defeito / necessidade',en:'Issue / need',es:'Falla / necesidad'},type:'text',required:true,maxLength:180}]},
    {id:'roldanas',name:'Roldanas e mecânica',nameI18n:{pt:'Roldanas e mecânica',en:'Rollers and mechanics',es:'Rodillos y mecánica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'Defeito percebido',en:'Observed issue',es:'Falla observada'},type:'text',required:true,maxLength:180}]},
    {id:'instalacao-portao',name:'Instalação / automatização',nameI18n:{pt:'Instalação / automatização',en:'Installation / automation',es:'Instalación / automatización'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'gateProfile',labelI18n:{pt:'Tipo / tamanho do portão',en:'Gate type / size',es:'Tipo / tamaño del portón'},type:'text',required:true,maxLength:160}]},
    {id:'seguranca-eletronica',name:'Segurança eletrônica',nameI18n:{pt:'Segurança eletrônica',en:'Electronic security',es:'Seguridad electrónica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'Equipamento / necessidade',en:'Equipment / need',es:'Equipo / necesidad'},type:'text',required:true,maxLength:180}]}
  ]},
  general:{services:[
    {id:'solicitacao-orcamento',name:'Solicitação de orçamento',nameI18n:{pt:'Solicitação de orçamento',en:'Quote request',es:'Solicitud de presupuesto'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'O que você precisa?',en:'What do you need?',es:'¿Qué necesitas?'},type:'text',required:true,maxLength:180}]},
    {id:'visita-tecnica',name:'Visita técnica',nameI18n:{pt:'Visita técnica',en:'Technical visit',es:'Visita técnica'},mode:'review',requiresEquipmentType:false,requiresSafeAccess:false,intakeFields:[{id:'issue',labelI18n:{pt:'O que precisa ser avaliado?',en:'What needs evaluation?',es:'¿Qué necesita evaluación?'},type:'text',required:true,maxLength:180}]}
  ]}
};
const clean=v=>typeof v==='string'?v.trim():'';
const slug=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
const phone=v=>clean(v).replace(/\D/g,'').slice(0,15);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const token=()=>crypto.randomBytes(24).toString('base64url');
const safeId=v=>{const s=clean(v);return /^[A-Za-z0-9_-]{1,128}$/.test(s)?s:''};
const intakeFieldTypes=new Set(['text','number']);
function normalizeIntakeValues(fields=[],raw={}){
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},result={};
  for(const field of (Array.isArray(fields)?fields:[]).slice(0,12)){
    const id=safeId(field?.id),type=clean(field?.type||'text');if(!id||!intakeFieldTypes.has(type))continue;
    const maxLength=Math.min(300,Math.max(1,Number.isInteger(Number(field?.maxLength))?Number(field.maxLength):160)),value=clean(source[id]).slice(0,maxLength);
    if(field?.required===true&&!value)throw new TypeError('INVALID_INTAKE');
    if(value&&type==='number'&&!Number.isFinite(Number(value.replace(',','.'))))throw new TypeError('INVALID_INTAKE');
    if(value)result[id]=value;
  }
  return result;
}
const validImage=file=>(file.mimetype==='image/jpeg'&&file.buffer[0]===0xff&&file.buffer[1]===0xd8&&file.buffer[2]===0xff)||(file.mimetype==='image/png'&&file.buffer.subarray(0,4).equals(Buffer.from([0x89,0x50,0x4e,0x47])))||(file.mimetype==='image/webp'&&file.buffer.subarray(0,4).toString()==='RIFF'&&file.buffer.subarray(8,12).toString()==='WEBP');
const inactive=d=>d?.enabled===false||['inactive','suspended','disabled','removed','revoked','archived'].includes(d?.status);
const canManageNestLocal=access=>globalRoles.has(access?.systemRole)||['owner','admin'].includes(clean(access?.member?.role||access?.member?.organizationRole).toLowerCase());
const sendError=(res,status,code)=>res.status(status).json({error:code});
const trackingTokenValid=(record,value)=>{const digest=hash(value);return record?.trackingTokenHash===digest||(Array.isArray(record?.trackingTokenHashes)&&record.trackingTokenHashes.includes(digest))};
function catalogReadiness(settings,services=[]){
  const issues=[];
  if(!settings){issues.push('SETUP_REQUIRED');return{ready:false,issues}}
  if(clean(settings.businessName).length<2)issues.push('BUSINESS_NAME_REQUIRED');
  if(slug(settings.slug).length<3)issues.push('SLUG_REQUIRED');
  const coverage=Array.isArray(settings.coverageCodes)?settings.coverageCodes.map(slug).filter(Boolean):[];
  if(!coverage.length)issues.push('COVERAGE_REQUIRED');
  if(!validTimeZone(clean(settings.timezone||'America/Sao_Paulo')))issues.push('TIMEZONE_INVALID');
  const list=Array.isArray(services)?services:[];
  if(!list.length)issues.push('SERVICE_REQUIRED');
  for(const service of list){
    if(!service||!safeId(service.id)||!clean(service.name)||!['fixed','review'].includes(service.mode)){issues.push('SERVICE_INVALID');break}
    if(service.mode==='fixed'){
      try{
        quote({catalog:{organizationId:'readiness',version:'validation',status:'published',currency:'BRL',validForMinutes:Number(settings.validForMinutes||30),coverageCodes:coverage.length?coverage:['validation'],services:[service]},request:{serviceId:service.id,quantity:1,coverageCode:coverage[0]||'validation',equipmentType:service.requiresEquipmentType===false?undefined:service.equipmentTypes?.[0],safeAccess:service.requiresSafeAccess===false?undefined:true},now:new Date()});
      }catch{issues.push('SERVICE_INVALID');break}
    }
  }
  return{ready:issues.length===0,issues:[...new Set(issues)]};
}

function nestLocalEntitlement(orgData={},subscriptionData={}){
  const appSubscription=subscriptionData?.apps?.nestlocal||null,orgApp=orgData?.apps?.nestlocal||null;
  const subscriptionStatus=clean(appSubscription?.status).toLowerCase(),organizationAppStatus=clean(orgApp?.status).toLowerCase();
  const planValue=clean(appSubscription?.plan||orgApp?.plan).toLowerCase(),plan=['essential','growth','pro'].includes(planValue)?planValue:'essential';
  let reason='';
  if(!appSubscription)reason='SUBSCRIPTION_NOT_FOUND';
  else if(paymentIssueStatuses.has(subscriptionStatus))reason='SUBSCRIPTION_PAYMENT_REQUIRED';
  else if(!activeSubscriptionStatuses.has(subscriptionStatus))reason='SUBSCRIPTION_INACTIVE';
  else if(!activeSubscriptionStatuses.has(organizationAppStatus))reason='ENTITLEMENT_INACTIVE';
  return {active:!reason,reason,subscriptionStatus,organizationAppStatus,plan,limits:planLimits[plan]};
}
function resolveNestLocalAccess({userDoc,orgDoc,memberDoc,subscriptionDoc}={}){
  if(!userDoc?.exists)return{accessible:false,reason:'USER_NOT_FOUND'};
  const userData=userDoc.data()||{};if(inactive(userData))return{accessible:false,reason:'USER_INACTIVE'};
  if(!orgDoc?.exists)return{accessible:false,reason:'ORGANIZATION_NOT_FOUND'};
  const orgData=orgDoc.data()||{};if(inactive(orgData))return{accessible:false,reason:'ORGANIZATION_INACTIVE'};
  const systemRole=clean(userData.systemRole).toLowerCase(),administrative=globalRoles.has(systemRole),entitlement=nestLocalEntitlement(orgData,subscriptionDoc?.data?.()||{});
  if(administrative)return{accessible:true,reason:'',systemRole,administrative:true,organizationRole:'',member:null,entitlement:{...entitlement,active:true,reason:'',plan:'pro',limits:planLimits.pro,status:'administrative'}};
  if(!memberDoc?.exists)return{accessible:false,reason:'MEMBERSHIP_NOT_FOUND',systemRole,administrative:false,entitlement};
  const member=memberDoc.data()||{};if(inactive(member))return{accessible:false,reason:'MEMBERSHIP_INACTIVE',systemRole,administrative:false,member,entitlement};
  const organizationRole=clean(member.role||member.organizationRole||'member').toLowerCase(),owner=organizationRole==='owner',memberAccess=member.appAccess?.nestlocal;
  if(!entitlement.active)return{accessible:false,reason:entitlement.reason,systemRole,administrative:false,organizationRole,member,entitlement};
  if(!owner&&memberAccess?.enabled!==true)return{accessible:false,reason:'MEMBER_APP_ACCESS_DISABLED',systemRole,administrative:false,organizationRole,member,entitlement};
  const canManage=owner||member.permissions?.['nestlocal.manage']===true||memberAccess?.permissions?.includes?.('nestlocal.manage');
  if(!canManage)return{accessible:false,reason:'PERMISSION_DENIED',systemRole,administrative:false,organizationRole,member,entitlement};
  return{accessible:true,reason:'',systemRole,administrative:false,organizationRole,member,entitlement};
}

const upload=multer({storage:multer.memoryStorage(),limits:{files:5,fileSize:5*1024*1024},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
const evidenceUpload=multer({storage:multer.memoryStorage(),limits:{files:8,fileSize:8*1024*1024},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
const reviewTokenValid=(record,value)=>{const digest=hash(value);return record?.reviewTokenHash===digest||(Array.isArray(record?.reviewTokenHashes)&&record.reviewTokenHashes.includes(digest))};

async function authenticate(req,res,next){
  const value=req.headers.authorization||'';
  if(!value.startsWith('Bearer ')) return sendError(res,401,'AUTH_REQUIRED');
  try{req.identity=await admin.auth().verifyIdToken(value.slice(7));next()}catch{return sendError(res,401,'INVALID_TOKEN')}
}

async function authorize(req,res,next){
  const orgId=clean(req.params.orgId);if(!orgId)return sendError(res,400,'ORGANIZATION_REQUIRED');
  try{
    const [user,org,member,subscription]=await Promise.all([
      db.doc(`users/${req.identity.uid}`).get(),
      db.doc(`organizations/${orgId}`).get(),
      db.doc(`organizations/${orgId}/members/${req.identity.uid}`).get(),
      db.doc(`subscriptions/${orgId}`).get()
    ]);
    const access=resolveNestLocalAccess({userDoc:user,orgDoc:org,memberDoc:member,subscriptionDoc:subscription});
    if(!access.accessible){
      const status=['SUBSCRIPTION_NOT_FOUND','SUBSCRIPTION_INACTIVE','ENTITLEMENT_INACTIVE'].includes(access.reason)?402:access.reason==='SUBSCRIPTION_PAYMENT_REQUIRED'?402:403;
      return sendError(res,status,access.reason||'ACCESS_DENIED');
    }
    req.access={orgId,org:{id:org.id,...org.data()},systemRole:access.systemRole,member:access.member||null,entitlement:{status:access.administrative?'administrative':access.entitlement.subscriptionStatus,plan:access.administrative?'pro':access.entitlement.plan,limits:access.administrative?planLimits.pro:access.entitlement.limits,administrative:access.administrative}};
    next();
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
}

async function getPublicEntitlement(orgId){
  const [subscription,org]=await Promise.all([db.doc(`subscriptions/${orgId}`).get(),db.doc(`organizations/${orgId}`).get()]);
  if(!org.exists||inactive(org.data()))return{active:false,status:'inactive',plan:'essential',limits:planLimits.essential};
  const entitlement=nestLocalEntitlement(org.data()||{},subscription.exists?subscription.data()||{}:{});
  return{active:entitlement.active,status:entitlement.reason||entitlement.subscriptionStatus,plan:entitlement.plan,limits:entitlement.limits};
}

async function resolveOrganization(storeSlug){
  const s=slug(storeSlug); if(!s) return null;
  const directory=await db.doc(`nestlocal_public_stores/${s}`).get();
  const orgId=safeId(directory.data()?.organizationId);if(!directory.exists||!orgId)return null;
  return {id:orgId};
}

async function rateLimit(req,key,orgId){
  const window=Math.floor(Date.now()/60000); const ip=clean(req.headers['x-forwarded-for']||req.ip).split(',')[0];
  const ref=db.doc(`organizations/${orgId}/nestlocal_rate_limits/${hash(`${key}:${ip}:${window}`).slice(0,32)}`);
  return db.runTransaction(async tx=>{const snap=await tx.get(ref);const count=(snap.data()?.count||0)+1;if(count>12)return false;tx.set(ref,{count,expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+120000)},{merge:true});return true});
}

const growthStatuses=new Set(['new','contacted','replied','diagnostic','demo','trial','customer','follow_up','no_fit']);
const requestStatuses=new Set(['new','reviewing','quoted','accepted','scheduled','in_progress','completed','declined','cancelled']);
const requestTransitions={
  new:new Set(['reviewing','cancelled']),
  reviewing:new Set(['cancelled']),
  quoted:new Set(['accepted','declined','cancelled']),
  accepted:new Set(['scheduled','cancelled']),
  scheduled:new Set(['in_progress','cancelled']),
  in_progress:new Set(['completed']),
  completed:new Set(),
  declined:new Set(),
  cancelled:new Set()
};
const paymentStatuses=new Set(['pending','partial','paid','cancelled']);
const messageCategories=new Set(['service_update','maintenance_reminder']);
const assistanceActionTypes=new Set(['quote_followup','customer_reactivation']);
const assistanceChannels=new Set(['whatsapp','phone','email','other']);
const assistanceOutcomes=new Set(['unresolved','no_response','asked_later','positive_signal','not_interested']);
const serviceWindows=new Set(['morning','afternoon','evening','flexible']);
const capacityWindows=new Set(['morning','afternoon','evening']);
const scheduleSlotStatuses=new Set(['scheduled','in_progress']);
const growthStageRank={new:0,contacted:1,replied:2,diagnostic:3,demo:4,trial:5,customer:6};
const growthChannels=new Set(['xray','instagram','phone','email','referral','partner','organic','other']);
const growthAngles=new Set(['revenue_visibility','quote_followup','customer_reactivation','empty_schedule','whatsapp_chaos','referral','other']);
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const signal=v=>clamp(v,0,1);
const timestampIso=v=>v?.toDate?.().toISOString?.()||null;
function validTimeZone(value){
  try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format(new Date());return true}catch{return false}
}
function localIsoDate(timeZone,date=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function addIsoDays(isoDate,days){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(isoDate));if(!match)return '';
  return new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])+Number(days),12)).toISOString().slice(0,10);
}
const timestampMillis=v=>v?.toMillis?.()||v?.toDate?.().getTime?.()||0;
const freshAssistance=(value,maxDays)=>value&&timestampMillis(value.at)>0&&(Date.now()-timestampMillis(value.at))<=maxDays*86400000;
function growthFitScore(signals={}){
  const weights={quote:20,whatsapp:20,scheduling:15,recurrence:15,demand:10,smallTeam:10,ownerInvolved:5,noStrongSystem:5};
  return Math.round(Object.entries(weights).reduce((total,[key,weight])=>total+signal(signals[key])*weight,0)*100)/100;
}
function growthPainScore(signals={}){
  const weights={quoteLoss:25,noFollowUp:20,noReactivation:15,agendaChaos:15,volume:10,ownerFeelsPain:5,urgency:10};
  return Math.round(Object.entries(weights).reduce((total,[key,weight])=>total+signal(signals[key])*weight,0)*100)/100;
}
function growthAcquisition(body={},fallback={}){
  const channel=clean(body.channel||fallback.channel||'other').toLowerCase();
  const angle=clean(body.angle||fallback.angle||'other').toLowerCase();
  return {
    channel:growthChannels.has(channel)?channel:'other',
    angle:growthAngles.has(angle)?angle:'other',
    campaign:clean(body.campaign||fallback.campaign).slice(0,80)
  };
}
const scheduleSlotId=({date,window,assignedTo})=>hash(`${clean(date)}|${clean(window)}|${clean(assignedTo)}`).slice(0,32);
const growthKey=value=>clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const growthFingerprint=({businessName,city})=>hash(`${growthKey(businessName)}|${growthKey(city)}`).slice(0,32);
async function existingGrowthFingerprints(fingerprints=[]){
  const unique=[...new Set(fingerprints.filter(Boolean))],found=new Set();
  for(let i=0;i<unique.length;i+=30){
    const part=unique.slice(i,i+30);if(!part.length)continue;
    const snap=await db.collection('nestlocal_growth_leads').where('fingerprint','in',part).get();
    snap.docs.forEach(doc=>{const fp=clean(doc.data()?.fingerprint);if(fp)found.add(fp)});
  }
  return found;
}
function growthLeadStage(lead={}){
  const stored=Number(lead.highestStage);
  if(Number.isFinite(stored)&&stored>=0)return stored;
  if(growthStageRank[lead.status]!==undefined)return growthStageRank[lead.status];
  const history=Array.isArray(lead.stageHistory)?lead.stageHistory:[];
  return history.reduce((max,event)=>Math.max(max,growthStageRank[event?.status]??0),0);
}
function messagingEligibility({category,request,customer,settings}){
  if(!messageCategories.has(category))return {eligible:false,reason:'INVALID_CATEGORY'};
  const messaging=settings?.messaging||{},templates=messaging.templates||{};
  if(category==='service_update'){
    if(request?.messagingConsent?.serviceUpdates?.accepted!==true)return {eligible:false,reason:'WHATSAPP_OPT_IN_REQUIRED'};
    if(!clean(templates.serviceUpdate))return {eligible:false,reason:'MESSAGE_TEMPLATE_REQUIRED'};
    if(messaging.connected!==true)return {eligible:false,reason:'MESSAGING_PROVIDER_NOT_CONNECTED',templateName:clean(templates.serviceUpdate)};
    return {eligible:true,templateName:clean(templates.serviceUpdate)};
  }
  if(customer?.messaging?.consents?.maintenanceReminders?.accepted!==true)return {eligible:false,reason:'WHATSAPP_OPT_IN_REQUIRED'};
  if(!clean(templates.maintenanceReminder))return {eligible:false,reason:'MESSAGE_TEMPLATE_REQUIRED'};
  if(messaging.connected!==true)return {eligible:false,reason:'MESSAGING_PROVIDER_NOT_CONNECTED',templateName:clean(templates.maintenanceReminder)};
  return {eligible:true,templateName:clean(templates.maintenanceReminder)};
}

function reminderReadiness(customers=[],settings={},options={}){
  const timeZone=validTimeZone(clean(settings?.timezone))?clean(settings.timezone):'UTC',today=localIsoDate(timeZone),due=customers.filter(c=>clean(c.nextServiceDate)&&clean(c.nextServiceDate)<=today),templateConfigured=Boolean(clean(settings?.messaging?.templates?.maintenanceReminder)),providerConnected=settings?.messaging?.connected===true;
  const items=due.map(customer=>{const eligibility=messagingEligibility({category:'maintenance_reminder',customer,settings});return{customerId:clean(customer.id),name:clean(customer.name),nextServiceDate:clean(customer.nextServiceDate),eligible:eligibility.eligible===true,reason:eligibility.eligible?'':eligibility.reason,templateName:clean(eligibility.templateName)}}),reasonCounts={};
  for(const item of items)if(item.reason)reasonCounts[item.reason]=(reasonCounts[item.reason]||0)+1;
  return {today,timeZone,dueCount:items.length,dueCountTruncated:options.truncated===true,consentedCount:due.filter(c=>c.messaging?.consents?.maintenanceReminders?.accepted===true).length,readyCount:items.filter(x=>x.eligible).length,blockedCount:items.filter(x=>!x.eligible).length,templateConfigured,providerConnected,reasonCounts,items};
}

function growthFunnelMetrics(leads=[]){
  const stages=['new','contacted','replied','diagnostic','demo','trial','customer'];
  const funnel={};
  for(const [index,stage] of stages.entries())funnel[stage]=leads.filter(lead=>growthLeadStage(lead)>=index).length;
  const rate=(a,b)=>a>0?Math.round((b/a)*1000)/10:0;
  const conversions={
    contactRate:rate(funnel.new,funnel.contacted),
    replyRate:rate(funnel.contacted,funnel.replied),
    diagnosticRate:rate(funnel.replied,funnel.diagnostic),
    demoRate:rate(funnel.diagnostic,funnel.demo),
    trialRate:rate(funnel.demo,funnel.trial),
    customerRate:rate(funnel.trial,funnel.customer),
    leadToCustomer:rate(funnel.new,funnel.customer)
  };
  const groupBy=key=>Object.values(leads.reduce((acc,lead)=>{
    const value=clean(key(lead))||'unknown';
    if(!acc[value])acc[value]={key:value,leads:0,customers:0};
    acc[value].leads++;
    if(growthLeadStage(lead)>=growthStageRank.customer)acc[value].customers++;
    return acc;
  },{})).map(group=>({...group,conversionRate:rate(group.leads,group.customers)})).sort((a,b)=>b.leads-a.leads||b.customers-a.customers);
  return {total:leads.length,funnel,conversions,byChannel:groupBy(lead=>lead.acquisition?.channel||lead.source),byAngle:groupBy(lead=>lead.acquisition?.angle),bySegment:groupBy(lead=>lead.segment)};
}
function diagnosticProjection(body={}){
  const monthlyQuotes=clamp(body.monthlyQuotes,0,5000);
  const averageTicket=clamp(body.averageTicket,0,1000000);
  const followUpRate=clamp(body.followUpRate,0,100);
  const whatsappShare=clamp(body.whatsappShare,0,100);
  const teamSize=clamp(body.teamSize,1,200);
  const needsScheduling=body.needsScheduling===true;
  const repeatable=body.repeatable===true;
  const manualOperation=body.manualOperation===true;
  if(!Number.isFinite(Number(body.monthlyQuotes))||monthlyQuotes<1||!Number.isFinite(Number(body.averageTicket))||averageTicket<=0)return null;
  const unfollowedQuotes=Math.round(monthlyQuotes*(1-followUpRate/100)*10)/10;
  const recoveryAssumption=0.15;
  const monthlyOpportunityCents=Math.round(unfollowedQuotes*recoveryAssumption*averageTicket*100);
  const fitSignals={
    quote:monthlyQuotes>=20?1:monthlyQuotes>=5?.5:0,
    whatsapp:whatsappShare>=70?1:whatsappShare>=30?.5:0,
    scheduling:needsScheduling?1:0,
    recurrence:repeatable?1:0,
    demand:monthlyQuotes>=30?1:monthlyQuotes>=10?.5:0,
    smallTeam:teamSize>=2&&teamSize<=10?1:teamSize<=20?.5:0,
    ownerInvolved:manualOperation?1:.5,
    noStrongSystem:manualOperation?1:.5
  };
  const painSignals={
    quoteLoss:followUpRate<=50?1:followUpRate<=80?.5:0,
    noFollowUp:followUpRate<=50?1:followUpRate<=80?.5:0,
    noReactivation:repeatable?(manualOperation?1:.5):0,
    agendaChaos:needsScheduling?(manualOperation?1:.5):0,
    volume:monthlyQuotes>=20?1:monthlyQuotes>=8?.5:0,
    ownerFeelsPain:manualOperation?1:.5,
    urgency:monthlyOpportunityCents>=100000?1:monthlyOpportunityCents>=30000?.5:0
  };
  return {monthlyQuotes,averageTicketCents:Math.round(averageTicket*100),followUpRate,whatsappShare,teamSize,needsScheduling,repeatable,manualOperation,unfollowedQuotes,recoveryAssumption,monthlyOpportunityCents,fitSignals,painSignals,fitScore:growthFitScore(fitSignals),painScore:growthPainScore(painSignals)};
}
async function publicGrowthRateLimit(req,key){
  const window=Math.floor(Date.now()/60000),ip=clean(req.headers['x-forwarded-for']||req.ip).split(',')[0];
  const ref=db.doc(`nestlocal_public_rate_limits/${hash(`${key}:${ip}:${window}`).slice(0,32)}`);
  return db.runTransaction(async tx=>{const snap=await tx.get(ref),count=(snap.data()?.count||0)+1;if(count>8)return false;tx.set(ref,{count,expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+120000)},{merge:true});return true});
}
async function requireGrowthAdmin(req,res,next){
  try{const user=await db.doc(`users/${req.identity.uid}`).get();if(!user.exists||inactive(user.data())||!globalRoles.has(user.data()?.systemRole))return sendError(res,403,'ACCESS_DENIED');req.growthAdmin={uid:req.identity.uid,systemRole:user.data()?.systemRole};next()}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
}

app.get('/health',(_req,res)=>res.json({ok:true,service:'nestlocal-api'}));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'nestlocal-api'}));


app.post('/api/public/growth/diagnostic',async(req,res)=>{
  try{
    if(!(await publicGrowthRateLimit(req,'diagnostic')))return sendError(res,429,'RATE_LIMITED');
    const b=req.body||{},businessName=clean(b.businessName).slice(0,120),contactName=clean(b.contactName).slice(0,100),contactPhone=phone(b.phone),city=clean(b.city).slice(0,100),segment=clean(b.segment).slice(0,100);
    const projection=diagnosticProjection(b);
    if(!projection||businessName.length<2||contactName.length<2||contactPhone.length<10||city.length<2||segment.length<2||b.acceptedTerms!==true)return sendError(res,400,'INVALID_DIAGNOSTIC');
    const ref=db.collection('nestlocal_growth_leads').doc();
    await ref.create({
      source:'revenue_xray',fingerprint:growthFingerprint({businessName,city,phone:contactPhone}),status:'new',highestStage:0,stageHistory:[{status:'new',at:admin.firestore.Timestamp.now(),by:'public_xray'}],acquisition:growthAcquisition({channel:'xray',angle:'revenue_visibility',campaign:'revenue_xray'}),businessName,contactName,phone:contactPhone,city,segment,
      metrics:{monthlyQuotes:projection.monthlyQuotes,averageTicketCents:projection.averageTicketCents,followUpRate:projection.followUpRate,whatsappShare:projection.whatsappShare,teamSize:projection.teamSize,needsScheduling:projection.needsScheduling,repeatable:projection.repeatable,manualOperation:projection.manualOperation},
      fitSignals:projection.fitSignals,painSignals:projection.painSignals,fitScore:projection.fitScore,painScore:projection.painScore,
      opportunity:{unfollowedQuotes:projection.unfollowedQuotes,recoveryAssumption:projection.recoveryAssumption,monthlyOpportunityCents:projection.monthlyOpportunityCents},
      nextAction:'Fazer diagnóstico comercial e validar os dados informados',nextContactAt:admin.firestore.FieldValue.serverTimestamp(),
      consent:{accepted:true,version:'revenue-xray-2026-09',acceptedAt:admin.firestore.FieldValue.serverTimestamp()},
      createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(201).json({leadId:ref.id,projection:{fitScore:projection.fitScore,painScore:projection.painScore,unfollowedQuotes:projection.unfollowedQuotes,monthlyOpportunityCents:projection.monthlyOpportunityCents,recoveryAssumption:projection.recoveryAssumption,methodology:'Estimativa indicativa: orçamentos sem acompanhamento × 15% de hipótese de recuperação × ticket médio informado. Não é previsão de receita.'}});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.use('/api/admin/nestlocal/growth',authenticate,requireGrowthAdmin);

app.get('/api/admin/nestlocal/growth/leads',async(_req,res)=>{
  try{
    const snap=await db.collection('nestlocal_growth_leads').orderBy('createdAt','desc').limit(100).get();
    const raw=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
    const leads=raw.map(d=>({...d,createdAt:timestampIso(d.createdAt),updatedAt:timestampIso(d.updatedAt),nextContactAt:timestampIso(d.nextContactAt),stageHistory:Array.isArray(d.stageHistory)?d.stageHistory.map(event=>({...event,at:timestampIso(event.at)})):[],consent:undefined}));
    res.json({leads,metrics:growthFunnelMetrics(raw)});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/admin/nestlocal/growth/leads',async(req,res)=>{
  try{
    const b=req.body||{},businessName=clean(b.businessName).slice(0,120),contactName=clean(b.contactName).slice(0,100),contactPhone=phone(b.phone),city=clean(b.city).slice(0,100),segment=clean(b.segment).slice(0,100);
    const rawSignals=b.signals&&typeof b.signals==='object'?b.signals:{};
    const fitSignals={quote:signal(rawSignals.quote),whatsapp:signal(rawSignals.whatsapp),scheduling:signal(rawSignals.scheduling),recurrence:signal(rawSignals.recurrence),demand:signal(rawSignals.demand),smallTeam:signal(rawSignals.smallTeam),ownerInvolved:signal(rawSignals.ownerInvolved),noStrongSystem:signal(rawSignals.noStrongSystem)};
    if(businessName.length<2||city.length<2||segment.length<2)return sendError(res,400,'INVALID_LEAD');
    const fingerprint=growthFingerprint({businessName,city,phone:contactPhone}),duplicates=await existingGrowthFingerprints([fingerprint]);
    if(duplicates.has(fingerprint))return sendError(res,409,'LEAD_DUPLICATE');
    const ref=db.collection('nestlocal_growth_leads').doc(),fitScore=growthFitScore(fitSignals);
    await ref.create({source:'manual_radar',fingerprint,status:'new',highestStage:0,stageHistory:[{status:'new',at:admin.firestore.Timestamp.now(),by:req.growthAdmin.uid}],acquisition:growthAcquisition(b,{channel:'other',angle:'other'}),businessName,contactName,phone:contactPhone,city,segment,fitSignals,fitScore,painSignals:{},painScore:0,nextAction:clean(b.nextAction).slice(0,300)||'Qualificar processo de orçamento, agenda e retorno',nextContactAt:admin.firestore.FieldValue.serverTimestamp(),notes:clean(b.notes).slice(0,1000),createdBy:req.growthAdmin.uid,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
    res.status(201).json({id:ref.id,fitScore});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/admin/nestlocal/growth/leads/batch',async(req,res)=>{
  try{
    const input=req.body?.leads;
    if(!Array.isArray(input)||input.length<1||input.length>50)return sendError(res,400,'INVALID_BATCH');
    const candidates=[],issues=[],seen=new Set();
    for(const [index,b] of input.entries()){
      if(!b||typeof b!=='object'){issues.push({index,reason:'INVALID_LEAD'});continue}
      const businessName=clean(b.businessName).slice(0,120),contactName=clean(b.contactName).slice(0,100),contactPhone=phone(b.phone),city=clean(b.city).slice(0,100),segment=clean(b.segment).slice(0,100);
      if(businessName.length<2||city.length<2||segment.length<2){issues.push({index,reason:'INVALID_LEAD'});continue}
      const rawSignals=b.signals&&typeof b.signals==='object'?b.signals:{};
      const fitSignals={quote:signal(rawSignals.quote),whatsapp:signal(rawSignals.whatsapp),scheduling:signal(rawSignals.scheduling),recurrence:signal(rawSignals.recurrence),demand:signal(rawSignals.demand),smallTeam:signal(rawSignals.smallTeam),ownerInvolved:signal(rawSignals.ownerInvolved),noStrongSystem:signal(rawSignals.noStrongSystem)};
      const fingerprint=growthFingerprint({businessName,city,phone:contactPhone});
      if(seen.has(fingerprint)){issues.push({index,reason:'DUPLICATE_IN_BATCH'});continue}
      seen.add(fingerprint);
      candidates.push({index,fingerprint,businessName,contactName,contactPhone,city,segment,fitSignals,fitScore:growthFitScore(fitSignals),acquisition:growthAcquisition(b,{channel:'other',angle:'other'}),nextAction:clean(b.nextAction).slice(0,300)||'Qualificar processo de orçamento, agenda e retorno',notes:clean(b.notes).slice(0,1000)});
    }
    const existing=await existingGrowthFingerprints(candidates.map(x=>x.fingerprint)),batch=db.batch(),created=[];
    for(const lead of candidates){
      if(existing.has(lead.fingerprint)){issues.push({index:lead.index,reason:'ALREADY_EXISTS'});continue}
      const ref=db.collection('nestlocal_growth_leads').doc();
      batch.create(ref,{source:'batch_radar',fingerprint:lead.fingerprint,status:'new',highestStage:0,stageHistory:[{status:'new',at:admin.firestore.Timestamp.now(),by:req.growthAdmin.uid}],acquisition:lead.acquisition,businessName:lead.businessName,contactName:lead.contactName,phone:lead.contactPhone,city:lead.city,segment:lead.segment,fitSignals:lead.fitSignals,fitScore:lead.fitScore,painSignals:{},painScore:0,nextAction:lead.nextAction,nextContactAt:admin.firestore.FieldValue.serverTimestamp(),notes:lead.notes,createdBy:req.growthAdmin.uid,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
      created.push({index:lead.index,id:ref.id,fitScore:lead.fitScore});
    }
    if(created.length)await batch.commit();
    res.status(201).json({created,createdCount:created.length,skippedCount:issues.length,issues});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.patch('/api/admin/nestlocal/growth/leads/:leadId',async(req,res)=>{
  try{
    const id=safeId(req.params.leadId);if(!id)return sendError(res,400,'INVALID_LEAD');
    const b=req.body||{},ref=db.doc(`nestlocal_growth_leads/${id}`);
    let result={painScore:undefined};
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)throw new TypeError('LEAD_NOT_FOUND');
      const current=snap.data(),update={updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      if(b.status!==undefined){
        const status=clean(b.status);if(!growthStatuses.has(status))throw new TypeError('INVALID_STATUS');
        update.status=status;
        if(status!==current.status){
          update.stageHistory=admin.firestore.FieldValue.arrayUnion({status,at:admin.firestore.Timestamp.now(),by:req.growthAdmin.uid});
          const currentHighest=growthLeadStage(current),rank=growthStageRank[status];
          update.highestStage=rank===undefined?currentHighest:Math.max(currentHighest,rank);
        }
      }
      if(b.nextAction!==undefined)update.nextAction=clean(b.nextAction).slice(0,300);
      if(b.notes!==undefined)update.notes=clean(b.notes).slice(0,1000);
      if(b.scheduleFollowUpDays!==undefined){const days=clamp(b.scheduleFollowUpDays,0,365);update.nextContactAt=admin.firestore.Timestamp.fromMillis(Date.now()+days*86400000)}
      if(b.nextContactAt!==undefined){const ms=Date.parse(clean(b.nextContactAt));if(!Number.isFinite(ms))throw new TypeError('INVALID_DATE');update.nextContactAt=admin.firestore.Timestamp.fromMillis(ms)}
      if(b.acquisition&&typeof b.acquisition==='object')update.acquisition=growthAcquisition(b.acquisition,current.acquisition||{});
      if(b.painSignals&&typeof b.painSignals==='object'){
        const p=b.painSignals;update.painSignals={quoteLoss:signal(p.quoteLoss),noFollowUp:signal(p.noFollowUp),noReactivation:signal(p.noReactivation),agendaChaos:signal(p.agendaChaos),volume:signal(p.volume),ownerFeelsPain:signal(p.ownerFeelsPain),urgency:signal(p.urgency)};update.painScore=growthPainScore(update.painSignals);result.painScore=update.painScore;
      }
      tx.set(ref,update,{merge:true});
    });
    res.json({ok:true,painScore:result.painScore});
  }catch(e){
    console.error(e);
    if(['LEAD_NOT_FOUND','INVALID_STATUS','INVALID_DATE'].includes(e?.message))return sendError(res,e.message==='LEAD_NOT_FOUND'?404:400,e.message);
    sendError(res,500,'INTERNAL_ERROR')
  }
});

app.get('/api/public/stores/:storeSlug',async(req,res)=>{
  try{const org=await resolveOrganization(req.params.storeSlug);if(!org)return sendError(res,404,'STORE_NOT_FOUND');const entitlement=await getPublicEntitlement(org.id);if(!entitlement.active)return sendError(res,404,'STORE_NOT_FOUND');const settings=await db.doc(`organizations/${org.id}/nestlocal_settings/public`).get();if(!settings.exists||settings.data()?.published!==true)return sendError(res,404,'STORE_NOT_FOUND');const services=await db.collection(`organizations/${org.id}/nestlocal_services`).where('published','==',true).get();res.set('Cache-Control','public,max-age=60');res.json({store:{slug:settings.data().slug,businessName:settings.data().businessName||org.name,coverageCodes:settings.data().coverageCodes||[],whatsapp:settings.data().whatsapp||'',currency:'BRL',timezone:settings.data().timezone||'America/Sao_Paulo',messagingEnabled:settings.data()?.messaging?.connected===true},services:services.docs.map(x=>({id:x.id,...x.data()}))})}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.post('/api/public/stores/:storeSlug/requests',async(req,res)=>{
  try{
    const org=await resolveOrganization(req.params.storeSlug);if(!org)return sendError(res,404,'STORE_NOT_FOUND');
    if(!(await rateLimit(req,'request',org.id)))return sendError(res,429,'RATE_LIMITED');
    const entitlement=await getPublicEntitlement(org.id);if(!entitlement.active)return sendError(res,402,'STORE_SUBSCRIPTION_INACTIVE');
    const body=req.body||{};const name=clean(body.name).slice(0,100),customerPhone=phone(body.phone),serviceId=clean(body.serviceId),coverageCode=slug(body.coverageCode),quantity=Number(body.quantity),addressLine=clean(body.addressLine).slice(0,180),preferredDate=clean(body.preferredDate).slice(0,10),preferredWindow=clean(body.preferredWindow).slice(0,30),serviceUpdatesOptIn=body.whatsappServiceOptIn===true,maintenanceOptIn=body.whatsappMaintenanceOptIn===true;
    if(name.length<2||customerPhone.length<10||!serviceId||!coverageCode||addressLine.length<5||!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)||!['morning','afternoon','evening','flexible'].includes(preferredWindow)||!Number.isSafeInteger(quantity)||quantity<1||quantity>10||body.acceptedTerms!==true)return sendError(res,400,'INVALID_REQUEST');
    const [settingsSnap,servicesSnap]=await Promise.all([db.doc(`organizations/${org.id}/nestlocal_settings/public`).get(),db.collection(`organizations/${org.id}/nestlocal_services`).where('published','==',true).get()]);
    if(!settingsSnap.exists||settingsSnap.data()?.published!==true)return sendError(res,409,'STORE_NOT_READY');
    const settings=settingsSnap.data(),orgTimeZone=validTimeZone(clean(settings.timezone))?clean(settings.timezone):'UTC';if(preferredDate<localIsoDate(orgTimeZone))return sendError(res,400,'INVALID_REQUEST');const services=servicesSnap.docs.map(x=>({id:x.id,...x.data()})),selectedService=services.find(x=>x.id===serviceId);if(!selectedService)return sendError(res,400,'INVALID_REQUEST');let intake={};try{intake=normalizeIntakeValues(selectedService.intakeFields,body.intake)}catch{return sendError(res,400,'INVALID_INTAKE')}
    const result=quote({catalog:{organizationId:org.id,version:clean(settings.catalogVersion),status:'published',currency:'BRL',validForMinutes:Number(settings.validForMinutes||30),coverageCodes:settings.coverageCodes||[],services},request:{serviceId,quantity,coverageCode,equipmentType:clean(body.equipmentType),safeAccess:body.safeAccess===true},now:new Date()});
    const publicToken=`${org.id}.${token()}`;const requestRef=db.collection(`organizations/${org.id}/nestlocal_requests`).doc();const customerId=hash(customerPhone).slice(0,28);
    const record={organizationId:org.id,customerId,customer:{name,phone:customerPhone},address:{line:addressLine,city:clean(body.city).slice(0,80),coverageCode},preference:{date:preferredDate,window:preferredWindow},serviceId,quantity,equipmentType:clean(body.equipmentType).slice(0,40),safeAccess:body.safeAccess===true,intake,note:clean(body.note).slice(0,1000),status:'new',quote:{...result,reasons:[...result.reasons]},trackingTokenHash:hash(publicToken),trackingTokenHashes:[hash(publicToken)],consent:{accepted:true,version:'pilot-2026-09',acceptedAt:admin.firestore.FieldValue.serverTimestamp()},messagingConsent:{serviceUpdates:{accepted:serviceUpdatesOptIn,businessName:settings.businessName||org.name,version:'whatsapp-service-2026-09',acceptedAt:serviceUpdatesOptIn?admin.firestore.Timestamp.now():null},maintenanceReminders:{accepted:maintenanceOptIn,businessName:settings.businessName||org.name,version:'whatsapp-maintenance-2026-09',acceptedAt:maintenanceOptIn?admin.firestore.Timestamp.now():null}},source:'public_store',createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
    const monthId=localIsoDate(orgTimeZone).slice(0,7),usageRef=db.doc(`organizations/${org.id}/nestlocal_usage/${monthId}`),customerRef=db.doc(`organizations/${org.id}/nestlocal_customers/${customerId}`);await db.runTransaction(async tx=>{const [usage,customer]=await Promise.all([tx.get(usageRef),tx.get(customerRef)]),count=Number(usage.data()?.requestCount||0);if(count>=entitlement.limits.requestsPerMonth)throw new TypeError('PLAN_REQUEST_LIMIT');const lastAssistance=customer.data()?.lastAssistance,requestRecord={...record};if(lastAssistance?.actionType==='customer_reactivation'&&freshAssistance(lastAssistance,90))requestRecord.assistedAcquisition={actionEventId:clean(lastAssistance.id),actionType:lastAssistance.actionType,channel:lastAssistance.channel,at:lastAssistance.at};tx.create(requestRef,requestRecord);{const customerData={name,phone:customerPhone,lastRequestAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};if(maintenanceOptIn)customerData['messaging.consents.maintenanceReminders']={accepted:true,businessName:settings.businessName||org.name,version:'whatsapp-maintenance-2026-09',acceptedAt:admin.firestore.Timestamp.now(),source:'public_request'};tx.set(customerRef,customerData,{merge:true})};tx.set(usageRef,{monthId,requestCount:count+1,plan:entitlement.plan,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});
    res.status(201).json({requestId:requestRef.id,trackingToken:publicToken,outcome:result.outcome,quote:{currency:result.currency,totalCents:result.totalCents,expiresAt:result.expiresAt,reasons:[...result.reasons]}});
  }catch(e){console.error(e);sendError(res,e?.message==='PLAN_REQUEST_LIMIT'?429:e instanceof TypeError?409:500,e?.message==='PLAN_REQUEST_LIMIT'?'PLAN_REQUEST_LIMIT':e instanceof TypeError?'QUOTE_UNAVAILABLE':'INTERNAL_ERROR')}
});

app.get('/api/public/requests/:requestId',async(req,res)=>{
  try{
    const id=safeId(req.params.requestId),t=clean(req.query.token),orgId=safeId(t.split('.')[0]);if(!id||!orgId||!t)return sendError(res,404,'NOT_FOUND');
    const doc=await db.doc(`organizations/${orgId}/nestlocal_requests/${id}`).get();if(!doc.exists||!trackingTokenValid(doc.data(),t))return sendError(res,404,'NOT_FOUND');
    const d=doc.data(),displayTotalCents=Number.isSafeInteger(Number(d.commercial?.finalAmountCents))?Number(d.commercial.finalAmountCents):Number.isSafeInteger(Number(d.quote?.totalCents))?Number(d.quote.totalCents):null;
    const canDecide=!['accepted','scheduled','in_progress','completed','declined','cancelled'].includes(d.status)&&displayTotalCents!==null&&displayTotalCents>0;
    res.json({id:doc.id,status:d.status,serviceId:d.serviceId,quantity:d.quantity,quote:d.quote,displayTotalCents,canDecide,decision:d.decision?{status:d.decision.status}:null,createdAt:d.createdAt});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/public/requests/:requestId/decision',async(req,res)=>{
  try{
    const id=safeId(req.params.requestId),t=clean(req.query.token),orgId=safeId(t.split('.')[0]),decision=clean(req.body?.decision).toLowerCase();
    if(!id||!orgId||!t||!['accepted','declined'].includes(decision))return sendError(res,400,'INVALID_DECISION');
    if(!(await rateLimit(req,'decision',orgId)))return sendError(res,429,'RATE_LIMITED');
    const ref=db.doc(`organizations/${orgId}/nestlocal_requests/${id}`);
    let result=null;
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists||!trackingTokenValid(snap.data(),t))throw new TypeError('NOT_FOUND');
      const current=snap.data(),existing=clean(current.decision?.status);
      if(existing){
        if(existing===decision){result={ok:true,status:current.status,decision:existing,idempotent:true};return}
        throw new TypeError('DECISION_LOCKED');
      }
      if(['scheduled','in_progress','completed','cancelled'].includes(current.status))throw new TypeError('DECISION_LOCKED');
      const displayTotalCents=Number.isSafeInteger(Number(current.commercial?.finalAmountCents))?Number(current.commercial.finalAmountCents):Number.isSafeInteger(Number(current.quote?.totalCents))?Number(current.quote.totalCents):null;
      if(decision==='accepted'&&(!displayTotalCents||displayTotalCents<=0))throw new TypeError('QUOTE_NOT_READY');
      const nextStatus=decision,at=admin.firestore.Timestamp.now(),decisionUpdate={status:nextStatus,decision:{status:decision,at,source:'public_tracking'},statusHistory:admin.firestore.FieldValue.arrayUnion({status:nextStatus,at,by:'customer'}),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      if(decision==='accepted'&&current.lastAssistance?.actionType==='quote_followup'&&freshAssistance(current.lastAssistance,30))decisionUpdate.assistedConversion={actionEventId:clean(current.lastAssistance.id),actionType:current.lastAssistance.actionType,channel:current.lastAssistance.channel,at:current.lastAssistance.at};
      tx.update(ref,decisionUpdate);
      result={ok:true,status:nextStatus,decision,displayTotalCents};
    });
    res.json(result);
  }catch(e){
    console.error(e);const code=e?.message;
    if(code==='NOT_FOUND')return sendError(res,404,'NOT_FOUND');
    if(['INVALID_DECISION','DECISION_LOCKED','QUOTE_NOT_READY'].includes(code))return sendError(res,409,code);
    sendError(res,500,'INTERNAL_ERROR')
  }
});

app.get('/api/public/reviews/:requestId',async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId),t=clean(req.query.token),orgId=safeId(t.split('.')[0]);if(!requestId||!orgId||!t)return sendError(res,404,'NOT_FOUND');
    const root=`organizations/${orgId}`,[request,settings,service]=await Promise.all([db.doc(`${root}/nestlocal_requests/${requestId}`).get(),db.doc(`${root}/nestlocal_settings/public`).get(),db.doc(`${root}/nestlocal_services/${requestId}`).get().catch(()=>null)]);
    if(!request.exists||!reviewTokenValid(request.data(),t))return sendError(res,404,'NOT_FOUND');
    const data=request.data()||{};if(data.status!=='completed')return sendError(res,409,'REVIEW_NOT_READY');
    const serviceDoc=await db.doc(`${root}/nestlocal_services/${safeId(data.serviceId)}`).get();
    res.set('Cache-Control','private,no-store');
    res.json({requestId,businessName:clean(settings.data()?.businessName)||'Prestador',serviceName:clean(serviceDoc.data()?.name)||clean(data.serviceId),submitted:data.review?.submitted===true,rating:data.review?.submitted===true?Number(data.review?.rating||0):null});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/public/reviews/:requestId',async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId),t=clean(req.query.token),orgId=safeId(t.split('.')[0]),rating=Number(req.body?.rating),comment=clean(req.body?.comment).slice(0,800);
    if(!requestId||!orgId||!t||!Number.isInteger(rating)||rating<1||rating>5)return sendError(res,400,'INVALID_REVIEW');
    if(!(await rateLimit(req,'review',orgId)))return sendError(res,429,'RATE_LIMITED');
    const root=`organizations/${orgId}`,requestRef=db.doc(`${root}/nestlocal_requests/${requestId}`),reviewRef=db.doc(`${root}/nestlocal_reviews/${requestId}`),metricsRef=db.doc(`${root}/nestlocal_metrics/reviews`);let result=null;
    await db.runTransaction(async tx=>{
      const [request,existing,metrics]=await Promise.all([tx.get(requestRef),tx.get(reviewRef),tx.get(metricsRef)]);
      if(!request.exists||!reviewTokenValid(request.data(),t))throw new TypeError('NOT_FOUND');
      const current=request.data()||{};if(current.status!=='completed')throw new TypeError('REVIEW_NOT_READY');
      if(existing.exists||current.review?.submitted===true){result={ok:true,idempotent:true,rating:Number(existing.data()?.rating||current.review?.rating||0)};return}
      const at=admin.firestore.Timestamp.now(),customerId=safeId(current.customerId),serviceId=safeId(current.serviceId),record={requestId,customerId,serviceId,rating,comment,status:'submitted',source:'secure_review_link',submittedAt:at,createdAt:admin.firestore.FieldValue.serverTimestamp()};
      tx.create(reviewRef,record);
      tx.update(requestRef,{review:{submitted:true,rating,comment,submittedAt:at},updatedAt:admin.firestore.FieldValue.serverTimestamp()});
      const previous=metrics.exists?metrics.data()||{}:{},distribution={...(previous.distribution||{})},key=String(rating);distribution[key]=Number(distribution[key]||0)+1;
      tx.set(metricsRef,{count:Number(previous.count||0)+1,sumRatings:Number(previous.sumRatings||0)+rating,distribution,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:false});
      result={ok:true,idempotent:false,rating};
    });
    res.status(result.idempotent?200:201).json(result);
  }catch(e){console.error(e);const code=e?.message;if(code==='NOT_FOUND')return sendError(res,404,code);if(code==='REVIEW_NOT_READY')return sendError(res,409,code);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/public/requests/:requestId/photos',upload.array('photos',5),async(req,res)=>{
  try{const id=safeId(req.params.requestId),t=clean(req.query.token),orgId=safeId(t.split('.')[0]);if(!id||!orgId||!t)return sendError(res,404,'NOT_FOUND');if(!(await rateLimit(req,'photos',orgId)))return sendError(res,429,'RATE_LIMITED');const ref=db.doc(`organizations/${orgId}/nestlocal_requests/${id}`),doc=await ref.get();if(!doc.exists||doc.data().trackingTokenHash!==hash(t))return sendError(res,404,'NOT_FOUND');const files=Array.isArray(req.files)?req.files:[];if(!files.length)return sendError(res,400,'PHOTOS_REQUIRED');if(!files.every(validImage))return sendError(res,415,'INVALID_PHOTO');const bucket=admin.storage().bucket();const saved=[];for(const [index,file] of files.entries()){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.mimetype];const path=`organizations/${orgId}/nestlocal/requests/${id}/${Date.now()}-${index}.${ext}`;await bucket.file(path).save(file.buffer,{resumable:false,metadata:{contentType:file.mimetype,cacheControl:'private,max-age=0',metadata:{organizationId:orgId,requestId:id}}});saved.push({path,contentType:file.mimetype,size:file.size})}await ref.update({attachments:admin.firestore.FieldValue.arrayUnion(...saved),updatedAt:admin.firestore.FieldValue.serverTimestamp()});res.status(201).json({uploaded:saved.length})}catch(e){console.error(e);sendError(res,e?.code==='LIMIT_FILE_SIZE'?413:500,e?.code==='LIMIT_FILE_SIZE'?'PHOTO_TOO_LARGE':'UPLOAD_FAILED')}});

app.get('/api/session',authenticate,async(req,res)=>{
  try{
    const user=await db.doc(`users/${req.identity.uid}`).get();if(!user.exists)return sendError(res,403,'USER_NOT_FOUND');
    const data=user.data()||{};if(inactive(data))return sendError(res,403,'USER_INACTIVE');
    const systemRole=clean(data.systemRole).toLowerCase(),administrative=globalRoles.has(systemRole);
    let ids=[data.organizationId,data.primaryOrganizationId,data.activeOrganizationId,...(Array.isArray(data.organizations)?data.organizations:[])].filter(x=>typeof x==='string'&&x);
    const legacy=await db.collection('organization_members').where('uid','==',req.identity.uid).limit(50).get();
    ids.push(...legacy.docs.filter(x=>!inactive(x.data())).map(x=>x.data().organizationId).filter(Boolean));
    if(administrative){const all=await db.collection('organizations').limit(50).get();ids.push(...all.docs.map(x=>x.id))}
    ids=[...new Set(ids)];
    const docs=await Promise.all(ids.map(async id=>{
      const [org,member,subscription]=await Promise.all([
        db.doc(`organizations/${id}`).get(),
        db.doc(`organizations/${id}/members/${req.identity.uid}`).get(),
        db.doc(`subscriptions/${id}`).get()
      ]);
      if(!org.exists||inactive(org.data()))return null;
      const access=resolveNestLocalAccess({userDoc:user,orgDoc:org,memberDoc:member,subscriptionDoc:subscription}),ent=access.entitlement||nestLocalEntitlement(org.data()||{},subscription.exists?subscription.data()||{}:{});
      return{id:org.id,name:org.data().name||org.id,slug:org.data().slug||'',nestlocal:{access:access.accessible,status:access.administrative?'administrative':ent.subscriptionStatus||'',organizationAppStatus:ent.organizationAppStatus||'',plan:access.administrative?'pro':ent.plan,limits:access.administrative?planLimits.pro:ent.limits,reason:access.reason||'',administrative:access.administrative===true,organizationRole:access.organizationRole||''}};
    }));
    const organizations=docs.filter(Boolean);
    res.json({user:{uid:req.identity.uid,displayName:data.displayName||req.identity.name||'',systemRole:systemRole||'user'},organizations,eligibleOrganizationCount:organizations.filter(x=>x.nestlocal?.access).length});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.get('/api/organizations/:orgId/nestlocal',authenticate,authorize,async(req,res)=>{
  try{
    const monthId=new Date().toISOString().slice(0,7),root=`organizations/${req.access.orgId}`,settings=await db.doc(`${root}/nestlocal_settings/public`).get(),settingsData=settings.exists?settings.data():null,timeZone=validTimeZone(clean(settingsData?.timezone))?clean(settingsData.timezone):'UTC',today=localIsoDate(timeZone),dueLimit=200,actionMetricStart=addIsoDays(today,-29);
    const [services,requests,customers,dueCustomers,usage,members,outbox,revenueMetrics,reviewMetrics,actionMetrics,experiments,decisionMemory]=await Promise.all([
      db.collection(`${root}/nestlocal_services`).get(),
      db.collection(`${root}/nestlocal_requests`).orderBy('createdAt','desc').limit(100).get(),
      db.collection(`${root}/nestlocal_customers`).limit(100).get(),
      db.collection(`${root}/nestlocal_customers`).where('nextServiceDate','<=',today).orderBy('nextServiceDate').limit(dueLimit).get(),
      db.doc(`${root}/nestlocal_usage/${monthId}`).get(),
      db.collection(`${root}/members`).limit(100).get(),
      db.collection(`${root}/nestlocal_message_outbox`).orderBy('createdAt','desc').limit(30).get(),
      db.doc(`${root}/nestlocal_metrics/revenue`).get(),
      db.doc(`${root}/nestlocal_metrics/reviews`).get(),
      db.collection(`${root}/nestlocal_action_metrics`).where('date','>=',actionMetricStart).orderBy('date').limit(31).get(),
      db.collection(`${root}/nestlocal_experiments`).orderBy('createdAt','desc').limit(5).get(),
      db.collection(`${root}/nestlocal_decision_memory`).limit(10).get()
    ]);
    const team=members.docs.filter(x=>!inactive(x.data())).map(x=>{const d=x.data(),role=clean(d.role||d.organizationRole).toLowerCase(),owner=role==='owner';return{uid:x.id,name:clean(d.displayName||d.name||d.email||x.id),email:clean(d.email),role,nestlocalEnabled:owner||d.appAccess?.nestlocal?.enabled===true,owner}}),serviceRows=services.docs.map(x=>({id:x.id,...x.data()})),customerRows=customers.docs.map(x=>({id:x.id,...x.data()})),dueRows=dueCustomers.docs.map(x=>({id:x.id,...x.data()})),setupReadiness=catalogReadiness(settingsData,serviceRows);
    res.json({organization:{id:req.access.orgId,name:req.access.org.name},entitlement:{...req.access.entitlement,usage:{monthId,requests:Number(usage.data()?.requestCount||0)},seats:{used:team.filter(x=>x.nestlocalEnabled).length,limit:req.access.entitlement.limits.users}},settings:settingsData,setupReadiness,services:serviceRows,requests:requests.docs.map(x=>({id:x.id,...x.data(),trackingTokenHash:undefined,trackingTokenHashes:undefined,reviewTokenHash:undefined,reviewTokenHashes:undefined})),customers:customerRows,customerCount:customers.size,team,messageOutbox:outbox.docs.map(x=>({id:x.id,...x.data()})),reminderReadiness:reminderReadiness(dueRows,settingsData||{},{truncated:dueCustomers.size===dueLimit}),revenueMetrics:revenueMetrics.exists?revenueMetrics.data():{assistedRevenueCents:0,assistedJobs:0},reviewMetrics:reviewMetrics.exists?reviewMetrics.data():{count:0,sumRatings:0,distribution:{}},actionOutcomeMetrics:actionOutcomeSnapshot(actionMetrics.docs.map(x=>x.data()),{periodStart:actionMetricStart,periodEnd:today}),guidedExperiments:experiments.docs.map(x=>({id:x.id,...x.data()})),decisionMemory:Object.fromEntries(decisionMemory.docs.map(x=>[x.id,{id:x.id,...x.data()}])),experimentAccess:{canManage:canManageNestLocal(req.access)}})
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.put('/api/organizations/:orgId/nestlocal/team/:uid',authenticate,authorize,async(req,res)=>{
  try{const targetUid=safeId(req.params.uid),enabled=req.body?.enabled===true,actorRole=clean(req.access.member?.role||req.access.member?.organizationRole).toLowerCase();if(!targetUid)return sendError(res,400,'INVALID_MEMBER');if(!globalRoles.has(req.access.systemRole)&&!['owner','admin'].includes(actorRole))return sendError(res,403,'ACCESS_DENIED');const memberRef=db.doc(`organizations/${req.access.orgId}/members/${targetUid}`),legacyRef=db.doc(`organization_members/${req.access.orgId}_${targetUid}`),membersQuery=db.collection(`organizations/${req.access.orgId}/members`).limit(100);await db.runTransaction(async tx=>{const [member,members]=await Promise.all([tx.get(memberRef),tx.get(membersQuery)]);if(!member.exists||inactive(member.data()))throw new TypeError('MEMBER_NOT_FOUND');const targetRole=clean(member.data()?.role||member.data()?.organizationRole).toLowerCase();if(targetRole==='owner'&&!enabled)throw new TypeError('OWNER_SEAT_REQUIRED');const alreadyEnabled=targetRole==='owner'||member.data()?.appAccess?.nestlocal?.enabled===true;const used=members.docs.filter(x=>{const d=x.data(),role=clean(d.role||d.organizationRole).toLowerCase();return !inactive(d)&&(role==='owner'||d.appAccess?.nestlocal?.enabled===true)}).length;if(enabled&&!alreadyEnabled&&used>=req.access.entitlement.limits.users)throw new TypeError('PLAN_USER_LIMIT');const appAccess={enabled,permissions:enabled?['nestlocal.manage']:[],updatedAt:admin.firestore.FieldValue.serverTimestamp()};tx.set(memberRef,{'appAccess.nestlocal':appAccess}, {merge:true});tx.set(legacyRef,{'appAccess.nestlocal':appAccess}, {merge:true})});res.json({ok:true,uid:targetUid,enabled})}catch(e){console.error(e);const code=e?.message;if(['MEMBER_NOT_FOUND','OWNER_SEAT_REQUIRED','PLAN_USER_LIMIT'].includes(code))return sendError(res,409,code);sendError(res,500,'INTERNAL_ERROR')}});

app.post('/api/organizations/:orgId/nestlocal/customers/batch',authenticate,authorize,async(req,res)=>{
  try{
    const rows=Array.isArray(req.body?.customers)?req.body.customers:[];if(!rows.length||rows.length>100)return sendError(res,400,'INVALID_CUSTOMER_BATCH');
    const prepared=[],seen=new Set(),skipped=[];
    for(const [index,row] of rows.entries()){
      const name=clean(row?.name).slice(0,100),customerPhone=phone(row?.phone),city=clean(row?.city).slice(0,80),addressLine=clean(row?.addressLine).slice(0,180),lastServiceLabel=clean(row?.lastServiceLabel).slice(0,120),lastServiceDate=clean(row?.lastServiceDate).slice(0,10),nextServiceDate=clean(row?.nextServiceDate).slice(0,10),nextServiceReason=clean(row?.nextServiceReason).slice(0,240);
      if(name.length<2||customerPhone.length<10||(lastServiceDate&&!/^\d{4}-\d{2}-\d{2}$/.test(lastServiceDate))||(nextServiceDate&&!/^\d{4}-\d{2}-\d{2}$/.test(nextServiceDate))){skipped.push({index,reason:'INVALID_CUSTOMER'});continue}
      const id=hash(customerPhone).slice(0,28);if(seen.has(id)){skipped.push({index,reason:'DUPLICATE_IN_BATCH'});continue}seen.add(id);
      prepared.push({index,id,name,phone:customerPhone,city,addressLine,lastServiceLabel,lastServiceDate,nextServiceDate,nextServiceReason});
    }
    if(!prepared.length)return res.status(400).json({error:'INVALID_CUSTOMER_BATCH',importedCount:0,skippedCount:skipped.length,skipped});
    const root=`organizations/${req.access.orgId}`,refs=prepared.map(x=>db.doc(`${root}/nestlocal_customers/${x.id}`)),existing=await db.getAll(...refs),batch=db.batch();let createdCount=0,updatedCount=0;
    for(const [i,item] of prepared.entries()){
      if(existing[i]?.exists)updatedCount++;else createdCount++;
      const data={name:item.name,phone:item.phone,source:'customer_import',updatedAt:admin.firestore.FieldValue.serverTimestamp(),importedAt:admin.firestore.FieldValue.serverTimestamp()};
      if(item.addressLine||item.city)data.address={line:item.addressLine,city:item.city};
      if(item.lastServiceLabel)data.lastServiceLabel=item.lastServiceLabel;
      if(item.lastServiceDate)data.lastServiceDate=item.lastServiceDate;
      if(item.nextServiceDate){data.nextServiceDate=item.nextServiceDate;data.nextServiceReason=item.nextServiceReason||item.lastServiceLabel||'Retorno importado';data.nextServiceSource='customer_import'}
      batch.set(refs[i],data,{merge:true});
    }
    await batch.commit();
    res.status(201).json({importedCount:prepared.length,createdCount,updatedCount,skippedCount:skipped.length,skipped});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/playbooks/:template/apply',authenticate,authorize,async(req,res)=>{
  try{
    if(!canManageNestLocal(req.access))return sendError(res,403,'ACCESS_DENIED');
    const template=slug(req.params.template);if(!servicePlaybooks[template])return sendError(res,400,'INVALID_TEMPLATE');
    const root=`organizations/${req.access.orgId}`,settingsRef=db.doc(`${root}/nestlocal_settings/public`),settings=await settingsRef.get();if(!settings.exists)return sendError(res,409,'SETUP_REQUIRED');
    const services=servicePlaybooks[template].services,refs=services.map(service=>db.doc(`${root}/nestlocal_services/${service.id}`)),existing=await db.getAll(...refs),missing=services.map((service,index)=>({service,ref:refs[index],exists:existing[index]?.exists===true})).filter(x=>!x.exists);
    if(!missing.length)return res.json({ok:true,template,addedCount:0,skippedCount:services.length});
    const batch=db.batch();for(const item of missing)batch.create(item.ref,{...item.service,published:false,addedFromPlaybook:template,createdAt:admin.firestore.FieldValue.serverTimestamp()});
    batch.set(settingsRef,{published:false,lastPlaybookApplied:template,lastPlaybookAppliedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    await batch.commit();res.status(201).json({ok:true,template,addedCount:missing.length,skippedCount:services.length-missing.length,warning:'REVIEW_CATALOG_BEFORE_PUBLISH'});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/bootstrap',authenticate,authorize,async(req,res)=>{
  try{
    const b=req.body||{},template=clean(b.template||'general').toLowerCase(),businessName=clean(b.businessName||req.access.org.name).slice(0,100),coverageCodes=Array.isArray(b.coverageCodes)?[...new Set(b.coverageCodes.map(slug).filter(Boolean))].slice(0,30):[],whatsapp=phone(b.whatsapp),timezone=clean(b.timezone||'America/Sao_Paulo');
    if(!servicePlaybooks[template])return sendError(res,400,'INVALID_TEMPLATE');
    if(businessName.length<2||!coverageCodes.length||!validTimeZone(timezone))return sendError(res,400,'ONBOARDING_DETAILS_REQUIRED');
    const root=`organizations/${req.access.orgId}`,settings=db.doc(`${root}/nestlocal_settings/public`),existing=await settings.get();if(existing.exists)return res.json({created:false});
    const baseSlug=slug(businessName||req.access.org.slug||req.access.org.name)||'negocio',batch=db.batch();
    batch.create(settings,{businessName,slug:`${baseSlug}-${req.access.orgId.slice(0,6)}`,businessType:template,coverageCodes,whatsapp,currency:'BRL',validForMinutes:30,catalogVersion:'draft-1',published:false,timezone,capacity:{workingDays:[],windows:[]},messaging:{provider:'whatsapp_cloud_api',connected:false,templates:{serviceUpdate:'',maintenanceReminder:''}},createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
    for(const service of servicePlaybooks[template].services)batch.create(db.doc(`${root}/nestlocal_services/${service.id}`),{...service,published:false});
    await batch.commit();res.status(201).json({created:true,template,warning:'REVIEW_CATALOG_BEFORE_PUBLISH'});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.put('/api/organizations/:orgId/nestlocal/settings',authenticate,authorize,async(req,res)=>{
  const b=req.body||{};const data={businessName:clean(b.businessName).slice(0,100),slug:slug(b.slug),whatsapp:phone(b.whatsapp),coverageCodes:Array.isArray(b.coverageCodes)?[...new Set(b.coverageCodes.map(slug).filter(Boolean))].slice(0,30):[],validForMinutes:Number(b.validForMinutes||30),published:false,'messaging.templates.serviceUpdate':clean(b.whatsappServiceTemplate).slice(0,120),'messaging.templates.maintenanceReminder':clean(b.whatsappMaintenanceTemplate).slice(0,120),updatedAt:admin.firestore.FieldValue.serverTimestamp()};if(data.businessName.length<2||data.slug.length<3||!data.coverageCodes.length||!Number.isSafeInteger(data.validForMinutes)||data.validForMinutes<5||data.validForMinutes>1440)return sendError(res,400,'INVALID_SETTINGS');await db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`).set(data,{merge:true});res.json({ok:true})
});

app.put('/api/organizations/:orgId/nestlocal/capacity',authenticate,authorize,async(req,res)=>{
  const b=req.body||{},timezone=clean(b.timezone||'America/Sao_Paulo'),workingDays=Array.isArray(b.workingDays)?[...new Set(b.workingDays.map(Number))].sort((a,b)=>a-b):[],windows=Array.isArray(b.windows)?[...new Set(b.windows.map(x=>clean(x)))]:[];
  if(!validTimeZone(timezone)||!workingDays.every(x=>Number.isInteger(x)&&x>=0&&x<=6)||!windows.every(x=>capacityWindows.has(x)))return sendError(res,400,'INVALID_CAPACITY');
  await db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`).set({timezone,'capacity.workingDays':workingDays,'capacity.windows':windows,capacityUpdatedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
  res.json({ok:true,timezone,workingDays,windows})
});

app.put('/api/organizations/:orgId/nestlocal/services/:serviceId',authenticate,authorize,async(req,res)=>{
  const b=req.body||{},id=slug(req.params.serviceId),returnAfterDays=Number(b.returnAfterDays||0);
  if(!id||!clean(b.name)||!['fixed','review'].includes(b.mode)||!Number.isInteger(returnAfterDays)||returnAfterDays<0||returnAfterDays>730)return sendError(res,400,'INVALID_SERVICE');
  const data={name:clean(b.name).slice(0,100),mode:b.mode,returnAfterDays,published:false};
  if(b.mode==='fixed')Object.assign(data,{unitPriceCents:Number(b.unitPriceCents),durationMinutes:Number(b.durationMinutes),maxQuantity:Number(b.maxQuantity),equipmentTypes:Array.isArray(b.equipmentTypes)?b.equipmentTypes.map(slug).filter(Boolean):[],requiresEquipmentType:b.requiresEquipmentType!==false,requiresSafeAccess:b.requiresSafeAccess!==false,inclusions:clean(b.inclusions).slice(0,500),exclusions:clean(b.exclusions).slice(0,500)});
  try{quote({catalog:{organizationId:req.access.orgId,version:'validation',status:'published',currency:'BRL',validForMinutes:30,coverageCodes:['validation'],services:[{id,...data}]},request:{serviceId:id,quantity:1,coverageCode:'validation',equipmentType:data.requiresEquipmentType===false?undefined:data.equipmentTypes?.[0],safeAccess:data.requiresSafeAccess===false?undefined:true},now:new Date()})}catch(e){if(data.mode==='fixed')return sendError(res,400,'INVALID_SERVICE')}
  await db.doc(`organizations/${req.access.orgId}/nestlocal_services/${id}`).set(data,{merge:true});await db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`).set({published:false,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});res.json({ok:true})
});

app.post('/api/organizations/:orgId/nestlocal/publish',authenticate,authorize,async(req,res)=>{
  try{
    const settingsRef=db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`),[settings,services]=await Promise.all([settingsRef.get(),db.collection(`organizations/${req.access.orgId}/nestlocal_services`).get()]);
    const data=settings.exists?settings.data():null,list=services.docs.map(x=>({id:x.id,...x.data()})),readiness=catalogReadiness(data,list);
    if(!readiness.ready)return res.status(409).json({error:'PUBLISH_NOT_READY',issues:readiness.issues});
    const version=`v${Date.now()}`,directoryRef=db.doc(`nestlocal_public_stores/${data.slug}`);
    await db.runTransaction(async tx=>{const directory=await tx.get(directoryRef);if(directory.exists&&directory.data()?.organizationId!==req.access.orgId)throw new TypeError('SLUG_TAKEN');if(data.publishedSlug&&data.publishedSlug!==data.slug)tx.delete(db.doc(`nestlocal_public_stores/${data.publishedSlug}`));tx.set(directoryRef,{organizationId:req.access.orgId,updatedAt:admin.firestore.FieldValue.serverTimestamp()});tx.set(settingsRef,{published:true,publishedSlug:data.slug,catalogVersion:version,publishedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});
    const batch=db.batch();for(const s of services.docs)batch.set(s.ref,{published:true,catalogVersion:version},{merge:true});await batch.commit();
    res.json({ok:true,version,publicPath:`/s/${data.slug}`});
  }catch(e){console.error(e);if(e?.message==='SLUG_TAKEN')return sendError(res,409,'SLUG_TAKEN');sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/experiments',authenticate,authorize,async(req,res)=>{
  try{
    if(!canManageNestLocal(req.access))return sendError(res,403,'ACCESS_DENIED');
    const b=req.body||{},actionType=clean(b.actionType),targetPerVariant=Number(b.targetPerVariant||5);
    if(!assistanceActionTypes.has(actionType))return sendError(res,400,'INVALID_EXPERIMENT_ACTION');
    if(![5,10,15,20].includes(targetPerVariant))return sendError(res,400,'INVALID_EXPERIMENT_TARGET');
    const root=`organizations/${req.access.orgId}`,settingsSnap=await db.doc(`${root}/nestlocal_settings/public`).get(),settings=settingsSnap.data()||{},timeZone=validTimeZone(clean(settings.timezone))?clean(settings.timezone):'UTC',today=localIsoDate(timeZone),periodStart=addIsoDays(today,-29),metricSnap=await db.collection(`${root}/nestlocal_action_metrics`).where('date','>=',periodStart).orderBy('date').limit(31).get(),snapshot=actionOutcomeSnapshot(metricSnap.docs.map(x=>x.data()),{periodStart,periodEnd:today}),eligibility=guidedExperimentEligibility(snapshot,actionType);
    if(!eligibility.eligible)return res.status(409).json({error:'EXPERIMENT_SAMPLE_NOT_READY',eligibility});
    const stateRef=db.doc(`${root}/nestlocal_experiment_state/active`),experimentRef=db.collection(`${root}/nestlocal_experiments`).doc(),emptyOutcomes={unresolved:0,no_response:0,asked_later:0,positive_signal:0,not_interested:0},record={id:experimentRef.id,status:'active',dimension:'channel',actionType,variants:['whatsapp','phone'],targetPerVariant,progress:{whatsapp:{total:0,outcomes:emptyOutcomes},phone:{total:0,outcomes:{...emptyOutcomes}}},baseline:{periodStart,periodEnd:today,detailedSample:eligibility.detailed,whatsapp:eligibility.whatsapp,phone:eligibility.phone,actionSample:eligibility.actionSample},startedBy:req.identity.uid,startedAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
    await db.runTransaction(async tx=>{const state=await tx.get(stateRef);if(clean(state.data()?.activeExperimentId))throw new TypeError('ACTIVE_EXPERIMENT_EXISTS');tx.create(experimentRef,record);tx.set(stateRef,{activeExperimentId:experimentRef.id,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});
    res.status(201).json({id:experimentRef.id,status:'active',actionType,variants:['whatsapp','phone'],targetPerVariant,baseline:record.baseline});
  }catch(e){console.error(e);if(e?.message==='ACTIVE_EXPERIMENT_EXISTS')return sendError(res,409,'ACTIVE_EXPERIMENT_EXISTS');sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/experiments/:experimentId/stop',authenticate,authorize,async(req,res)=>{
  try{
    if(!canManageNestLocal(req.access))return sendError(res,403,'ACCESS_DENIED');
    const experimentId=safeId(req.params.experimentId);if(!experimentId)return sendError(res,400,'INVALID_EXPERIMENT');
    const root=`organizations/${req.access.orgId}`,experimentRef=db.doc(`${root}/nestlocal_experiments/${experimentId}`),stateRef=db.doc(`${root}/nestlocal_experiment_state/active`);
    let result=null;
    await db.runTransaction(async tx=>{const [experiment,state]=await Promise.all([tx.get(experimentRef),tx.get(stateRef)]);if(!experiment.exists)throw new TypeError('EXPERIMENT_NOT_FOUND');const data=experiment.data()||{};if(data.status!=='active'){result={id:experimentId,status:data.status||'stopped',idempotent:true};return}tx.set(experimentRef,{status:'stopped',stoppedBy:req.identity.uid,stoppedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});if(clean(state.data()?.activeExperimentId)===experimentId)tx.set(stateRef,{activeExperimentId:'',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});result={id:experimentId,status:'stopped'}});
    res.json(result);
  }catch(e){console.error(e);if(e?.message==='EXPERIMENT_NOT_FOUND')return sendError(res,404,'EXPERIMENT_NOT_FOUND');sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/experiments/:experimentId/review',authenticate,authorize,async(req,res)=>{
  try{
    if(!canManageNestLocal(req.access))return sendError(res,403,'ACCESS_DENIED');
    const experimentId=safeId(req.params.experimentId),decision=clean(req.body?.decision),note=clean(req.body?.note).slice(0,180);
    if(!experimentId)return sendError(res,400,'INVALID_EXPERIMENT');
    if(decision!=='context_only')return sendError(res,400,'INVALID_EXPERIMENT_REVIEW');
    const root=`organizations/${req.access.orgId}`,experimentRef=db.doc(`${root}/nestlocal_experiments/${experimentId}`),at=admin.firestore.Timestamp.now();
    let response=null;
    await db.runTransaction(async tx=>{
      const experiment=await tx.get(experimentRef);if(!experiment.exists)throw new TypeError('EXPERIMENT_NOT_FOUND');
      const data={id:experiment.id,...experiment.data()};if(data.status==='active')throw new TypeError('EXPERIMENT_REVIEW_NOT_READY');
      const snapshot=experimentReviewSnapshot(data),review={version:1,decision,note,snapshot,by:req.identity.uid,at},memoryRef=db.doc(`${root}/nestlocal_decision_memory/${snapshot.actionType}`),memory={version:1,actionType:snapshot.actionType,decision,note,snapshot,sourceExperimentId:experimentId,reviewedBy:req.identity.uid,reviewedAt:at,stale:false,updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      tx.set(experimentRef,{review,reviewStale:false,reviewedAt:at,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      tx.set(memoryRef,memory,{merge:false});
      response={id:experimentId,status:data.status,review:{decision,note,snapshot,stale:false},decisionMemory:{actionType:snapshot.actionType,sourceExperimentId:experimentId,stale:false}};
    });
    res.json(response);
  }catch(e){console.error(e);if(e?.message==='EXPERIMENT_NOT_FOUND')return sendError(res,404,'EXPERIMENT_NOT_FOUND');if(e?.message==='EXPERIMENT_REVIEW_NOT_READY')return sendError(res,409,'EXPERIMENT_REVIEW_NOT_READY');sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/action-events',authenticate,authorize,async(req,res)=>{
  try{
    const b=req.body||{},actionType=clean(b.actionType),channel=clean(b.channel||'other'),outcome=clean(b.outcome||'unresolved').toLowerCase(),outcomeNote=clean(b.outcomeNote).slice(0,180),resumeOn=clean(b.resumeOn),experimentId=safeId(b.experimentId),requestId=safeId(b.requestId),customerId=safeId(b.customerId),snoozeDays=Number(b.snoozeDays??1);
    if(!assistanceActionTypes.has(actionType)||!assistanceChannels.has(channel))return sendError(res,400,'INVALID_ACTION_EVENT');
    if(!assistanceOutcomes.has(outcome))return sendError(res,400,'INVALID_ACTION_OUTCOME');
    if(!Number.isSafeInteger(snoozeDays)||snoozeDays<1||snoozeDays>30)return sendError(res,400,'INVALID_SNOOZE_DAYS');
    if(resumeOn&&!/^\d{4}-\d{2}-\d{2}$/.test(resumeOn))return sendError(res,400,'INVALID_RESUME_DATE');
    if(actionType==='quote_followup'&&!requestId)return sendError(res,400,'REQUEST_REQUIRED');
    if(actionType==='customer_reactivation'&&!customerId)return sendError(res,400,'CUSTOMER_REQUIRED');
    const root=`organizations/${req.access.orgId}`,targetType=requestId?'request':'customer',targetId=requestId||customerId,targetRef=requestId?db.doc(`${root}/nestlocal_requests/${requestId}`):db.doc(`${root}/nestlocal_customers/${customerId}`),settingsRef=db.doc(`${root}/nestlocal_settings/public`);
    const [target,settingsSnap]=await Promise.all([targetRef.get(),settingsRef.get()]);if(!target.exists)return sendError(res,404,requestId?'REQUEST_NOT_FOUND':'CUSTOMER_NOT_FOUND');
    const data=target.data(),settings=settingsSnap.data()||{},timeZone=validTimeZone(clean(settings.timezone))?clean(settings.timezone):'UTC',today=localIsoDate(timeZone),now=Date.now(),maxResumeDate=addIsoDays(today,90);if(resumeOn&&(resumeOn<=today||resumeOn>maxResumeDate))return sendError(res,400,'INVALID_RESUME_DATE');const nextEligibleDate=resumeOn||addIsoDays(today,snoozeDays),resurfaceMode=resumeOn?'date':'days',assistanceCooldowns={...(data.assistanceCooldowns||{}),[actionType]:nextEligibleDate};
    const targetPhone=requestId?phone(data.customer?.phone):phone(data.phone),whatsappEligible=actionType==='quote_followup'?data.messagingConsent?.serviceUpdates?.accepted===true:data.messaging?.consents?.maintenanceReminders?.accepted===true,experimentTargetEligible=Boolean(targetPhone)&&whatsappEligible;
    if(actionType==='quote_followup'){
      const updatedAt=timestampMillis(data.updatedAt)||timestampMillis(data.createdAt);
      if(data.status!=='quoted'||!updatedAt||now-updatedAt<48*60*60*1000)return sendError(res,409,'FOLLOWUP_NOT_DUE');
      if(channel==='whatsapp'&&!whatsappEligible)return sendError(res,409,'WHATSAPP_OPT_IN_REQUIRED');
    }
    if(actionType==='customer_reactivation'){
      const nextDate=clean(data.nextServiceDate);
      if(!nextDate||nextDate>today)return sendError(res,409,'REACTIVATION_NOT_DUE');
      if(channel==='whatsapp'&&!whatsappEligible)return sendError(res,409,'WHATSAPP_OPT_IN_REQUIRED');
    }
    const day=today,eventId=hash(`${actionType}|${targetId}|${channel}|${day}`).slice(0,32),eventRef=db.doc(`${root}/nestlocal_action_events/${eventId}`),metricRef=db.doc(`${root}/nestlocal_action_metrics/${day}`),outcomeAt=admin.firestore.Timestamp.now(),lastAssistanceOutcome={outcome,outcomeNote,at:outcomeAt,by:req.identity.uid};
    let response=null;
    await db.runTransaction(async tx=>{
      const [existing,metricSnap]=await Promise.all([tx.get(eventRef),tx.get(metricRef)]),existingData=existing.exists?existing.data():null,previousOutcome=assistanceOutcomes.has(clean(existingData?.outcome))?clean(existingData.outcome):'unresolved',counted=existingData?.metricsRecorded===true,cohortCounted=existingData?.cohortMetricsRecorded===true;
      const metric=updateActionMetric(metricSnap.exists?metricSnap.data():{}, {day,outcome,channel,actionType,previousOutcome,counted,cohortCounted});
      const existingExperimentId=safeId(existingData?.experimentId),linkedExperimentId=existingExperimentId||(!existing.exists?experimentId:''),experimentRef=linkedExperimentId?db.doc(`${root}/nestlocal_experiments/${linkedExperimentId}`):null,sampleRef=linkedExperimentId?db.doc(`${root}/nestlocal_experiment_samples/${hash(`${linkedExperimentId}|${targetType}|${targetId}`).slice(0,32)}`):null,stateRef=linkedExperimentId?db.doc(`${root}/nestlocal_experiment_state/active`):null;
      let experimentSnap=null,sampleSnap=null,experimentCounted=false,experimentReason='',experimentCompleted=false,experimentVariant='';
      if(experimentRef&&sampleRef)[experimentSnap,sampleSnap]=await Promise.all([tx.get(experimentRef),tx.get(sampleRef)]);
      if(existingExperimentId&&experimentSnap?.exists&&existingData?.experimentRecorded===true){
        const expData={id:experimentSnap.id,...experimentSnap.data()},updated=updateExperimentProgress(expData,{variant:existingData.experimentVariant||channel,outcome,previousOutcome,counted:true}),reviewChanged=previousOutcome!==outcome&&Boolean(expData.review?.decision),reviewStale=expData.reviewStale===true||reviewChanged,memoryRef=reviewChanged&&expData.actionType?db.doc(`${root}/nestlocal_decision_memory/${expData.actionType}`):null,memorySnap=memoryRef?await tx.get(memoryRef):null;
        experimentVariant=existingData.experimentVariant||channel;experimentCounted=true;
        tx.set(experimentRef,{progress:updated.progress,reviewStale,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
        if(reviewChanged&&memoryRef&&memorySnap?.exists&&clean(memorySnap.data()?.sourceExperimentId)===expData.id)tx.set(memoryRef,{stale:true,staleReason:'source_outcome_changed',staleAt:admin.firestore.Timestamp.now(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
        if(sampleSnap?.exists)tx.set(sampleRef,{outcome,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      }else if(!existing.exists&&experimentId){
        if(!experimentSnap?.exists)experimentReason='EXPERIMENT_NOT_AVAILABLE';
        else{
          const expData={id:experimentSnap.id,...experimentSnap.data()};
          if(expData.status!=='active')experimentReason='EXPERIMENT_NOT_ACTIVE';
          else if(expData.actionType!==actionType)experimentReason='EXPERIMENT_ACTION_MISMATCH';
          else if(!experimentTargetEligible)experimentReason='EXPERIMENT_TARGET_NOT_ELIGIBLE';
          else if(sampleSnap?.exists)experimentReason='EXPERIMENT_TARGET_ALREADY_USED';
          else if(!canCountNewExperimentSample(expData,channel))experimentReason='EXPERIMENT_VARIANT_FULL';
          else{
            const updated=updateExperimentProgress(expData,{variant:channel,outcome,counted:false});experimentVariant=channel;experimentCounted=true;experimentCompleted=updated.complete;
            tx.set(experimentRef,{progress:updated.progress,status:experimentCompleted?'completed':'active',completedAt:experimentCompleted?admin.firestore.FieldValue.serverTimestamp():(expData.completedAt||null),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
            tx.create(sampleRef,{experimentId,targetType,targetId,variant:channel,eventId,outcome,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
            if(experimentCompleted)tx.set(stateRef,{activeExperimentId:'',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
          }
        }
      }else if(existing.exists&&experimentId&&!existingExperimentId)experimentReason='EXPERIMENT_EVENT_ALREADY_RECORDED';
      const experimentFields=experimentCounted?{experimentId:linkedExperimentId,experimentVariant,experimentRecorded:true}:{};
      if(existing.exists){
        tx.set(eventRef,{outcome,outcomeNote,snoozeDays,resumeOn,resurfaceMode,nextEligibleDate,metricsRecorded:true,cohortMetricsRecorded:true,...experimentFields,outcomeUpdatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
        tx.set(targetRef,{assistanceCooldowns,lastAssistanceOutcome},{merge:true});
        tx.set(metricRef,{...metric,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:false});
        response={id:eventId,actionType,channel,outcome,outcomeNote,resurfaceMode,nextEligibleDate,status:existingData?.status||'completed_by_user',idempotent:true,experiment:{id:linkedExperimentId||experimentId||'',counted:experimentCounted,variant:experimentVariant,completed:experimentCompleted,reason:experimentReason}};
        return;
      }
      const at=outcomeAt,event={id:eventId,actionType,channel,outcome,outcomeNote,targetType,targetId,status:'completed_by_user',snoozeDays,resumeOn,resurfaceMode,nextEligibleDate,metricsRecorded:true,cohortMetricsRecorded:true,...experimentFields,by:req.identity.uid,at,createdAt:admin.firestore.FieldValue.serverTimestamp()};
      tx.create(eventRef,event);tx.set(targetRef,{lastAssistance:{id:eventId,actionType,channel,at,by:req.identity.uid},lastAssistanceOutcome,assistanceCooldowns},{merge:true});tx.set(metricRef,{...metric,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:false});
      response={id:eventId,actionType,channel,outcome,outcomeNote,resurfaceMode,nextEligibleDate,status:'completed_by_user',experiment:{id:experimentCounted?linkedExperimentId:(experimentId||''),counted:experimentCounted,variant:experimentVariant,completed:experimentCompleted,reason:experimentReason}};
    });
    res.status(response.idempotent?200:201).json(response);
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/messages/prepare',authenticate,authorize,async(req,res)=>{
  try{
    const b=req.body||{},category=clean(b.category),requestId=safeId(b.requestId),customerId=safeId(b.customerId);
    if(!messageCategories.has(category))return sendError(res,400,'INVALID_MESSAGE_CATEGORY');
    if(category==='service_update'&&!requestId)return sendError(res,400,'REQUEST_REQUIRED');
    if(category==='maintenance_reminder'&&!customerId)return sendError(res,400,'CUSTOMER_REQUIRED');
    const root=`organizations/${req.access.orgId}`;
    const [settingsSnap,requestSnap,customerSnap]=await Promise.all([
      db.doc(`${root}/nestlocal_settings/public`).get(),
      requestId?db.doc(`${root}/nestlocal_requests/${requestId}`).get():Promise.resolve(null),
      customerId?db.doc(`${root}/nestlocal_customers/${customerId}`).get():Promise.resolve(null)
    ]);
    const request=requestSnap?.exists?requestSnap.data():null,customer=customerSnap?.exists?customerSnap.data():null,settings=settingsSnap.data()||{};
    if(requestId&&!request)return sendError(res,404,'REQUEST_NOT_FOUND');
    if(customerId&&!customer)return sendError(res,404,'CUSTOMER_NOT_FOUND');
    const eligibility=messagingEligibility({category,request,customer,settings}),targetId=requestId||customerId,timeZone=validTimeZone(clean(settings.timezone))?clean(settings.timezone):'UTC',day=localIsoDate(timeZone),templateName=clean(eligibility.templateName);
    const id=hash(`${category}|${targetId}|${templateName}|${day}`).slice(0,32),ref=db.doc(`${root}/nestlocal_message_outbox/${id}`),existing=await ref.get();
    if(existing.exists)return res.json({id,status:existing.data().status,eligibility,idempotent:true});
    const status=eligibility.eligible?'ready':'blocked';
    const consentEvidenceRef=eligibility.reason==='WHATSAPP_OPT_IN_REQUIRED'?'':category==='service_update'?`nestlocal-consent:${requestId}:service_updates`:`nestlocal-consent:${customerId}:maintenance_reminders`;await ref.create({category,targetType:requestId?'request':'customer',targetId,channel:'whatsapp',provider:'whatsapp_cloud_api',sourceApp:'nestlocal',deliveryContractVersion:1,status,blockReason:eligibility.eligible?'':eligibility.reason,templateName,consentEvidenceRef,sendMode:'approved_template_required',preparedBy:req.identity.uid,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
    res.status(201).json({id,status,eligibility});
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/messages/prepare-due-reminders',authenticate,authorize,async(req,res)=>{
  try{
    const root=`organizations/${req.access.orgId}`,settingsSnap=await db.doc(`${root}/nestlocal_settings/public`).get(),settings=settingsSnap.data()||{},timeZone=validTimeZone(clean(settings.timezone))?clean(settings.timezone):'UTC',today=localIsoDate(timeZone),dueLimit=200,customersSnap=await db.collection(`${root}/nestlocal_customers`).where('nextServiceDate','<=',today).orderBy('nextServiceDate').limit(dueLimit).get(),customers=customersSnap.docs.map(x=>({id:x.id,...x.data()})),readiness=reminderReadiness(customers,settings,{truncated:customersSnap.size===dueLimit}),eligible=readiness.items.filter(x=>x.eligible);
    if(!eligible.length)return res.json({preparedCount:0,existingCount:0,dueCount:readiness.dueCount,dueCountTruncated:readiness.dueCountTruncated,readyCount:0,blockedCount:readiness.blockedCount,reasonCounts:readiness.reasonCounts,today});
    const refs=eligible.map(item=>{const id=hash(`maintenance_reminder|${item.customerId}|${item.templateName}|${today}`).slice(0,32);return{item,id,ref:db.doc(`${root}/nestlocal_message_outbox/${id}`)}});
    const existing=await Promise.all(refs.map(x=>x.ref.get())),batch=db.batch();let preparedCount=0,existingCount=0;
    for(let i=0;i<refs.length;i++){const {item,ref}=refs[i];if(existing[i].exists){existingCount++;continue}preparedCount++;batch.create(ref,{category:'maintenance_reminder',targetType:'customer',targetId:item.customerId,channel:'whatsapp',provider:'whatsapp_cloud_api',sourceApp:'nestlocal',deliveryContractVersion:1,status:'ready',blockReason:'',templateName:item.templateName,consentEvidenceRef:`nestlocal-consent:${item.customerId}:maintenance_reminders`,sendMode:'approved_template_required',preparedBy:req.identity.uid,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()})}
    if(preparedCount)await batch.commit();
    res.json({preparedCount,existingCount,dueCount:readiness.dueCount,dueCountTruncated:readiness.dueCountTruncated,readyCount:readiness.readyCount,blockedCount:readiness.blockedCount,reasonCounts:readiness.reasonCounts,today})
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.get('/api/organizations/:orgId/nestlocal/requests/:requestId/photos/:photoIndex',authenticate,authorize,async(req,res)=>{try{const requestId=safeId(req.params.requestId),index=Number(req.params.photoIndex);if(!requestId||!Number.isSafeInteger(index)||index<0||index>4)return sendError(res,404,'NOT_FOUND');const doc=await db.doc(`organizations/${req.access.orgId}/nestlocal_requests/${requestId}`).get(),attachment=doc.data()?.attachments?.[index];if(!doc.exists||!attachment?.path||!attachment.path.startsWith(`organizations/${req.access.orgId}/nestlocal/requests/${requestId}/`))return sendError(res,404,'NOT_FOUND');res.set({'Content-Type':attachment.contentType,'Cache-Control':'private,no-store','Content-Disposition':`inline; filename="pedido-${requestId}-${index+1}"`});admin.storage().bucket().file(attachment.path).createReadStream().on('error',e=>{console.error(e);if(!res.headersSent)sendError(res,404,'NOT_FOUND');else res.destroy(e)}).pipe(res)}catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}});

app.post('/api/organizations/:orgId/nestlocal/requests',authenticate,authorize,async(req,res)=>{
  try{
    const b=req.body||{},name=clean(b.name).slice(0,100),customerPhone=phone(b.phone),serviceId=safeId(b.serviceId),addressLine=clean(b.addressLine).slice(0,180),city=clean(b.city).slice(0,80),coverageCode=slug(b.coverageCode),preferredDate=clean(b.preferredDate).slice(0,10),preferredWindow=clean(b.preferredWindow||'flexible'),note=clean(b.note).slice(0,1000);
    if(name.length<2||customerPhone.length<10||!serviceId||addressLine.length<5||!coverageCode||(preferredDate&&!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate))||!serviceWindows.has(preferredWindow))return sendError(res,400,'INVALID_REQUEST');
    const root=`organizations/${req.access.orgId}`,[settings,service]=await Promise.all([db.doc(`${root}/nestlocal_settings/public`).get(),db.doc(`${root}/nestlocal_services/${serviceId}`).get()]);
    if(!settings.exists)return sendError(res,409,'SETUP_REQUIRED');if(!service.exists)return sendError(res,400,'INVALID_SERVICE');
    const settingsData=settings.data()||{},timeZone=validTimeZone(clean(settingsData.timezone))?clean(settingsData.timezone):'UTC',today=localIsoDate(timeZone);
    if(preferredDate&&preferredDate<today)return sendError(res,400,'INVALID_REQUEST');
    const requestRef=db.collection(`${root}/nestlocal_requests`).doc(),customerId=hash(customerPhone).slice(0,28),customerRef=db.doc(`${root}/nestlocal_customers/${customerId}`),monthId=today.slice(0,7),usageRef=db.doc(`${root}/nestlocal_usage/${monthId}`),createdAt=admin.firestore.Timestamp.now(),record={organizationId:req.access.orgId,customerId,customer:{name,phone:customerPhone},address:{line:addressLine,city,coverageCode},preference:{date:preferredDate,window:preferredWindow},serviceId,quantity:1,equipmentType:'',safeAccess:false,note,status:'new',quote:{organizationId:req.access.orgId,catalogVersion:clean(settingsData.catalogVersion||'draft'),serviceId,quantity:1,currency:'BRL',outcome:'review',reasons:[],unitPriceCents:null,totalCents:null,durationMinutes:null,inclusions:null,exclusions:null,createdAt:new Date().toISOString(),expiresAt:null,source:'internal'},trackingTokenHash:'',trackingTokenHashes:[],consent:{accepted:false,source:'internal'},messagingConsent:{serviceUpdates:{accepted:false,source:'internal'},maintenanceReminders:{accepted:false,source:'internal'}},source:'internal',createdAt,updatedAt:admin.firestore.FieldValue.serverTimestamp()};
    await db.runTransaction(async tx=>{const usage=await tx.get(usageRef),count=Number(usage.data()?.requestCount||0);if(count>=req.access.entitlement.limits.requestsPerMonth)throw new TypeError('PLAN_REQUEST_LIMIT');tx.create(requestRef,record);tx.set(customerRef,{name,phone:customerPhone,lastRequestAt:createdAt,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});tx.set(usageRef,{monthId,requestCount:count+1,plan:req.access.entitlement.plan,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})});
    res.status(201).json({requestId:requestRef.id,status:'new'});
  }catch(e){console.error(e);if(e?.message==='PLAN_REQUEST_LIMIT')return sendError(res,429,'PLAN_REQUEST_LIMIT');sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/quote',authenticate,authorize,async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId),amountCents=Number(req.body?.amountCents),note=clean(req.body?.note).slice(0,500);if(!requestId||!Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>100000000)return sendError(res,400,'INVALID_QUOTE');
    const root=`organizations/${req.access.orgId}`,ref=db.doc(`${root}/nestlocal_requests/${requestId}`),settingsRef=db.doc(`${root}/nestlocal_settings/public`);let response=null;
    await db.runTransaction(async tx=>{const [snap,settings]=await Promise.all([tx.get(ref),tx.get(settingsRef)]);if(!snap.exists)throw new TypeError('REQUEST_NOT_FOUND');const current=snap.data()||{},status=clean(current.status);if(!['new','reviewing','quoted'].includes(status)||current.decision?.status)throw new TypeError('QUOTE_LOCKED');const validForMinutes=Math.min(1440,Math.max(5,Number(settings.data()?.validForMinutes||30))),now=new Date(),expiresAt=new Date(now.getTime()+validForMinutes*60000).toISOString(),quoteData={...(current.quote||{}),organizationId:req.access.orgId,serviceId:current.serviceId,quantity:Number(current.quantity||1),currency:'BRL',outcome:'priced',reasons:[],totalCents:amountCents,source:'manual',manualNote:note,createdAt:current.quote?.createdAt||now.toISOString(),expiresAt};
      const update={quote:quoteData,'commercial.quotedAmountCents':amountCents,quotedAt:admin.firestore.Timestamp.now(),quotedBy:req.identity.uid,status:'quoted',updatedAt:admin.firestore.FieldValue.serverTimestamp()};if(status!=='quoted')update.statusHistory=admin.firestore.FieldValue.arrayUnion({status:'quoted',at:admin.firestore.Timestamp.now(),by:req.identity.uid});tx.update(ref,update);response={ok:true,status:'quoted',amountCents,expiresAt}});
    res.json(response);
  }catch(e){console.error(e);const code=e?.message;if(code==='REQUEST_NOT_FOUND')return sendError(res,404,code);if(code==='QUOTE_LOCKED')return sendError(res,409,code);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/review-link',authenticate,authorize,async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId);if(!requestId)return sendError(res,400,'INVALID_REQUEST');
    const root=`organizations/${req.access.orgId}`,ref=db.doc(`${root}/nestlocal_requests/${requestId}`),publicToken=`${req.access.orgId}.${token()}`,digest=hash(publicToken);let result=null;
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)throw new TypeError('REQUEST_NOT_FOUND');
      const current=snap.data()||{};if(current.status!=='completed')throw new TypeError('REVIEW_NOT_READY');
      const hashes=[...new Set([...(Array.isArray(current.reviewTokenHashes)?current.reviewTokenHashes:[]),clean(current.reviewTokenHash),digest].filter(Boolean))].slice(-3);
      tx.update(ref,{reviewTokenHash:digest,reviewTokenHashes:hashes,reviewLinkIssuedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
      result={requestId,reviewPath:`/review/${requestId}?token=${encodeURIComponent(publicToken)}`};
    });
    res.json(result);
  }catch(e){console.error(e);const code=e?.message;if(code==='REQUEST_NOT_FOUND')return sendError(res,404,code);if(code==='REVIEW_NOT_READY')return sendError(res,409,code);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/evidence',authenticate,authorize,evidenceUpload.array('photos',8),async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId),phase=clean(req.body?.phase||'after').toLowerCase(),note=clean(req.body?.note).slice(0,300);if(!requestId||!['before','after','other'].includes(phase))return sendError(res,400,'INVALID_EVIDENCE');
    const root=`organizations/${req.access.orgId}`,ref=db.doc(`${root}/nestlocal_requests/${requestId}`),doc=await ref.get();if(!doc.exists)return sendError(res,404,'REQUEST_NOT_FOUND');
    const current=doc.data()||{};if(!['scheduled','in_progress','completed'].includes(current.status))return sendError(res,409,'EVIDENCE_NOT_READY');
    const existing=Array.isArray(current.workEvidence)?current.workEvidence:[],files=Array.isArray(req.files)?req.files:[];if(!files.length)return sendError(res,400,'PHOTOS_REQUIRED');if(existing.length+files.length>24)return sendError(res,409,'EVIDENCE_LIMIT');if(!files.every(validImage))return sendError(res,415,'INVALID_PHOTO');
    const bucket=admin.storage().bucket(),saved=[];for(const [index,file] of files.entries()){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.mimetype],path=`${root}/nestlocal/requests/${requestId}/evidence/${Date.now()}-${index}.${ext}`;await bucket.file(path).save(file.buffer,{resumable:false,metadata:{contentType:file.mimetype,cacheControl:'private,max-age=0',metadata:{organizationId:req.access.orgId,requestId,phase}}});saved.push({path,contentType:file.mimetype,size:file.size,phase,note,uploadedBy:req.identity.uid,uploadedAt:admin.firestore.Timestamp.now()})}
    await ref.update({workEvidence:admin.firestore.FieldValue.arrayUnion(...saved),updatedAt:admin.firestore.FieldValue.serverTimestamp()});res.status(201).json({uploaded:saved.length,total:existing.length+saved.length,phase});
  }catch(e){console.error(e);sendError(res,e?.code==='LIMIT_FILE_SIZE'?413:500,e?.code==='LIMIT_FILE_SIZE'?'PHOTO_TOO_LARGE':'UPLOAD_FAILED')}
});

app.get('/api/organizations/:orgId/nestlocal/requests/:requestId/evidence/:evidenceIndex',authenticate,authorize,async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId),index=Number(req.params.evidenceIndex);if(!requestId||!Number.isSafeInteger(index)||index<0||index>23)return sendError(res,404,'NOT_FOUND');
    const doc=await db.doc(`organizations/${req.access.orgId}/nestlocal_requests/${requestId}`).get(),evidence=doc.data()?.workEvidence?.[index];if(!doc.exists||!evidence?.path||!evidence.path.startsWith(`organizations/${req.access.orgId}/nestlocal/requests/${requestId}/evidence/`))return sendError(res,404,'NOT_FOUND');
    res.set({'Content-Type':evidence.contentType,'Cache-Control':'private,no-store','Content-Disposition':`inline; filename="evidencia-${requestId}-${index+1}"`});admin.storage().bucket().file(evidence.path).createReadStream().on('error',e=>{console.error(e);if(!res.headersSent)sendError(res,404,'NOT_FOUND');else res.destroy(e)}).pipe(res);
  }catch(e){console.error(e);sendError(res,500,'INTERNAL_ERROR')}
});

app.post('/api/organizations/:orgId/nestlocal/requests/:requestId/tracking-link',authenticate,authorize,async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId);if(!requestId)return sendError(res,400,'INVALID_REQUEST');const root=`organizations/${req.access.orgId}`,ref=db.doc(`${root}/nestlocal_requests/${requestId}`),publicToken=`${req.access.orgId}.${token()}`,digest=hash(publicToken);let result=null;
    await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new TypeError('REQUEST_NOT_FOUND');const current=snap.data()||{},amount=Number.isSafeInteger(Number(current.quote?.totalCents))?Number(current.quote.totalCents):Number.isSafeInteger(Number(current.commercial?.finalAmountCents))?Number(current.commercial.finalAmountCents):0;if(amount<=0)throw new TypeError('QUOTE_NOT_READY');if(['cancelled'].includes(clean(current.status)))throw new TypeError('TRACKING_LOCKED');const hashes=[...new Set([...(Array.isArray(current.trackingTokenHashes)?current.trackingTokenHashes:[]),clean(current.trackingTokenHash),digest].filter(Boolean))].slice(-3);tx.update(ref,{trackingTokenHash:digest,trackingTokenHashes:hashes,trackingLinkIssuedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});result={requestId,trackingPath:`/track/${requestId}?token=${encodeURIComponent(publicToken)}`}});
    res.json(result);
  }catch(e){console.error(e);const code=e?.message;if(code==='REQUEST_NOT_FOUND')return sendError(res,404,code);if(['QUOTE_NOT_READY','TRACKING_LOCKED'].includes(code))return sendError(res,409,code);sendError(res,500,'INTERNAL_ERROR')}
});

app.patch('/api/organizations/:orgId/nestlocal/requests/:requestId',authenticate,authorize,async(req,res)=>{
  try{
    const requestId=safeId(req.params.requestId),b=req.body||{};if(!requestId)return sendError(res,400,'INVALID_REQUEST');
    const ref=db.doc(`organizations/${req.access.orgId}/nestlocal_requests/${requestId}`);
    let response={ok:true};
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);if(!snap.exists)throw new TypeError('REQUEST_NOT_FOUND');
      const current=snap.data(),update={updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      if(b.status!==undefined){
        const status=clean(b.status);if(!requestStatuses.has(status))throw new TypeError('INVALID_STATUS');if(status!==current.status&&!requestTransitions[clean(current.status)]?.has(status))throw new TypeError('INVALID_STATUS_TRANSITION');
        update.status=status;
        if(status!==current.status){
          update.statusHistory=admin.firestore.FieldValue.arrayUnion({status,at:admin.firestore.Timestamp.now(),by:req.identity.uid});
          if(status==='accepted'&&current.lastAssistance?.actionType==='quote_followup'&&freshAssistance(current.lastAssistance,30))update.assistedConversion={actionEventId:clean(current.lastAssistance.id),actionType:current.lastAssistance.actionType,channel:current.lastAssistance.channel,at:current.lastAssistance.at};
          if(status==='in_progress'&&!current.execution?.startedAt)update['execution.startedAt']=admin.firestore.FieldValue.serverTimestamp();
          if(status==='completed'&&!current.execution?.completedAt)update['execution.completedAt']=admin.firestore.FieldValue.serverTimestamp();
        }
      }
      if(b.scheduledDate!==undefined){
        const value=clean(b.scheduledDate);if(value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError('INVALID_SCHEDULE_DATE');update['schedule.date']=value;
      }
      if(b.scheduledWindow!==undefined){
        const value=clean(b.scheduledWindow);if(value&&!serviceWindows.has(value))throw new TypeError('INVALID_SCHEDULE_WINDOW');update['schedule.window']=value;
      }
      if(b.assignedTo!==undefined)update['schedule.assignedTo']=clean(b.assignedTo).slice(0,100);
      if(b.executionNotes!==undefined)update['execution.notes']=clean(b.executionNotes).slice(0,1500);
      if(b.warrantyUntil!==undefined){const value=clean(b.warrantyUntil);if(value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError('INVALID_WARRANTY_DATE');update['warranty.until']=value}
      if(b.warrantyNotes!==undefined)update['warranty.notes']=clean(b.warrantyNotes).slice(0,500);
      if(b.finalAmountCents!==undefined){
        const value=Number(b.finalAmountCents);if(!Number.isSafeInteger(value)||value<0||value>100000000)throw new TypeError('INVALID_AMOUNT');update['commercial.finalAmountCents']=value;
      }
      if(b.amountPaidCents!==undefined){
        const value=Number(b.amountPaidCents);if(!Number.isSafeInteger(value)||value<0||value>100000000)throw new TypeError('INVALID_AMOUNT');update['commercial.amountPaidCents']=value;
      }
      if(b.paymentStatus!==undefined){
        const value=clean(b.paymentStatus);if(!paymentStatuses.has(value))throw new TypeError('INVALID_PAYMENT_STATUS');update['commercial.paymentStatus']=value;
      }
      if(b.nextServiceDate!==undefined){
        const value=clean(b.nextServiceDate);if(value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError('INVALID_NEXT_SERVICE_DATE');update['return.nextServiceDate']=value;update['return.source']=value?'manual':admin.firestore.FieldValue.delete();
      }
      if(b.returnReason!==undefined)update['return.reason']=clean(b.returnReason).slice(0,240);

      const nextStatus=clean(b.status||current.status);
      if(b.finalAmountCents!==undefined||b.amountPaidCents!==undefined||b.paymentStatus!==undefined||nextStatus==='completed'){
        const nextFinal=Number(b.finalAmountCents!==undefined?b.finalAmountCents:(current.commercial?.finalAmountCents??current.quote?.totalCents??0)),nextPaid=Number(b.amountPaidCents!==undefined?b.amountPaidCents:(current.commercial?.amountPaidCents||0)),nextPayment=clean(b.paymentStatus!==undefined?b.paymentStatus:(current.commercial?.paymentStatus||'pending'));
        if(!Number.isSafeInteger(nextFinal)||nextFinal<0||!Number.isSafeInteger(nextPaid)||nextPaid<0||nextPaid>nextFinal)throw new TypeError('INVALID_PAYMENT_STATE');
        if(nextPayment==='pending'&&nextPaid!==0)throw new TypeError('INVALID_PAYMENT_STATE');
        if(nextPayment==='partial'&&!(nextPaid>0&&nextPaid<nextFinal))throw new TypeError('INVALID_PAYMENT_STATE');
        if(nextPayment==='paid'&&nextPaid!==nextFinal)throw new TypeError('INVALID_PAYMENT_STATE');
      }
      const nextSchedule={
        date:b.scheduledDate!==undefined?clean(b.scheduledDate):clean(current.schedule?.date),
        window:b.scheduledWindow!==undefined?clean(b.scheduledWindow):clean(current.schedule?.window),
        assignedTo:b.assignedTo!==undefined?safeId(b.assignedTo):safeId(current.schedule?.assignedTo)
      };
      const shouldHoldSlot=scheduleSlotStatuses.has(nextStatus),currentSlotId=clean(current.schedule?.slotId);
      const completedNow=nextStatus==='completed'&&!current.completionRecordedAt,customerId=safeId(current.customerId),serviceId=safeId(current.serviceId);
      let nextSlotId='',memberRef=null,slotRef=null,oldSlotRef=null,customerRef=null,serviceRef=null,settingsRef=null;
      if(shouldHoldSlot){
        if(!nextSchedule.date||!serviceWindows.has(nextSchedule.window)||!nextSchedule.assignedTo)throw new TypeError('SCHEDULE_REQUIRED');
        memberRef=db.doc(`organizations/${req.access.orgId}/members/${nextSchedule.assignedTo}`);
        nextSlotId=scheduleSlotId(nextSchedule);
        slotRef=db.doc(`organizations/${req.access.orgId}/nestlocal_schedule_slots/${nextSlotId}`);
      }
      if(currentSlotId&&currentSlotId!==nextSlotId)oldSlotRef=db.doc(`organizations/${req.access.orgId}/nestlocal_schedule_slots/${currentSlotId}`);
      if(completedNow&&customerId)customerRef=db.doc(`organizations/${req.access.orgId}/nestlocal_customers/${customerId}`);
      if(completedNow&&serviceId)serviceRef=db.doc(`organizations/${req.access.orgId}/nestlocal_services/${serviceId}`);
      if(completedNow)settingsRef=db.doc(`organizations/${req.access.orgId}/nestlocal_settings/public`);

      const [member,slot,oldSlot,customer,service,settings]=await Promise.all([
        memberRef?tx.get(memberRef):Promise.resolve(null),
        slotRef?tx.get(slotRef):Promise.resolve(null),
        oldSlotRef?tx.get(oldSlotRef):Promise.resolve(null),
        customerRef?tx.get(customerRef):Promise.resolve(null),
        serviceRef?tx.get(serviceRef):Promise.resolve(null),
        settingsRef?tx.get(settingsRef):Promise.resolve(null)
      ]);

      if(memberRef&&(!member?.exists||inactive(member.data())||!(clean(member.data()?.role||member.data()?.organizationRole).toLowerCase()==='owner'||member.data()?.appAccess?.nestlocal?.enabled===true)))throw new TypeError('INVALID_ASSIGNEE');
      if(slotRef&&slot?.exists&&slot.data()?.requestId!==requestId)throw new TypeError('SCHEDULE_CONFLICT');

      if(slotRef){
        tx.set(slotRef,{requestId,date:nextSchedule.date,window:nextSchedule.window,assignedTo:nextSchedule.assignedTo,status:'reserved',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
        update['schedule.date']=nextSchedule.date;
        update['schedule.window']=nextSchedule.window;
        update['schedule.assignedTo']=nextSchedule.assignedTo;
        update['schedule.slotId']=nextSlotId;
        if(nextStatus==='scheduled'&&!current.schedule?.confirmedAt)update['schedule.confirmedAt']=admin.firestore.FieldValue.serverTimestamp();
      }
      if(oldSlotRef&&oldSlot?.exists&&oldSlot.data()?.requestId===requestId)tx.delete(oldSlotRef);
      if(!shouldHoldSlot&&currentSlotId)update['schedule.slotId']=admin.firestore.FieldValue.delete();

      if(completedNow){
        const finalAmount=Number.isSafeInteger(Number(b.finalAmountCents))?Number(b.finalAmountCents):Number(current.commercial?.finalAmountCents??current.quote?.totalCents??0);
        update.completionRecordedAt=admin.firestore.FieldValue.serverTimestamp();
        const assistance=current.assistedConversion||current.assistedAcquisition;
        if(assistance&&Math.max(0,finalAmount||0)>0){
          const revenueEventRef=db.doc(`organizations/${req.access.orgId}/nestlocal_revenue_events/${requestId}`),metricsRef=db.doc(`organizations/${req.access.orgId}/nestlocal_metrics/revenue`);
          tx.set(revenueEventRef,{requestId,customerId:current.customerId||'',kind:'assisted',amountCents:Math.max(0,finalAmount||0),actionEventId:clean(assistance.actionEventId),actionType:clean(assistance.actionType),channel:clean(assistance.channel),completedAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:false});
          tx.set(metricsRef,{assistedRevenueCents:admin.firestore.FieldValue.increment(Math.max(0,finalAmount||0)),assistedJobs:admin.firestore.FieldValue.increment(1),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
          update['attribution.assisted']=true;update['attribution.actionEventId']=clean(assistance.actionEventId);update['attribution.actionType']=clean(assistance.actionType);
        }
        if(customerRef){
          const lifetime=Number(customer?.data()?.lifetimeRevenueCents||0),explicitDate=b.nextServiceDate!==undefined?clean(b.nextServiceDate):null,currentDate=clean(current.return?.nextServiceDate),ruleDays=Number(service?.data()?.returnAfterDays||0),orgTimeZone=clean(settings?.data()?.timezone)||'America/Sao_Paulo',completedLocalDate=localIsoDate(validTimeZone(orgTimeZone)?orgTimeZone:'UTC'),autoDate=explicitDate===null&&!currentDate&&Number.isInteger(ruleDays)&&ruleDays>0?addIsoDays(completedLocalDate,ruleDays):'',nextServiceDate=explicitDate!==null?explicitDate:(currentDate||autoDate),manualReason=clean(b.returnReason!==undefined?b.returnReason:current.return?.reason),autoReason=autoDate?clean(service?.data()?.name||current.serviceId):'',nextServiceReason=manualReason||autoReason;
          if(autoDate){update['return.nextServiceDate']=autoDate;update['return.reason']=nextServiceReason;update['return.source']='service_rule';update['return.ruleDays']=ruleDays}
          tx.set(customerRef,{name:current.customer?.name||customer?.data()?.name||'',phone:current.customer?.phone||customer?.data()?.phone||'',lastCompletedAt:admin.firestore.FieldValue.serverTimestamp(),lastServiceId:current.serviceId||'',lastRequestId:requestId,lifetimeRevenueCents:lifetime+Math.max(0,finalAmount||0),nextServiceDate,nextServiceReason,nextServiceSource:autoDate?'service_rule':nextServiceDate?'manual_or_existing':'',updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
        }
      } else if(current.customerId&&(b.nextServiceDate!==undefined||b.returnReason!==undefined)){
        tx.set(db.doc(`organizations/${req.access.orgId}/nestlocal_customers/${current.customerId}`),{nextServiceDate:clean(b.nextServiceDate!==undefined?b.nextServiceDate:current.return?.nextServiceDate),nextServiceReason:clean(b.returnReason!==undefined?b.returnReason:current.return?.reason),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      }
      tx.update(ref,update);response={ok:true,status:nextStatus};
    });
    res.json(response);
  }catch(e){
    console.error(e);const code=e?.message;
    if(['REQUEST_NOT_FOUND','INVALID_STATUS','INVALID_SCHEDULE_DATE','INVALID_SCHEDULE_WINDOW','SCHEDULE_REQUIRED','INVALID_ASSIGNEE','SCHEDULE_CONFLICT','INVALID_AMOUNT','INVALID_PAYMENT_STATUS','INVALID_PAYMENT_STATE','INVALID_NEXT_SERVICE_DATE','INVALID_WARRANTY_DATE','INVALID_STATUS_TRANSITION'].includes(code))return sendError(res,code==='REQUEST_NOT_FOUND'?404:400,code);
    sendError(res,500,'INTERNAL_ERROR')
  }
});

app.use((err,_req,res,_next)=>{console.error(err);sendError(res,err?.code==='LIMIT_FILE_SIZE'?413:400,err?.code==='LIMIT_FILE_SIZE'?'PHOTO_TOO_LARGE':'INVALID_UPLOAD')});
app.use((_req,res)=>sendError(res,404,'NOT_FOUND'));
const port=Number(process.env.PORT||8080);app.listen(port,()=>console.log(`NestLocal API listening on ${port}`));

import { createNestAiClient } from '@millionsnest/ai';

const NESTAI_BASE_URL = String(process.env.NESTAI_BASE_URL || 'https://ai.millionsnest.com/v1/');
const HUB_BASE_URL = String(process.env.MILLIONSNEST_HUB_URL || 'https://www.millionsnest.com/');

function localeOf(value) {
  const raw = String(value || 'pt').toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('es')) return 'es';
  return 'pt-BR';
}

export function readNestLocalSessionToken(req) {
  const auth = typeof req?.headers?.authorization === 'string' ? req.headers.authorization : '';
  if (auth.startsWith('Bearer nl_')) return auth.slice('Bearer '.length);
  const cookieHeader = String(req?.headers?.cookie || '');
  const rawCookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith('__session='));
  if (!rawCookie) return '';
  const value = rawCookie.slice('__session='.length);
  return /^nl_[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
}

async function exchangeNestLocalSession(sessionToken, locale) {
  if (!/^nl_[A-Za-z0-9_-]{43}$/.test(sessionToken)) throw new Error('NESTLOCAL_NESTAI_SESSION_REQUIRED');
  const response = await fetch(new URL('api/v1/ai/nestlocal-session-token', HUB_BASE_URL), {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + sessionToken,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ locale: localeOf(locale) }),
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.token) {
    throw new Error(String(body?.error || 'NESTLOCAL_NESTAI_TOKEN_EXCHANGE_FAILED'));
  }
  return String(body.token);
}

export function createNestLocalAiClient({ sessionToken, organizationId, locale }) {
  if (!organizationId) throw new Error('NESTLOCAL_NESTAI_ORG_REQUIRED');
  return createNestAiClient({
    appId: 'nestlocal',
    organizationId,
    locale: localeOf(locale),
    baseUrl: NESTAI_BASE_URL,
    hubBaseUrl: HUB_BASE_URL,
    getToken: () => exchangeNestLocalSession(sessionToken, locale),
  });
}

export async function extractNestLocalRequest(input) {
  const client = createNestLocalAiClient(input);
  const response = await client.run({
    task: 'nestlocal.request.extract',
    input: {
      text: String(input.text || '').slice(0, 6000),
      authority: {
        mode: 'suggestion_only',
        calculatePrice: false,
        reserveSchedule: false,
        mutateRequest: false,
      },
    },
  });
  return response.result;
}

export async function composeNestLocalQuote(input) {
  const client = createNestLocalAiClient(input);
  const response = await client.run({
    task: 'nestlocal.quote.compose',
    input: {
      businessName: input.businessName || '',
      service: input.service || '',
      currency: input.currency || 'BRL',
      totalCents: input.totalCents,
      expiresAt: input.expiresAt || null,
      scope: input.scope || {},
      schedule: input.schedule || null,
      customerName: input.customerName || '',
      authority: {
        mode: 'draft_only',
        calculatePrice: false,
        reserveSchedule: false,
        sendMessage: false,
      },
    },
  });
  return String(response.result || '').trim();
}

export async function composeNestLocalFollowup(input) {
  const client = createNestLocalAiClient(input);
  const response = await client.run({
    task: 'nestlocal.followup.compose',
    input: {
      businessName: input.businessName || '',
      customerName: input.customerName || '',
      service: input.service || '',
      status: input.status || '',
      currency: input.currency || 'BRL',
      totalCents: Number.isSafeInteger(input.totalCents) ? input.totalCents : null,
      ageHours: Number.isFinite(input.ageHours) ? input.ageHours : null,
      lastOutcome: input.lastOutcome || '',
      lastOutcomeNote: input.lastOutcomeNote || '',
      whatsappAllowed: input.whatsappAllowed === true,
      authority: {
        mode: 'draft_only',
        sendMessage: false,
        mutateRequest: false,
        changeStatus: false,
      },
    },
  });
  return String(response.result || '').trim();
}

// F4 gated adapter: no provider or model IDs belong in NestLocal.
// Only minimal structured operational facts are forwarded; generated output is never an action.
export async function explainNestLocalPulse(input) {
  const client=createNestLocalAiClient(input);
  const sourceId=String(input.sourceId||'').slice(0,128);
  const response=await client.run({
    task:'nestlocal.pulse.explain',
    input:{
      facts:{status:String(input.status||'').slice(0,40),date:String(input.date||'').slice(0,10)},
      sourceIds:[sourceId],
      authority:{mode:'suggestion_only',sendMessage:false,reserveSchedule:false,mutateRequest:false,calculatePrice:false},
    },
  });
  const result=typeof response.result==='string'?JSON.parse(response.result):response.result;
  if(!result||typeof result.summary!=='string'||!Array.isArray(result.sourceIds)||
     result.sourceIds.length!==1||result.sourceIds[0]!==sourceId)throw new Error('AI_UNGROUNDED_OUTPUT');
  return {summary:result.summary.slice(0,700),reason:String(result.reason||'').slice(0,700),
    nextStep:String(result.nextStep||'').slice(0,400),
    uncertainty:result.uncertainty?String(result.uncertainty).slice(0,400):null,
    sourceIds:[sourceId]};
}

// Tasks registered centrally in NestAI F4. All consumers gate invocation server-side.
export async function assistNestLocalSetup(input) {
  const client=createNestLocalAiClient(input);
  const response=await client.run({
    task:'nestlocal.setup.assist',
    input:{
      businessType:String(input.businessType||'general').slice(0,40),
      coverageCount:Number(input.coverageCount)||0,
      serviceDraftCount:Number(input.serviceDraftCount)||0,
      hasReplyChannel:input.hasReplyChannel===true,
      authority:{mode:'suggestion_only',publishCatalog:false,changePrices:false,connectChannels:false},
    },
  });
  const raw=typeof response.result==='string'?JSON.parse(response.result):response.result;
  if(!raw||typeof raw.summary!=='string'||!Array.isArray(raw.suggestions)||!Array.isArray(raw.warnings))throw new Error('AI_SCHEMA_INVALID');
  return {
    summary:raw.summary.slice(0,500),
    suggestions:raw.suggestions.slice(0,5).filter(x=>x&&typeof x.field==='string'&&typeof x.value==='string').map(x=>({field:x.field.slice(0,60),value:x.value.slice(0,160),reason:String(x.reason||'').slice(0,260)})),
    warnings:raw.warnings.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,260)),
  };
}
export async function suggestNestLocalReturn(input) {
  if(input.purposeConsent!==true)throw new Error('PURPOSE_CONSENT_REQUIRED');
  const client=createNestLocalAiClient(input);
  const response=await client.run({
    task:'nestlocal.return.suggest',
    input:{
      serviceCategory:String(input.serviceCategory||'service').slice(0,60),
      dueDate:String(input.dueDate||'').slice(0,10),
      purposeConsent:true,
      authority:{mode:'draft_only',sendMessage:false,changeStatus:false,reserveSchedule:false},
    },
  });
  const raw=typeof response.result==='string'?JSON.parse(response.result):response.result;
  if(!raw||typeof raw.draft!=='string'||typeof raw.consentRequired!=='boolean'||!Array.isArray(raw.warnings))throw new Error('AI_SCHEMA_INVALID');
  return {draft:raw.draft.slice(0,1200),consentRequired:raw.consentRequired,warnings:raw.warnings.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,300))};
}

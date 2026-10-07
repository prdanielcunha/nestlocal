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

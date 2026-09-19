import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addIsoCalendarDays } from '../web/action-focus.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('calendar helper crosses month and year boundaries safely',()=>{
  assert.equal(addIsoCalendarDays('2026-01-31',1),'2026-02-01');
  assert.equal(addIsoCalendarDays('2026-12-31',1),'2027-01-01');
  assert.equal(addIsoCalendarDays('2026-09-19',90),'2026-12-18');
  assert.equal(addIsoCalendarDays('invalid',7),'');
});

test('backend accepts an exact future revisit date without weakening quick snooze validation',()=>{
  const server=read('../server.mjs');
  for(const token of [
    "resumeOn=clean(b.resumeOn)",
    "'INVALID_RESUME_DATE'",
    "maxResumeDate=addIsoDays(today,90)",
    "resumeOn<=today||resumeOn>maxResumeDate",
    "nextEligibleDate=resumeOn||addIsoDays(today,snoozeDays)",
    "resurfaceMode=resumeOn?'date':'days'",
    "snoozeDays,resumeOn,resurfaceMode,nextEligibleDate",
  ]) assert.ok(server.includes(token),'missing '+token);
  assert.ok(server.includes("snoozeDays<1||snoozeDays>30"));
});

test('Action Assistant exposes quick presets plus an exact date picker',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "addIsoCalendarDays",
    "remind30Days:'Rever em 30 dias'",
    "remindCustom:'Escolher uma data'",
    'value="30"',
    'value="custom"',
    'id="action-resume-date"',
    "maxResumeDate=addIsoCalendarDays(todayIso,90)",
    "resumeOn=snoozeValue==='custom'?",
    "resumeOn:resumeOn||undefined",
    "resumeDateRequired",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('custom date field is hidden until explicitly selected',()=>{
  const client=read('../web/live.js');
  assert.ok(client.includes("actionSnooze.value==='custom'"));
  assert.ok(client.includes("actionResumeWrap.hidden=!custom"));
  assert.ok(client.includes("actionResumeDate.value=addIsoCalendarDays(organizationDateIso(),7)"));
});

test('exact revisit copy exists in PT EN ES',()=>{
  const client=read('../web/live.js');
  for(const token of [
    "customResumeDate:'Data exata'",
    "customResumeDate:'Exact date'",
    "customResumeDate:'Fecha exacta'",
    "invalidResumeDate:'Escolha uma data futura válida, dentro de 90 dias.'",
  ]) assert.ok(client.includes(token),'missing '+token);
});

test('exact revisit control is visually integrated with action memory',()=>{
  const css=read('../web/operations.css');
  for(const token of [
    '.assist-resume-date',
    '.assist-resume-date[hidden]',
    '.assist-resume-date input',
  ]) assert.ok(css.includes(token),'missing '+token);
});

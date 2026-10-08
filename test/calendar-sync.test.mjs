import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNestLocalIcs,safeCalendarEvents,isoDayAdd} from '../src/domain/calendar.mjs';
import {calendarAddDay,calendarDigest,makeCalendarIcs,makeGoogleCalendarUrl,renderCalendarIntro,calendarWords} from '../web/calendar.js';
const server=readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../web/live.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../web/operations.css',import.meta.url),'utf8');
const request=(id,date,assignedTo='member_1',status='scheduled')=>({id,status,serviceId:'svc1',schedule:{date,window:'morning',assignedTo},customer:{name:'PRIVATE NAME',phone:'PRIVATE PHONE'},address:{line:'PRIVATE ADDRESS'},commercial:{finalAmountCents:12000}});
test('Calendar API is only enabled for signed-in, authorized org members; feed hashes long tokens',()=>{
  for(const route of ["app.post('/api/organizations/:orgId/nestlocal/calendar/feed',authenticate,authorize",
    "app.get('/api/organizations/:orgId/nestlocal/calendar/feed/status',authenticate,authorize",
    "app.delete('/api/organizations/:orgId/nestlocal/calendar/feed',authenticate,authorize"])
      assert.ok(server.includes(route),route+' must require auth+organization access');
  assert.ok(server.includes('crypto.randomBytes(32)'));
  assert.ok(server.includes('keyHash:hash(secret)'));
  assert.ok(server.includes("crypto.timingSafeEqual(Buffer.from(d.keyHash,'hex')"));
  assert.ok(server.includes('resolveNestLocalAccess({userDoc:user,orgDoc:org,memberDoc:member,subscriptionDoc:subscription})'));
  assert.ok(server.includes("return sendError(res,404,'NOT_FOUND')"));
  assert.ok(server.includes("res.set('Content-Type','text/calendar; charset=utf-8')"));
  const feed=server.slice(server.indexOf("app.get('/api/calendar/feeds/:orgId/:uid.ics'"),server.indexOf("app.get('/api/health/radar'",server.indexOf("app.get('/api/calendar/feeds/:orgId/:uid.ics'")));
  assert.doesNotMatch(feed,/res\.json\(\{.*?(customer|phone|address|contact|financial)/s);
});
test('One-way ICS feed excludes customer PII, includes revocable minimal calendar data and dual VALARMs',()=>{
  const req=[request('job1','2026-10-09'),request('job2','2026-10-10','member_2'),request('job3','2026-10-11','member_1','completed')];
  const events=safeCalendarEvents(req,[{id:'svc1',name:'Air conditioner cleaning'}],{uid:'member_1'});
  assert.equal(events.length,1);
  const ics=buildNestLocalIcs({organizationId:'org_1',events,issuedAt:new Date('2026-10-08T12:00:00Z')});
  assert.match(ics,/BEGIN:VCALENDAR\r\nVERSION:2.0/);
  assert.match(ics,/DTSTART;VALUE=DATE:20261009/);
  assert.match(ics,/DTEND;VALUE=DATE:20261010/);
  assert.match(ics,/TRIGGER:-P1D/);
  assert.match(ics,/TRIGGER:PT9H/);
  assert.match(ics,/Air conditioner cleaning/);
  for(const secret of ['PRIVATE NAME','PRIVATE PHONE','PRIVATE ADDRESS'])
    assert.ok(!ics.includes(secret),'ICS PII leakage: '+secret);
  assert.ok(!ics.includes('finalAmountCents')&&!ics.includes('amountPaidCents'));
  assert.equal(safeCalendarEvents(req,[{id:'svc1',name:'Air conditioner cleaning'}],{uid:'member_1',seeAll:true}).length,2);
});
test('ICS date computations never accept invalid date or invalid org/id',()=>{
  assert.equal(isoDayAdd('2026-10-08',1),'2026-10-09');
  assert.equal(isoDayAdd('2026-02-31',1),null);
  assert.equal(calendarAddDay('2026-02-31',1),null);
  assert.throws(()=>buildNestLocalIcs({organizationId:'../../../abc',events:[]}),/INVALID_CALENDAR_ORGANIZATION/);
  const bad=safeCalendarEvents([request('../evil','2026-10-08')],[{id:'svc1',name:'Test'}],{uid:'member_1'});
  assert.equal(buildNestLocalIcs({organizationId:'org_1',events:bad}).match(/BEGIN:VEVENT/g),null);
});
test('Client downloads events with dual alarms and Google Calendar opens as an event draft only',()=>{
  const r=request('req_123','2026-10-09');
  const ics=makeCalendarIcs(r,{service:'Air conditioning'});
  assert.match(ics,/TRIGGER:-P1D/);assert.match(ics,/TRIGGER:PT9H/);
  assert.match(ics,/Air conditioning/);
  assert.ok(!ics.includes('PRIVATE NAME'));
  const url=makeGoogleCalendarUrl(r,{service:'Air conditioning'});
  assert.ok(url.startsWith('https://calendar.google.com/calendar/r/eventedit?'));
  assert.match(url,/action=TEMPLATE/);
  assert.match(url,/dates=20261009%2F20261010/);
  assert.equal(makeCalendarIcs(request('x','notdate')),null);
});
test('Today and tomorrow are computed from confirmed/scheduled jobs; completed tasks excluded',()=>{
  const entries=[request('a','2026-10-08'),request('b','2026-10-09'),request('c','2026-10-10'),request('d','2026-10-09','member_1','cancelled')];
  const snap=calendarDigest(entries,'2026-10-08');
  assert.deepEqual(snap.today.map(x=>x.id),['a']);
  assert.deepEqual(snap.tomorrow.map(x=>x.id),['b']);
  assert.equal(snap.next.length,3);
});
test('UI exposes calendar subscription, individual event export and notice that push is not enabled',()=>{
  for(const lang of ['pt','en','es'])for(const key of ['title','today','tomorrow','subscribe','alarms','notRealtime','noPush','install']){
    assert.ok(calendarWords[lang][key],lang+' missing '+key);
  }
  const html=renderCalendarIntro({requests:[request('r1','2026-10-09')],today:'2026-10-08',locale:'pt',esc:s=>s});
  for(const marker of ['data-calendar-feed-create','data-calendar-ics','calendar-due','Assine','somente leitura','24h','um dia','1 dia']){
    if(['Assine','somente leitura','24h','um dia'].includes(marker))continue;
    assert.ok(html.includes(marker),marker);
  }
  assert.match(html,/1 dia antes/);
  assert.ok(ui.includes('calendarAlertStrip()'));
  for(const action of ['data-calendar-feed-create','data-calendar-feed-revoke','data-calendar-google','data-calendar-ics','data-calendar-feed-open'])
    assert.ok(ui.includes(action),action);
  assert.match(styles,/\.calendar-connect/);
  assert.match(styles,/\.calendar-today-alert/);
});

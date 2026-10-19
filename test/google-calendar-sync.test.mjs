import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarSyncPlan,googleEventBody,calendarEventId} from '../web/google-calendar-sync.js';
const scope={orgId:'synthetic',uid:'synthetic-user'},request={id:'request',status:'scheduled',schedule:{date:'2099-01-01',window:'morning',revision:2},customer:{name:'PRIVATE',phone:'PRIVATE'},address:{line:'PRIVATE'}};
const event=()=>({id:'synthetic-event',etag:'"version1"',...googleEventBody(request,scope)});
test('two-way calendar plan identifies push, pull, simultaneous conflict and equal dates',()=>{
 assert.equal(calendarSyncPlan(request,null,scope).type,'create');assert.equal(calendarSyncPlan(request,event(),scope).type,'equal');
 const moved={...event(),start:{date:'2099-01-03'},end:{date:'2099-01-04'}};
 assert.equal(calendarSyncPlan(request,moved,scope).type,'pull');
 const changed={...request,schedule:{...request.schedule,date:'2099-01-02',revision:3}};
 assert.equal(calendarSyncPlan(changed,event(),scope).type,'push');assert.equal(calendarSyncPlan(changed,moved,scope).type,'conflict');
});
test('calendar never adopts another tenant/user event or guesses exact time, recurrence, deletion or guests',()=>{
 for(const value of [{...event(),extendedProperties:{private:{}}},{...event(),status:'cancelled'},{...event(),start:{dateTime:'2099-01-01T10:00:00Z'}},{...event(),recurrence:['RRULE:FREQ=DAILY']},{...event(),attendees:[{email:'private@example.test'}]},{...event(),visibility:'public'}])assert.throws(()=>calendarSyncPlan(request,value,scope),/CALENDAR_UNSUPPORTED/);
 assert.throws(()=>calendarSyncPlan({...request,status:'completed'},event(),scope));
});
test('calendar payload is private, date-only, stable per organization/user/request and excludes customer PII',async()=>{
 const body=googleEventBody(request,scope);assert.equal(body.visibility,'private');assert.equal(body.start.date,'2099-01-01');assert.doesNotMatch(JSON.stringify(body),/PRIVATE/);
 const id=await calendarEventId({...scope,requestId:request.id});assert.match(id,/^[0-9a-v]{66}$/);assert.equal(await calendarEventId({...scope,requestId:request.id}),id);assert.notEqual(await calendarEventId({...scope,uid:'other-user',requestId:request.id}),id);
});

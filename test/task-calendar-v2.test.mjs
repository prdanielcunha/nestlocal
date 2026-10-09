import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTaskReminderIcs} from '../web/task-calendar.js';
test('renders an exact operator-chosen IANA time, no customer details',()=>{
 const result=makeTaskReminderIcs({id:'t_test',dueDate:'2026-10-12',dueTime:'09:30',timezone:'America/Sao_Paulo',version:2,title:'Maria 43999999999',note:'secret'},
 {issuedAt:new Date('2026-10-09T10:00:00Z')});
 assert.ok(result.includes('DTSTART;TZID=America/Sao_Paulo:20261012T093000'));
 assert.ok(result.includes('TRIGGER:-PT1H'));
 assert.equal(result.includes('Maria'),false);assert.equal(result.includes('43999999999'),false);assert.equal(result.includes('secret'),false);
});
test('all-day events are explicitly date-only and Spanish translation is safe',()=>{
 const x=makeTaskReminderIcs({id:'t1',dueDate:'2026-12-31',dueTime:'',timezone:'UTC'}, {locale:'es'});
 assert.ok(x.includes('DTSTART;VALUE=DATE:20261231'));
 assert.ok(x.includes('DTEND;VALUE=DATE:20270101'));
 assert.ok(x.includes('Recordar seguimiento'));
});
test('rejects false dates, missing zone, invalid hours and id injection',()=>{
 const base={id:'task1',dueDate:'2026-10-12',dueTime:'09:30',timezone:'America/Sao_Paulo'};
 assert.equal(makeTaskReminderIcs({...base,dueDate:'2026-02-30'}),null);
 assert.equal(makeTaskReminderIcs({...base,dueTime:'27:00'}),null);
 assert.equal(makeTaskReminderIcs({...base,timezone:'?;INJECT'}),null);
 assert.equal(makeTaskReminderIcs({...base,id:'other\r\nEND:VEVENT'}),null);
});

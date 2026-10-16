import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRequestFinance,summarizeRequestFinance} from '../src/domain/financial-reconciliation.mjs';
const completed=(changes={})=>({status:'completed',completionRecordedAt:'2026-10-01',
 quote:{totalCents:10000},commercial:{finalAmountCents:10000,amountPaidCents:5000,paymentStatus:'partial'},...changes});

test('C08: separates recognized executed amount from manually recorded receipts',()=>{
 const check=inspectRequestFinance(completed());
 assert.deepEqual(check.issues,[]);
 assert.equal(check.executedCents,10000);
 assert.equal(check.manuallyRecordedPaidCents,5000);
});
test('C08: identifies inconsistent paid, partial, cancelled and legacy states',()=>{
 assert.ok(inspectRequestFinance(completed({commercial:{finalAmountCents:10000,amountPaidCents:12000,paymentStatus:'paid'}})).issues.includes('PAID_EXCEEDS_AMOUNT'));
 assert.ok(inspectRequestFinance(completed({commercial:{finalAmountCents:10000,amountPaidCents:1,paymentStatus:'cancelled'}})).issues.includes('CANCELLED_WITH_RECEIPTS'));
 assert.ok(inspectRequestFinance(completed({commercial:{finalAmountCents:10000,paymentStatus:'partial'}})).issues.includes('HISTORICAL_PAYMENT_AMOUNT_UNKNOWN'));
 assert.ok(inspectRequestFinance(completed({completionRecordedAt:null})).issues.includes('LEGACY_COMPLETION_UNVERIFIED'));
 assert.ok(inspectRequestFinance(completed({quote:{},commercial:{paymentStatus:'paid',amountPaidCents:0}})).issues.includes('COMPLETED_AMOUNT_UNKNOWN'));
});
test('C08: assisted event amount must agree with the same completed request',()=>{
 const row=completed({attribution:{assisted:true}});
 assert.ok(inspectRequestFinance(row).issues.includes('ASSISTED_EVENT_MISSING'));
 assert.ok(inspectRequestFinance(row,{amountCents:9000}).issues.includes('ASSISTED_EVENT_AMOUNT_MISMATCH'));
 assert.deepEqual(inspectRequestFinance(row,{amountCents:10000}).issues,[]);
});
test('C08: summarizes >100 synthetic records, counts missing and hides identities',()=>{
 const records=Array.from({length:230},(_,i)=>({record:completed({customer:{name:'Synthetic-'+i},commercial:{finalAmountCents:10000,amountPaidCents:i===30?11000:5000,paymentStatus:'partial'}})}));
 const result=summarizeRequestFinance(records,250);
 assert.equal(result.scanned,230);assert.equal(result.totalCount,250);assert.equal(result.complete,false);
 assert.equal(result.completed,230);assert.equal(result.recordedExecutedCents,2300000);
 assert.equal(result.issues.PAID_EXCEEDS_AMOUNT,1);
 assert.equal(JSON.stringify(result).includes('Synthetic-'),false);
});

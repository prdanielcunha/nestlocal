# Maintenance Plans & Field Operations

## Objective

Give service companies enough recurring-maintenance and field-operation structure to run real work in NestLocal without turning the product into a vertical ERP.

The scope is operational:

**customer → maintenance plan → next visit → agenda → technician → execution → evidence → work order → warranty → next return**

## Maintenance plan

A customer can have a lightweight maintenance plan with:

- active/inactive state;
- plan name;
- interval in days;
- next visit date;
- contract start and end dates;
- operational notes.

When an active plan has a next visit, that date feeds the canonical customer return queue. Disabling a plan clears the return date only when that return was created by the maintenance plan itself.

This preserves existing manual/service-rule returns.

## Field route

Customer and agenda views expose a route action based on the stored service address.

The first version intentionally opens the address in the maps provider instead of claiming route optimization. It does not invent travel time, distance, traffic, or technician sequence.

## Printable work order

In-progress and completed requests can generate a printable work-order view using real request data:

- business;
- customer and contact;
- service address;
- service;
- date/window;
- assigned technician;
- structured intake;
- execution notes;
- evidence count;
- final amount;
- payment state and amount paid;
- warranty;
- next return.

The report is generated client-side from the already-authorized request payload. It does not publish a public document or bypass tenant authorization.

## Relationship to PMOC and formal contracts

This feature is **not** a regulatory PMOC module and must not be sold as one.

It covers the operational layer needed by many recurring-service companies: contract dates, frequency, next visit, evidence, work order, warranty, and follow-up.

A formal PMOC/compliance product would require its own domain model, responsible professionals, equipment inventory, regulatory fields, document/version rules, signatures, and jurisdiction-specific review before being claimed as complete.

## Commercial use

For HVAC, pest control, gates/security, electrical maintenance, cleaning, and mixed maintenance operators, the demo can now show:

1. imported customer;
2. active maintenance plan;
3. next visit in the return queue;
4. scheduled technician;
5. route action;
6. execution with before/after evidence;
7. printable work order;
8. warranty;
9. customer review;
10. future return.

This is enough to validate the operational value proposition without forcing a full-system replacement on day one.

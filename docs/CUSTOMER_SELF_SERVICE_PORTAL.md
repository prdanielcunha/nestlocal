# Customer Self-Service Portal

## Objective

Turn the existing secure tracking link into a useful customer surface after quote approval, without introducing a customer account or weakening tenant security.

The link now supports the customer journey:

**quote → approval → schedule → confirmation/change request → execution → balance → warranty → next return**

## Schedule confirmation

When a request is scheduled, the secure tracking page shows:

- date;
- service window;
- current customer confirmation state.

The customer can:

- confirm the time;
- request a schedule change.

The action is token-gated and accepted only while the request is actually in the `scheduled` state.

A change request does not silently choose another slot or remove the existing reservation. It becomes a high-priority **Resolve schedule change** action for the operator, preserving human control over capacity.

## Payment visibility

For in-progress/completed work, the tracking page may show:

- final amount;
- amount already recorded as paid;
- remaining balance.

These values are projections of the operator-authored payment state already stored by NestLocal.

## Optional Pix instructions

An owner/admin may configure:

- whether Pix should be displayed;
- Pix key;
- payee/identification;
- short payment instructions.

The Pix key is shown only on the token-protected tracking page and only when a balance remains.

This does **not**:

- create a Pix charge;
- confirm settlement;
- query a bank/provider;
- change the payment status automatically.

The operator still confirms payment manually. A real payment provider integration remains a separate future boundary.

## Warranty and return

After completion, the secure page can also show:

- warranty end date and operator-authored warranty notes;
- next return date and reason.

Internal technician notes, assignee IDs, evidence files, tokens, and private operational fields are not exposed by the public tracking projection.

## Commercial value

This strengthens the demo for nearly every dossier segment:

- fewer “qual horário mesmo?” messages;
- explicit reschedule signal instead of a lost WhatsApp message;
- one secure link for quote, schedule, balance, warranty and future return;
- optional Pix convenience without provider cost or false payment automation.

It also strengthens NestLocal's central positioning: the customer can stay on WhatsApp for conversation while the operational truth remains in a structured service loop.

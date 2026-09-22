# Post-Service Trust Loop

## Objective

Close the operational loop after a job is completed without turning NestLocal into a heavy ERP.

The post-service flow is now:

**execution → evidence → payment/status → warranty → next return → customer review**

## Field evidence

Authorized operators can attach private service evidence while a request is:

- scheduled;
- in progress;
- completed.

Each upload:

- accepts JPEG, PNG, or WebP;
- supports up to 8 photos per request action;
- caps the request at 24 evidence files;
- records phase: before, after, or other;
- records an optional note;
- records who uploaded it;
- stores files under the organization/request namespace;
- is retrievable only through the authenticated NestLocal API.

This evidence is separate from public intake photos so customer-submitted diagnostic images and technician work evidence do not get mixed.

## Secure review loop

A completed request can generate a dedicated customer review link.

Security rules:

- the raw review token is returned only when the operator generates a link;
- Firestore stores only token hashes;
- the authorized Home payload strips all review token hashes;
- public review routes require the review token;
- only completed requests can be reviewed;
- rating is restricted to integers from 1 to 5;
- a review is idempotent and cannot inflate metrics through repeated submission.

## Review metrics

Reviews update a factual aggregate document:

- count;
- sum of ratings;
- distribution from 1 to 5.

The Home displays only the observed average and review count. No synthetic reputation score or prediction is created.

## Commercial value

This closes two recurring objections from service companies:

1. “How do I prove what the technician did?”
2. “How do I turn a finished service into reputation and a future customer?”

For cleaning, gates/security, electrical, repairs, pest control, and HVAC, the result is a stronger demo because the story no longer ends at “completed.”

## Guardrails

- evidence is private by default;
- review links do not expose the customer phone or internal request data;
- reviews are not fabricated or prefilled;
- warranty remains optional and operator-authored;
- a review does not automatically trigger a public Google review or any third-party posting;
- WhatsApp sending remains gated by the official messaging readiness contract.

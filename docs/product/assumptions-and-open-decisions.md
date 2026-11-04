# Assumptions and Open-Decisions Register

Status key: **DEFAULT** = founder accepted the safe default on 2026-11-04 for building; **OPEN** = still needs a
real decision before the stated gate. Nothing here is legal advice. Anything touching law, money, or sensitive
data must be confirmed by qualified professionals before public launch (handbook §12.6).

## Decisions (handbook Appendix C.1)

| ID | Decision | Status | Safe default being built | Needed by |
|----|----------|--------|--------------------------|-----------|
| D1 | Minimum age, eligibility, verification (India) | DEFAULT (dev/staging only) | 18 floor in local/dev/staging. **Production has no default: registration stays closed until `REGISTRATION_MIN_AGE` is set after legal review.** Date of birth is self-declared. | Before any real user |
| D2 | Registration fields; email required? | DEFAULT | Phone (OTP), first name, DOB, gender, city, relationship status. Email optional. | M1 |
| D3 | Default field visibility & disclosure | DEFAULT | Most conservative: only first name, age, city before Mutual Interest. | M2 |
| D4 | Interest withdrawal; behaviour after block | DEFAULT | Withdraw only while pending. Block closes the conversation for both; unblock does not restore it. | M4 |
| D5 | Message retention / deletion / legal holds | DEFAULT | No automatic purge. Deletion = request → soft-delete → sessions revoked; anonymization job exists but is **disabled**. | Before public launch |
| D6 | Photo limits, scanning, moderation, default visibility | DEFAULT | Re-encode + strip EXIF; configurable size cap; no automated image classification; visible only per field policy. | M2 |
| D7 | Chat images | DEFAULT | Off (flag `messaging.chat_images`). Text only. | M5 |
| D8 | Report categories, severity, SLAs, appeals | DEFAULT | DRAFT taxonomy; appeals recorded, handled manually. | M6 |
| D9 | Plans, pricing, refunds, boosts | DEFAULT | None. Manual admin grant with reason + expiry. No pricing UI. No boosts or paid visibility. | M7 |
| D10 | Supabase/Vercel plans, RPO/RTO, monitoring vendor | OPEN | Structured JSON logs behind an adapter; no third-party SDK. | M9 |
| D11 | Analytics consent & retention | DEFAULT | First-party, aggregate, no PII in events; no third-party analytics. | M7 |
| D12 | AI provider settings, models, retention, budget | DEFAULT | All AI flags off. Prompts/outputs not stored beyond metadata. Provider data-use terms to be checked before enabling. | M8 |
| D13 | Admin auth; staff vs member identity | DEFAULT | Separate staff records; phone OTP **plus** mandatory TOTP. | M6 |
| D14 | Religion and other sensitive filters | DEFAULT | Off (flag `discovery.filter_religion`). | M3 |
| D15 | Delivery / repository | DEFAULT | Private GitHub repo (not yet linked to my session; see founder guide). | M0 |
| D16 | **Product name, domain, brand** | OPEN | Placeholder "Relationship Discovery Platform". | Before public launch |
| D17 | **Visual palette / logo** | OPEN | Draft calm palette in `globals.css`; neutral placeholder icon. | M2 |
| D18 | **Android store listing** (ADR-0002 option B) | OPEN | PWA only. | After alpha |

## Assumptions made by the build (recorded per handbook §16.2)

| ID | Assumption | Revisit |
|----|------------|---------|
| A-01 | Next.js App Router with TypeScript, Tailwind CSS v4 and shadcn/ui; exact versions pinned by `package-lock.json` at first install. | M0 close |
| A-02 | Unit tests use Node's built-in test runner (no extra dependency); E2E uses Playwright from M1. | M1 |
| A-03 | `jobs` table lives in the `audit` schema beside `outbox_events` (infrastructure shared by all domains). | ADR if disputed |
| A-04 | Test OTPs (Supabase test numbers) are used in local/dev/staging; a real SMS provider and India sender registration are needed before production. | M1 |
| A-05 | Only `authenticated` and `service_role` ever connect from the app server; `anon` has no access to any managed schema. | Permanent |
| A-06 | Country rollout is controlled by `reference.countries.launch_enabled`; India is seeded as `false`. | Launch |
| A-07 | Rate-limit numbers are engineering abuse controls (configurable), not business policy. | M1 |
| A-08 | Product terms (Story, Express Interest, Mutual Interest, Discovery Engine, Trust Center) are enforced by `check:boundaries` in UI code. | Permanent |

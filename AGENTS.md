# Instructions for coding agents (Claude, Cursor)

Governing spec: *Relationship Discovery Platform — Founder & Engineering Handbook v0.9*. Read it fully first.
Source-of-truth order: handbook/ADRs → PRD → UX specs → OpenAPI/migrations → existing code → recorded assumptions.

Hard rules (handbook §16.3):
- Vocabulary: **Story, Express Interest, Mutual Interest, Discovery Engine, Trust Center, Compatibility Dimensions**.
- Never build: swipes, popularity/compatibility scores or percentages, anonymous chat, random video, autonomous AI messaging, ads.
- Never invent legal, age, retention, pricing or payment policy. Record assumptions in `docs/product/assumptions-and-open-decisions.md`.
- Default-deny RLS on every table, in the same migration that creates it, with a test. Service-role key: server only,
  allow-listed modules only (`npm run check:boundaries`).
- Browser never queries domain tables; all access via `/api/v1` using `apiHandler` (ADR-0001).
- No secrets, real user data, phone numbers or emails in code, tests, logs or prompts.
- One milestone at a time; wait for founder approval before the next. Run `npm run check` before reporting.

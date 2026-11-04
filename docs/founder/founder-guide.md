# Founder's step-by-step guide (non-technical)

You decide **what** and **why**; engineering handles **how**. This guide lists what only you can do, in order,
and how a milestone is approved. Costs and plan limits change often, so check each provider's pricing page
when you sign up rather than trusting a number written here.

## How the product reaches your Android phone
We build **one web app** that is also **installable on Android** (a "PWA"; see ADR-0002).
1. Open the site in Chrome on your Android phone.
2. Tap the **⋮ menu → Install app** (or **Add to Home screen**). It gets its own icon and opens full-screen.
3. Later, once the closed alpha works well, we can list the same app in the **Google Play Store** (option B in ADR-0002).
A separate native app is deliberately *not* the plan: it would double cost and privacy risk for no benefit in alpha.

## Part 1 — Accounts to create (this week)
Create all of these using **one company-controlled email** and turn on **two-step verification** for each. Never share
passwords in chat; invite me/engineers as collaborators instead.
| # | Account | Why | When |
|---|---------|-----|------|
| 1 | **GitHub** (a private repository, e.g. `relationship-discovery-platform`) | Stores the code safely | Now |
| 2 | **Supabase** (two projects: `rdp-staging`, later `rdp-production`) | Database, login, photo storage | Before M1 |
| 3 | **Vercel** | Hosts the website | Before first deploy |
| 4 | **Google AI Studio / Gemini API** | AI features (kept OFF until M8) | Before M8 |
| 5 | **Domain name** registrar | Your web address | Before public launch |
| 6 | **SMS provider** for OTP in India | Real OTP texts; needs sender registration under Indian rules, which takes lead time | Start before production |
| 7 | Google Play developer account | Play Store listing | After alpha |

### Giving me the code repository
1. In claude.ai **Settings → Connectors**, connect your **GitHub** account.
2. Create an **empty private** repo on GitHub.
3. Tell me its name as `owner/repo`. I will attach it and push the code.
(Fallback: I give you a zip; GitHub's **Add file → Upload files** works, but connecting is cleaner.)

## Part 2 — Decisions only you can make (already defaulted, please still read)
Open `docs/product/assumptions-and-open-decisions.md`. Rows marked **OPEN** need you:
- **D16 Product name & domain** — pick a name, check the trademark, buy the domain.
- **D17 Look and feel** — approve the logo/colours when I show you the first real screens (M2).
- **D10 Plans and monitoring** — approve monthly spend for hosting before M9.

## Part 3 — Work outside software that must start early (long lead times)
These gate public launch (handbook Appendix C and §13.7). Engineering cannot finish them for you.
1. **Qualified India legal counsel** — privacy and data protection, platform/intermediary duties, terms, privacy policy,
   age eligibility (**D1**), grievance process, retention schedule (**D5**). Until counsel confirms D1, production registration stays closed by design.
2. **Moderation and support staffing** — a named person who reviews reports before inviting any user. The software is not enough.
3. **A named incident owner** and a support email address.
4. **SMS sender registration** with your chosen provider.
5. **Alpha cohort plan** — a small, invited group, including people with different relationship histories (handbook §14.6).
6. **Content and safety policy text** — drafted with counsel; I will place it in the product.

## Part 4 — How each milestone works (your approval gates)
For each of M0–M9 I will: explain the plan → build → test → security/privacy check → update docs → send you a report in plain
language. **Nothing moves on until you reply "Approved M#".** Your checklist at each gate:
1. Did I list what changed in plain words and what is *not* done?
2. Do the open decisions it touches have your answer?
3. Can you *see* it working (a link to the staging site)? You should click through it on your phone.
4. Any red flags on privacy or safety? Ask me anything; "why" questions are welcome.

| Milestone | What you will be able to see | Your decision |
|---|---|---|
| M0 Foundation | Landing page installable on your phone; safety rules proven in tests | Approve; create accounts |
| M1 Accounts | Sign in with phone OTP (test numbers) | D2 fields, D1 status |
| M2 Story & photos | Build your own profile; privacy preview | D3, D6, D17 |
| M3 Discovery | Browse people with "why am I seeing this" | D14 |
| M4 Interest | Express/accept Interest | D4 |
| M5 Messaging | Chat after Mutual Interest; report/block | D7 |
| M6 Trust & Admin | Moderation queue for your team | D8, D13 |
| M7 Premium & notifications | Manual premium grants; notices | D9, D11 |
| M8 AI | Optional writing help (off by default) | D12 |
| M9 Hardening | Security/accessibility/load report; launch checklist | Go / no-go for alpha |

## Part 5 — What "done" means for the alpha
Handbook §13.7: no open serious security defects, the full journey (register → profile → discover → interest → mutual interest →
message → block/report) passes automated tests, pause/delete tested, backups restored once in rehearsal, legal policies and age
rule approved, moderation staffed, and **you** sign off the cohort size and known limits.

## Part 6 — Red lines I will hold for you
No swiping, no compatibility percentages, no anonymous chat, no AI messaging for people, no ads, no selling data, no paying to
bypass safety. If a future idea breaks one, I will tell you before building it.

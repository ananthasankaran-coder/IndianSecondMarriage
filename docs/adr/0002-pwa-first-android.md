# ADR-0002: Android via installable web app (PWA) first, Play Store wrapper later

- Status: **Proposed — needs founder approval** (handbook §15.1: technology changes require an ADR)
- Owner: Founder (product decision), Engineering

## Context
The founder wants a website and an Android app that can be installed. The approved stack is a single
Next.js web application. A separate native app (Kotlin or React Native) would double the codebase, test
surface and privacy review, which conflicts with "modular monolith, small team".

## Options
| Option | What the user gets | Cost / risk |
|---|---|---|
| A. **PWA** (installable web app) | Install from Chrome on Android; own icon, full screen, push-capable | Lowest cost; no app-store review; works on iPhone too (via Safari "Add to Home Screen") |
| B. **PWA + Trusted Web Activity** (Play Store listing wrapping the same site) | Real Play Store listing with the same code | Small extra work and a Google Play developer account; store policy review for a relationship-category app |
| C. Native app (Kotlin / React Native) | Full native | Highest cost; second codebase; not in the approved stack |

## Decision (proposed)
Build **A now** (manifest, icons, offline fallback already in M0). Add **B** after the closed alpha proves
the product, as an ADR-0005 follow-up. Revisit C only if measured needs (e.g. deep OS integrations) justify it.

## Privacy rule for the service worker
Only the offline fallback page is cached. API, auth, profile, photo and message responses are never cached.

## Consequences
+ One codebase for web and Android. + Fast iteration.
- Push notifications on iOS need the app installed to the home screen. - Play Store review rules apply at step B.

#!/usr/bin/env node
/**
 * Architecture boundary checker (handbook §15.3, ADR-001). Fails CI when:
 *  1. UI code (src/app pages/components, src/components) imports server-only modules.
 *  2. Anything outside the allow-listed server modules references the service-role key.
 *  3. A domain imports another domain's internals (only index.ts public API allowed).
 *  4. Forbidden product terms appear in user-facing source (swipe, compatibility %).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const src = join(root, "src");
const violations = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) yield p;
  }
}

const SERVICE_ROLE_ALLOWED = [
  `src${sep}server${sep}database${sep}`,
  `src${sep}server${sep}jobs${sep}`,
  `src${sep}config${sep}env.ts`,
];

try {
  for (const file of walk(src)) {
    const rel = relative(root, file);
    const text = readFileSync(file, "utf8");
    const imports = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);

    const isUi =
      rel.startsWith(`src${sep}components${sep}`) ||
      (rel.startsWith(`src${sep}app${sep}`) && !rel.includes(`${sep}api${sep}`));
    if (isUi && imports.some((i) => /server[\\/]|\/server\/|domains\/[^"']+\/(repo|service)/.test(i))) {
      violations.push(`${rel}: UI code must not import server modules or domain internals (use /api/v1)`);
    }

    if (
      /SERVICE_ROLE|serviceRole/i.test(text) &&
      !SERVICE_ROLE_ALLOWED.some((a) => rel.startsWith(a) || rel === a)
    ) {
      violations.push(`${rel}: service-role key referenced outside allow-listed server modules`);
    }

    const m = rel.match(/^src[\\/]domains[\\/]([^\\/]+)[\\/]/);
    if (m) {
      for (const i of imports) {
        const d = i.match(/domains\/([^/]+)\/(.+)$/);
        if (d && d[1] !== m[1] && d[2] !== "index.ts" && d[2] !== "index") {
          violations.push(`${rel}: imports internals of domain "${d[1]}" (${i}); use its index.ts`);
        }
      }
    }

    if (isUi && /\bswipe(d|s|r)?\b|compatibility\s*(score|percent)|\d+\s*%\s*(match|compatib)/i.test(text)) {
      violations.push(`${rel}: forbidden product term (swipe / compatibility percentage / "match" wording)`);
    }
  }
} catch (e) {
  console.error("boundary check could not run:", e instanceof Error ? e.message : e);
  process.exit(2);
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n - " + violations.join("\n - "));
  process.exit(1);
}
console.log("Architecture boundaries OK");

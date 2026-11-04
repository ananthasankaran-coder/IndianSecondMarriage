import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  // The logger is the only sanctioned console writer.
  { files: ["src/server/observability/logger.ts", "scripts/**"], rules: { "no-console": "off" } },
  // Tests may use looser typing for assertions on parsed JSON.
  { files: ["tests/**"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
]);

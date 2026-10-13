import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Raw data drop (browser script) + its generated module — not hand-edited.
    "src/lib/statesandcities.js",
    "src/lib/states-data.ts",
  ]),
]);

export default eslintConfig;

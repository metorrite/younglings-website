import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Type-aware: catch promises used as if they were values. `!hubOpen()` on an async helper is always false and tsc says nothing (T-131).
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // JSX handlers (onClick={async () => …}) are left out: React ignores what a handler returns, so `void`-wrapping the ~80 of them would change
      // nothing. Conditionals, arguments (setTimeout(async …)) and object properties are still checked.
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  // node:test's test() returns a promise the runner itself tracks; awaiting or voiding each one would be noise.
  {
    files: ["**/*.test.ts"],
    rules: { "@typescript-eslint/no-floating-promises": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

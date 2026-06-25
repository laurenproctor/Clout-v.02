import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated build artifacts inside git worktrees — ignore the artifacts,
    // not the whole worktree (a worktree may hold legitimate source to lint).
    ".worktrees/**/.next/**",
    ".worktrees/**/out/**",
    ".worktrees/**/build/**",
  ]),
]);

export default eslintConfig;

---
name: typescript-modern
description: >
  Use this skill whenever writing, reviewing, generating, or refactoring TypeScript code.
  This skill contains the latest TypeScript release notes (5.8, 5.9, 6.0), migration guidance
  for the upcoming TypeScript 7.0 (Go-based compiler), modern tsconfig defaults, and
  current best practices as of March 2026. Trigger this skill for any TypeScript task including:
  writing new .ts/.tsx files, updating tsconfig.json, reviewing type definitions, migrating
  between TypeScript versions, choosing module resolution strategies, configuring strict mode,
  using modern TypeScript features like `import defer`, `using` declarations, Temporal types,
  subpath imports with `#/`, or `--erasableSyntaxOnly`. Also trigger when the user asks about
  TypeScript best practices, type safety patterns, or how to prepare for TypeScript 7.0.
  Even if the request seems routine, consult this skill — your training data likely predates
  TypeScript 5.8+ and the critical 6.0 transition release.
---

# TypeScript Modern Practices (Updated March 2026)

This skill ensures Claude Code generates TypeScript that aligns with the **current state of the language** (up to TypeScript 6.0.2, released March 23, 2026) and follows modern best practices.

## Why This Skill Exists

TypeScript is undergoing its most significant transition ever:
- **TypeScript 6.0** (March 2026) is the **last release built on the JavaScript codebase**
- **TypeScript 7.0** is being rewritten in **Go** for 10x faster compilation with shared-memory multi-threading
- Many compiler options have been **deprecated or had defaults changed** in 6.0
- New language features (import defer, Temporal types, `#/` subpath imports) are available
- The recommended tsconfig.json defaults have shifted significantly

If you rely on pre-5.8 knowledge, you will generate outdated configurations and miss important deprecations.

## Quick Reference: What Version Introduced What

| Version | Release Date | Key Features |
|---------|-------------|--------------|
| 5.8 | Mar 2025 | `--erasableSyntaxOnly`, `require()` of ESM in nodenext, `--module node18`, granular return type checks, `--libReplacement` flag |
| 5.9 | Aug 2025 | `import defer` syntax, `--module node20`, expandable hovers, minimal `tsc --init`, cached type instantiations |
| 6.0 | Mar 2026 | Bridge to 7.0. New defaults (`strict: true`, `target: es2025`, `module: esnext`). Deprecates ES3/ES5 targets, `outFile`, import assertions. Temporal types, `#/` subpath imports, `--stableTypeOrdering` flag |

## How to Use This Skill

1. **For any new TypeScript file or project setup** → Read `references/tsconfig-modern.md` for current recommended configuration
2. **When using new language features** → Read `references/new-features.md` for syntax and usage of features from 5.8–6.0
3. **When migrating or upgrading TypeScript** → Read `references/migration-6-to-7.md` for deprecations and breaking changes
4. **For general coding patterns** → Read `references/best-practices.md` for type safety, error handling, and code organization patterns

## Critical Rules (Always Apply)

### Default Configuration (TypeScript 6.0+)
- `strict: true` is now the **default** — do not set it to `false` in new projects
- `target` defaults to `es2025` — stop targeting ES5/ES3 (both are deprecated)
- `module` defaults to `esnext` — ESM is the standard
- Use `moduleResolution: "bundler"` for frontend projects using Vite/Webpack/Rollup
- Use `moduleResolution: "nodenext"` for Node.js backend projects
- The `--module node20` option is now stable for Node.js v20 projects

### Avoid Deprecated Features
- **Do NOT use** `target: "es3"` or `target: "es5"` — both deprecated in 6.0, removed in 7.0
- **Do NOT use** `outFile` — use a bundler instead
- **Do NOT use** `import ... assert { type: "json" }` — use `import ... with { type: "json" }` (import attributes)
- **Do NOT use** `downlevelIteration` — meaningless for ES2015+ targets, deprecated in 6.0
- **Do NOT use** `noImplicitUseStrict` — deprecated in 6.0
- **Do NOT use** `suppressExcessPropertyErrors` — deprecated in 6.0

### Type Safety Patterns
- **Never use `any`** unless migrating JS→TS. Use `unknown` for truly unknown types
- **Prefer `satisfies`** over `as` for type assertions that should preserve literal types
- **Use `const` assertions** (`as const`) to preserve literal types in objects and arrays
- **Prefer `interface` for object shapes** that may be extended; use `type` for unions, intersections, and mapped types
- **Use discriminated unions** over optional properties for state management
- **Return `Result<T, E>` pattern** instead of throwing errors for expected failures

### Module Best Practices
- Use `verbatimModuleSyntax: true` — preserves import/export as-is for tree-shaking
- For Node.js projects on v22+, `require()` of ESM modules now works under `--module nodenext`
- Use `import type` / `export type` for type-only imports to ensure clean erasure
- For direct TS execution (Node.js 23.6+, tsx, ts-node), use `--erasableSyntaxOnly` to ensure your TS syntax can be stripped without transformation

### Error Handling
- Prefer typed error results over try/catch for business logic errors
- Use `unknown` for catch clause variables (the default in strict mode)
- Use the `using` declaration with `Symbol.dispose` for automatic resource cleanup (ES2025)

## References

Read these files for detailed information:
- `references/new-features.md` — Detailed coverage of features from TypeScript 5.8, 5.9, and 6.0
- `references/tsconfig-modern.md` — Recommended tsconfig.json configurations for different project types
- `references/migration-6-to-7.md` — Complete migration guide from 5.x → 6.0 → 7.0
- `references/best-practices.md` — Modern TypeScript coding patterns and conventions

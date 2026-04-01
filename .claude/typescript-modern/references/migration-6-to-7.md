# Migration Guide: TypeScript 5.x → 6.0 → 7.0

## Table of Contents
1. [Overview](#overview)
2. [New Defaults in 6.0](#new-defaults-in-60)
3. [Deprecated Options](#deprecated-options)
4. [Breaking Behavioral Changes](#breaking-behavioral-changes)
5. [Preparing for TypeScript 7.0](#preparing-for-typescript-70)
6. [Migration Checklist](#migration-checklist)

---

## Overview

TypeScript 6.0 (March 2026) is a **bridge release** — the last version built on the JavaScript codebase. TypeScript 7.0 will be written in Go with 10x faster compilation.

The upgrade path:
1. Upgrade to 6.0 and fix all deprecation warnings
2. Use `"ignoreDeprecations": "6.0"` temporarily if needed
3. Test with `--stableTypeOrdering` to match 7.0 behavior
4. Try `@typescript/native-preview` (TS 7.0 preview) to verify compatibility
5. Upgrade to 7.0 when stable

---

## New Defaults in 6.0

TypeScript 6.0 changes several defaults to reflect modern usage. If upgrading from 5.x, you may need to either adapt or explicitly set the old values.

| Option | 5.x Default | 6.0 Default | Action |
|--------|-------------|-------------|--------|
| `strict` | `false` | `true` | Embrace it. Fix type errors instead of disabling |
| `target` | `es5` | `es2025` | Update to `es2025` or higher |
| `module` | `commonjs` | `esnext` | Use `esnext` for bundled apps, `nodenext` for Node.js |
| `moduleResolution` | `node` | `bundler` | Use `bundler` for frontend, `nodenext` for Node.js |
| `skipLibCheck` | `false` | `true` | Generally fine to keep `true` |

### Restoring 5.x Behavior (temporary)

If you need time to adapt, you can explicitly set old defaults:
```jsonc
{
  "compilerOptions": {
    "strict": false,        // Not recommended long-term
    "target": "es5",        // Deprecated, avoid
    "module": "commonjs",
    "moduleResolution": "node"  // Deprecated, migrate to bundler or nodenext
  }
}
```

---

## Deprecated Options

These options work in 6.0 with `"ignoreDeprecations": "6.0"` but will be **removed in 7.0**:

### Targets
- **`target: "es3"`** — Removed. Minimum is now `es2015`
- **`target: "es5"`** — Deprecated. Use `es2015` or higher
  - Without ES5, TypeScript no longer emits `__extends`, `__generator/__awaiter`, or `__spreadArray` helpers
  - If you truly need ES5 output, post-process with Babel or another tool

### Module Options
- **`moduleResolution: "node"`** — Deprecated. Use `bundler` or `nodenext`
  - Migration: `--moduleResolution bundler` can now combine with `--module commonjs`
- **`outFile`** — Deprecated. Use a bundler (Webpack, Rollup, esbuild, Vite)
  - Zero community members raised concerns about removal in the tracking issue

### Strict Mode
- **`noImplicitUseStrict`** — Deprecated. TS 6.0 unconditionally emits `"use strict"` in non-ESM files
- **`suppressExcessPropertyErrors`** — Deprecated. Fix excess property errors instead
- **`noStrictGenericChecks`** — Deprecated

### Iteration
- **`downlevelIteration`** — Deprecated. Only had effect when targeting below ES2015. Since ES3/ES5 are deprecated, this flag is meaningless
  - Migration: Remove from tsconfig.json entirely. Many projects (Zod, SWR, Sentry, tldraw) had it set despite targeting ES2015+ where it had no effect

### Import Assertions
- **`import ... assert { type: "json" }`** — Deprecated in favor of import attributes
- Extends to dynamic `import()` calls: `import(..., { assert: {...} })` also deprecated
  - Migration: Use `with` instead of `assert`

---

## Breaking Behavioral Changes

### Unconditional `"use strict"` in Non-ESM
TypeScript 6.0 always emits `"use strict"` in CommonJS output. ESM is already strict by spec.

**Impact:** Code using reserved words (`implements`, `interface`, `let`, `package`, `private`, `protected`, `public`, `static`, `yield`) as variable/parameter/function names in non-module, non-strict code will break.

**Fix:** Rename variables that use reserved words.

### Function Expressions in Generic Calls
Type-checking for function expressions in generic calls (especially generic JSX) is more precise. May introduce new errors or require explicit type arguments.

### DOM Type Updates
Updated to reflect latest web standards including Temporal API adjustments. May affect type-checking in browser-facing code.

### `alwaysStrict` is Now Unconditional
You can no longer set `alwaysStrict: false`. The option is effectively always on.

---

## Preparing for TypeScript 7.0

### What Is TypeScript 7.0?
- Complete rewrite of the compiler and language service in **Go**
- Uses native code and **shared-memory multi-threading**
- Achieves **~10x faster** compilation on most projects
- The language itself (syntax, type system) remains the same
- **Your TypeScript knowledge still applies** — only the compiler internals change

### The `--stableTypeOrdering` Flag
TypeScript 6.0 introduces this flag to make type ordering match 7.0's behavior. Use it to preview how your code will behave under the new compiler:

```jsonc
{
  "compilerOptions": {
    "stableTypeOrdering": true
  }
}
```

### Testing with Native Preview
```bash
# Install the 7.0 native preview
npm install -D @typescript/native-preview

# Use the VS Code extension
# Search for "TypeScript Native Preview" in VS Code extensions
```

### What Won't Work in 7.0
- Any option deprecated in 6.0 (with `ignoreDeprecations: "6.0"`) will be **removed**
- The TypeScript compiler API will change (affects custom transformers, language service plugins)
- `outFile` is gone entirely

### What Will Be Better in 7.0
- ~10x faster builds
- Better memory usage
- Faster editor responsiveness (language service)
- Shared-memory multi-threading for large projects

---

## Migration Checklist

### From 5.x to 6.0
- [ ] Update `typescript` package: `npm install -D typescript@6`
- [ ] Remove `target: "es5"` or `target: "es3"` — set `es2015` minimum (prefer `es2025`)
- [ ] Remove `downlevelIteration` from tsconfig
- [ ] Remove `noImplicitUseStrict` and `suppressExcessPropertyErrors`
- [ ] Replace `moduleResolution: "node"` with `bundler` or `nodenext`
- [ ] Replace `outFile` with a bundler if used
- [ ] Replace `import ... assert` with `import ... with`
- [ ] Ensure code doesn't use JS reserved words as identifiers in non-strict/non-module files
- [ ] Run build and fix any new type errors from stricter defaults
- [ ] Consider enabling `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`

### From 6.0 to 7.0 (when available)
- [ ] Enable `--stableTypeOrdering` in 6.0 and fix any differences
- [ ] Test with `@typescript/native-preview`
- [ ] Remove `"ignoreDeprecations": "6.0"` and fix all remaining deprecated usage
- [ ] Update any custom compiler API usage (transformers, plugins)
- [ ] Verify build output matches between 6.0 and 7.0 preview

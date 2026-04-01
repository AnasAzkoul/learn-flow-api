# Modern tsconfig.json Configurations (2026)

## Table of Contents
1. [Frontend Project (Vite/React/Vue)](#frontend-project)
2. [Node.js Backend](#nodejs-backend)
3. [Fullstack Monorepo](#fullstack-monorepo)
4. [Library / Package](#library--package)
5. [Direct TS Execution (tsx / Node.js 23.6+)](#direct-ts-execution)
6. [Key Options Explained](#key-options-explained)

---

## Frontend Project

For projects using Vite, Webpack, Rollup, or similar bundlers with React, Vue, or other frameworks:

```jsonc
{
  "compilerOptions": {
    // Language & Output
    "target": "es2025",
    "lib": ["es2025", "dom", "dom.iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",

    // Type Safety
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Module Behavior
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",

    // Emit
    "noEmit": true, // Bundler handles emit
    "skipLibCheck": true,

    // JSX (adjust for your framework)
    "jsx": "react-jsx",

    // Path Aliases (if using subpath imports)
    // Prefer #/ subpath imports over paths when possible
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**For Vue/Nuxt projects**, change JSX settings:
```jsonc
{
  "compilerOptions": {
    "jsx": "preserve",
    // Vue-specific: let vue-tsc handle .vue files
  }
}
```

---

## Node.js Backend

For Node.js server applications:

```jsonc
{
  "compilerOptions": {
    // Language & Output
    "target": "es2025",
    "lib": ["es2025"],
    "module": "nodenext",
    "moduleResolution": "nodenext",

    // Type Safety
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Module Behavior
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",

    // Emit
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,

    // Types
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**For Node.js 20 specifically** (stable, won't change behavior):
```jsonc
{
  "compilerOptions": {
    "module": "node20",
    "moduleResolution": "node20"
  }
}
```

---

## Fullstack Monorepo

Use project references with a root tsconfig and per-package configs:

```jsonc
// Root tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/frontend" },
    { "path": "./packages/backend" }
  ]
}
```

```jsonc
// packages/shared/tsconfig.json (shared types/utils)
{
  "compilerOptions": {
    "target": "es2025",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*"]
}
```

---

## Library / Package

For npm packages consumed by others:

```jsonc
{
  "compilerOptions": {
    "target": "es2022",  // More conservative for library consumers
    "lib": ["es2022"],
    "module": "nodenext",
    "moduleResolution": "nodenext",

    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,

    // Emit declarations for consumers
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",

    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## Direct TS Execution

For running TypeScript directly with Node.js 23.6+, tsx, or ts-blank-space:

```jsonc
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "verbatimModuleSyntax": true,

    // Critical: ensures all TS syntax can be stripped without transformation
    "erasableSyntaxOnly": true,

    // No emit needed — runtime executes TS directly
    "noEmit": true,
    "skipLibCheck": true
  }
}
```

**Remember:** with `erasableSyntaxOnly`, avoid:
- `enum` (use union types or `as const` objects)
- `namespace` with runtime code
- Constructor parameter properties (`constructor(public x: string)`)

---

## Key Options Explained

### `verbatimModuleSyntax: true`
Preserves import/export syntax exactly as written. Essential for tree-shaking. Replaces the older `importsNotUsedAsValues` and `preserveValueImports` (both removed in 5.5+).

Forces you to use `import type` for type-only imports:
```typescript
// ✅ Correct with verbatimModuleSyntax
import type { User } from "./types";
import { createUser } from "./users";

// ❌ Will error — User is type-only but imported as value
import { User, createUser } from "./users";
```

### `noUncheckedIndexedAccess: true`
Adds `undefined` to index signature results, catching potential runtime errors:
```typescript
const arr = [1, 2, 3];
const val = arr[5]; // Type is `number | undefined` instead of `number`
```

### `exactOptionalPropertyTypes: true`
Distinguishes between "optional" and "explicitly undefined":
```typescript
interface User {
  name: string;
  nickname?: string; // Can be absent, but NOT explicitly undefined
}

const user: User = { name: "Anas", nickname: undefined }; // ❌ Error
const user2: User = { name: "Anas" }; // ✅ OK
```

### `moduleDetection: "force"`
Treats every file as a module regardless of content. Prevents files from being treated as global scripts.

### `isolatedModules: true`
Ensures each file can be transpiled independently. Required by most bundlers (Vite, esbuild, SWC).

### `skipLibCheck: true`
Skips type-checking of `.d.ts` files. Significantly speeds up compilation. Recommended for all projects.

### Module Resolution Quick Guide

| Scenario | `module` | `moduleResolution` |
|----------|----------|--------------------|
| Frontend with bundler (Vite, Webpack) | `esnext` | `bundler` |
| Node.js (latest features) | `nodenext` | `nodenext` |
| Node.js v20 (stable) | `node20` | `node20` |
| Library (dual CJS/ESM) | `nodenext` | `nodenext` |
| Direct TS execution | `nodenext` | `nodenext` |

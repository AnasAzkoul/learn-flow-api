# New TypeScript Features (5.8 – 6.0)

## Table of Contents
1. [TypeScript 5.8 (March 2025)](#typescript-58)
2. [TypeScript 5.9 (August 2025)](#typescript-59)
3. [TypeScript 6.0 (March 2026)](#typescript-60)

---

## TypeScript 5.8

### Granular Return Type Checks in Conditional Expressions

TypeScript 5.8 checks each branch of a conditional expression in a return statement against the declared return type. This catches subtle bugs that were previously missed.

```typescript
declare const untypedCache: Map<any, any>;

// TS 5.8 catches this bug — the `else` branch returns string, not URL
function getUrlObject(urlString: string): URL {
  return untypedCache.has(urlString)
    ? untypedCache.get(urlString)
    : urlString;
  //  ^^^^^^^^^ Error: Type 'string' is not assignable to type 'URL'
}

// Fixed version:
function getUrlObject(urlString: string): URL {
  return untypedCache.has(urlString)
    ? untypedCache.get(urlString)
    : new URL(urlString);
}
```

### `--erasableSyntaxOnly` Flag

For direct TypeScript execution in Node.js 23.6+ (via `--experimental-strip-types`), tsx, or ts-blank-space, only "erasable" TypeScript syntax is supported — syntax that can be removed without affecting runtime behavior.

This flag ensures your code is compatible with type-stripping runtimes:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

**What is NOT erasable (will error with this flag):**
- `enum` declarations (use `const enum` or union types instead)
- `namespace` with runtime code
- Parameter properties in constructors (`constructor(public name: string)`)
- `import =` and `export =` syntax
- Class fields with `declare` that have initializers

**What IS erasable:**
- Type annotations
- Interfaces
- Type aliases
- `as` assertions
- `satisfies` expressions
- `import type` / `export type`
- Generic type parameters
- `const enum` (these are inlined)

### `require()` of ESM under `--module nodenext`

Node.js 22 allows `require()` calls from CommonJS modules to ESM modules. TypeScript 5.8 supports this under `--module nodenext`:

```typescript
// In a CommonJS file, this now works under --module nodenext
const { readFile } = require("fs");
```

### `--module node18` (Stable)

A stable module flag for projects locked to Node.js 18. Unlike `nodenext`, it won't gain new behaviors over time. Does NOT support `require()` of ESM.

### `--libReplacement` Flag

Controls whether TypeScript looks up `@typescript/lib-*` packages. Set `--libReplacement false` to skip this lookup and improve performance if you're not using custom lib replacements.

### Performance Improvements
- Efficient path normalization (works with string indexes instead of array allocations)
- Reduced configuration revalidation during file edits in watch mode
- Faster editor responsiveness in large projects

---

## TypeScript 5.9

### `import defer` Syntax

Support for ECMAScript's deferred module evaluation proposal. Modules are loaded but not evaluated until a property is accessed:

```typescript
// Module is loaded but NOT executed yet
import defer * as heavyModule from "./heavy-module.js";

// Only when you access a property does the module execute
function doWork() {
  return heavyModule.process(data); // Module evaluates HERE
}
```

**Rules:**
- Only namespace imports work (`import defer * as name`)
- Cannot use named imports or default imports with `import defer`
- Requires native runtime or bundler support
- Only works under `--module preserve` and `--module esnext`

**Use cases:**
- Improving application startup time
- Conditional loading of expensive modules
- Deferring side effects until needed

### `--module node20` (Stable)

A stable module resolution option for Node.js v20 behavior:
- Implies `--target es2023`
- Unlike `nodenext`, won't pick up new behaviors from future Node.js versions
- Provides predictable, stable module resolution

### Minimal `tsc --init`

Running `tsc --init` now generates a clean, minimal tsconfig.json instead of a heavily commented one:

```jsonc
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "strict": true,
    "jsx": "react-jsx",
    "moduleDetection": "force",
    "types": []
  }
}
```

### Expandable Hovers (VS Code Preview)

In VS Code, type hover tooltips now have `+` / `-` buttons to expand or collapse type details. The default hover length has been increased.

Configure max hover length: `js/ts.hover.maximumLength`

### Performance: Cached Type Instantiations

TypeScript 5.9 caches intermediate type instantiations, significantly improving performance for libraries like Zod and tRPC that use deeply nested generics. Also eliminates unnecessary function allocations during file checks (~11% improvement).

---

## TypeScript 6.0

TypeScript 6.0 is the **final release on the JavaScript codebase**. It's a bridge release to TypeScript 7.0 (Go-based compiler).

### Less Context-Sensitivity on `this`-less Functions

Functions that don't use `this` are no longer treated as contextually sensitive for type inference. This fixes a long-standing inconsistency between arrow functions and method syntax:

```typescript
declare function callIt<T>(obj: {
  produce: (x: number) => T;
  consume: (y: T) => void;
}): void;

// Previously errored with method syntax when order was flipped:
callIt({
  consume(y) { return y.toFixed(); }, // ✅ Now works! y is inferred as number
  produce(x: number) { return x * 2; },
});
```

### Subpath Imports with `#/`

Node.js now supports subpath imports starting with `#/`, and TypeScript 6.0 supports this under `nodenext` and `bundler` module resolution:

```jsonc
// package.json
{
  "imports": {
    "#/*": "./src/*"
  }
}
```

```typescript
// Instead of relative paths:
import { utils } from "../../utils.js";

// Use clean subpath imports:
import { utils } from "#/utils.js";
```

### Combining `--moduleResolution bundler` with `--module commonjs`

You can now use `--moduleResolution bundler` with `--module commonjs`, providing a migration path away from the deprecated `--moduleResolution node`.

### `es2025` Target and Lib

New `es2025` option for both `target` and `lib`. Includes typed APIs for:
- `Set` methods (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`)
- `Map.getOrInsert()` and `Map.getOrInsertComputed()` (stage-4 "upsert" proposal)
- `RegExp.escape()` (stage-4)
- `Promise.try()` (stage-4)
- `Iterator.from()` and iterator helper methods

### Temporal Types

TypeScript 6.0 ships built-in types for the **stage-4 Temporal API** via `esnext.temporal` in lib:

```typescript
// Temporal provides a modern date/time API
const now = Temporal.Now.plainDateTimeISO();
const meeting = Temporal.PlainDateTime.from("2026-04-01T14:00:00");
const duration = now.until(meeting);

// Temporal.ZonedDateTime for timezone-aware operations
const zoned = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
```

Note: Your runtime must support or polyfill Temporal for this to actually run.

### `--stableTypeOrdering` Flag

A migration flag that makes TypeScript 6.0 match TypeScript 7.0's type ordering behavior, helping you compare output between the two codebases before migrating.

### New Default Values in 6.0

| Option | Old Default | New Default (6.0) |
|--------|-------------|-------------------|
| `strict` | `false` | `true` |
| `target` | `es5` | `es2025` |
| `module` | `commonjs` | `esnext` |
| `moduleResolution` | `node` | `bundler` |
| `alwaysStrict` | `false` | `true` (unconditional in non-ESM) |
| `skipLibCheck` | `false` | `true` |

### `using` Declarations (ES2025 Explicit Resource Management)

Available via `es2025` target. Provides automatic resource cleanup:

```typescript
function readFile(path: string) {
  using file = openFile(path); // file[Symbol.dispose]() called automatically
  return file.readAll();
  // file is disposed here when it goes out of scope
}

// Async version:
async function fetchData(url: string) {
  await using connection = await connect(url);
  return connection.getData();
  // connection[Symbol.asyncDispose]() called automatically
}
```

### Import Attributes (replacing Import Assertions)

Import assertions (`assert`) are deprecated. Use import attributes (`with`) instead:

```typescript
// ❌ Deprecated (will error in 7.0):
import data from "./data.json" assert { type: "json" };

// ✅ Correct:
import data from "./data.json" with { type: "json" };
```

This deprecation now extends to dynamic `import()` calls as well.

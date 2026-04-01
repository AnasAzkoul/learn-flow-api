# TypeScript Best Practices (2026)

## Table of Contents
1. [Type Safety Patterns](#type-safety-patterns)
2. [Error Handling](#error-handling)
3. [Function Design](#function-design)
4. [Object and Data Modeling](#object-and-data-modeling)
5. [Module Organization](#module-organization)
6. [Performance-Aware Typing](#performance-aware-typing)
7. [Working with AI Coding Assistants](#working-with-ai-coding-assistants)

---

## Type Safety Patterns

### Never Use `any` — Use `unknown` Instead

```typescript
// ❌ Bad: any disables all type checking
function parseJSON(input: string): any {
  return JSON.parse(input);
}

// ✅ Good: unknown forces you to narrow before using
function parseJSON(input: string): unknown {
  return JSON.parse(input);
}

// Narrow the type before use:
const data = parseJSON('{"name": "Anas"}');
if (isUser(data)) {
  console.log(data.name); // Safe
}
```

### Use `satisfies` for Type Validation Without Widening

```typescript
// ❌ Using `as` loses literal type information
const config = {
  port: 3000,
  host: "localhost",
} as Config;

// ✅ Using `satisfies` validates AND preserves literal types
const config = {
  port: 3000,
  host: "localhost",
} satisfies Config;
// config.port is `3000`, not `number`
// config.host is `"localhost"`, not `string`
```

### Use `as const` for Immutable Literals

```typescript
// ❌ Type is string[]
const routes = ["/home", "/about", "/contact"];

// ✅ Type is readonly ["/home", "/about", "/contact"]
const routes = ["/home", "/about", "/contact"] as const;

// ✅ Works great with object configs too
const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

type StatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]; // 200 | 404 | 500
```

### Discriminated Unions Over Optional Properties

```typescript
// ❌ Bad: unclear state combinations, easy to have impossible states
interface Request {
  status: string;
  data?: unknown;
  error?: string;
  isLoading?: boolean;
}

// ✅ Good: discriminated union makes impossible states impossible
type Request<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

function handleRequest(req: Request<User>) {
  switch (req.status) {
    case "success":
      console.log(req.data); // TypeScript knows data exists
      break;
    case "error":
      console.log(req.error); // TypeScript knows error exists
      break;
  }
}
```

### Use Template Literal Types for String Patterns

```typescript
// Enforce specific string patterns at the type level
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type APIRoute = `/api/${string}`;
type EventName = `on${Capitalize<string>}`;

// Combine for powerful constraints
type Endpoint = `${HTTPMethod} ${APIRoute}`;
const endpoint: Endpoint = "GET /api/users"; // ✅
const bad: Endpoint = "FETCH /api/users";    // ❌ Error
```

### Prefer `interface` for Extendable Shapes, `type` for Everything Else

```typescript
// ✅ interface: extendable, mergeable, clear "shape of a thing"
interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminUser extends User {
  permissions: string[];
}

// ✅ type: unions, intersections, mapped types, utility types
type Status = "active" | "inactive" | "suspended";
type UserWithStatus = User & { status: Status };
type ReadonlyUser = Readonly<User>;
type UserKeys = keyof User;
```

---

## Error Handling

### Result Pattern Over Thrown Exceptions

For expected/business-logic errors, use a typed Result pattern instead of try/catch:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage:
type ValidationError = { field: string; message: string };

function validateEmail(email: string): Result<string, ValidationError> {
  if (!email.includes("@")) {
    return err({ field: "email", message: "Invalid email format" });
  }
  return ok(email);
}

const result = validateEmail(input);
if (result.ok) {
  sendEmail(result.value); // TypeScript knows this is string
} else {
  showError(result.error); // TypeScript knows this is ValidationError
}
```

### Use `unknown` in Catch Clauses

```typescript
// ❌ Bad (TS strict mode already prevents this)
try {
  riskyOperation();
} catch (error: any) {
  console.log(error.message); // Unsafe
}

// ✅ Good: narrow before using
try {
  riskyOperation();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message); // Safe
  } else {
    console.log("Unknown error:", String(error));
  }
}
```

### Use `using` for Resource Cleanup (ES2025)

```typescript
// ✅ Automatic cleanup with using declarations
class DatabaseConnection implements Disposable {
  [Symbol.dispose]() {
    this.close();
  }
  close() { /* cleanup */ }
  query(sql: string) { /* ... */ }
}

function runQuery(sql: string) {
  using db = new DatabaseConnection();
  return db.query(sql);
  // db[Symbol.dispose]() called automatically
}

// Async version
class AsyncConnection implements AsyncDisposable {
  async [Symbol.asyncDispose]() {
    await this.disconnect();
  }
  async disconnect() { /* async cleanup */ }
}

async function fetchData() {
  await using conn = await AsyncConnection.create();
  return conn.getData();
  // conn[Symbol.asyncDispose]() called automatically
}
```

---

## Function Design

### Use Explicit Return Types for Public APIs

```typescript
// ❌ Return type inferred — brittle for consumers
function getUser(id: string) {
  return db.users.find(u => u.id === id);
}

// ✅ Explicit return type — stable contract
function getUser(id: string): User | undefined {
  return db.users.find(u => u.id === id);
}
```

Let TypeScript infer return types for private/internal functions and short lambdas.

### Use Generics with Constraints

```typescript
// ❌ Too permissive
function getProperty<T>(obj: T, key: string): unknown {
  return (obj as any)[key];
}

// ✅ Constrained and type-safe
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

### Use Overloads Sparingly — Prefer Union Parameters

```typescript
// ❌ Overloads when a union would suffice
function format(value: string): string;
function format(value: number): string;
function format(value: string | number): string {
  return String(value);
}

// ✅ Simpler with union
function format(value: string | number): string {
  return String(value);
}
```

Use overloads only when different input types produce different output types.

### Use `readonly` Parameters

```typescript
// ✅ Signal that the function won't mutate the input
function sum(numbers: readonly number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

function processUser(user: Readonly<User>): string {
  return `${user.name} (${user.email})`;
}
```

---

## Object and Data Modeling

### Use Branded/Opaque Types for Domain Safety

```typescript
// Prevent mixing up IDs of different entities
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };

function createUserId(id: string): UserId {
  return id as UserId;
}

function getUser(id: UserId): User { /* ... */ }
function getOrder(id: OrderId): Order { /* ... */ }

const userId = createUserId("abc");
getUser(userId);   // ✅
getOrder(userId);  // ❌ Type error — can't pass UserId as OrderId
```

### Use Utility Types Effectively

```typescript
// Pick only what you need
type UserSummary = Pick<User, "id" | "name">;

// Omit sensitive fields
type PublicUser = Omit<User, "passwordHash" | "email">;

// Make everything optional for updates
type UserUpdate = Partial<User>;

// Make everything required
type CompleteUser = Required<User>;

// Record for dictionaries
type UserMap = Record<string, User>;

// Readonly for immutable data
type FrozenConfig = Readonly<Config>;

// Combine for powerful patterns
type ReadonlyPartial<T> = Readonly<Partial<T>>;
```

---

## Module Organization

### Use `import type` for Type-Only Imports

```typescript
// ✅ Clear separation of runtime vs type imports
import type { User, UserRole } from "./types";
import { createUser, deleteUser } from "./users";

// ✅ Inline type imports
import { createUser, type User } from "./users";
```

This is required when using `verbatimModuleSyntax: true`.

### Use Barrel Exports Judiciously

```typescript
// ✅ Good: barrel file for a bounded module
// components/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export type { ButtonProps, InputProps } from "./types";

// ❌ Bad: huge barrel file re-exporting everything
// This kills tree-shaking and increases bundle size
export * from "./module1";
export * from "./module2";
// ... 50 more modules
```

### Prefer `#/` Subpath Imports Over Path Aliases (TS 6.0+)

```jsonc
// package.json
{
  "imports": {
    "#/*": "./src/*"
  }
}
```

```typescript
// ✅ Works natively with Node.js and bundlers
import { utils } from "#/lib/utils.js";

// ⚠️ Older approach — requires bundler/tsconfig paths
import { utils } from "@/lib/utils";
```

Subpath imports are a Node.js standard — they work without bundler configuration.

---

## Performance-Aware Typing

### Avoid Deep Generic Nesting

Deeply nested generics slow down the type checker. Keep generic depth reasonable:

```typescript
// ❌ Deeply nested — slow type checking
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ✅ Consider using a library (like type-fest) for complex utility types
// or limit nesting depth
```

### Use `skipLibCheck: true`

Always. It skips type-checking `.d.ts` files from `node_modules`, dramatically improving build speed without sacrificing safety in your own code.

### Use Project References for Monorepos

Split large projects into smaller sub-projects with project references. Each sub-project is type-checked independently and cached:

```jsonc
// tsconfig.json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" }
  ]
}
```

---

## Working with AI Coding Assistants

TypeScript's type system serves as a **contract between you and AI tools**. Good types help AI assistants generate more accurate code:

### Provide Clear Interfaces

```typescript
// ✅ Clear interface = better AI-generated implementations
interface UserService {
  getById(id: UserId): Promise<Result<User, NotFoundError>>;
  create(data: CreateUserInput): Promise<Result<User, ValidationError>>;
  update(id: UserId, data: Partial<User>): Promise<Result<User, NotFoundError | ValidationError>>;
  delete(id: UserId): Promise<Result<void, NotFoundError>>;
}
```

### Use JSDoc for Complex Business Logic

```typescript
/**
 * Calculates the shipping cost based on weight and destination.
 * @param weight - Package weight in kilograms
 * @param destination - ISO 3166-1 alpha-2 country code
 * @returns Shipping cost in EUR cents
 * @throws {InvalidDestinationError} If the country code is not supported
 */
function calculateShipping(weight: number, destination: string): number {
  // ...
}
```

### Keep Types Close to Implementation

```typescript
// ✅ Co-locate types with implementation
// users/types.ts — types for the users module
// users/service.ts — service implementation
// users/repository.ts — data access

// ❌ Giant shared types.ts file with everything
```

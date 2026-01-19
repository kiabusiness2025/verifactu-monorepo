# TypeScript Strict Mode Guide

## 📘 What is TypeScript Strict Mode?

TypeScript Strict Mode enforces the strictest type-checking rules. It catches more errors at compile time instead of runtime.

**Benefits:**
- ✅ Catch errors before deployment
- ✅ Better IDE autocomplete
- ✅ Self-documenting code
- ✅ Fewer runtime surprises
- ✅ Easier refactoring

---

## 🔧 Configuration

### Current Setup

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

This enables all strict type checks.

---

## 🎯 Key Rules

### 1. No Implicit Any

**❌ Not allowed:**
```typescript
function add(a, b) {  // Error: 'a' has implicit 'any' type
  return a + b;
}
```

**✅ Correct:**
```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

**Or use inference:**
```typescript
function add(a: number, b: number) {  // Return type inferred
  return a + b;
}
```

### 2. Strict Null Checks

**❌ Not allowed:**
```typescript
function getUser(id: number) {
  const user = users.find(u => u.id === id);
  return user.name;  // Error: 'user' might be undefined
}
```

**✅ Correct:**
```typescript
function getUser(id: number): string | undefined {
  const user = users.find(u => u.id === id);
  return user?.name;  // Optional chaining
}

// Or check first
function getUser(id: number): string {
  const user = users.find(u => u.id === id);
  if (!user) throw new Error('User not found');
  return user.name;  // Now guaranteed to exist
}
```

### 3. Function Parameter Types

**❌ Not allowed:**
```typescript
const users = ['Alice', 'Bob'];
users.map(user => user.toUpperCase());  // OK here, but...

function process(items: any[]) {
  items.map(item => item.process());  // Error: 'item' has implicit 'any'
}
```

**✅ Correct:**
```typescript
function process(items: string[]) {
  items.map(item => item.toUpperCase());
}

// Or be explicit
function process(items: any[]) {
  items.map((item: any) => item.process());  // Now explicit
}
```

### 4. No Unused Variables

**❌ Not allowed:**
```typescript
function getData() {
  const result = fetch('/api/data');  // Error: 'result' is unused
  return 'done';
}

function process(data: string, id: number) {  // Error: 'id' is unused
  return data.toUpperCase();
}
```

**✅ Correct:**
```typescript
function getData() {
  const result = await fetch('/api/data');
  return result.json();
}

function process(data: string) {  // Removed unused 'id'
  return data.toUpperCase();
}

// Or prefix with underscore if intentionally unused
function process(data: string, _id: number) {
  return data.toUpperCase();
}
```

### 5. Function Return Types

**❌ Not allowed (implicit):**
```typescript
export function calculate(a: number, b: number) {
  return a + b;  // Return type could be inferred, but better explicit
}
```

**✅ Correct:**
```typescript
export function calculate(a: number, b: number): number {
  return a + b;
}

// Or use inference for internal functions
const calculate = (a: number, b: number) => a + b;  // OK internally
```

### 6. This Binding

**❌ Not allowed:**
```typescript
class User {
  name = 'John';
  
  getName() {
    setTimeout(function() {
      console.log(this.name);  // Error: 'this' is undefined
    }, 1000);
  }
}
```

**✅ Correct:**
```typescript
class User {
  name = 'John';
  
  getName() {
    setTimeout(() => {  // Arrow function preserves 'this'
      console.log(this.name);
    }, 1000);
  }
}
```

### 7. Object Property Initialization

**❌ Not allowed:**
```typescript
class User {
  name: string;  // Error: Property not initialized
  
  constructor() {
    // forgot to set this.name
  }
}
```

**✅ Correct:**
```typescript
class User {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
}

// Or use initializer
class User {
  name: string = '';
}
```

---

## 🎨 Common Patterns

### API Response Typing

**❌ Not type-safe:**
```typescript
async function fetchUser(id: number) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();  // Returns any
}
```

**✅ Type-safe:**
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data as User;
}
```

### Optional Properties

```typescript
interface UserProfile {
  id: number;
  name: string;
  bio?: string;        // Optional
  avatar?: string;     // Optional
}

const user: UserProfile = {
  id: 1,
  name: 'John',
  // bio and avatar are optional, can be omitted
};
```

### Union Types

```typescript
type Status = 'pending' | 'success' | 'error';

function handleStatus(status: Status) {
  if (status === 'pending') {
    // ...
  } else if (status === 'success') {
    // ...
  } else if (status === 'error') {
    // ...
  }
  // TypeScript ensures all cases covered
}
```

### Nullable Values

```typescript
function getUserName(user: User | null): string {
  return user?.name ?? 'Unknown';  // Optional chaining + nullish coalescing
}

// Or
function getUserName(user: User | null): string {
  if (!user) return 'Unknown';
  return user.name;
}
```

### API Handlers with Types

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Type the body
    const data: { email: string; name: string } = body;
    
    const user = await prisma.user.create({
      data,
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

---

## 🧩 Real-World Examples

### Database Query

```typescript
import { prisma } from '@/lib/prisma';

// Type-safe Prisma usage
const user = await prisma.user.findUnique({
  where: { id: 1 },
});

if (!user) {
  throw new Error('User not found');
}

// Now user is guaranteed to have all properties
console.log(user.email);  // ✅ Allowed
```

### React Component Props

```typescript
interface CardProps {
  title: string;
  description?: string;
  onClick: (id: number) => void;
}

export function Card({ title, description, onClick }: CardProps) {
  return (
    <div onClick={() => onClick(1)}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
```

### Custom Hook

```typescript
function useUser(id: number): User | null {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    fetchUser(id)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);
  
  return user;
}
```

### Utility Function

```typescript
function groupBy<T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

// Usage
const users = [
  { id: 1, role: 'admin' },
  { id: 2, role: 'user' },
  { id: 3, role: 'admin' },
];

const byRole = groupBy(users, u => u.role);
// byRole: { admin: [...], user: [...] }
```

---

## 🚨 Error Messages

### Common Errors

**Error:** `Type 'undefined' is not assignable to type 'string'`
```typescript
// Problem
const name: string = user.name;  // user might not exist

// Solution
const name: string = user?.name ?? 'Unknown';
```

**Error:** `Parameter 'item' implicitly has an 'any' type`
```typescript
// Problem
const result = items.map(item => item.id);

// Solution
const result = items.map((item: Item) => item.id);
// Or provide array type
const result: number[] = items.map(item => item.id);
```

**Error:** `'x' is declared but its value is never read`
```typescript
// Problem
const unused = 5;

// Solution
console.log(unused);  // Use it
// Or
const _unused = 5;  // Prefix with underscore
```

---

## ✅ Benefits & Checklist

### Code Quality Improvements
- ✅ Fewer bugs in production
- ✅ Better IDE support
- ✅ Self-documenting code
- ✅ Easier team collaboration
- ✅ Safer refactoring

### Checklist Before Commit
- [ ] No `any` types (except intentional)
- [ ] All function parameters typed
- [ ] All function return types specified (exports)
- [ ] No unused variables
- [ ] Null checks where needed
- [ ] `pnpm typecheck` passes

---

## 📚 Related Documentation

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Strict Mode Docs](https://www.typescriptlang.org/tsconfig#strict)
- [Project tsconfig.json](../../tsconfig.json)

---

## 🎓 Learning Path

1. **Start:** Read this guide (15 min)
2. **Practice:** Write a typed function
3. **Check:** Run `pnpm typecheck` (should pass)
4. **Explore:** Check existing code patterns in the project
5. **Master:** Write complex types (generics, unions)

---

Last updated: January 2026

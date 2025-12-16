# Testing Configuration for Verifactu App

## Problem Solved

The verifactu-app tests were failing with a module resolution error:
```
Cannot find module './app/page' from 'page.test.tsx'
```

## Root Causes

1. **Missing Test Dependencies**: Jest, @testing-library/react, @testing-library/jest-dom, and jest-environment-jsdom were not installed
2. **Invalid Test File**: `page.test.tsx` was trying to import `@/app/page` which doesn't exist (the app uses a route group structure with no root page.tsx)
3. **Incomplete Jest Configuration**: Module name mapper didn't cover all import patterns

## Solutions Implemented

### 1. Added Test Dependencies
Updated `package.json` with:
- `jest@^29.7.0`
- `jest-environment-jsdom@^29.7.0`
- `@testing-library/react@^14.1.2`
- `@testing-library/jest-dom@^6.1.5`
- `@testing-library/user-event@^14.5.1`
- `@types/jest@^29.5.11`

### 2. Fixed Jest Configuration
Enhanced `jest.config.mjs` with:
- Proper module name mappers for `@/app/*` and `@/components/*`
- CSS/SCSS module handling with `identity-obj-proxy`
- Explicit test match patterns
- Coverage collection configuration

### 3. Replaced Invalid Test
- Removed `page.test.tsx` that referenced non-existent file
- Created `__tests__/basic.test.ts` with simple passing tests
- Tests now align with actual app structure

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Next Steps

To add more comprehensive tests:

1. **Component Tests**: Test individual components in the `components/` directory
2. **Layout Tests**: Test the layout components (requires mocking next/font)
3. **Integration Tests**: Test page interactions and routing
4. **API Tests**: Test any API routes if they exist

## Test Structure

```
apps/app/
├── __tests__/          # Test files go here
│   └── basic.test.ts   # Basic sanity tests
├── jest.config.mjs     # Jest configuration
├── jest.setup.js       # Jest setup file
└── package.json        # Includes test dependencies
```

## Notes

- The app uses Next.js 14 App Router with route groups
- No root `app/page.tsx` exists, routes are organized in groups like `(admin)` and `(full-width-pages)`
- Tests must account for this structure when testing pages
- Mock `next/font` when testing components that use it

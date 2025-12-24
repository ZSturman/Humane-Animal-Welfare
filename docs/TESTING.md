# Testing Guide

This document provides comprehensive guidance on testing the Shelter Link platform, including test categories, commands, best practices, and CI/CD integration.

## Table of Contents

- [Overview](#overview)
- [Test Categories](#test-categories)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#ci-cd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

Shelter Link uses a comprehensive testing strategy with three main types of tests:

| Type | Framework | Purpose | Location |
|------|-----------|---------|----------|
| **Unit Tests** | Vitest | Test individual functions and modules | `apps/*/src/__tests__/` |
| **Integration Tests** | Vitest + Supertest | Test API routes with mocked database | `apps/api/src/__tests__/routes/` |
| **E2E Tests** | Playwright | Test full user workflows | `/e2e/` |

---

## Test Categories

### 1. API Unit Tests

Located in `apps/api/src/__tests__/`, these tests verify:

- **Services** (`services/`)
  - Risk scoring algorithms
  - Business logic calculations
  - Data transformations

- **Routes** (`routes/`)
  - HTTP endpoint behavior
  - Request/response formats
  - Error handling

- **Middleware** (`middleware/`)
  - Authentication
  - Authorization
  - Request validation

### 2. Frontend Unit Tests

Located in `apps/web/src/__tests__/`, these tests verify:

- **Components** (`components/`)
  - Rendering behavior
  - User interactions
  - Styling/variants

- **Stores** (`stores/`)
  - State management
  - Actions and mutations
  - Async operations

- **Utilities** (`lib/`)
  - API client behavior
  - Helper functions
  - Data formatting

### 3. End-to-End Tests

Located in `/e2e/`, these tests verify complete user workflows:

- **Authentication** (`auth.spec.ts`)
  - Auto-login in demo mode
  - Session persistence
  - Navigation guards

- **Animals** (`animals.spec.ts`)
  - Browsing animals
  - Search and filtering
  - Animal details

- **At-Risk** (`at-risk.spec.ts`)
  - Risk dashboard
  - Severity filtering
  - Priority actions

- **Transfers** (`transfers.spec.ts`)
  - Transfer requests
  - Status display
  - Partner information

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

### Run All Tests

```bash
# Run all unit tests
npm test

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests (starts demo server automatically)
npm run test:e2e
```

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run tests in watch mode (development)
npm run test -- --watch

# Run tests for specific package
npm run test --workspace=@shelter-link/api
npm run test --workspace=@shelter-link/web

# Run specific test file
npm run test -- apps/api/src/__tests__/services/risk-scoring.test.ts

# Run tests matching pattern
npm run test -- --grep "risk scoring"
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/index.html
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/animals.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests with debug mode
npx playwright test --debug

# Run tests in headed mode (see browser)
npx playwright test --headed
```

### Demo Mode Testing

The E2E tests automatically run against the demo mode:

```bash
# Start demo server manually (for debugging)
npm run dev:demo

# Tests will auto-start the server when running:
npm run test:e2e
```

---

## Writing Tests

### API Unit Tests

```typescript
// apps/api/src/__tests__/services/example.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '@/services/example';

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### API Route Tests

```typescript
// apps/api/src/__tests__/routes/example.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

describe('GET /example', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    // Register routes and plugins
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 200 OK', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/example',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

### Frontend Component Tests

```typescript
// apps/web/src/__tests__/components/Example.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../setup';
import { Example } from '@/components/Example';

describe('Example Component', () => {
  it('should render correctly', () => {
    render(<Example title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = vi.fn();
    render(<Example onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### E2E Tests

```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/feature');
    await page.waitForLoadState('networkidle');
  });

  test('should display feature page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Feature');
  });

  test('should handle user interaction', async ({ page }) => {
    await page.click('button:has-text("Action")');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

---

## Coverage Requirements

### Thresholds

| Metric | Required | Target |
|--------|----------|--------|
| Statements | 70% | 80% |
| Branches | 60% | 70% |
| Functions | 70% | 80% |
| Lines | 70% | 80% |

### Excluded from Coverage

```typescript
// vitest.config.ts
coverage: {
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.d.ts',
    '**/test/**',
    '**/mocks/**',        // Mock data
    '**/*.config.*',      // Config files
    '**/index.ts',        // Re-export files
  ],
}
```

### Viewing Coverage

After running `npm run test:coverage`:

1. **Terminal**: Summary printed to console
2. **HTML Report**: Open `coverage/index.html`
3. **CI Badge**: Generated from `coverage/coverage-summary.json`

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
npm run test -- --run
```

### Pre-push Hook

```bash
# .husky/pre-push
#!/bin/sh
npm run test:coverage -- --run
```

---

## When to Test

### During Development

| Action | Tests to Run |
|--------|--------------|
| New feature | Write unit tests first (TDD encouraged) |
| Bug fix | Write regression test, then fix |
| Refactoring | Run existing tests to verify behavior |
| Before commit | Run related unit tests |
| Before PR | Run full test suite with coverage |

### Continuous Testing

```bash
# Watch mode for rapid feedback
npm run test -- --watch

# E2E with UI for debugging
npm run test:e2e:ui
```

---

## Test Data

### Mock Data Location

Mock data for demo mode and testing is located in:

```
apps/web/src/mocks/data/
├── animals.ts     # 45 mock animals with risk profiles
├── users.ts       # Demo user and organization
├── transfers.ts   # Sample transfer requests
├── dashboard.ts   # Computed dashboard stats
└── index.ts       # Exports
```

### Using Mock Data in Tests

```typescript
import { mockAnimals, mockUser } from '@/mocks/data';

describe('MyTest', () => {
  it('should work with mock data', () => {
    expect(mockAnimals.length).toBe(45);
    expect(mockUser.role).toBe('ADMIN');
  });
});
```

---

## Troubleshooting

### Common Issues

#### Tests Failing with "Cannot find module"

```bash
# Rebuild TypeScript
npm run build

# Clear cache
rm -rf node_modules/.vite
```

#### E2E Tests Timing Out

```bash
# Increase timeout in playwright.config.ts
timeout: 60000,

# Or per-test:
test.slow();
```

#### Coverage Not Meeting Thresholds

1. Check excluded files aren't being counted
2. Add tests for uncovered branches
3. Use `/* v8 ignore next */` for unreachable code

#### Prisma Mock Issues

```typescript
// Ensure mock is set up before import
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));
```

### Debugging Tips

```bash
# Verbose Vitest output
npm run test -- --reporter=verbose

# Playwright debug mode
PWDEBUG=1 npx playwright test

# Single test with full trace
npx playwright test e2e/animals.spec.ts --trace on
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

---

## Contributing Tests

When contributing new features:

1. ✅ Write unit tests for new functions
2. ✅ Write integration tests for new API endpoints
3. ✅ Write E2E tests for new user workflows
4. ✅ Ensure coverage thresholds are met
5. ✅ Update mock data if needed
6. ✅ Document any new testing patterns

Questions? Open an issue or reach out to the maintainers.

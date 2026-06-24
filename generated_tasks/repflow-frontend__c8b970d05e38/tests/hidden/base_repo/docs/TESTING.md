# Testing & Quality Assurance Guide

This document covers the testing strategy, coverage requirements, and cross-browser/device testing procedures for Repflow.

## Table of Contents

1. [Unit Testing (Jest)](#unit-testing-jest)
2. [Test Coverage](#test-coverage)
3. [Running Tests](#running-tests)
4. [Cross-Browser Testing](#cross-browser-testing)
5. [Cross-Device Testing](#cross-device-testing)
6. [CI/CD Integration](#cicd-integration)

---

## Unit Testing (Jest)

### Test Structure

Tests are colocated with their source files in `__tests__` directories:

```
lib/
  __tests__/
    error-messages.test.ts
    email-subject-manager.test.ts
hooks/
  __tests__/
    use-error-handler.test.ts
components/ui/
  __tests__/
    loading-spinner.test.tsx
    error-display.test.tsx
```

### Tested Components & Utilities

| Module | Tests | Coverage |
|--------|-------|----------|
| `lib/error-messages.ts` | Error message conversion, validation formatting | 96%+ |
| `hooks/use-error-handler.ts` | Error handling, toast integration, async wrapper | 100% |
| `components/ui/loading-spinner.tsx` | LoadingSpinner, PageLoading, InlineLoading | 100% |
| `components/ui/error-display.tsx` | ErrorDisplay variants, FieldError | 99%+ |

### Test Categories

- **Success states**: Verify correct behavior when operations succeed
- **Error states**: Verify user-friendly error handling and messages
- **Edge cases**: Null/undefined inputs, empty strings, boundary conditions

---

## Test Coverage

### Coverage Requirements

- **Minimum 80%** on modified components and utilities
- Coverage is enforced for:
  - `lib/error-messages.ts`
  - `hooks/use-error-handler.ts`
  - `components/ui/loading-spinner.tsx`
  - `components/ui/error-display.tsx`

### Generating Coverage Report

```bash
npm run test:coverage
```

Output is written to `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser for a detailed report.

---

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Pre-Deployment Checklist

- [ ] All tests pass (`npm test`)
- [ ] Coverage meets 80% threshold (`npm run test:coverage`)
- [ ] No lint errors (`npm run lint`)

---

## Cross-Browser Testing

### Desktop Browsers

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | ✓ | Primary development browser |
| Firefox | Latest | ✓ | Test for Firefox-specific issues |
| Safari | Latest | ✓ | WebKit rendering, macOS |

### Manual Testing Checklist (Desktop)

Run through key user flows in each browser:

1. **Authentication**
   - [ ] Sign in / Sign up
   - [ ] Password reset
   - [ ] Session persistence

2. **Creator Dashboard**
   - [ ] Deal creation (all deal types)
   - [ ] Preferences (category dropdown)
   - [ ] Profile editing

3. **Deal Tracker**
   - [ ] Create new deal with dynamic rate inputs
   - [ ] Drag-and-drop deal cards
   - [ ] Deal details modal

4. **UI Consistency**
   - [ ] Form inputs render correctly
   - [ ] Button hover/active/disabled states
   - [ ] Loading indicators display
   - [ ] Error messages display correctly

### Testing Tools

- **BrowserStack** (optional): Cloud-based cross-browser testing
- **Chrome DevTools**: Device toolbar for responsive testing
- **Safari Web Inspector**: WebKit debugging

---

## Cross-Device Testing

### Mobile & Tablet

| Device | Browser | Resolution | Status |
|--------|---------|------------|--------|
| iPhone | Safari | 390×844 | ✓ |
| iPhone | Chrome | 390×844 | ✓ |
| Android | Chrome | 412×915 | ✓ |
| iPad | Safari | 768×1024 | ✓ |

### Manual Testing Checklist (Mobile)

1. **Touch Interactions**
   - [ ] Buttons are tappable (min 44×44px)
   - [ ] Form inputs are usable
   - [ ] Dropdowns open correctly
   - [ ] Modals are dismissible

2. **Layout**
   - [ ] No horizontal scroll
   - [ ] Text is readable without zooming
   - [ ] Critical content above fold

3. **Performance**
   - [ ] Pages load in < 3 seconds
   - [ ] No jank on scroll
   - [ ] Animations are smooth

### Local Mobile Testing

1. Start dev server: `npm run dev`
2. Find your local IP: `ifconfig` or `ipconfig`
3. Access from device: `http://<your-ip>:3000`
4. Or use Chrome DevTools device emulation

---

## CI/CD Integration

### Recommended Pipeline Steps

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage

- name: Lint
  run: npm run lint

- name: Build
  run: npm run build
```

### Deployment Gate

**Do not deploy** if:
- Any test fails
- Coverage drops below 80% on covered files
- Lint errors exist
- Build fails

---

## Test Results Summary

### Last Run

| Metric | Value |
|--------|-------|
| Test Suites | 5 passed |
| Tests | 69 passed |
| Coverage (all) | 97%+ |
| Coverage (error-messages) | 96% |
| Coverage (use-error-handler) | 100% |
| Coverage (loading-spinner) | 100% |
| Coverage (error-display) | 99% |

---

## Adding New Tests

When adding new functionality:

1. Create test file: `__tests__/<module>.test.ts(x)`
2. Cover success and error paths
3. Run `npm run test:coverage` to verify
4. Add to `collectCoverageFrom` in jest.config.ts if needed
5. Update this document with new test locations

### Example Test Template

```typescript
describe('ComponentName', () => {
  it('handles success case', () => {
    // Arrange, Act, Assert
  });

  it('handles error case', () => {
    // Test error handling
  });
});
```

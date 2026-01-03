# E2E Test Plan - Leonardo-Learn

This document outlines the end-to-end testing strategy for leonardo-learn, including coverage analysis, priorities, and implementation roadmap.

## Table of Contents

- [Current Test Coverage](#current-test-coverage)
- [Coverage Gaps](#coverage-gaps)
- [Test Priorities](#test-priorities)
- [Test Strategy](#test-strategy)
- [Performance Benchmarks](#performance-benchmarks)
- [Implementation Roadmap](#implementation-roadmap)
- [Test Infrastructure](#test-infrastructure)

## Current Test Coverage

### Existing E2E Tests (3 files, 61+ test cases)

#### 1. CUD Harmony Generator (`e2e/cud-harmony-generator.e2e.ts`)

**Coverage**: 11 test cases
**Focus**: CUD optimization modes and performance

| Test Case | Status | Description |
|-----------|--------|-------------|
| Mode switching (Off/Guide/Soft/Strict) | ✅ Pass | Verifies all 4 CUD modes are selectable |
| CUD badge display per mode | ✅ Pass | Checks badge variants (CUD/≈CUD/!CUD) |
| Optimization results | ✅ Pass | Validates ΔE calculations |
| Brand color → JSON export | ✅ Pass | Tests JSON export format |
| Brand color → CSS export | ✅ Pass | Tests CSS custom properties export |
| Anchor color harmony score variation | ✅ Pass | Ensures harmony score changes with anchor |
| Empty input handling | ✅ Pass | Validates error states |
| Invalid input handling | ✅ Pass | Tests malformed HEX inputs |
| Performance: 20-color palette | ✅ Pass | Target: <200ms (actual: ~150ms avg) |
| Performance: mode switching | ✅ Pass | Target: <100ms (actual: ~80ms avg) |
| Edge case: rapid mode changes | ✅ Pass | Debouncing and state consistency |

**Coverage score**: **70%** of CUD-related functionality
**Missing coverage**:
- ❌ CUD range guide visualization
- ❌ Palette validation panel (6 checks)
- ❌ Soft snap return factor adjustment

---

#### 2. Background Color Change (`e2e/background-color-change.e2e.ts`)

**Coverage**: 10 test cases
**Focus**: Background color selector and contrast recalculation

| Test Case | Status | Description |
|-----------|--------|-------------|
| Color picker interaction | ✅ Pass | Opens picker, selects color |
| HEX input with debounce | ✅ Pass | 150ms debounce validation |
| LocalStorage persistence | ✅ Pass | Saves to `leonardo-light-bg` / `leonardo-dark-bg` |
| Page reload restoration | ✅ Pass | Restores colors from LocalStorage |
| View switching (Palette ↔ Shades) | ✅ Pass | Background color syncs across views |
| Preset buttons | ✅ Pass | Tests all 4 presets per mode |
| Contrast value updates | ✅ Pass | WCAG badges recalculate correctly |
| Light/Dark toggle | ✅ Pass | Mode switching works |
| Custom background color | ✅ Pass | User-entered HEX values |
| Invalid HEX handling | ✅ Pass | Error states and validation |

**Coverage score**: **90%** of background color functionality
**Missing coverage**:
- ❌ OKLCH input format (alternative to HEX)

---

#### 3. Semantic Role Overlay (`e2e/semantic-role-overlay.e2e.ts`)

**Coverage**: 40+ test cases
**Focus**: DADS token system and semantic role mapping

| Test Category | Count | Description |
|---------------|-------|-------------|
| Circular swatch rendering | 8 | All 6 role categories (P/S/Su/E/W/L) |
| Label auto-contrast | 6 | Black/white text selection |
| Multi-role priority | 4 | Handling shades with multiple roles |
| Brand role hue-scale mapping | 6 | Brand → DADS shade resolution |
| Tooltips & ARIA | 8 | Accessibility features |
| External role info bars | 4 | Roles outside hue bounds |
| Contrast boundary pills | 4 | 3:1→, 4.5:1→, ←4.5:1, ←3:1 |
| Performance (130 shades) | 1 | Target: <200ms (actual: ~180ms) |
| Keyboard navigation | 3 | Tab order, focus management |
| Screen reader announcements | 2 | ARIA live regions |

**Coverage score**: **95%** of semantic role functionality
**Missing coverage**:
- ❌ Unresolved role bar (for hue-scale indeterminate brands)

---

### Overall Test Coverage Summary

| Feature Area | Coverage | Test Count | Status |
|--------------|----------|------------|--------|
| CUD Optimization | 70% | 11 | 🟡 Partial |
| Background Color | 90% | 10 | 🟢 Good |
| Semantic Roles | 95% | 40+ | 🟢 Excellent |
| **Harmony Generation** | **0%** | **0** | 🔴 **Missing** |
| **Palette View** | **30%** | **3** | 🔴 **Insufficient** |
| **Accessibility View** | **0%** | **0** | 🔴 **Missing** |
| **Export Functionality** | **20%** | **2** | 🔴 **Insufficient** |
| **Color Detail Modal** | **0%** | **0** | 🔴 **Missing** |
| **Navigation & State** | **40%** | **5** | 🟡 **Partial** |

**Total E2E coverage**: **~40%** of critical user paths

---

## Coverage Gaps

### 🔴 Critical Gaps (High Priority)

#### 1. Harmony Selection → Palette Generation Flow

**User impact**: This is the **Golden Path** - most important user journey
**Current state**: ❌ No dedicated E2E test
**What's missing**:
- Brand color input validation
- Harmony card click interaction
- Automatic view transition (Harmony → Palette)
- Palette generation verification (correct color count, 13 shades each)
- Generation performance (<200ms target)

**Recommended test**: `e2e/harmony-to-palette.e2e.ts`

---

#### 2. Export Dialog End-to-End

**User impact**: Critical for production use - users need to export palettes
**Current state**: ⚠️ Only format validation (not full UX flow)
**What's missing**:
- Export button click
- Format selector interaction (CSS/Tailwind/JSON/DTCG)
- Preview textarea rendering
- Clipboard copy verification
- File download verification
- Success notification display
- Edge cases: empty palette, export dialog close

**Recommended test**: `e2e/export-dialog.e2e.ts`

---

#### 3. CVD Simulation (Accessibility View)

**User impact**: Accessibility specialists rely on this for compliance
**Current state**: ❌ No E2E tests (only unit tests exist)
**What's missing**:
- CVD type button selection (P/D/T/Achromatopsia)
- Color transformation accuracy (visual regression)
- DeltaE calculation verification
- Confusion pair highlighting
- CVD score and grade display
- Adjacent shades analysis
- Distinguishability matrix rendering

**Recommended test**: `e2e/cvd-simulation.e2e.ts`

---

#### 4. Multi-View Workflow

**User impact**: Users frequently navigate between views
**Current state**: ⚠️ View switching tested in isolation, not as complete workflow
**What's missing**:
- Complete user journey: Harmony → Palette → Shades → Accessibility → Export
- State persistence across view switches
- Background color synchronization
- CVD simulation mode persistence
- CUD mode preservation
- Performance of view transitions

**Recommended test**: `e2e/multi-view-workflow.e2e.ts`

---

### 🟡 Moderate Gaps (Medium Priority)

#### 5. Color Detail Modal

**User impact**: Power users (design system maintainers) need this for fine-tuning
**Current state**: ❌ No E2E tests
**What's missing**:
- Shade click to open modal
- Mini scale navigation
- Hue scrubber interaction (±30° range)
- Infinite scroll (wraps at 0°/360°)
- Live preview during drag
- WCAG badge updates
- APCA value display
- Close and apply changes

**Recommended test**: `e2e/color-detail-modal.e2e.ts`

---

#### 6. CUD Validation Panel

**User impact**: Users in CUD modes need validation feedback
**Current state**: ❌ Panel exists but no E2E tests
**What's missing**:
- Panel visibility (only in CUD modes)
- All 6 validation checks:
  1. Off-CUD colors detected
  2. Contrast issues
  3. CVD confusion risks
  4. Similar color warnings
  5. Yellow-green confusion
  6. vs recommended examples
- Expandable details
- Issue counts
- Warning/error states

**Recommended test**: `e2e/cud-validation-panel.e2e.ts`

---

#### 7. Harmony Type Variety

**User impact**: Users need access to all 9 harmony types
**Current state**: ⚠️ Only tested generically, not each type
**What's missing**:
- Individual tests for each harmony:
  - Complementary (2 colors)
  - Triadic (3 colors)
  - Analogous (3 colors)
  - Split-Complementary (3 colors)
  - Tetradic (4 colors)
  - Square (4 colors)
  - Material 3 (5 colors)
  - DADS (10+ colors)
- Color count validation
- Hue angle calculations
- Visual preview accuracy

**Recommended test**: `e2e/harmony-types.e2e.ts`

---

### 🟢 Minor Gaps (Low Priority)

#### 8. Error Handling & Edge Cases

- Network failures (DADS token loading)
- Browser storage quota exceeded
- Unicode/emoji in HEX input
- Out-of-gamut OKLCH values
- Extremely rapid user actions (race conditions)

**Recommended test**: `e2e/error-handling.e2e.ts`

---

#### 9. Accessibility (a11y) Features

- Keyboard-only navigation (all views)
- Screen reader announcements (all state changes)
- Focus management (modals, dropdowns)
- ARIA attributes (labels, roles, live regions)
- Color contrast for UI elements (meta-accessibility)

**Recommended test**: `e2e/accessibility-features.e2e.ts`

---

#### 10. Mobile Responsiveness

- Touch interactions (color picker, hue scrubber)
- Viewport adaptations (tablet, mobile)
- Virtual keyboard handling
- Swipe gestures (view navigation)

**Recommended test**: `e2e/mobile-responsiveness.e2e.ts`

---

## Test Priorities

### Priority Matrix

| Priority | Feature | User Impact | Implementation Effort | ROI |
|----------|---------|-------------|----------------------|-----|
| **P0** 🔴 | Harmony → Palette flow | Critical (Golden Path) | Low (2 hours) | **Very High** |
| **P0** 🔴 | Export dialog | Critical (production use) | Medium (4 hours) | **Very High** |
| **P0** 🔴 | CVD simulation | High (accessibility compliance) | Medium (4 hours) | **High** |
| **P1** 🟡 | Multi-view workflow | High (common pattern) | Medium (3 hours) | **High** |
| **P1** 🟡 | CUD validation panel | Medium (CUD users only) | Low (2 hours) | **Medium** |
| **P1** 🟡 | Harmony type variety | Medium (feature completeness) | Medium (4 hours) | **Medium** |
| **P2** 🟢 | Color detail modal | Low (power users) | Medium (3 hours) | **Medium** |
| **P2** 🟢 | Error handling | Low (edge cases) | High (6 hours) | **Low** |
| **P2** 🟢 | Accessibility features | Low (already mostly accessible) | High (8 hours) | **Low** |
| **P2** 🟢 | Mobile responsiveness | Low (desktop-first tool) | High (8 hours) | **Low** |

### Recommended Implementation Order

**Sprint 1** (P0 - Critical, ~10 hours):
1. `harmony-to-palette.e2e.ts` (2h)
2. `export-dialog.e2e.ts` (4h)
3. `cvd-simulation.e2e.ts` (4h)

**Sprint 2** (P1 - High, ~9 hours):
4. `multi-view-workflow.e2e.ts` (3h)
5. `cud-validation-panel.e2e.ts` (2h)
6. `harmony-types.e2e.ts` (4h)

**Sprint 3** (P2 - Medium, ~6 hours):
7. `color-detail-modal.e2e.ts` (3h)
8. `error-handling.e2e.ts` (3h)

**Future** (Low ROI):
9. `accessibility-features.e2e.ts`
10. `mobile-responsiveness.e2e.ts`

---

## Test Strategy

### Testing Approach

#### 1. **User Journey-Driven Testing**

Focus on real user workflows rather than isolated features:
- ✅ Test complete flows (e.g., Harmony → Palette → Export)
- ✅ Validate state consistency across views
- ❌ Avoid testing implementation details (internal state, private methods)

**Example**:
```typescript
// ✅ Good: Tests user journey
test('User can generate and export a palette', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="brand-color-input"]', '#3B82F6');
  await page.click('[data-testid="harmony-card-complementary"]');
  await expect(page.locator('[data-testid="palette-view"]')).toBeVisible();
  await page.click('[data-testid="export-button"]');
  await page.selectOption('[data-testid="format-selector"]', 'css');
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('--color-primary-');
});

// ❌ Bad: Tests implementation detail
test('State.palettes array is populated', async ({ page }) => {
  // This is a unit test concern, not E2E
});
```

---

#### 2. **Visual Regression Testing**

Use Playwright's screenshot comparison for color-sensitive features:
- CVD simulation (compare Normal vs P/D/T type)
- Harmony previews (verify color accuracy)
- Color scales (ensure correct shades)

**Example**:
```typescript
test('CVD Protanopia simulation transforms colors correctly', async ({ page }) => {
  await page.goto('/?view=accessibility');

  // Baseline: Normal vision
  await page.click('[data-testid="cvd-normal"]');
  await expect(page.locator('[data-testid="color-matrix"]')).toHaveScreenshot('cvd-normal.png');

  // Test: Protanopia simulation
  await page.click('[data-testid="cvd-protanopia"]');
  await expect(page.locator('[data-testid="color-matrix"]')).toHaveScreenshot('cvd-protanopia.png');

  // Verify images are different (simulation applied)
  // Playwright will auto-fail if screenshots match
});
```

---

#### 3. **Performance Testing**

Validate performance targets from CLAUDE.md:
- 20-color palette CUD optimization: **<200ms**
- Mode switching: **<100ms**
- View rendering (130 shades): **<200ms**

**Example**:
```typescript
test('Harmony generation completes within 200ms', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="brand-color-input"]', '#FF6B35');

  const startTime = Date.now();
  await page.click('[data-testid="harmony-card-material3"]'); // 5 colors
  await page.waitForSelector('[data-testid="palette-view"]');
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(200);
});
```

---

#### 4. **Accessibility Testing**

Use Playwright's accessibility tools (Axe integration):
- Automated WCAG checks on all views
- Keyboard navigation (Tab order, Enter/Space for buttons)
- Screen reader compatibility (ARIA labels, live regions)

**Example**:
```typescript
import AxeBuilder from '@axe-core/playwright';

test('Palette view meets WCAG AAA standards', async ({ page }) => {
  await page.goto('/?view=palette');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

#### 5. **Data-Driven Testing**

Test multiple inputs systematically:
- Various brand colors (red, blue, green, yellow, etc.)
- Edge case OKLCH values (L=0, L=1, C=0, C=0.4)
- Different harmony types
- All CUD modes

**Example**:
```typescript
const brandColors = [
  { hex: '#FF0000', name: 'Red' },
  { hex: '#00FF00', name: 'Green' },
  { hex: '#0000FF', name: 'Blue' },
  { hex: '#FFFF00', name: 'Yellow' },
  { hex: '#FF00FF', name: 'Magenta' },
];

for (const { hex, name } of brandColors) {
  test(`Generates palette for ${name} brand color`, async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="brand-color-input"]', hex);
    await page.click('[data-testid="harmony-card-triadic"]');

    const colorCards = await page.locator('[data-testid="color-scale"]').count();
    expect(colorCards).toBe(3); // Triadic = 3 colors
  });
}
```

---

### Test Data Management

#### Fixtures

Create reusable test data in `e2e/fixtures/`:

```typescript
// e2e/fixtures/brand-colors.ts
export const testBrandColors = {
  blue: '#3B82F6',
  red: '#EF4444',
  green: '#10B981',
  yellow: '#F59E0B',
  purple: '#8B5CF6',
};

// e2e/fixtures/expected-outputs.ts
export const expectedCSSExport = {
  blue: `:root {
  --color-primary-50: oklch(0.99 0.01 200);
  --color-primary-100: oklch(0.95 0.02 200);
  /* ... */
}`,
};
```

---

### Playwright Configuration

Current setup: `playwright.config.ts`

**Key settings**:
- **Browser**: Chromium (primary), Firefox, WebKit (optional)
- **Viewport**: 1280×720 (default desktop)
- **Base URL**: `http://localhost:3000` (dev server)
- **Timeout**: 30 seconds (default)
- **Retries**: 2 (flaky test mitigation)
- **Workers**: 4 (parallel execution)
- **Screenshot**: On failure
- **Video**: On first retry

**Recommended additions**:
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry', // Debugging
    video: 'on-first-retry',
    screenshot: 'only-on-failure',

    // Clipboard permissions (for export tests)
    permissions: ['clipboard-read', 'clipboard-write'],

    // Color scheme (test both light/dark)
    colorScheme: 'light',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'dark-mode',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
    // Optional: Mobile
    // {
    //   name: 'mobile',
    //   use: { ...devices['iPhone 13'] },
    // },
  ],
});
```

---

## Performance Benchmarks

### Current Benchmarks (from existing tests)

| Operation | Target | Actual (avg) | Status | Test File |
|-----------|--------|--------------|--------|-----------|
| 20-color CUD optimization | <200ms | ~150ms | ✅ Pass | `cud-harmony-generator.e2e.ts` |
| CUD mode switching | <100ms | ~80ms | ✅ Pass | `cud-harmony-generator.e2e.ts` |
| Shades view rendering (130 shades) | <200ms | ~180ms | ✅ Pass | `semantic-role-overlay.e2e.ts` |
| Background color debounce | 150ms | 150ms | ✅ Pass | `background-color-change.e2e.ts` |

### Missing Benchmarks (to be implemented)

| Operation | Target | Priority | Test File (proposed) |
|-----------|--------|----------|----------------------|
| Harmony card click → Palette view | <200ms | P0 | `harmony-to-palette.e2e.ts` |
| View transition (any → any) | <100ms | P1 | `multi-view-workflow.e2e.ts` |
| CVD simulation toggle | <150ms | P0 | `cvd-simulation.e2e.ts` |
| Export dialog open → preview render | <100ms | P0 | `export-dialog.e2e.ts` |
| Color detail modal open | <50ms | P2 | `color-detail-modal.e2e.ts` |
| Hue scrubber drag (per frame) | <16ms (60fps) | P2 | `color-detail-modal.e2e.ts` |

### Performance Testing Best Practices

1. **Measure consistently**:
   ```typescript
   const duration = await page.evaluate(async () => {
     const start = performance.now();
     // Trigger operation
     await someAsyncOperation();
     return performance.now() - start;
   });
   expect(duration).toBeLessThan(200);
   ```

2. **Use Navigation Timing API**:
   ```typescript
   const navigationTiming = await page.evaluate(() =>
     JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]))
   );
   const domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart;
   expect(domContentLoaded).toBeLessThan(1000);
   ```

3. **Monitor regression**:
   - Track benchmarks in CI
   - Fail if performance degrades >10%
   - Use Playwright's `soft` assertions for warnings

---

## Implementation Roadmap

### Phase 1: Critical Coverage (Sprint 1)

**Goal**: Achieve 60% coverage of critical paths
**Duration**: 2 weeks
**Deliverables**:

1. **`e2e/harmony-to-palette.e2e.ts`** (Golden Path)
   - Brand color input validation (5 test cases)
   - Harmony card selection (9 harmony types)
   - View transition (1 test case)
   - Palette generation verification (3 test cases)
   - Performance benchmark (1 test case)
   - **Total**: 19 test cases

2. **`e2e/export-dialog.e2e.ts`** (Production Use)
   - Export button interaction (1 test case)
   - Format selector (4 formats × 2 = 8 test cases)
   - Clipboard copy (4 test cases)
   - File download (4 test cases)
   - Preview rendering (4 test cases)
   - Error handling (3 test cases)
   - **Total**: 24 test cases

3. **`e2e/cvd-simulation.e2e.ts`** (Accessibility)
   - CVD type selection (5 types)
   - Color transformation accuracy (5 visual regression tests)
   - DeltaE calculations (3 test cases)
   - Confusion pair detection (4 test cases)
   - CVD score display (2 test cases)
   - Performance (1 test case)
   - **Total**: 20 test cases

**Milestone**: **63 new test cases**, **~60% total coverage**

---

### Phase 2: High-Value Features (Sprint 2)

**Goal**: Achieve 75% coverage
**Duration**: 2 weeks
**Deliverables**:

4. **`e2e/multi-view-workflow.e2e.ts`**
   - Complete user journey (1 comprehensive test)
   - State persistence (4 test cases)
   - Background color sync (2 test cases)
   - View transition performance (4 test cases)
   - **Total**: 11 test cases

5. **`e2e/cud-validation-panel.e2e.ts`**
   - Panel visibility (2 test cases)
   - All 6 validation checks (12 test cases)
   - Expandable details (3 test cases)
   - **Total**: 17 test cases

6. **`e2e/harmony-types.e2e.ts`**
   - Individual harmony tests (9 types × 3 = 27 test cases)
   - Color count validation (9 test cases)
   - Visual previews (9 test cases)
   - **Total**: 45 test cases

**Milestone**: **73 new test cases**, **~75% total coverage**

---

### Phase 3: Power User Features (Sprint 3)

**Goal**: Achieve 85% coverage
**Duration**: 1 week
**Deliverables**:

7. **`e2e/color-detail-modal.e2e.ts`**
   - Modal open/close (2 test cases)
   - Mini scale navigation (3 test cases)
   - Hue scrubber (6 test cases)
   - WCAG badge updates (2 test cases)
   - Performance (1 test case)
   - **Total**: 14 test cases

8. **`e2e/error-handling.e2e.ts`**
   - Network failures (3 test cases)
   - Invalid inputs (5 test cases)
   - Edge cases (4 test cases)
   - **Total**: 12 test cases

**Milestone**: **26 new test cases**, **~85% total coverage**

---

### Phase 4: Polish & Edge Cases (Future)

**Goal**: Achieve 95% coverage
**Deliverables**:

9. **`e2e/accessibility-features.e2e.ts`**
   - Keyboard navigation (10 test cases)
   - Screen reader (8 test cases)
   - Focus management (6 test cases)
   - **Total**: 24 test cases

10. **`e2e/mobile-responsiveness.e2e.ts`**
    - Touch interactions (8 test cases)
    - Viewport adaptations (4 test cases)
    - **Total**: 12 test cases

**Milestone**: **36 new test cases**, **~95% total coverage**

---

### Final Target

**Total test cases**: ~200 (across 10 test files)
**Total coverage**: **~95%** of critical user paths
**Estimated effort**: **6 weeks** (3 developers)

---

## Test Infrastructure

### Directory Structure

```
e2e/
├── test-plan.md                      # This file
├── scenarios/
│   └── README.md                     # Scenario-based test guide
├── fixtures/
│   ├── brand-colors.ts               # Test brand color data
│   ├── expected-outputs.ts           # Expected export formats
│   └── test-palettes.ts              # Pre-generated palettes
├── helpers/
│   ├── navigation.ts                 # View switching helpers
│   ├── assertions.ts                 # Custom expect matchers
│   └── performance.ts                # Performance measurement utilities
├── screenshots/
│   ├── cvd-baselines/                # Visual regression baselines
│   └── harmony-previews/             # Harmony card baselines
├── cud-harmony-generator.e2e.ts      # ✅ Existing
├── background-color-change.e2e.ts    # ✅ Existing
├── semantic-role-overlay.e2e.ts      # ✅ Existing
├── harmony-to-palette.e2e.ts         # 🔄 Phase 1
├── export-dialog.e2e.ts              # 🔄 Phase 1
├── cvd-simulation.e2e.ts             # 🔄 Phase 1
├── multi-view-workflow.e2e.ts        # 🔄 Phase 2
├── cud-validation-panel.e2e.ts       # 🔄 Phase 2
├── harmony-types.e2e.ts              # 🔄 Phase 2
├── color-detail-modal.e2e.ts         # 🔄 Phase 3
├── error-handling.e2e.ts             # 🔄 Phase 3
├── accessibility-features.e2e.ts     # 🔄 Phase 4
└── mobile-responsiveness.e2e.ts      # 🔄 Phase 4
```

---

### Custom Helpers

#### Navigation Helper (`e2e/helpers/navigation.ts`)

```typescript
import { Page } from '@playwright/test';

export async function navigateToView(page: Page, view: 'harmony' | 'palette' | 'shades' | 'accessibility') {
  await page.click(`[data-testid="nav-${view}"]`);
  await page.waitForSelector(`[data-testid="${view}-view"]`);
}

export async function generatePalette(page: Page, brandColor: string, harmonyType: string) {
  await page.fill('[data-testid="brand-color-input"]', brandColor);
  await page.click(`[data-testid="harmony-card-${harmonyType}"]`);
  await page.waitForSelector('[data-testid="palette-view"]');
}
```

---

#### Custom Assertions (`e2e/helpers/assertions.ts`)

```typescript
import { expect } from '@playwright/test';

export async function expectOKLCHValid(page: Page, selector: string) {
  const oklch = await page.locator(selector).getAttribute('data-oklch');
  const [l, c, h] = oklch!.split(',').map(Number);

  expect(l).toBeGreaterThanOrEqual(0);
  expect(l).toBeLessThanOrEqual(1);
  expect(c).toBeGreaterThanOrEqual(0);
  expect(c).toBeLessThanOrEqual(0.4);
  expect(h).toBeGreaterThanOrEqual(0);
  expect(h).toBeLessThan(360);
}

export async function expectWCAGBadge(page: Page, selector: string, level: 'AA' | 'AAA' | 'Fail') {
  const badge = page.locator(`${selector} [data-testid="wcag-badge"]`);
  await expect(badge).toHaveText(level);
}
```

---

#### Performance Utilities (`e2e/helpers/performance.ts`)

```typescript
import { Page } from '@playwright/test';

export async function measureOperation(page: Page, operation: () => Promise<void>): Promise<number> {
  const startTime = Date.now();
  await operation();
  return Date.now() - startTime;
}

export async function measureNavigationTiming(page: Page): Promise<Record<string, number>> {
  return await page.evaluate(() => {
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      loadComplete: timing.loadEventEnd - timing.loadEventStart,
      firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
    };
  });
}
```

---

### Visual Regression Setup

**Baseline creation**:
```bash
# Generate baseline screenshots
bun run test:e2e --update-snapshots

# Review baselines
ls -lh e2e/screenshots/cvd-baselines/
```

**Configuration** (in `playwright.config.ts`):
```typescript
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,        // Allow minor rendering differences
      threshold: 0.2,             // 20% tolerance
      animations: 'disabled',     // Disable animations
    },
  },
});
```

---

### CI Integration

**GitHub Actions workflow** (`.github/workflows/e2e-tests.yml`):

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - run: bun run test:e2e
        env:
          CI: true

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: e2e/screenshots/
```

---

## Appendix

### Test Naming Conventions

**Format**: `{feature}.e2e.ts`

**Test case naming**:
```typescript
test('User can {action} when {condition}', async ({ page }) => {
  // Example: "User can export palette when format is CSS"
});

test('{Feature} should {behavior}', async ({ page }) => {
  // Example: "CVD simulation should transform colors accurately"
});

test('{Action} completes within {time}', async ({ page }) => {
  // Example: "Palette generation completes within 200ms"
});
```

---

### Data Test IDs

**Convention**: `data-testid="{component}-{element}"`

**Examples**:
- `data-testid="brand-color-input"`
- `data-testid="harmony-card-complementary"`
- `data-testid="nav-palette"`
- `data-testid="export-button"`
- `data-testid="cvd-protanopia"`

**Benefits**:
- Resilient to class name changes
- Clear semantic meaning
- Easy to grep in codebase

---

### Debugging Tips

1. **Run in headed mode**:
   ```bash
   bun run test:e2e --headed
   ```

2. **Debug specific test**:
   ```bash
   bun run test:e2e harmony-to-palette.e2e.ts --debug
   ```

3. **Playwright Inspector**:
   ```bash
   PWDEBUG=1 bun run test:e2e
   ```

4. **Trace viewer**:
   ```bash
   bunx playwright show-trace trace.zip
   ```

---

**Document version**: 1.0
**Last updated**: 2026-01-03
**Maintained by**: leonardo-learn team

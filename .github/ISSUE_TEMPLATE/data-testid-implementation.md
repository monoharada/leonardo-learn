---
name: E2E Testing - Add data-testid attributes
about: Add data-testid attributes to UI components for reliable test selectors
title: 'E2E Testing: Add data-testid attributes to UI components for reliable test selectors'
labels: testing, enhancement, e2e
assignees: ''
---

## Problem

The newly created E2E test documentation (`.claude/docs/user-flows.md`, `e2e/test-plan.md`, `e2e/scenarios/README.md`) references `data-testid` attributes extensively for test selectors, but **these attributes do not exist in the actual application code** (`index.html` and `src/ui/demo/` components).

### Current State

**Documented test selectors** (from user flow docs):
```typescript
await page.click('[data-testid="brand-color-input"]');
await page.click('[data-testid="harmony-card-complementary"]');
await page.click('[data-testid="export-button"]');
await page.click('[data-testid="cvd-protanopia"]');
```

**Actual HTML** (`index.html`):
```html
<!-- Expected: [data-testid="nav-harmony"] -->
<!-- Actual: --> <button id="view-harmony" class="dads-button">ハーモニー</button>

<!-- Expected: [data-testid="export-button"] -->
<!-- Actual: --> <button id="export-btn" class="dads-button">エクスポート</button>

<!-- Expected: [data-testid="cvd-protanopia"] -->
<!-- Actual: --> <button data-cvd="protanopia" class="dads-button">P型</button>
```

### Why Existing E2E Tests Pass

The current E2E tests (`e2e/cud-harmony-generator.e2e.ts`, `e2e/semantic-role-overlay.e2e.ts`, etc.) navigate to **custom test pages** rather than the actual application:

```typescript
// e2e/cud-harmony-generator.e2e.ts
test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/cud-test-page.html"); // ← Custom test page, not index.html
});
```

These test pages DO have `data-testid` attributes, but the main application (`index.html`) does not. **This means actual user flows through the real application are untested.**

### Impact

1. **Cannot implement documented E2E scenarios** - All new test scenarios will fail immediately
2. **False sense of security** - Existing tests give green checkmarks but don't test real user paths
3. **Fragile tests** - Using ID/class selectors couples tests to implementation details
4. **Documentation unusable** - ~200 test case scenarios documented but not implementable

### Scope

Components needing `data-testid` attributes (based on user flow documentation):

**Harmony View:**
- Brand color input field: `data-testid="brand-color-input"`
- Color picker button: `data-testid="brand-color-picker"`
- CUD mode selector: `data-testid="cud-mode-selector"`
- Harmony cards (9 types): `data-testid="harmony-card-{type}"` (complementary, triadic, etc.)
- CUD badges: `data-testid="cud-badge"`
- CUD range guide: `data-testid="cud-range-guide"`

**Palette View:**
- Palette view container: `data-testid="palette-view"`
- Color scale cards: `data-testid="color-scale"`
- Shade swatches: `data-testid="shade-{index}"`
- WCAG badges: `data-testid="wcag-badge"`
- CUD validation panel: `data-testid="cud-validation-panel"`
- Validation checks: `data-testid="validation-check"`
- Export button: `data-testid="export-button"`

**Shades View:**
- Shades view container: `data-testid="shades-view"`
- Hue sections: `data-testid="hue-section-{hue}"`
- Shade cells: `data-testid="shade-{hue}-{index}"`
- Semantic role overlays: `data-testid="role-swatch"`
- Contrast boundary pills: `data-testid="contrast-boundary"`
- External role info bars: `data-testid="external-role-bar"`

**Accessibility View:**
- Accessibility view container: `data-testid="accessibility-view"`
- CVD type buttons: `data-testid="cvd-{type}"` (normal, protanopia, deuteranopia, tritanopia, achromatopsia)
- CVD score display: `data-testid="cvd-score"`
- Confusion pairs: `data-testid="confusion-pair"`
- Distinguishability matrix: `data-testid="distinguishability-matrix"`

**Navigation:**
- View buttons: `data-testid="nav-{view}"` (harmony, palette, shades, accessibility)

**Background Color Selector:**
- Light/Dark toggle: `data-testid="background-toggle-{mode}"`
- Color picker: `data-testid="background-color-picker"`
- Color input: `data-testid="background-color-input"`
- Preset buttons: `data-testid="background-preset-{index}"`

**Export Dialog:**
- Export dialog container: `data-testid="export-dialog"`
- Format selector: `data-testid="format-selector"`
- Format buttons: `data-testid="format-{format}"` (css, tailwind, json)
- Preview textarea: `data-testid="export-preview"`
- Copy button: `data-testid="copy-button"`
- Download button: `data-testid="download-button"`
- Close dialog: `data-testid="close-dialog"`

**Color Detail Modal:**
- Modal container: `data-testid="color-detail-modal"`
- Mini scale navigation: `data-testid="mini-scale"`
- Hue scrubber: `data-testid="hue-scrubber"`
- Confirm button: `data-testid="modal-confirm"`

## Proposed Solutions

### Option A: Add data-testid to Application (Recommended)

**Pros:**
- ✅ Tests become resilient to UI refactoring (ID/class changes don't break tests)
- ✅ Clear semantic meaning for test authors
- ✅ Documentation becomes immediately usable
- ✅ Industry best practice (React Testing Library, Playwright recommend data-testid)

**Cons:**
- ⚠️ Adds ~100+ attributes across codebase (one-time effort)
- ⚠️ Slight HTML bloat (minimal, ~1-2KB total)

**Implementation:**
1. Create naming convention guide (e.g., `{component}-{element}`)
2. Add to component templates systematically
3. Optional: Add ESLint rule to require data-testid on interactive elements

### Option B: Update Documentation to Use Actual Selectors

**Pros:**
- ✅ No code changes needed
- ✅ Tests can be written immediately

**Cons:**
- ❌ Tests become fragile (coupled to implementation)
- ❌ ID/class changes break tests
- ❌ Harder to maintain (need to track selector changes)
- ❌ Some elements lack unique selectors (require complex xpath)

### Option C: Hybrid Approach

Add `data-testid` only to critical user flow elements, use IDs for others.

## Acceptance Criteria

- [ ] All components listed in scope have appropriate `data-testid` attributes
- [ ] Naming convention documented in `CONTRIBUTING.md` or similar
- [ ] At least one E2E test navigates to `/` (actual app) instead of test pages
- [ ] Golden Path scenario (brand color → harmony → palette → export) passes end-to-end

## Related Documentation

- User Flow Documentation: `.claude/docs/user-flows.md`
- E2E Test Plan: `e2e/test-plan.md`
- Test Scenarios: `e2e/scenarios/README.md`

## Priority

**High** - Blocks implementation of 10+ test files covering ~200 test cases documented in test plan Phase 1-4.

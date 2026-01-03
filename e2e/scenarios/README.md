# E2E Test Scenarios - Leonardo-Learn

This directory contains scenario-based E2E tests organized by user persona and workflow. Each scenario represents a complete user journey from start to finish.

> **⚠️ Implementation Note**: Test code examples use `data-testid` selectors that **do not yet exist** in the actual application. See [GitHub Issue](../../.github/ISSUE_TEMPLATE/data-testid-implementation.md). Before implementing these scenarios, either add data-testid attributes to the application OR update test code to use actual selectors (`#export-btn`, `data-cvd="protanopia"`, etc.).

## Table of Contents

- [Overview](#overview)
- [Scenario Structure](#scenario-structure)
- [Scenario Catalog](#scenario-catalog)
- [Implementation Guide](#implementation-guide)
- [Best Practices](#best-practices)

## Overview

### What is a Scenario?

A **scenario** is a complete, real-world user workflow that spans multiple features and views. Unlike feature-specific tests (e.g., "background color selector works"), scenarios test entire user journeys (e.g., "design system maintainer creates DADS-based tokens and exports to JSON format").

### Why Scenario-Based Testing?

**Benefits**:
- ✅ Tests real user behavior (not isolated features)
- ✅ Catches integration issues between features
- ✅ Validates state management across views
- ✅ Ensures consistent UX throughout the journey
- ✅ Provides living documentation of user workflows

**Relationship to Test Plan**:
- **Test Plan** (`e2e/test-plan.md`): Coverage analysis, priorities, implementation roadmap
- **Scenarios** (this directory): Persona-driven, end-to-end user journeys
- **Feature Tests** (`e2e/*.e2e.ts`): Focused tests for specific components

---

## Scenario Structure

### File Naming Convention

**Format**: `{persona}-{goal}.scenario.ts`

**Examples**:
- `designer-brand-palette-export.scenario.ts`
- `accessibility-specialist-cvd-validation.scenario.ts`
- `developer-multicolor-theme.scenario.ts`
- `design-system-maintainer-dads-tokens.scenario.ts`

### Scenario Template

```typescript
import { test, expect } from '@playwright/test';

/**
 * Scenario: {Persona} {Goal}
 *
 * User Persona: {Persona name and background}
 * User Goal: {What the user wants to achieve}
 * Success Criteria: {How we know the user succeeded}
 * Estimated Duration: {Time to complete scenario}
 */

test.describe('Scenario: {Persona} - {Goal}', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to app, clear state, etc.
    await page.goto('/');
  });

  test('completes workflow successfully', async ({ page }) => {
    // GIVEN: Initial state
    // WHEN: User performs actions
    // THEN: User achieves goal

    // Step 1: {Action}
    // Step 2: {Action}
    // ...
    // Step N: Verify success
  });

  test('handles {edge case} gracefully', async ({ page }) => {
    // Optional: Test error recovery
  });
});
```

---

## Scenario Catalog

### 1. Golden Path Scenarios (P0)

#### Scenario 1.1: Brand Designer - Quick Palette Export

**File**: `brand-designer-quick-palette.scenario.ts`

**Persona**: Brand Designer (Julia)
- Works at a design agency
- Creates brand guidelines for clients
- Needs to deliver accessible color palettes quickly
- Limited accessibility expertise

**User Goal**: Generate a complementary color palette from a brand color and export as CSS for developer handoff.

**Flow**:
```
[Start] Harmony View
    ↓ Enter client brand color (#3B82F6)
    ↓ Review 9 harmony previews
    ↓ Select "Complementary" (2 colors: Primary + Accent)
[Auto-transition] Palette View
    ↓ Review Primary scale (13 shades)
    ↓ Review Accent scale (13 shades)
    ↓ Check WCAG badges (ensure AA+ for key shades)
    ↓ Toggle to Dark background
    ↓ Verify contrast maintains
[Export] Export Dialog
    ↓ Click "Export" button
    ↓ Select "CSS" format
    ↓ Copy to clipboard
[Success] Paste into email to developer
```

**Success Criteria**:
- ✅ Palette generated within 3 minutes
- ✅ All shades 300-700 meet WCAG AA (4.5:1)
- ✅ CSS export contains `--color-primary-*` and `--color-accent-*` variables
- ✅ Background toggle works without errors

**Test Code**:
```typescript
test('Brand designer generates and exports palette', async ({ page }) => {
  const brandColor = '#3B82F6'; // Client's blue

  // Step 1: Enter brand color
  await page.goto('/');
  await page.fill('[data-testid="brand-color-input"]', brandColor);

  // Step 2: Select Complementary harmony
  await page.click('[data-testid="harmony-card-complementary"]');

  // Step 3: Verify palette view
  await expect(page.locator('[data-testid="palette-view"]')).toBeVisible();
  const colorScales = await page.locator('[data-testid="color-scale"]').count();
  expect(colorScales).toBe(2); // Primary + Accent

  // Step 4: Verify WCAG badges
  const aaBadges = await page.locator('[data-testid="wcag-badge"][data-level="AA"]').count();
  expect(aaBadges).toBeGreaterThan(0);

  // Step 5: Toggle to dark background
  await page.click('[data-testid="background-toggle-dark"]');
  await page.waitForTimeout(200); // Allow contrast recalculation

  // Step 6: Export as CSS
  await page.click('[data-testid="export-button"]');
  await page.selectOption('[data-testid="format-selector"]', 'css');

  // Step 7: Copy to clipboard
  await page.click('[data-testid="copy-button"]');

  // Step 8: Verify clipboard content
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('--color-primary-');
  expect(clipboardText).toContain('--color-accent-');
  expect(clipboardText).toMatch(/oklch\(\d+\.\d+ \d+\.\d+ \d+\)/);
});
```

---

#### Scenario 1.2: Frontend Developer - Tailwind Integration

**File**: `developer-tailwind-integration.scenario.ts`

**Persona**: Frontend Developer (Marcus)
- Builds React apps with Tailwind CSS
- Needs color tokens in Tailwind format
- Works with both light and dark themes

**User Goal**: Generate a Triadic palette and export Tailwind config for both light and dark backgrounds.

**Flow**:
```
[Start] Harmony View
    ↓ Enter app primary color (#10B981)
    ↓ Select "Triadic" (3 colors)
[Auto-transition] Palette View
    ↓ Test on Light background (#ffffff)
    ↓ Export Tailwind → save as tailwind.light.config.js
    ↓ Switch to Dark background (#000000)
    ↓ Export Tailwind → save as tailwind.dark.config.js
[Success] Import configs in project
```

**Success Criteria**:
- ✅ Triadic generates exactly 3 colors
- ✅ Each color has 13 shades (50-1200)
- ✅ Tailwind export is valid JavaScript
- ✅ Both light and dark exports differ in recommended shades

**Test Code**:
```typescript
test('Developer exports Tailwind config for light/dark themes', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="brand-color-input"]', '#10B981');
  await page.click('[data-testid="harmony-card-triadic"]');

  // Light theme export
  await page.click('[data-testid="background-toggle-light"]');
  await page.click('[data-testid="export-button"]');
  await page.selectOption('[data-testid="format-selector"]', 'tailwind');
  const lightExport = await page.locator('[data-testid="export-preview"]').textContent();
  expect(lightExport).toContain('module.exports');
  expect(lightExport).toContain('theme: {');

  await page.click('[data-testid="close-dialog"]');

  // Dark theme export
  await page.click('[data-testid="background-toggle-dark"]');
  await page.click('[data-testid="export-button"]');
  const darkExport = await page.locator('[data-testid="export-preview"]').textContent();

  // Verify exports differ (different recommended shades)
  expect(lightExport).not.toBe(darkExport);
});
```

---

### 2. Accessibility-Focused Scenarios (P0)

#### Scenario 2.1: Accessibility Specialist - CVD Compliance Validation

**File**: `accessibility-specialist-cvd-validation.scenario.ts`

**Persona**: Accessibility Specialist (Priya)
- Consultant for government/healthcare projects
- Must ensure WCAG AAA + CVD compliance
- Tests all color vision deficiency types

**User Goal**: Validate that a palette is distinguishable for Protanopia, Deuteranopia, and Tritanopia users.

**Flow**:
```
[Start] Harmony View
    ↓ Enable CUD Strict mode
    ↓ Enter brand color (#EF4444)
    ↓ Select "Material 3" (5 colors)
[Palette View] Quick review
[Accessibility View] CVD Testing
    ↓ Select Protanopia → verify no confusion pairs
    ↓ Select Deuteranopia → verify no confusion pairs
    ↓ Select Tritanopia → verify no confusion pairs
    ↓ Check CVD score ≥ B grade
[Export] Export JSON with CVD metadata
[Success] Document compliance in audit report
```

**Success Criteria**:
- ✅ CUD Strict mode snaps all colors to database
- ✅ No confusion pairs (ΔE < 12) in any CVD type
- ✅ CVD score ≥ 80% (B grade)
- ✅ JSON export includes `cudMetadata` field

**Test Code**:
```typescript
test('Accessibility specialist validates CVD compliance', async ({ page }) => {
  // Step 1: Enable CUD Strict
  await page.goto('/');
  await page.selectOption('[data-testid="cud-mode-selector"]', 'strict');

  // Step 2: Generate Material 3 palette
  await page.fill('[data-testid="brand-color-input"]', '#EF4444');
  await page.click('[data-testid="harmony-card-material3"]');

  // Step 3: Navigate to Accessibility view
  await page.click('[data-testid="nav-accessibility"]');
  await expect(page.locator('[data-testid="accessibility-view"]')).toBeVisible();

  // Step 4: Test Protanopia
  await page.click('[data-testid="cvd-protanopia"]');
  const protanConfusion = await page.locator('[data-testid="confusion-pair"]').count();
  expect(protanConfusion).toBe(0);

  // Step 5: Test Deuteranopia
  await page.click('[data-testid="cvd-deuteranopia"]');
  const deutanConfusion = await page.locator('[data-testid="confusion-pair"]').count();
  expect(deutanConfusion).toBe(0);

  // Step 6: Test Tritanopia
  await page.click('[data-testid="cvd-tritanopia"]');
  const tritanConfusion = await page.locator('[data-testid="confusion-pair"]').count();
  expect(tritanConfusion).toBe(0);

  // Step 7: Verify CVD score
  const cvdScore = await page.locator('[data-testid="cvd-score"]').textContent();
  const scoreValue = parseInt(cvdScore!.match(/\d+/)![0]);
  expect(scoreValue).toBeGreaterThanOrEqual(80); // B grade

  // Step 8: Export with metadata
  await page.click('[data-testid="export-button"]');
  await page.selectOption('[data-testid="format-selector"]', 'json');
  const jsonExport = await page.locator('[data-testid="export-preview"]').textContent();
  const parsed = JSON.parse(jsonExport!);
  expect(parsed.metadata.cudMode).toBe('strict');
  expect(parsed.metadata.complianceRate).toBe(100);
});
```

---

### 3. Advanced Customization Scenarios (P1)

#### Scenario 3.1: Design System Maintainer - DADS Token Export

**File**: `design-system-maintainer-dads-tokens.scenario.ts`

**Persona**: Design System Maintainer (Yuki)
- Manages design system for large enterprise
- Integrates with Figma and design token pipelines
- Needs semantic role mappings

**User Goal**: Generate DADS-based palette with semantic roles and export to JSON format for Figma plugin.

> **Note**: DTCG format is planned but not yet implemented. This scenario uses JSON format as a substitute.

**Flow**:
```
[Start] Harmony View
    ↓ Enter brand color (#8B5CF6)
    ↓ Select "DADS" harmony
[Palette View] Quick review (10 hues)
[Shades View] Deep inspection
    ↓ Verify semantic role overlays (Primary, Success, Error, etc.)
    ↓ Check contrast boundaries (3:1→, 4.5:1→)
    ↓ Review brand color mapping to specific DADS shade
[Color Detail Modal] Fine-tune a specific shade
    ↓ Click blue-600 shade
    ↓ Adjust hue by +5°
    ↓ Confirm changes
[Export] Export as JSON (with semantic metadata)
[Success] Import into Figma Tokens plugin (manual conversion to DTCG if needed)
```

**Success Criteria**:
- ✅ DADS harmony generates 10 hues × 13 shades = 130 colors
- ✅ Semantic roles appear on correct shades
- ✅ Contrast boundaries calculated accurately
- ✅ JSON export contains semantic metadata
- ✅ Hue adjustment reflects in export

**Test Code**:
```typescript
test('Design system maintainer creates DADS tokens', async ({ page }) => {
  // Step 1: Generate DADS palette
  await page.goto('/');
  await page.fill('[data-testid="brand-color-input"]', '#8B5CF6');
  await page.click('[data-testid="harmony-card-dads"]');

  // Step 2: Navigate to Shades view
  await page.click('[data-testid="nav-shades"]');
  await expect(page.locator('[data-testid="shades-view"]')).toBeVisible();

  // Step 3: Verify semantic role overlays
  const roleSwatches = await page.locator('[data-testid="role-swatch"]').count();
  expect(roleSwatches).toBeGreaterThan(0);

  // Step 4: Verify contrast boundaries
  const boundaryPills = await page.locator('[data-testid="contrast-boundary"]').count();
  expect(boundaryPills).toBeGreaterThanOrEqual(4); // 3:1→, 4.5:1→, ←4.5:1, ←3:1

  // Step 5: Fine-tune blue-600
  await page.click('[data-testid="shade-blue-600"]');
  await expect(page.locator('[data-testid="color-detail-modal"]')).toBeVisible();

  // Step 6: Adjust hue
  const hueSlider = page.locator('[data-testid="hue-scrubber"]');
  const currentHue = await hueSlider.getAttribute('value');
  const newHue = parseInt(currentHue!) + 5;
  await hueSlider.fill(newHue.toString());

  // Step 7: Confirm changes
  await page.click('[data-testid="modal-confirm"]');
  await expect(page.locator('[data-testid="color-detail-modal"]')).not.toBeVisible();

  // Step 8: Export as JSON (DTCG not yet implemented)
  await page.click('[data-testid="export-button"]');
  await page.selectOption('[data-testid="format-selector"]', 'json');

  // Step 9: Verify JSON structure with semantic metadata
  const jsonExport = await page.locator('[data-testid="export-preview"]').textContent();
  const parsed = JSON.parse(jsonExport!);
  expect(parsed.colors.blue['600']).toBeDefined();
  expect(parsed.colors.blue['600'].hex).toBeDefined();
  expect(parsed.colors.blue['600'].oklch).toBeDefined();
  // TODO: Verify semantic role metadata when implemented
});
```

---

### 4. CUD Optimization Scenarios (P1)

#### Scenario 4.1: Inclusive Designer - Brand Adaptation for CUD

**File**: `inclusive-designer-cud-optimization.scenario.ts`

**Persona**: Inclusive Designer (Alex)
- Specializes in universal design
- Balances brand identity with accessibility
- Uses CUD Soft Snap for optimal balance

**User Goal**: Adapt a non-CUD-friendly brand color to maximize color-blind accessibility while maintaining brand harmony.

**Flow**:
```
[Start] Harmony View
    ↓ Enter brand color (#FF6B35) - non-CUD color
    ↓ Enable CUD Guide mode (assess current state)
    ↓ See many !CUD badges
    ↓ Switch to CUD Soft Snap mode
    ↓ Observe ≈CUD badges (improved)
    ↓ Select Triadic harmony
[Palette View] Review optimization
    ↓ Check CUD validation panel
    ↓ Review 6 validation checks
    ↓ Identify remaining issues (e.g., CVD confusion)
[Accessibility View] Validate CVD
    ↓ Test Protan/Deutan/Tritan
    ↓ Identify confusion pairs
[Harmony View] Iterate
    ↓ Adjust anchor color by +10° hue
    ↓ Regenerate
    ↓ Recheck validation
[Export] Export JSON with CUD metadata
[Success] Achieve 90%+ compliance with acceptable harmony
```

**Success Criteria**:
- ✅ CUD Guide shows initial non-compliance
- ✅ CUD Soft Snap improves compliance to 80%+
- ✅ Harmony score remains >70
- ✅ Validation panel shows improvement
- ✅ Iteration resolves CVD confusion

**Test Code**:
```typescript
test('Inclusive designer optimizes brand color for CUD', async ({ page }) => {
  const brandColor = '#FF6B35';

  // Step 1: Assess with Guide mode
  await page.goto('/');
  await page.selectOption('[data-testid="cud-mode-selector"]', 'guide');
  await page.fill('[data-testid="brand-color-input"]', brandColor);

  // Step 2: Count !CUD badges
  const initialOffCUD = await page.locator('[data-testid="cud-badge"][data-status="off"]').count();
  expect(initialOffCUD).toBeGreaterThan(0);

  // Step 3: Switch to Soft Snap
  await page.selectOption('[data-testid="cud-mode-selector"]', 'soft');
  await page.waitForTimeout(200); // Optimization time

  // Step 4: Verify improvement
  const softNearCUD = await page.locator('[data-testid="cud-badge"][data-status="near"]').count();
  expect(softNearCUD).toBeGreaterThan(0);

  // Step 5: Generate Triadic
  await page.click('[data-testid="harmony-card-triadic"]');

  // Step 6: Check validation panel
  await expect(page.locator('[data-testid="cud-validation-panel"]')).toBeVisible();
  const validationChecks = await page.locator('[data-testid="validation-check"]').count();
  expect(validationChecks).toBe(6);

  // Step 7: Check compliance rate
  const complianceText = await page.locator('[data-testid="compliance-rate"]').textContent();
  const complianceRate = parseInt(complianceText!.match(/\d+/)![0]);
  expect(complianceRate).toBeGreaterThanOrEqual(80);

  // Step 8: Verify harmony score maintained
  const harmonyScore = await page.locator('[data-testid="harmony-score"]').textContent();
  const scoreValue = parseInt(harmonyScore!);
  expect(scoreValue).toBeGreaterThan(70);
});
```

---

### 5. Multi-View Workflow Scenarios (P1)

#### Scenario 5.1: Comprehensive Review - All Views

**File**: `comprehensive-review-all-views.scenario.ts`

**Persona**: QA Tester (Chen)
- Tests design system releases
- Validates consistency across all views
- Checks state persistence

**User Goal**: Navigate through all 4 views and verify state consistency.

**Flow**:
```
[Harmony View]
    ↓ Generate palette with CUD Soft + Complementary
[Palette View]
    ↓ Set background to custom color (#f5f5f5)
    ↓ Verify contrast badges
[Shades View]
    ↓ Verify background color persists
    ↓ Check semantic roles
[Accessibility View]
    ↓ Enable Protanopia simulation
    ↓ Verify CVD score
[Back to Harmony View]
    ↓ Verify CUD mode persists
    ↓ Verify brand color persists
[Export]
    ↓ Export CSS with full state
[Success] All state consistent across views
```

**Success Criteria**:
- ✅ Background color syncs across Palette + Shades views
- ✅ CUD mode persists through all view switches
- ✅ CVD simulation persists when returning to Accessibility view
- ✅ Brand color and harmony selection preserved
- ✅ Export includes all current state

**Test Code**:
```typescript
test('User navigates all views with consistent state', async ({ page }) => {
  const customBackground = '#f5f5f5';

  // Step 1: Generate palette
  await page.goto('/');
  await page.selectOption('[data-testid="cud-mode-selector"]', 'soft');
  await page.fill('[data-testid="brand-color-input"]', '#3B82F6');
  await page.click('[data-testid="harmony-card-complementary"]');

  // Step 2: Set custom background in Palette view
  await expect(page.locator('[data-testid="palette-view"]')).toBeVisible();
  await page.click('[data-testid="background-color-picker"]');
  await page.fill('[data-testid="background-color-input"]', customBackground);
  await page.waitForTimeout(200); // Debounce

  // Step 3: Navigate to Shades view
  await page.click('[data-testid="nav-shades"]');
  await expect(page.locator('[data-testid="shades-view"]')).toBeVisible();

  // Step 4: Verify background persists
  const shadesBackground = await page.locator('[data-testid="background-color-input"]').inputValue();
  expect(shadesBackground).toBe(customBackground);

  // Step 5: Navigate to Accessibility view
  await page.click('[data-testid="nav-accessibility"]');
  await expect(page.locator('[data-testid="accessibility-view"]')).toBeVisible();

  // Step 6: Enable Protanopia
  await page.click('[data-testid="cvd-protanopia"]');

  // Step 7: Return to Harmony view
  await page.click('[data-testid="nav-harmony"]');
  await expect(page.locator('[data-testid="harmony-view"]')).toBeVisible();

  // Step 8: Verify CUD mode persists
  const cudMode = await page.locator('[data-testid="cud-mode-selector"]').inputValue();
  expect(cudMode).toBe('soft');

  // Step 9: Verify brand color persists
  const brandColor = await page.locator('[data-testid="brand-color-input"]').inputValue();
  expect(brandColor).toBe('#3B82F6');

  // Step 10: Return to Accessibility and verify CVD persists
  await page.click('[data-testid="nav-accessibility"]');
  const cvdButton = page.locator('[data-testid="cvd-protanopia"]');
  await expect(cvdButton).toHaveAttribute('aria-pressed', 'true');
});
```

---

## Implementation Guide

### Step 1: Identify Target Persona

Choose from 4 primary personas (see `.claude/docs/user-flows.md`):
1. **Design System Maintainer** - DADS integration, JSON export (DTCG planned)
2. **Accessibility Specialist** - WCAG, CVD compliance
3. **Brand Designer** - Quick palette generation, aesthetics
4. **Frontend Developer** - CSS/Tailwind export, multi-theme

### Step 2: Define User Goal

What does the user want to achieve?
- Generate a palette? ✅
- Validate accessibility? ✅
- Export in specific format? ✅
- Fine-tune colors? ✅

### Step 3: Map Complete Flow

Document every step from entry to success:
1. Starting point (usually Harmony View)
2. Intermediate actions (view switches, settings)
3. Decision points (which harmony? which export format?)
4. End goal (export file, validation confirmation)

### Step 4: Define Success Criteria

How do we know the user succeeded?
- Specific metrics (e.g., CVD score ≥ 80%)
- File outputs (e.g., valid JSON with semantic metadata)
- Visual confirmations (e.g., all badges green)
- Time constraints (e.g., completes in <5 min for new users)

### Step 5: Write Test Code

Use Playwright's `test()` API:
- **Given**: Set up initial state
- **When**: User performs actions (clicks, inputs, navigations)
- **Then**: Verify outcomes (assertions)

### Step 6: Add Edge Cases (Optional)

Consider error paths:
- What if network fails during DADS token load?
- What if user enters invalid HEX?
- What if browser doesn't support clipboard API?

---

## Best Practices

### 1. Write Tests from User Perspective

❌ **Bad** (implementation-focused):
```typescript
test('State.palettes array updates when harmony selected', async ({ page }) => {
  // Too low-level
});
```

✅ **Good** (user-focused):
```typescript
test('User sees palette after selecting Complementary harmony', async ({ page }) => {
  await page.click('[data-testid="harmony-card-complementary"]');
  await expect(page.locator('[data-testid="palette-view"]')).toBeVisible();
});
```

---

### 2. Use Descriptive Test Names

Include persona, action, and expected outcome:

✅ **Good**:
- `Brand designer exports CSS palette for client handoff`
- `Accessibility specialist validates CVD compliance for government project`
- `Developer integrates Tailwind tokens into React app`

---

### 3. Document Context in Comments

Help future maintainers understand the scenario:

```typescript
test('Inclusive designer optimizes brand color for CUD', async ({ page }) => {
  // Context: Brand color #FF6B35 is not CUD-compliant (orange).
  // Goal: Use Soft Snap to find nearest CUD color while preserving harmony.

  const brandColor = '#FF6B35';

  // Step 1: Assess current compliance with Guide mode
  // Expected: Many !CUD badges due to non-compliant orange
  await page.selectOption('[data-testid="cud-mode-selector"]', 'guide');
  // ...
});
```

---

### 4. Avoid Hard-Coded Waits

❌ **Bad**:
```typescript
await page.waitForTimeout(2000); // Hope it's done by now?
```

✅ **Good**:
```typescript
await page.waitForSelector('[data-testid="palette-view"]', { state: 'visible' });
```

---

### 5. Measure Performance Where Relevant

If scenario has time constraints:

```typescript
test('Brand designer completes workflow in under 3 minutes', async ({ page }) => {
  const startTime = Date.now();

  // ... perform all scenario steps ...

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(180000); // 3 minutes
});
```

---

### 6. Clean Up After Tests

```typescript
test.afterEach(async ({ page }) => {
  // Clear LocalStorage to prevent state pollution
  await page.evaluate(() => localStorage.clear());
});
```

---

### 7. Use Fixtures for Reusable Data

```typescript
// e2e/fixtures/personas.ts
export const personas = {
  brandDesigner: {
    brandColor: '#3B82F6',
    harmonyType: 'complementary',
    exportFormat: 'css',
  },
  accessibilitySpecialist: {
    brandColor: '#EF4444',
    cudMode: 'strict',
    cvdTypes: ['protanopia', 'deuteranopia', 'tritanopia'],
  },
};

// In test:
import { personas } from './fixtures/personas';

test('Brand designer scenario', async ({ page }) => {
  const { brandColor, harmonyType, exportFormat } = personas.brandDesigner;
  // Use persona data
});
```

---

## Appendix

### Scenario Checklist

Before marking a scenario as complete, verify:

- [ ] Persona clearly defined (name, background, goals)
- [ ] User goal stated explicitly
- [ ] Complete flow documented (step-by-step)
- [ ] Success criteria defined (measurable)
- [ ] Test code implements full scenario
- [ ] Edge cases considered (at least 1)
- [ ] Comments explain context and intent
- [ ] Test passes consistently (run 3+ times)
- [ ] Performance measured (if time-constrained)
- [ ] State cleanup after test

---

### Scenario Template File

Create new scenarios using this template:

```typescript
import { test, expect } from '@playwright/test';

/**
 * Scenario: [Persona] [Goal]
 *
 * User Persona:
 * - Name: [Name]
 * - Background: [Background]
 * - Goals: [Goals]
 *
 * User Goal: [What the user wants to achieve]
 *
 * Success Criteria:
 * - [Criterion 1]
 * - [Criterion 2]
 * - [Criterion 3]
 *
 * Estimated Duration: [Time]
 */

test.describe('Scenario: [Persona] - [Goal]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('completes workflow successfully', async ({ page }) => {
    // GIVEN: [Initial state]

    // WHEN: [User actions]
    // Step 1: [Action]
    // Step 2: [Action]
    // ...

    // THEN: [Verify success]
    // Assert success criteria met
  });

  test('handles [edge case] gracefully', async ({ page }) => {
    // Optional: Test error path
  });
});
```

---

### Relationship to Other Docs

| Document | Purpose | Link |
|----------|---------|------|
| **User Flows** | Detailed flow documentation | `.claude/docs/user-flows.md` |
| **Test Plan** | Coverage analysis, priorities | `e2e/test-plan.md` |
| **Scenarios** | Persona-driven E2E tests | `e2e/scenarios/` (this dir) |
| **Feature Tests** | Component-specific tests | `e2e/*.e2e.ts` |

---

**Next Steps**:

1. **Review** user flows in `.claude/docs/user-flows.md`
2. **Choose** a persona and goal from catalog above
3. **Create** new scenario file using template
4. **Implement** test code following best practices
5. **Run** test and verify it passes
6. **Document** in this README's catalog

---

**Document version**: 1.1
**Last updated**: 2026-01-03
**Maintained by**: leonardo-learn team

**Changelog**:
- v1.1 (2026-01-03): Added implementation note about data-testid selectors, fixed DTCG references (not yet implemented), updated time estimates
- v1.0 (2026-01-03): Initial version

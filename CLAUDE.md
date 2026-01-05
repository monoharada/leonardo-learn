# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**leonardo-learn** is an OKLCH color space-based design system color palette generator inspired by Adobe Leonardo. It uses a contrast-ratio-driven approach ("generate colors from contrast requirements" rather than "check contrast after choosing colors") to create accessible palettes from brand colors with WCAG 2.1/2.2 and WCAG 3 APCA compliance, plus CUD (Color Universal Design) support.

## Development Commands

```bash
# Install dependencies
bun install

# Development (watch mode)
bun run dev

# Build (browser-targeted with minification)
bun run build

# Run all tests
bun test

# Run single test file
bun test src/core/cud/optimizer.test.ts

# Watch mode for tests
bun test --watch

# Coverage (target: 90%+)
bun test --coverage

# Performance benchmarks (CI mode)
cross-env CI_BENCH=1 bun test src/core/cud/performance.test.ts

# E2E tests (Playwright)
bun run test:e2e

# E2E tests with UI
bun run test:e2e:ui

# Type check
bun run type-check

# Lint (Biome)
bun run lint
bun run lint:fix

# Format
bun run format

# Full check (lint + format)
bun run check
```

## Architecture

### Three-Layer Design (Adobe Leonardo-inspired)
1. **Theme Layer** (`src/core/theme.ts`): Manages multiple color definitions, theme coordination
2. **Color/BackgroundColor Layer** (`src/core/color.ts`, `background.ts`): Individual color and scale definitions
3. **Algorithm Layer** (`src/core/solver.ts`, `interpolation.ts`): Contrast calculation, binary search, spline interpolation

### Dependency Direction
```
UI Layer (src/ui/) → Core Layer (src/core/) → Utils Layer (src/utils/)
```
Circular dependencies are prohibited.

### Key Modules

| Path | Purpose |
|------|---------|
| `src/core/` | Color generation algorithms, Theme/Color classes |
| `src/core/cud/` | CUD optimization (optimizer, zone, snapper, harmony-score) |
| `src/core/export/` | CSS, JSON, Tailwind, DTCG exporters |
| `src/core/tokens/` | Design token system (DADS importer, semantic resolver) |
| `src/core/system/` | Color system coordination (collision detection, contrast maintenance, role assignment) |
| `src/core/semantic-role/` | Semantic role mapping (contrast boundaries, hue normalization) |
| `src/core/strategies/` | Generation strategies (DADS optimizer, M3 generator) |
| `src/core/preview/` | Preview generation (scale preview, theme preview) |
| `src/accessibility/` | WCAG 2.1/2.2, APCA (WCAG 3), CVD simulation |
| `src/utils/` | OKLCH/OKLab color space operations |
| `src/ui/` | Demo UI, CUD components |
| `e2e/` | Playwright E2E tests |

### CUD Optimization Algorithm (ADR-007)
- **Greedy algorithm** for multi-objective optimization (CUD distance + harmony)
- **3-zone classification**: Safe (ΔE ≤ 0.05), Warning (0.05 < ΔE ≤ 0.12), Off (ΔE > 0.12)
- **Soft Snap**: OKLab linear interpolation with configurable return factor
- Performance target: 20-color palette in <200ms

## Documentation

### User Flows & Testing

**User Flow Documentation**: `.claude/docs/user-flows.md`

Comprehensive documentation of all user interaction flows including:
- **Golden Path**: Brand color → Harmony selection → Palette review → Export (2-3 min)
- **Alternative Flows**: Advanced customization, accessibility validation, background-adaptive design, CUD optimization
- **UI Components**: Detailed breakdown of all 4 views (Harmony, Palette, Shades, Accessibility)
- **User Personas**: Design system maintainers, accessibility specialists, brand designers, frontend developers
- **Feature Interactions**: Event cascades, state management, performance considerations

This document serves as the foundation for E2E and browser testing strategies.

## Code Standards

### TypeScript
- **Strict mode required** (all strict flags enabled in tsconfig.json)
- `any` type prohibited - use `unknown` or proper type definitions
- Path aliases: `@/` for `src/`, `@/core/*`, `@/utils/*`, `@/ui/*`

### Formatting (Biome)
- Tab indentation
- Double quotes
- Auto-organize imports

### Test Placement
Tests are co-located with source files (unit/integration), E2E tests are separate:
```
src/core/cud/optimizer.ts
src/core/cud/optimizer.test.ts      # Unit test (co-located)
e2e/cud-harmony-generator.e2e.ts    # E2E test (separate directory)
```

## Key Libraries

- **culori.js**: OKLCH/OKLab color operations (only runtime dependency)
- **apca-w3**: WCAG 3 APCA contrast calculation
- **@digital-go-jp/design-tokens**: DADS token integration
- **@material/material-color-utilities**: M3 color generation

## Spec-Driven Development

This project uses Kiro-style spec-driven development:
- **Steering docs**: `.kiro/steering/` (product.md, tech.md, structure.md)
- **Specifications**: `.kiro/specs/[feature-name]/`

Key commands:
- `/kiro:spec-status [feature]`: Check progress
- `/kiro:spec-impl [feature] [tasks]`: Implement tasks

### Codex Review Workflow (必須)

**重要**: 各kiro:specフェーズ完了後、必ずCodexレビューを実行すること。

```bash
# 各フェーズ完了後にCodexレビューを実行
/sdd-codex-review requirements [feature]  # kiro:spec-requirements後
/sdd-codex-review design [feature]        # kiro:spec-design後
/sdd-codex-review tasks [feature]         # kiro:spec-tasks後
/sdd-codex-review impl [feature]          # kiro:spec-impl後（従来方式）

# セクション単位レビュー（推奨）
/sdd-codex-review impl-section [feature] [section-id]  # 特定セクション
/sdd-codex-review impl-pending [feature]               # 未レビュー一括

# E2Eエビデンス収集
/sdd-codex-review e2e-evidence [feature] [section-id]  # 手動実行
```

ワークフロー:
1. `/kiro:spec-requirements [feature]` → `/sdd-codex-review requirements [feature]`
2. `/kiro:spec-design [feature]` → `/sdd-codex-review design [feature]`
3. `/kiro:spec-tasks [feature]` → `/sdd-codex-review tasks [feature]`
4. `/kiro:spec-impl [feature] [task]` → `/sdd-codex-review impl-section [feature] [section-id]`（セクション単位推奨）

各フェーズでAPPROVEDを取得してから次へ進む。

## Agent-Driven Development Guidelines

Claude Code should **autonomously** leverage agents and built-in tools throughout the development process. This section defines when and how to use specialized capabilities for this project.

### 1. Task Decomposition & Planning (ALWAYS USE)

**When to activate**:
- ANY task involving 3+ steps or files
- Feature implementation requests
- Complex refactoring or architectural changes
- Performance optimization work
- Accessibility improvements

**Tools to use**:
- **Plan Agent (EnterPlanMode)**: For architectural decisions, multiple valid approaches, or large-scale changes
- **TodoWrite tool** (CRITICAL): Create task lists IMMEDIATELY when starting any non-trivial work
  - Break down into specific, actionable items
  - Mark tasks as `in_progress` BEFORE starting work
  - Mark as `completed` IMMEDIATELY after finishing (no batching)
  - Keep exactly ONE task `in_progress` at any time

**Example workflow**:
```
User request → TodoWrite (create plan) → Mark first task in_progress →
Implement → Mark completed → Next task → ... → All done
```

### 2. Code Quality & Simplicity (ENFORCE AUTOMATICALLY)

**Auto-check before any commit**:
- ✅ **No `any` types**: Use `unknown` or proper type definitions
- ✅ **No circular dependencies**: Verify UI → Core → Utils direction
- ✅ **No over-engineering**:
  - Don't add features beyond what was requested
  - Don't create abstractions for one-time operations
  - Don't add error handling for impossible scenarios
  - Three similar lines > premature abstraction
- ✅ **No backwards-compatibility hacks**: Delete unused code completely
- ✅ **Strict TypeScript compliance**: All strict flags must pass
- ✅ **Biome formatting**: Auto-format with tab indentation, double quotes

**Tools to use**:
- Run `bun run check` before committing
- Use `bun run type-check` to verify strict TypeScript
- Grep for `any` type usage: should return zero results
- Check import paths for circular dependencies (use Explore agent if complex)

**Custom agents to create** (if needed):
```bash
# Create .claude/agents/simplicity-checker.md
/agents  # Then configure for over-engineering detection
```

### 3. Accessibility Validation (CRITICAL - AUTO-CHECK)

**When to activate** (ALWAYS for color-related changes):
- ANY changes to `src/core/solver.ts`, `src/accessibility/`, `src/core/cud/`
- Contrast calculation modifications
- Color generation algorithm updates
- UI component changes in `src/ui/`

**Required checks**:
- ✅ **WCAG 2.1/2.2 compliance**: Verify contrast ratios meet standards
- ✅ **APCA (WCAG 3) compliance**: Check `src/accessibility/apca.ts` integration
- ✅ **CUD optimization**: Validate ΔE thresholds (Safe ≤0.05, Warning ≤0.12, Off >0.12)
- ✅ **CVD simulation**: Ensure color-blind friendly palettes

**Testing requirements**:
```bash
# Run accessibility-specific tests automatically
bun test src/accessibility/
bun test src/core/cud/

# Verify APCA contrast calculations
bun test src/core/solver.test.ts
```

**Custom agents recommended**:
- **accessibility-guardian**: Auto-validates WCAG/APCA on color changes
- **cud-optimizer-validator**: Checks CUD zone classifications and harmony scores

### 4. Test-Driven Development (MANDATORY)

**Coverage target**: 90%+ (ENFORCE)

**Workflow** (follow strictly):
1. **Write tests FIRST** (TDD approach)
2. **Implement to pass tests**
3. **Verify coverage**: `bun test --coverage`
4. **Never commit** if coverage drops below 90%

**Auto-test scenarios**:
- After implementing any function in `src/core/`
- After modifying algorithms in `src/core/solver.ts`, `src/core/interpolation.ts`
- After CUD optimization changes
- Before any git commit

**Test placement**:
- **Co-located**: Unit/integration tests next to source files
  ```
  src/core/cud/optimizer.ts
  src/core/cud/optimizer.test.ts  ← Same directory
  ```
- **Separate**: E2E tests in dedicated directory
  ```
  e2e/cud-harmony-generator.e2e.ts  ← E2E directory
  ```

**Custom agents recommended**:
- **tdd-specialist**: Generates tests before implementation
- **coverage-analyzer**: Monitors and reports coverage drops

### 5. Performance Monitoring (AUTO-CHECK)

**Performance target**: 20-color palette generation in <200ms (ENFORCE)

**When to measure** (ALWAYS for these changes):
- Modifications to `src/core/cud/optimizer.ts`
- Changes to `src/core/solver.ts` (binary search algorithm)
- Updates to `src/core/interpolation.ts` (spline interpolation)
- Any algorithm in `src/core/strategies/`

**Benchmarking**:
```bash
# Run performance benchmarks automatically
cross-env CI_BENCH=1 bun test src/core/cud/performance.test.ts

# Verify <200ms target is met
```

**Custom agents recommended**:
- **performance-analyzer**: Auto-runs benchmarks and flags regressions

### 6. Architecture & Dependency Management (AUTO-ENFORCE)

**Critical rules** (NEVER violate):
- ❌ **No circular dependencies**: UI → Core → Utils (one direction only)
- ❌ **No cross-layer imports**: `src/ui/` cannot import from `src/core/` siblings
- ✅ **Use path aliases**: `@/core/*`, `@/utils/*`, `@/ui/*` (not relative paths)

**Auto-check before commits**:
```bash
# Verify dependency direction (use Explore agent if complex codebase)
# Check for backward imports: Core → UI (FORBIDDEN)
# Check for sibling imports within layers (DISCOURAGED)
```

**Tools to use**:
- **Explore Agent**: For analyzing dependency graphs in large changes
- **Grep tool**: Search for forbidden import patterns
  ```bash
  # Example: Check if core imports from ui (should be zero)
  grep -r "from '@/ui" src/core/
  ```

### 7. Documentation & User Flows (REFERENCE FREQUENTLY)

**Key documents to consult**:
- **User flows**: `.claude/docs/user-flows.md` (check before UI changes)
- **Steering docs**: `.kiro/steering/` (check before architecture decisions)
- **ADRs**: `.kiro/steering/` (Architecture Decision Records)

**When to reference**:
- Before implementing UI features → Check `.claude/docs/user-flows.md`
- Before architectural changes → Check `.kiro/steering/tech.md`
- Before new features → Check `.kiro/steering/product.md`

### 8. E2E Testing (RUN BEFORE PR)

**When to run** (MANDATORY):
- After implementing user-facing features
- Before creating pull requests
- After significant UI changes

**Commands**:
```bash
# Run E2E tests automatically
bun run test:e2e

# Use UI mode for debugging
bun run test:e2e:ui
```

### Built-in Agents Reference

Claude Code provides these built-in agents (use autonomously as needed):

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **Explore** | Fast codebase analysis (read-only) | Understand code structure, find files, analyze dependencies |
| **Plan** | Implementation planning & task decomposition | Complex features, architectural decisions, multiple approaches |
| **General-Purpose** | Multi-step tasks with file modifications | Standard development tasks requiring read + write + execute |

### Custom Agents for leonardo-learn

**Recommended custom agents to create**:

1. **`.claude/agents/accessibility-guardian.md`**
   - Auto-validates WCAG 2.1/2.2 and APCA compliance
   - Checks CUD optimization constraints
   - Triggers on: Changes to `src/accessibility/`, `src/core/solver.ts`, `src/core/cud/`

2. **`.claude/agents/performance-analyzer.md`**
   - Runs benchmarks automatically
   - Validates <200ms target for palette generation
   - Triggers on: Changes to `src/core/cud/`, `src/core/solver.ts`, `src/core/strategies/`

3. **`.claude/agents/simplicity-enforcer.md`**
   - Detects over-engineering patterns
   - Flags unnecessary abstractions
   - Checks for premature optimization
   - Triggers on: All code changes

4. **`.claude/agents/dependency-checker.md`**
   - Validates UI → Core → Utils direction
   - Detects circular dependencies
   - Checks path alias usage
   - Triggers on: New files, import changes

### Autonomous Behavior Rules

**Claude Code MUST autonomously**:
1. ✅ Use TodoWrite for ANY task with 3+ steps (no exceptions)
2. ✅ Run `bun run check` before committing
3. ✅ Run tests after implementing functions: `bun test [file].test.ts`
4. ✅ Check test coverage: `bun test --coverage` (must be 90%+)
5. ✅ Validate accessibility after color algorithm changes
6. ✅ Run performance benchmarks after optimizer changes
7. ✅ Reference `.claude/docs/user-flows.md` before UI changes
8. ✅ Use Explore agent for complex dependency analysis
9. ✅ Use Plan agent (EnterPlanMode) for architectural decisions
10. ✅ Check for `any` types and circular dependencies before commits

**Claude Code MUST NEVER**:
1. ❌ Commit code with `any` types
2. ❌ Introduce circular dependencies (UI → Core → Utils violation)
3. ❌ Over-engineer (add features/abstractions beyond requirements)
4. ❌ Skip tests (90%+ coverage is mandatory)
5. ❌ Ignore performance regressions (>200ms for 20-color palette)
6. ❌ Break accessibility standards (WCAG 2.1/2.2, APCA compliance)
7. ❌ Add backwards-compatibility hacks (delete unused code completely)

### Integration with Existing Workflows

This agent-driven approach **complements** existing workflows:

- **Kiro spec workflow**: Use Plan agent during `/kiro:spec-design` and `/kiro:spec-tasks`
- **Codex review**: Run `/sdd-codex-review` after agent-assisted implementation
- **E2E evidence**: Agents can help collect evidence for `/sdd-codex-review e2e-evidence`

### Quick Reference Card

```bash
# Task planning (ALWAYS use for 3+ step tasks)
Use TodoWrite immediately when starting work

# Code quality checks (BEFORE commits)
bun run check              # Lint + format
bun run type-check         # Strict TypeScript
grep -r "any" src/         # Should return zero

# Testing (AFTER implementations)
bun test [file].test.ts    # Unit tests
bun test --coverage        # Must be 90%+
bun run test:e2e           # E2E tests

# Accessibility (AFTER color changes)
bun test src/accessibility/
bun test src/core/cud/

# Performance (AFTER optimizer changes)
cross-env CI_BENCH=1 bun test src/core/cud/performance.test.ts

# Architecture (BEFORE big changes)
Read .claude/docs/user-flows.md
Read .kiro/steering/tech.md
Use Explore agent for dependency analysis
```

## Practical Examples & Templates

### TodoWrite Workflow Examples

**Example 1: Feature Implementation**
```
User: "Add CUD harmony optimization to the palette generator"

Claude Code (autonomous):
1. Use TodoWrite to create task list:
   - Research existing CUD implementation in src/core/cud/
   - Design harmony scoring algorithm
   - Implement harmony calculator in src/core/cud/harmony-score.ts
   - Write tests for harmony calculator (TDD)
   - Integrate with optimizer.ts
   - Run accessibility tests
   - Run performance benchmarks (<200ms target)
   - Update documentation

2. Mark first task as "in_progress"
3. Use Explore agent to research existing CUD code
4. Mark first task as "completed"
5. Mark second task as "in_progress"
6. ... continue until all done
```

**Example 2: Bug Fix with Testing**
```
User: "Fix contrast calculation bug in solver.ts"

Claude Code (autonomous):
1. Use TodoWrite to create task list:
   - Reproduce bug with failing test case
   - Debug solver.ts binary search algorithm
   - Fix the bug
   - Verify test passes
   - Run full test suite (coverage must stay 90%+)
   - Check for regressions in accessibility tests

2. Mark "Reproduce bug" as in_progress
3. Write failing test in src/core/solver.test.ts
4. Mark as completed, move to next task
5. ... continue sequentially
```

**TodoWrite Best Practices for leonardo-learn**:
- **Granularity**: Each task = 5-15 minutes of work
- **Testing**: Always include test-related tasks (write test, run test, verify coverage)
- **Accessibility**: For color changes, include `bun test src/accessibility/` task
- **Performance**: For optimizer changes, include benchmark task
- **Atomicity**: Each task should be independently completable

### Custom Agent Creation Templates

Based on the existing `.claude/commands/kiro/` structure, here are templates for creating custom agents:

#### Template 1: accessibility-guardian.md
```markdown
---
name: accessibility-guardian
description: Auto-validates WCAG 2.1/2.2 and APCA compliance for color-related changes
tools:
  - read_file
  - grep
  - bash
triggers:
  - src/core/solver.ts
  - src/accessibility/
  - src/core/cud/
---

You are an accessibility validation specialist for the leonardo-learn color palette generator.

## Your Mission

Validate that color generation changes maintain WCAG 2.1/2.2 and APCA (WCAG 3) compliance.

## Validation Checklist

### 1. WCAG 2.1/2.2 Compliance
- Run: `bun test src/accessibility/wcag2.test.ts`
- Check contrast ratios meet AA/AAA standards
- Verify distinguishability tests pass

### 2. APCA (WCAG 3) Compliance
- Run: `bun test src/accessibility/apca.test.ts`
- Validate Lc (lightness contrast) calculations
- Check src/accessibility/apca.ts integration

### 3. CUD Optimization
- Run: `bun test src/core/cud/`
- Validate ΔE thresholds:
  - Safe: ΔE ≤ 0.05
  - Warning: 0.05 < ΔE ≤ 0.12
  - Off: ΔE > 0.12
- Check harmony scores remain valid

### 4. CVD Simulation
- Run: `bun test src/accessibility/cvd-simulator.test.ts`
- Ensure color-blind friendly palettes (protanopia, deuteranopia, tritanopia)

## Report Format

Provide a concise report:
- ✅ Passed checks
- ❌ Failed checks with file:line references
- ⚠️ Warnings (e.g., approaching threshold limits)

## Exit Criteria

Only approve if ALL accessibility tests pass. If any fail, provide specific fix recommendations.
```

#### Template 2: performance-analyzer.md
```markdown
---
name: performance-analyzer
description: Runs benchmarks and validates <200ms target for palette generation
tools:
  - read_file
  - bash
triggers:
  - src/core/cud/optimizer.ts
  - src/core/solver.ts
  - src/core/interpolation.ts
  - src/core/strategies/
---

You are a performance monitoring specialist for the leonardo-learn color palette generator.

## Performance Target

**20-color palette generation must complete in <200ms** (enforced)

## Benchmarking Workflow

### 1. Run Performance Tests
```bash
cross-env CI_BENCH=1 bun test src/core/cud/performance.test.ts
```

### 2. Analyze Results
- Check "20-color full optimization" benchmark
- Compare against 200ms baseline
- Identify performance regressions (>10% slowdown)

### 3. Profile Hot Paths (if needed)
- Binary search in src/core/solver.ts
- Spline interpolation in src/core/interpolation.ts
- CUD optimizer greedy algorithm in src/core/cud/optimizer.ts

## Report Format

```
Performance Analysis Report
===========================
✅ 20-color palette: 145ms (✓ <200ms target)
⚠️ 50-color palette: 380ms (approaching limit)
❌ Binary search: +25% slower (regression detected)

Recommendations:
- Optimize binary search epsilon threshold
- Consider memoization for repeated calculations
```

## Exit Criteria

Approve if 20-color benchmark stays <200ms. If regression detected, provide optimization suggestions.
```

#### Template 3: simplicity-enforcer.md
```markdown
---
name: simplicity-enforcer
description: Detects over-engineering patterns and enforces code simplicity
tools:
  - read_file
  - grep
triggers:
  - all code changes
---

You are a code simplicity guardian for the leonardo-learn project.

## Over-Engineering Detection Rules

### 1. No Premature Abstraction
❌ **Bad**: Creating helper function for single use
```typescript
function calculateSum(a: number, b: number) { return a + b; }
const total = calculateSum(x, y);
```
✅ **Good**: Direct calculation for one-time operation
```typescript
const total = x + y;
```

### 2. No Unnecessary Error Handling
❌ **Bad**: Validating internal function parameters
```typescript
function internal_helper(value: ValidatedType) {
  if (!value) throw new Error("Invalid value"); // Redundant
}
```
✅ **Good**: Trust internal code contracts
```typescript
function internal_helper(value: ValidatedType) {
  // No validation needed - caller guarantees valid input
}
```

### 3. Three Similar Lines > Premature Abstraction
❌ **Bad**: Abstracting 3 similar lines
```typescript
function setColor(prop: string, value: string) { ... }
setColor("primary", primary);
setColor("secondary", secondary);
setColor("tertiary", tertiary);
```
✅ **Good**: Keep simple code simple
```typescript
colors.primary = primary;
colors.secondary = secondary;
colors.tertiary = tertiary;
```

### 4. No Backwards-Compatibility Hacks
❌ **Bad**: Keeping unused variables for "compatibility"
```typescript
const _oldName = value; // Kept for backwards compatibility
const newName = value;
```
✅ **Good**: Delete unused code completely
```typescript
const newName = value;
```

## Validation Checklist

1. Grep for common over-engineering patterns:
   - Unused variables starting with `_`
   - Single-use helper functions
   - Feature flags for hypothetical futures
2. Check for abstractions with only 1-2 usages
3. Verify error handling only at system boundaries (user input, external APIs)

## Report Format

List violations with file:line references and suggest simpler alternatives.
```

### Built-in Agent Usage Examples

#### Explore Agent Example
```typescript
// User request: "Where is the contrast calculation implemented?"

// Claude Code autonomously uses Explore agent:
Task: Analyze codebase structure
Agent: Explore (fast, read-only)
Prompt: "Find all files related to contrast calculation. Look for:
- WCAG contrast ratio functions
- APCA contrast calculation
- Binary search for contrast targets
Return file paths with brief descriptions."

// Expected output:
src/core/solver.ts:45 - Binary search for target contrast ratios
src/accessibility/wcag2.ts:12 - WCAG 2.1/2.2 contrast ratio calculation
src/accessibility/apca.ts:34 - APCA Lc (lightness contrast) calculation
```

#### Plan Agent Example
```typescript
// User request: "Add Material Design 3 color generation support"

// Claude Code autonomously enters Plan Mode:
EnterPlanMode()

// In Plan Mode:
1. Explore existing color generation strategies in src/core/strategies/
2. Read Material Design 3 documentation
3. Design integration approach:
   - Create src/core/strategies/m3-generator.ts
   - Integrate with existing Theme system
   - Maintain backward compatibility
4. Write plan.md with task breakdown
5. ExitPlanMode() → user approval → implement
```

### Integration with Kiro/Codex Workflows

#### Pattern 1: Spec Implementation with Agent Assistance
```bash
# User runs Kiro spec workflow
/kiro:spec-requirements color-harmony-optimization
/sdd-codex-review requirements color-harmony-optimization
# → APPROVED

/kiro:spec-design color-harmony-optimization
# Claude Code autonomously:
# - Uses Plan agent to analyze design options
# - References .kiro/steering/tech.md for architecture guidelines
# - Creates design.md with detailed technical approach
/sdd-codex-review design color-harmony-optimization
# → APPROVED

/kiro:spec-tasks color-harmony-optimization
# Claude Code autonomously:
# - Uses TodoWrite to break down into tasks
# - Marks tasks with [E2E] tags where needed
/sdd-codex-review tasks color-harmony-optimization
# → APPROVED

/kiro:spec-impl color-harmony-optimization 1-3
# Claude Code autonomously:
# - Uses TodoWrite for sub-tasks within each task
# - Runs accessibility tests after color algorithm changes
# - Runs performance benchmarks after optimizer changes
# - Marks section complete
/sdd-codex-review impl-section color-harmony-optimization section-1
# → APPROVED
```

#### Pattern 2: Bug Fix with Autonomous Checks
```typescript
// User: "Fix the APCA contrast bug reported in issue #42"

// Claude Code autonomous workflow:
1. TodoWrite: Create task list (reproduce, fix, test, verify)
2. Explore agent: Analyze src/accessibility/apca.ts and related tests
3. Implement fix with TDD (write failing test first)
4. Run accessibility tests: bun test src/accessibility/
5. Check coverage: bun test --coverage (must stay 90%+)
6. Commit with message referencing issue #42
7. No Codex review needed (bug fix, not spec work)
```

#### Pattern 3: Performance Optimization
```typescript
// User: "Optimize the CUD optimizer to be faster"

// Claude Code autonomous workflow:
1. TodoWrite: Create task list
2. Run baseline benchmark: cross-env CI_BENCH=1 bun test src/core/cud/performance.test.ts
   Result: 20-color palette = 185ms (baseline)
3. Use Plan agent to design optimization approach
4. Implement optimization in src/core/cud/optimizer.ts
5. Run benchmark again: 145ms (✅ 22% improvement)
6. Verify tests still pass: bun test src/core/cud/
7. Check no regressions: bun test --coverage
8. Commit with performance metrics in message
```

### When to Use Which Agent

| Scenario | Agent | Rationale |
|----------|-------|-----------|
| "Where is X implemented?" | Explore | Fast read-only search |
| "How does Y work?" | Explore | Codebase understanding |
| "Add new feature Z" | Plan → TodoWrite | Complex multi-step task |
| "Fix bug in W" | TodoWrite only | Clear scope, no planning needed |
| "Optimize performance" | TodoWrite + Benchmark | Iterative with measurements |
| "Refactor architecture" | Plan → TodoWrite | Architectural decisions needed |
| "Add accessibility check" | TodoWrite + accessibility-guardian | Validation required |

### Common Pitfalls to Avoid

1. **❌ Using Explore for simple file reads**: Just use Read tool directly
2. **❌ Entering Plan Mode for trivial tasks**: TodoWrite is sufficient for <3 step tasks
3. **❌ Forgetting to mark todos complete**: Update immediately after finishing
4. **❌ Skipping autonomous checks**: Always run `bun run check` before commit
5. **❌ Not running accessibility tests**: Required for ANY color algorithm change

### Agent Success Metrics

Track these metrics to ensure effective agent usage:

- **TodoWrite usage rate**: Should be 100% for tasks with 3+ steps
- **Test coverage**: Must maintain 90%+ (enforced)
- **Accessibility test pass rate**: 100% required before commit
- **Performance regression rate**: 0 regressions >10% allowed
- **`any` type count**: Should remain at 2 (only in utility functions with JSDoc)

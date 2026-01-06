# Development Reference

## Commands

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

## Code Standards

### TypeScript
- Strict mode required (all flags enabled)
- `any` type prohibited - use `unknown`
- Path aliases: `@/core/*`, `@/utils/*`, `@/ui/*`

### Formatting (Biome)
- Tab indentation
- Double quotes
- Auto-organize imports

### Test Placement

**Co-located** (unit/integration):
```
src/core/cud/optimizer.ts
src/core/cud/optimizer.test.ts
```

**Separate** (E2E):
```
e2e/cud-harmony-generator.e2e.ts
```

## Quality Gates

- Test coverage: 90%+ required
- Performance: 20-color palette <200ms
- No `any` types
- No circular dependencies

## Spec-Driven Development

**Kiro workflow commands**:
- `/kiro:spec-status [feature]` - Check progress
- `/kiro:spec-impl [feature] [tasks]` - Implement tasks

**Codex review** (required after each phase):
```bash
/sdd-codex-review requirements [feature]
/sdd-codex-review design [feature]
/sdd-codex-review tasks [feature]
/sdd-codex-review impl [feature]
```

## Key Libraries

| Library | Purpose |
|---------|---------|
| culori.js | OKLCH/OKLab color operations |
| apca-w3 | WCAG 3 APCA contrast |
| @digital-go-jp/design-tokens | DADS integration |
| @material/material-color-utilities | M3 color generation |

## E2E Video Evidence

E2E tests record video evidence in `test-results/`. After running:
```bash
bun run test:e2e
npx playwright show-report
```

# Reference Documentation

Quick reference guides for leonardo-learn development.

## Contents

| File | Description |
|------|-------------|
| [architecture.md](./architecture.md) | Three-layer design, module overview, dependency rules |
| [cud-optimization.md](./cud-optimization.md) | CUD algorithm, zones, soft snap, harmony scoring |
| [accessibility.md](./accessibility.md) | WCAG 2.1/2.2, APCA, CVD simulation |
| [development.md](./development.md) | Commands, code standards, quality gates |
| [harmony-types.md](./harmony-types.md) | Color harmony types, palette roles |

## Quick Links

### Key Documentation
- `.kiro/steering/tech.md` - Technical decisions (ADRs)
- `.kiro/steering/product.md` - Product overview
- `.kiro/steering/structure.md` - Project structure
- `.claude/docs/user-flows.md` - User interaction flows
- `docs/cud-feature-overview.md` - CUD feature details

### Key Source Files
- `src/core/solver.ts` - Binary search algorithm
- `src/core/harmony.ts` - Harmony generation
- `src/core/cud/optimizer.ts` - CUD optimization
- `src/accessibility/` - WCAG/APCA/CVD

### Spec-Driven Development
- `.kiro/specs/` - Feature specifications
- Use `/kiro:spec-*` commands for workflow
- Use `/sdd-codex-review` after each phase

## Common Tasks

### Run tests
```bash
bun test
```

### Check code quality
```bash
bun run check
```

### Run E2E tests
```bash
bun run test:e2e
```

### View coverage
```bash
bun test --coverage
```

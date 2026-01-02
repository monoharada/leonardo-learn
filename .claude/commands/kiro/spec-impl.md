---
description: Execute spec tasks using TDD methodology
allowed-tools: Bash, Read, Write, Edit, MultiEdit, Grep, Glob, LS, WebFetch, WebSearch
argument-hint: <feature-name> [task-numbers]
---

# Implementation Task Executor

<background_information>
- **Mission**: Execute implementation tasks using Test-Driven Development methodology based on approved specifications
- **Success Criteria**:
  - All tests written before implementation code
  - Code passes all tests with no regressions
  - Tasks marked as completed in tasks.md
  - Implementation aligns with design and requirements
  - **Codex review invoked and APPROVED** via `/sdd-codex-review impl-section` (at section completion)
  - **E2E evidence collected** for `[E2E]` tagged sections (after review APPROVED)
</background_information>

<instructions>
## Core Task
Execute implementation tasks for feature **$1** using Test-Driven Development.

## Execution Steps

### Step 1: Load Context

**Read all necessary context**:
- `.kiro/specs/$1/spec.json`, `requirements.md`, `design.md`, `tasks.md`
- **Entire `.kiro/steering/` directory** for complete project memory

**Validate approvals**:
- Verify tasks are approved in spec.json (stop if not, see Safety & Fallback)

### Step 2: Select Tasks

**Determine which tasks to execute**:
- If `$2` provided: Execute specified task numbers (e.g., "1.1" or "1,2,3")
- Otherwise: Execute all pending tasks (unchecked `- [ ]` in tasks.md)

### Step 3: Execute with TDD

For each selected task, follow Kent Beck's TDD cycle:

1. **RED - Write Failing Test**:
   - Write test for the next small piece of functionality
   - Test should fail (code doesn't exist yet)
   - Use descriptive test names

2. **GREEN - Write Minimal Code**:
   - Implement simplest solution to make test pass
   - Focus only on making THIS test pass
   - Avoid over-engineering

3. **REFACTOR - Clean Up**:
   - Improve code structure and readability
   - Remove duplication
   - Apply design patterns where appropriate
   - Ensure all tests still pass after refactoring

4. **VERIFY - Validate Quality**:
   - All tests pass (new and existing)
   - No regressions in existing functionality
   - Code coverage maintained or improved

5. **MARK COMPLETE**:
   - Update checkbox from `- [ ]` to `- [x]` in tasks.md

## Critical Constraints
- **TDD Mandatory**: Tests MUST be written before implementation code
- **Task Scope**: Implement only what the specific task requires
- **Test Coverage**: All new code must have tests
- **No Regressions**: Existing tests must continue to pass
- **Design Alignment**: Implementation must follow design.md specifications
</instructions>

## Tool Guidance
- **Read first**: Load all context before implementation
- **Test first**: Write tests before code
- Use **WebSearch/WebFetch** for library documentation when needed

## Output Description

Provide brief summary in the language specified in spec.json:

1. **Tasks Executed**: Task numbers and test results
2. **Section Status**: Current section completion status
3. **Status**: Completed tasks marked in tasks.md, remaining tasks count
4. **Next Step**:
   - If section complete: Invoke Codex review via Skill tool
   - If section incomplete: Continue to next task

**Format**: Concise (under 150 words)

**CRITICAL**: After section completion, you MUST use the Skill tool to invoke `sdd-codex-review` with args `impl-section $1 [section-id]`. Do NOT invoke review after each individual task - only at section completion.

## Safety & Fallback

### Error Scenarios

**Tasks Not Approved or Missing Spec Files**:
- **Stop Execution**: All spec files must exist and tasks must be approved
- **Suggested Action**: "Complete previous phases: `/kiro:spec-requirements`, `/kiro:spec-design`, `/kiro:spec-tasks`"

**Test Failures**:
- **Stop Implementation**: Fix failing tests before continuing
- **Action**: Debug and fix, then re-run

### Task Execution

**Execute specific task(s)**:
- `/kiro:spec-impl $1 1.1` - Single task
- `/kiro:spec-impl $1 1,2,3` - Multiple tasks

**Execute all pending**:
- `/kiro:spec-impl $1` - All unchecked tasks

### Post-Implementation: Codex Review（セクション単位）

**重要**: タスクごとではなく、**セクション単位**でCodexレビューを実行します。

#### セクションの定義

tasks.md の `##` 見出し単位でセクションを識別:
```markdown
## Section 1: Core Foundation        ← セクション1
### Task 1.1: Define base types
### Task 1.2: Implement utilities

## Section 2: Feature Implementation  ← セクション2
### Task 2.1: Build main component
```

#### セクション完了チェック

1. 現在のタスクが属するセクションを特定（`##` 見出しで識別）
2. セクション内の全タスクの期待ファイルが存在するか確認
   - 各タスクの `**Creates:**` / `**Modifies:**` を参照
3. 全ファイル存在 AND 未レビュー → レビュー実行

#### 呼び出し条件

```
IF section_complete AND NOT section_reviewed:
    // 1. Codexレビュー実行
    Skill tool invoke: "sdd-codex-review"
    args: impl-section $1 $section_id
    APPROVED が返されるまで修正・再レビューをループ
    最大6回のリトライ

    // 2. E2Eエビデンス収集（APPROVED後、[E2E]タグ付きセクションのみ）
    IF section has [E2E] tag AND e2e_evidence.status == "pending":
        Playwright MCPでE2Eエビデンス収集
        結果を .context/e2e-evidence/ に保存
        ユーザーにスクリーンショットパスを報告
        E2E失敗でもセクション完了として扱う（ブロッキングではない）

ELSE:
    次のタスクへ続行（レビューはスキップ）
```

#### レビュータイミング

```
❌ task 1.1 完了 → レビューしない
❌ task 1.2 完了 → レビューしない（まだセクション未完了）
✅ セクション内の全タスク完了 → Codex review
```

#### シミュレート禁止

- Codex CLI を実際に実行すること
- レビュー結果を自分で生成しないこと
- Session ID を報告に含めること

#### E2Eエビデンス収集（[E2E]タグ付きセクション）

セクション見出しに `[E2E]` タグがある場合（例: `## Section 2: Dashboard [E2E]`）、
Codexレビュー承認後にPlaywright MCPを使用してスクリーンショットを収集:

```
.context/e2e-evidence/
└── [feature-name]/
    └── [section-id]/
        ├── step-01-initial.png
        ├── step-02-action.png
        └── step-03-complete.png
```

think

---
description: Generate comprehensive requirements for a specification
allowed-tools: Bash, Glob, Grep, LS, Read, Write, Edit, MultiEdit, Update, WebSearch, WebFetch, AskUserQuestion
argument-hint: <feature-name>
---

# Requirements Generation

<background_information>
- **Mission**: Generate comprehensive, testable requirements in EARS format based on the project description from spec initialization
- **Success Criteria**:
  - Create complete requirements document aligned with steering context
  - Follow the project's EARS patterns and constraints for all acceptance criteria
  - Focus on core functionality without implementation details
  - Update metadata to track generation status
</background_information>

<instructions>
## Core Task
Generate complete requirements for feature **$1** based on the project description in requirements.md.

## Execution Steps

1. **Load Context**:
   - Read `.kiro/specs/$1/spec.json` for language and metadata
   - Read `.kiro/specs/$1/requirements.md` for project description
   - **Load ALL steering context**: Read entire `.kiro/steering/` directory including:
     - Default files: `structure.md`, `tech.md`, `product.md`
     - All custom steering files (regardless of mode settings)
     - This provides complete project memory and context

2. **Read Guidelines**:
   - Read `.kiro/settings/rules/ears-format.md` for EARS syntax rules
   - Read `.kiro/settings/templates/specs/requirements.md` for document structure

2.5 **Optional Preflight Interview (timeboxed, Japanese)**:
   - Purpose: clarify only high-risk unknowns WITHOUT slowing down generation.
   - Trigger logic (in order):
     1. IF `.kiro/specs/$1/spec.json` contains `interview.requirements: true` → ALWAYS RUN
     2. ELSE IF `.kiro/specs/$1/interview.md` exists → SKIP (already interviewed)
     3. ELSE IF phase is `"initialized"` OR approvals.requirements.approved is `false` → RUN
     4. ELSE IF `.kiro/specs/$1/requirements.md` project description is missing/thin → RUN
   - Key: Skip interview if interview.md exists (unless explicit flag is set)
   - Use AskUserQuestion tool in Japanese. Keep the requirements output language unchanged (still follow spec.json).
   - Hard limits:
     - Max 8 questions total (single round).
     - If user answers "unknown/TBD", record it as Open Questions and continue.
   - Interview questions (priority order):
     1. このフィーチャーの成功基準は何ですか？
     2. スコープ外とするものを3つ挙げてください
     3. ユーザー/ロールの違いと権限の違いを教えてください
     4. 失敗時の動作はどうすべきですか？
     5. データの信頼できる情報源は何ですか？
     6. セキュリティ・プライバシーの制約は何ですか？
     7. 運用・可観測性について：何を監視すべきですか？
     8. テスト可能な受け入れ基準を3つ挙げてください
   - Write a concise Q&A + decisions summary to `.kiro/specs/$1/interview.md` (recommended).
     - Do NOT block requirements generation if interview.md writing is skipped.
   - Reliability fallback:
     - If AskUserQuestion tool fails/unavailable/returns empty, immediately switch to plain text questions (still Japanese), same limits.

3. **Generate Requirements**:
   - Create initial requirements based on project description
   - Group related functionality into logical requirement areas
   - Apply EARS format to all acceptance criteria
   - Use language specified in spec.json

4. **Update Metadata**:
   - Set `phase: "requirements-generated"`
   - Set `approvals.requirements.generated: true`
   - Update `updated_at` timestamp

## Important Constraints
- Focus on WHAT, not HOW (no implementation details)
- Requirements must be testable and verifiable
- Choose appropriate subject for EARS statements (system/service name for software)
- Generate initial version first, then iterate with user feedback (no sequential questions upfront).
  Exception: a triggered preflight interview is allowed ONLY if timeboxed (<= 8 questions) and focused on high-risk unknowns.
- Requirement headings in requirements.md MUST include a leading numeric ID only (for example: "Requirement 1", "1.", "2 Feature ..."); do not use alphabetic IDs like "Requirement A".
</instructions>

## Tool Guidance
- **Read first**: Load all context (spec, steering, rules, templates) before generation
- **Write last**: Update requirements.md only after complete generation
- Use **WebSearch/WebFetch** only if external domain knowledge needed

## Output Description
Provide output in the language specified in spec.json with:

1. **Generated Requirements Summary**: Brief overview of major requirement areas (3-5 bullets)
2. **Document Status**: Confirm requirements.md updated and spec.json metadata updated
3. **Codex Review**: Invoke `/sdd-codex-review requirements $1` for quality assurance
4. **Next Steps**: Guide user on how to proceed (approve and continue, or modify)

**Format Requirements**:
- Use Markdown headings for clarity
- Include file paths in code blocks
- Keep summary concise (under 300 words)

**CRITICAL**: After outputting the summary, you MUST use the Skill tool to invoke `sdd-codex-review` with args `requirements $1`.

## Safety & Fallback

### Error Scenarios
- **Missing Project Description**: If requirements.md lacks project description, use preflight interview (Japanese) to gather minimum viable details (<= 8 questions), then generate.
- **Ambiguous Requirements**: Do NOT run long sequential questioning. Either:
  - (If triggered) run the timeboxed preflight interview (<= 8 questions), then generate, OR
  - Generate an initial version and iterate with user feedback.
- **Template Missing**: If template files don't exist, use inline fallback structure with warning
- **Language Undefined**: Default to English (`en`) if spec.json doesn't specify language
- **Incomplete Requirements**: After generation, explicitly ask user if requirements cover all expected functionality
- **Steering Directory Empty**: Warn user that project context is missing and may affect requirement quality
- **Non-numeric Requirement Headings**: If existing headings do not include a leading numeric ID (for example, they use "Requirement A"), normalize them to numeric IDs and keep that mapping consistent (never mix numeric and alphabetic labels).

### Next Phase: Design Generation

**If Requirements Approved**:
- Review generated requirements at `.kiro/specs/$1/requirements.md`
- **Optional Gap Analysis** (for existing codebases):
  - Run `/kiro:validate-gap $1` to analyze implementation gap with current code
  - Identifies existing components, integration points, and implementation strategy
  - Recommended for brownfield projects; skip for greenfield
- Then `/kiro:spec-design $1 -y` to proceed to design phase

**If Modifications Needed**:
- Provide feedback and re-run `/kiro:spec-requirements $1`

**Note**: Approval is mandatory before proceeding to design phase.

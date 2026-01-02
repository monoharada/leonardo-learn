---
name: sdd-codex-review
description: "Executes automated code reviews using OpenAI Codex CLI for SDD workflow phases (requirements, design, tasks, impl). Triggers after /kiro:spec-* completion. Loops until APPROVED with auto-fix. Use: /sdd-codex-review [phase] [feature-name]. Codex統合自動レビュー。"
---

# SDD-Codex-Review

Automated code review skill using OpenAI Codex CLI for Spec-Driven Development workflows.

## Quick Start (English)

```bash
# Review each phase
/sdd-codex-review requirements [feature-name]
/sdd-codex-review design [feature-name]
/sdd-codex-review tasks [feature-name]
/sdd-codex-review impl [feature-name]

# Section-based impl review (recommended)
/sdd-codex-review impl-section [feature-name] [section-id]
/sdd-codex-review impl-pending [feature-name]

# E2E evidence collection (for [E2E] tagged sections)
/sdd-codex-review e2e-evidence [feature-name] [section-id]

# Auto-progress mode (review all phases sequentially)
/sdd-codex-review auto [feature-name]
```

**Key Points:**
- Executes actual `codex exec --sandbox read-only` commands (no simulation)
- Returns JSON verdict with Codex Session ID
- Auto-fixes issues and re-reviews until APPROVED (max 6 iterations)

---

## 概要

cc-sddワークフローの各フェーズ完了時にOpenAI Codexを使用して自動レビューを実行。
OKが出るまでフィードバックループを繰り返します。

## 前提条件

- `codex` CLIがインストール済み
- プロジェクトがcc-sdd仕様に準拠（`.kiro/specs/[feature]/`）
- spec.jsonが存在

---

## シミュレート禁止

**Codex CLIを実際に実行することが必須です。**

| 禁止 | 必須 |
|------|------|
| ❌ レビュー結果を自分で生成 | ✅ `codex exec`を実行 |
| ❌ Session IDなしで報告 | ✅ Session IDを報告に含める |

**Why?** Different models catch different issues. Session ID proves actual execution.

---

## 使用方法

```bash
# 特定フェーズのレビュー
/sdd-codex-review requirements [feature-name]
/sdd-codex-review design [feature-name]
/sdd-codex-review tasks [feature-name]
/sdd-codex-review impl [feature-name]

# セクション単位のimplレビュー（推奨）
/sdd-codex-review impl-section [feature-name] [section-id]
/sdd-codex-review impl-pending [feature-name]

# E2Eエビデンス収集（[E2E]タグ付きセクション用）
/sdd-codex-review e2e-evidence [feature-name] [section-id]

# 自動進行モード
/sdd-codex-review auto [feature-name]
```

### コマンド一覧

| コマンド | 説明 |
|----------|------|
| `impl-section [feature] [section-id]` | 特定セクションをレビュー |
| `impl-pending [feature]` | 完了済み・未レビューのセクションを全てレビュー |
| `impl [feature]` | 全実装を一括レビュー（従来方式） |
| `e2e-evidence [feature] [section-id]` | E2Eエビデンス収集（手動実行用） |

---

## ワークフロー概要

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ kiro:spec-* │ ──▶ │ Codex Review │ ──▶ │ 自動修正    │
│ 完了        │     │ (JSON出力)   │     │             │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
       ┌──────────────────────────────┬──────────┴──────────┐
       ▼                              ▼                      ▼
┌──────────────┐                ┌──────────┐          ┌──────────┐
│ OK: 次フェーズ│                │ 再レビュー│          │ 5回超過: │
│ spec.json更新│                │ (ループ) │          │ ユーザー │
│ ユーザー報告 │                └──────────┘          │ 介入要求 │
└──────────────┘                                      └──────────┘
```

---

## セクション単位レビュー

### 概要

実装フェーズでは、**セクション単位**でレビューを実行することを推奨します。
これにより、タスクごとのレビューオーバーヘッドを削減し、効率的なレビューサイクルを実現します。

### セクション定義

tasks.mdの`##`見出しでセクションを定義：

```markdown
## Section 1: Core Foundation
### Task 1.1: Define base types
**Creates:** `src/types/base.ts`

### Task 1.2: Implement utilities
**Creates:** `src/utils/helpers.ts`

## Section 2: Feature Implementation
### Task 2.1: Build main component
**Creates:** `src/components/Main.tsx`
```

### 完了検知アルゴリズム

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ タスク実装  │ ──▶ │ セクション完了   │ ──▶ │ 全ファイル  │
│ 完了        │     │ チェック         │     │ 存在?       │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                    │
                            ┌───────────────────────┴───────┐
                            │ YES                           │ NO
                            ▼                               ▼
                    ┌──────────────┐                ┌──────────────┐
                    │ レビュー済み?│                │ 次タスクへ   │
                    └──────┬───────┘                └──────────────┘
                           │ NO
                           ▼
                    ┌──────────────┐
                    │ Codex Review │
                    │ 実行         │
                    └──────────────┘
```

### 完了検知ロジック

1. **セクション解析**: tasks.mdから`##`見出しを検出
2. **ファイル抽出**: 各タスクの`**Creates:**`/`**Modifies:**`からファイル一覧を取得
3. **存在確認**: 全期待ファイルが存在するか確認
4. **レビュートリガー**: 完了 AND 未レビュー の場合にレビュー実行

### impl-section コマンド

特定のセクションをレビュー：

```bash
/sdd-codex-review impl-section my-feature section-1-core-foundation
```

**処理フロー**:
1. `.kiro/specs/[feature]/tasks.md`を解析
2. 指定セクションのタスク・ファイル一覧を取得
3. セクション専用プロンプトでCodex実行
4. spec.jsonの`section_tracking`と`codex_reviews.impl.sections`を更新

### impl-pending コマンド

完了済み・未レビューのセクションを順次レビュー：

```bash
/sdd-codex-review impl-pending my-feature
```

**処理フロー**:
1. spec.jsonから`section_tracking`を読み込み
2. `status === "complete" && reviewed === false`のセクションを抽出
3. 各セクションに対して`impl-section`相当の処理を実行

詳細: [workflows/section-detection.md](workflows/section-detection.md)

---

## E2Eエビデンス収集

### 概要

`[E2E]` タグ付きセクションでは、**Codexレビュー承認後**にPlaywright（`recordVideo`オプション有効）を使用してE2Eテストのエビデンス（**画面録画とスクリーンショット**）を自動収集します。

### なぜレビュー後に実行するのか

1. **品質優先**: レビュー済みのコードでエビデンスを取得（バグを含む状態を記録しない）
2. **効率性**: 修正が入る可能性があるレビュー前にE2Eを実行するのは無駄
3. **エビデンス目的**: 最終的な承認済みコードの動作を記録する

### セクションフォーマット

```markdown
## Section 2: User Dashboard [E2E]

### Task 2.1: Build dashboard layout
**Creates:** `src/components/Dashboard.tsx`
**E2E:** ダッシュボード初期表示、ウィジェット配置確認

### Task 2.2: Add data refresh
**Creates:** `src/hooks/useRefresh.ts`
**E2E:** 更新ボタン動作、ローディング表示
```

### トリガー条件

```
Codexレビュー APPROVED AND e2e_required = true AND e2e_evidence.status = "pending"
```

### 実行フロー

```
┌─────────────────────────────────────────────────────────────────┐
│                    セクション完了                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │    Codexレビュー     │
                    └──────────────────────┘
                              │
                      ┌───────┴───────┐
                      │               │
                  APPROVED       NEEDS_REVISION
                      │               │
                      ▼               ▼
              ┌───────────────┐  ┌───────────────┐
              │ E2E必要?      │  │ 修正→再レビュー│
              │ ([E2E]タグ)   │  └───────────────┘
              └───────────────┘
                │           │
               YES          NO
                │           │
                ▼           ▼
   ┌────────────────────┐  ┌────────────────────┐
   │ E2Eエビデンス収集  │  │ セクション完了     │
   │ (Playwright+録画)  │  │ 次のセクションへ   │
   └────────────────────┘  └────────────────────┘
                │
                ▼
   ┌────────────────────┐
   │ エビデンス確認&報告│
   │ セクション完了     │
   └────────────────────┘
```

### エビデンス保存先

```
.context/e2e-evidence/
└── [feature-name]/
    └── [section-id]/
        ├── step-01-initial.png
        ├── step-02-action.png
        └── step-03-complete.png
```

### E2Eエビデンスコマンド

```bash
# 手動でE2Eエビデンスを収集（レビュー承認済みセクションのみ）
/sdd-codex-review e2e-evidence [feature-name] [section-id]
```

### 重要: E2E失敗はブロッキングではない

E2Eエビデンス収集が失敗しても、セクションは完了として扱います。
E2Eはエビデンス目的であり、品質ゲートではありません。

詳細: [workflows/e2e-evidence.md](workflows/e2e-evidence.md)

---

## レビュー判定基準

| 判定 | 条件 |
|------|------|
| ok: true | blocking = 0件 |
| ok: false | blocking ≧ 1件 |

### フェーズ別verdict

| Phase | PASS | FAIL |
|-------|------|------|
| requirements | OK | NEEDS_REVISION |
| design | GO | NO_GO |
| tasks | APPROVED | NEEDS_REVISION |
| impl | APPROVED | NEEDS_REVISION |

### severity

- **blocking**: 修正必須（1件で`ok: false`）
- **advisory**: 推奨・警告（レポートに記載のみ）

### category

correctness, security, perf, maintainability, testing, style

---

## 詳細ドキュメント

| トピック | ファイル |
|----------|----------|
| Phase 1-4詳細・修正ループ | [workflows/phase-workflows.md](workflows/phase-workflows.md) |
| セクション検出アルゴリズム | [workflows/section-detection.md](workflows/section-detection.md) |
| E2Eエビデンス収集 | [workflows/e2e-evidence.md](workflows/e2e-evidence.md) |
| 規模別戦略（small/medium/large） | [workflows/scale-strategies.md](workflows/scale-strategies.md) |
| コンテキスト節約モード | [workflows/context-saving.md](workflows/context-saving.md) |
| spec.json仕様 | [reference/spec-json-format.md](reference/spec-json-format.md) |

---

## プロンプトテンプレート

| フェーズ | テンプレート |
|----------|-------------|
| 要件 | [prompts/requirements-review.md](prompts/requirements-review.md) |
| 設計 | [prompts/design-review.md](prompts/design-review.md) |
| タスク | [prompts/tasks-review.md](prompts/tasks-review.md) |
| 実装 | [prompts/impl-review.md](prompts/impl-review.md) |
| セクション実装 | [prompts/section-impl-review.md](prompts/section-impl-review.md) |
| E2Eエビデンス | [prompts/e2e-evidence-prompt.md](prompts/e2e-evidence-prompt.md) |
| アーキテクチャ | [prompts/arch-review.md](prompts/arch-review.md) |
| クロスチェック | [prompts/cross-check-review.md](prompts/cross-check-review.md) |

---

## Codex呼び出しパターン

### 初回レビュー
```bash
codex exec --sandbox read-only "[prompt]"
codex exec --sandbox read-only review --base main "[指示]"
```

### 再レビュー（session継続）
```bash
codex exec --sandbox read-only resume --last "[修正内容]"
codex exec --sandbox read-only resume [SESSION_ID] "[修正内容]"
```

---

## ユーザー報告フォーマット

```markdown
## Codexレビュー完了報告

### フェーズ: [PHASE] ([FEATURE])

| 項目 | 状態 |
|------|------|
| **Codex Session ID** | `[SESSION_ID]` |
| レビュー回数 | X / 5 |
| 最終判定 | [VERDICT] |

### サマリー
[Codexからのsummary]

### 解決済み指摘事項
1. [issue1] → [suggestion1適用]

### 次のステップ
[次に実行すべきコマンド]
```

---

## エラーハンドリング

| エラー | 対応 |
|--------|------|
| タイムアウト | ファイル分割してリトライ |
| 通常エラー | 1回リトライ |
| 再失敗 | 「未レビュー」として記録 |
| max_iters到達 | ユーザー介入要求 |

### レビュー完了待ち
- 60秒ごとに最大20回ポーリング
- 20回到達後も未完了: タイムアウト扱い

---

## 実装時の注意事項

1. **ファイル存在確認**: 対象ファイルの存在を必ず確認
2. **JSON抽出**: Codex出力から```json...```ブロックを正規表現で抽出
3. **差分適用**: suggestionは可能な限り自動適用
4. **履歴保持**: レビュー結果をspec.jsonのcodex_reviewsに記録
5. **順次処理**: 1フェーズずつ処理（依存関係のため）

---

## コンテキスト節約モード

**自動的に有効**。オプション指定不要。

1. レビュー開始前に状態を`.context/`に保存
2. バックグラウンドでCodex実行
3. 結果取得後に自動復元
4. 完了後にクリーンアップ

詳細: [workflows/context-saving.md](workflows/context-saving.md)

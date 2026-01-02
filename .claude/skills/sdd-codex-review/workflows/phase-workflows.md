# Phase別レビューワークフロー詳細

本ドキュメントでは、各レビューフェーズの詳細な処理フローを説明します。

---

## Phase 1: 要件レビュー (spec-requirements完了後)

### トリガー
```bash
/sdd-codex-review requirements [feature-name]
```

### 処理フロー

1. **ファイル読み込み**
   ```bash
   .kiro/specs/[feature]/requirements.md
   .kiro/specs/[feature]/spec.json
   ```

2. **Codexレビュー実行**
   ```bash
   codex exec --sandbox read-only "
   あなたはcc-sdd要件レビュアーです。以下の要件定義をレビューしてください。

   ## レビュー基準
   1. 完全性: 全機能要件がカバーされているか
   2. 明確性: 曖昧な表現がないか
   3. テスト可能性: 受け入れ基準が検証可能か
   4. 一貫性: 要件間の矛盾がないか
   5. EARS形式準拠: When/If/The system shall 形式か

   ## 要件ファイル内容
   $(cat .kiro/specs/[feature]/requirements.md)

   ## 出力形式（JSON）
   {
     \"ok\": true | false,
     \"phase\": \"requirements\",
     \"issues\": [...],
     \"summary\": \"全体評価\"
   }
   "
   ```

3. **結果解析と判定**
   - `ok === true` → 承認、次フェーズへ
   - `ok === false` → 自動修正適用、再レビュー

4. **自動修正（ok: false時）**
   - `issues`配列を走査
   - 各`suggestion`をrequirements.mdに適用
   - 再度Codexレビューを実行（最大6回）

5. **spec.json更新（OK時）**
   ```javascript
   spec.approvals.requirements.approved = true;
   spec.phase = "requirements-approved";
   spec.updated_at = new Date().toISOString();
   ```

6. **ユーザー報告**
   - レビュー回数
   - 解決済み指摘
   - 次のステップ提案

---

## Phase 2: 設計レビュー (spec-design完了後)

### トリガー
```bash
/sdd-codex-review design [feature-name]
```

### 処理フロー

1. **ファイル読み込み**
   ```bash
   .kiro/specs/[feature]/design.md
   .kiro/specs/[feature]/requirements.md  # 参照用
   ```

2. **Codexレビュー実行**
   - 設計レビュー基準（`.kiro/settings/rules/design-review.md`準拠）
   - GO/NO-GO判定
   - Critical Issues ≦ 3件

3. **判定基準**
   - `ok === true` → 承認（→ GO）
   - `ok === false` → 自動修正 or ユーザー介入（→ NO_GO）

4. **spec.json更新（GO時）**
   ```javascript
   spec.approvals.design.approved = true;
   spec.phase = "design-approved";
   ```

---

## Phase 3: タスクレビュー (spec-tasks完了後)

### トリガー
```bash
/sdd-codex-review tasks [feature-name]
```

### レビュー基準
- 要件カバレッジ: 全要件IDがタスクにトレースされているか
- タスク粒度: 各タスクが適切なサイズか
- 依存関係: タスク間の依存が正しく定義されているか
- 並列実行可能性: (P)マークが適切に付与されているか

### spec.json更新（APPROVED時）
```javascript
spec.approvals.tasks.approved = true;
spec.phase = "ready-for-implementation";
```

---

## Phase 4: 実装レビュー (spec-impl完了後)

### トリガー
```bash
/sdd-codex-review impl [feature-name]
```

### レビュー対象
- 変更されたソースファイル
- 対象タスクのtasks.md内の定義
- design.mdのインターフェース定義

### レビュー基準
- 要件準拠: 対象タスクの要件IDが満たされているか
- 設計準拠: design.mdのインターフェース定義に従っているか
- コード品質: TypeScript strict mode準拠、テストカバレッジ

### 設計コンテキストの提供（重要）

**NEEDS_REVISION時は、タスク範囲と設計意図を明示的に伝えて再レビューする**

段階的リファクタリングなど、タスクが分割されている場合：

```bash
codex exec --sandbox read-only resume [SESSION_ID] "
## 設計コンテキストの補足

### タスク分割の設計意図
- タスクX.X: [このタスクの範囲]を実施
- タスクY.Y: [関連する後続タスク]で対応予定

### 現タスクの完了条件
1. [条件1] ✅
2. [条件2] ✅

### 指摘への対応方針
[指摘内容]は[後続タスク]で対応予定。

この設計コンテキストを踏まえて再評価をお願いします。
"
```

### 実装レビュー専用コマンド
```bash
# mainブランチとの差分をベースにレビュー
codex exec --sandbox read-only review --base main "[追加の指示]"

# 未コミットの変更をレビュー
codex exec --sandbox read-only review --uncommitted "[追加の指示]"
```

---

## Phase 4b: セクション単位実装レビュー（推奨）

### 概要

実装フェーズでは、タスクごとではなく**セクション単位**でレビューを実行することを推奨します。
これにより、レビューオーバーヘッドを削減し、セクション間の整合性を確認できます。

### トリガー条件

セクション完了時に自動的にレビューをトリガー：

```
タスク実装完了
    ↓
セクション完了チェック（全期待ファイル存在確認）
    ↓
完了 AND 未レビュー → Codexレビュー実行
```

### コマンド

```bash
# 特定セクションをレビュー
/sdd-codex-review impl-section [feature-name] [section-id]

# 完了済み・未レビューのセクションを全てレビュー
/sdd-codex-review impl-pending [feature-name]
```

### 処理フロー

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
                    └──────┬───────┘                │ 続行         │
                           │ NO                     └──────────────┘
                           ▼
                    ┌──────────────┐
                    │ Codex Review │
                    │ 実行         │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ spec.json    │
                    │ 更新         │
                    └──────────────┘
```

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

### 完了判定ロジック

1. tasks.mdから`##`見出しを検出してセクション境界を特定
2. **完了判定（優先順位）**:
   - **方式1（推奨）**: `tasks_completed`フラグ - `spec.json`の`section_tracking.sections[id].tasks_completed[taskId]`が全てtrue
   - **方式2（フォールバック）**: `tasks_completed`未設定の場合のみ:
     - `**Creates:**`ファイルは存在確認
     - `**Modifies:**`ファイルは変更検出（`git diff main..HEAD`）
3. 全タスク完了 = セクション完了

### Codex呼び出し

```bash
codex exec --sandbox read-only "
[section-impl-review.mdプロンプト]
セクション: {{SECTION_NAME}}
タスク: {{SECTION_TASK_IDS}}
変更ファイル: {{SECTION_FILES}}
"
```

### spec.json更新（APPROVED時）

```javascript
// section_tracking更新
spec.section_tracking.sections[sectionId].status = "complete";
spec.section_tracking.sections[sectionId].reviewed = true;
spec.section_tracking.sections[sectionId].review_session_id = sessionId;
spec.section_tracking.reviewed_sections += 1;

// codex_reviews更新
spec.codex_reviews.impl.sections[sectionId] = {
  review_count: count,
  final_verdict: "APPROVED",
  resolved_issues: issueCount,
  session_id: sessionId,
  timestamp: new Date().toISOString()
};

// 全セクション完了チェック
if (allSectionsApproved) {
  spec.codex_reviews.impl.all_sections_approved = true;
  spec.codex_reviews.impl.final_verdict = "APPROVED";
  spec.phase = "impl-approved";
}
```

### セクション境界の尊重

レビュー時は、セクション境界を明示的に伝える：

```bash
codex exec --sandbox read-only resume [SESSION_ID] "
## セクション境界の明確化

### このセクションで完了すべき
- [機能A]
- [機能B]

### 後続セクションで対応予定
- [機能C] → Section 2で実装
- [機能D] → Section 3で実装

後続セクションで対応予定の項目はblockingとしないでください。
"
```

---

## 自動進行モード

### トリガー
```bash
/sdd-codex-review auto [feature-name]
```

### 処理フロー

1. spec.jsonの現在`phase`を確認
2. 現在フェーズの成果物をCodexでレビュー
3. OKなら次フェーズへ自動進行
4. 全フェーズ完了までループ

```
initialized → requirements → design → tasks → impl → completed
```

---

## レビュー判定基準

| 判定 | 条件 |
|------|------|
| ok: true (OK/GO/APPROVED) | blocking = 0件 |
| ok: false (NEEDS_REVISION/NO_GO) | blocking ≧ 1件 |

### severity定義

| severity | 意味 | 影響 |
|----------|------|------|
| blocking | 修正必須 | 1件でも`ok: false` |
| advisory | 推奨・警告 | `ok: true`でも出力可 |

### category定義

- **correctness**: 正確性、要件/設計準拠
- **security**: セキュリティ（自動的にblocking）
- **perf**: パフォーマンス
- **maintainability**: 保守性
- **testing**: テストカバレッジ
- **style**: スタイル、形式

---

## 修正ループとテスト/リンタ統合

### 修正ループフロー

`ok: false`の場合、`max_iters`回まで反復：

```
[ok: false] → [issues解析] → [修正] → [テスト/リンタ] → [再レビュー]
    ↑                                                      │
    └──────────────────────────────────────────────────────┘
```

### テスト/リンタ自動実行

修正適用後に自動実行：

```bash
# プロジェクトのツールチェーンに応じて選択
# Bun + Biome プロジェクトの場合:
bun run type-check        # TypeScript型チェック
bun run lint:fix          # Biome lint + fix
bun run format            # Biome format
bun test                  # テスト実行

# npm + ESLint/Prettier プロジェクトの場合:
# npx tsc --noEmit && npx eslint --fix . && npx prettier --write . && npm test
```

### 停止条件

1. **ok: true** - レビュー承認
2. **max_iters到達** - 最大6回
3. **テスト2回連続失敗** - テストが安定しない

---

## Codex呼び出しパターン

### 初回レビュー
```bash
codex exec --sandbox read-only "[prompt]"
codex exec --sandbox read-only review --base main "[指示]"
```

### 再レビュー（2回目以降）
```bash
codex exec --sandbox read-only resume --last "[修正内容]"
codex exec --sandbox read-only resume [SESSION_ID] "[修正内容]"
```

**`resume`のメリット**:
- 前回コンテキスト保持
- トークン消費削減
- 高速レスポンス

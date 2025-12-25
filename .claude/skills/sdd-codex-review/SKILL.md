---
name: sdd-codex-review
description: "Codex統合レビュースキル。kiro:spec-requirements/design/tasks/impl完了後に実行。/sdd-codex-review [phase] [feature]で各フェーズをCodexレビュー。APPROVEDまでループ。"
---

# SDD-Codex-Review: Codex統合レビューワークフロー

cc-sddワークフローの各フェーズ完了時にOpenAI Codexを使用して自動レビューを実行し、
OKが出るまでフィードバックループを繰り返すスキルです。

## 前提条件

- `codex` CLIがインストール済み
- プロジェクトがcc-sdd仕様に準拠（`.kiro/specs/[feature]/`）
- spec.jsonが存在し、フェーズ情報が正しく設定されている

## 使用方法

```bash
# 特定フェーズのレビュー実行
/sdd-codex-review requirements [feature-name]
/sdd-codex-review design [feature-name]
/sdd-codex-review tasks [feature-name]
/sdd-codex-review impl [feature-name]

# 自動進行モード（現在のフェーズから順次レビュー）
/sdd-codex-review auto [feature-name]
```

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
│ OK: 次フェーズ│                │ 再レビュー│          │ 3回超過: │
│ spec.json更新│                │ (ループ) │          │ ユーザー │
│ ユーザー報告 │                └──────────┘          │ 介入要求 │
└──────────────┘                                      └──────────┘
```

---

## Phase 1: 要件レビュー (spec-requirements完了後)

### トリガー
```bash
/sdd-codex-review requirements [feature-name]
```

### 処理フロー

1. **ファイル読み込み**
   ```bash
   # 対象ファイル
   .kiro/specs/[feature]/requirements.md
   .kiro/specs/[feature]/spec.json
   ```

2. **Codexレビュー実行**
   ```bash
   codex exec -C "$(pwd)" --full-auto "
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
     \"verdict\": \"OK\" | \"NEEDS_REVISION\",
     \"issues\": [
       {
         \"severity\": \"critical\" | \"medium\" | \"minor\",
         \"location\": \"Requirement X.X\",
         \"issue\": \"問題の説明\",
         \"suggestion\": \"修正案\"
       }
     ],
     \"summary\": \"全体評価\"
   }
   "
   ```

3. **結果解析と判定**
   - `verdict === "OK"` → 承認、次フェーズへ
   - `verdict === "NEEDS_REVISION"` → 自動修正適用、再レビュー

4. **自動修正（NEEDS_REVISION時）**
   - `issues`配列を走査
   - 各`suggestion`をrequirements.mdに適用
   - 再度Codexレビューを実行（最大3回）

5. **spec.json更新（OK時）**
   ```javascript
   spec.approvals.requirements.approved = true;
   spec.phase = "requirements-approved";
   spec.updated_at = new Date().toISOString();
   ```

6. **ユーザー報告**
   ```markdown
   ## Codexレビュー完了: 要件定義

   | 項目 | 値 |
   |------|-----|
   | フィーチャー | [feature-name] |
   | レビュー回数 | X / 3 |
   | 最終判定 | OK |

   ### 解決済み指摘
   - [修正内容1]
   - [修正内容2]

   ### 次のステップ
   `/kiro:spec-design [feature-name]` で設計フェーズへ進んでください。
   ```

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
   - `verdict === "GO"` → 承認
   - `verdict === "NO_GO"` → 自動修正 or ユーザー介入

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
| OK/GO/APPROVED | critical = 0件 かつ medium ≦ 2件 |
| NEEDS_REVISION/NO_GO | critical ≧ 1件 または medium ≧ 3件 |

---

## エラーハンドリング

### Codex呼び出し失敗
- 3回リトライ（指数バックオフ: 5s, 15s, 45s）
- 失敗継続時はユーザーに通知

### 無限ループ防止
- 各フェーズ最大3回のレビューサイクル
- 3回超過時はユーザー手動介入を要求

### JSON解析失敗
- Codex出力が期待形式でない場合
- raw出力をユーザーに提示して判断を委ねる

---

## Codex呼び出しパターン

### 基本形式
```bash
codex exec -C "[project-dir]" --full-auto "[prompt]"
```

### プロンプトテンプレート参照
- 要件: `prompts/requirements-review.md`
- 設計: `prompts/design-review.md`
- タスク: `prompts/tasks-review.md`
- 実装: `prompts/impl-review.md`

---

## spec.json更新フォーマット

```json
{
  "phase": "requirements-approved",
  "approvals": {
    "requirements": { "approved": true },
    "design": { "approved": false },
    "tasks": { "approved": false }
  },
  "updated_at": "2025-12-25T12:00:00.000Z",
  "codex_reviews": {
    "requirements": {
      "review_count": 2,
      "final_verdict": "OK",
      "resolved_issues": 3
    }
  }
}
```

---

## ユーザー報告フォーマット

```markdown
## Codexレビュー完了報告

### フェーズ: [PHASE] ([FEATURE])

| 項目 | 状態 |
|------|------|
| レビュー回数 | X / 3 |
| 最終判定 | [VERDICT] |
| 解決済み指摘 | X件 |

### サマリー
[Codexからのsummary]

### 解決済み指摘事項
1. [issue1] → [suggestion1適用]
2. [issue2] → [suggestion2適用]

### 残存警告（承認済み）
- [minor issue] (対応不要)

### 更新ファイル
- `.kiro/specs/[FEATURE]/[FILE]`
- `.kiro/specs/[FEATURE]/spec.json`

### 次のステップ
[次に実行すべきコマンド]
```

---

## 実装時の注意事項

1. **ファイル読み込み**: 必ず対象ファイルの存在確認を行う
2. **JSON抽出**: Codex出力から```json...```ブロックを正規表現で抽出
3. **差分適用**: suggestionは可能な限り自動適用、複雑な場合はユーザー確認
4. **履歴保持**: 各レビュー結果をspec.jsonのcodex_reviewsに記録
5. **並列処理禁止**: 1フェーズずつ順次処理（依存関係のため）

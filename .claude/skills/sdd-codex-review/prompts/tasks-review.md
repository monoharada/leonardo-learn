# タスクレビュープロンプト

このファイルはCodexに送信するタスク分解レビュー用プロンプトテンプレートです。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --full-auto`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）のタスクレビュアーです。
以下のタスク分解をレビューし、実装可能性を評価してください。

## レビュー基準

### 1. 要件カバレッジ
- 全ての要件IDがタスクにトレースされているか
- 受け入れ基準（AC）がタスクに反映されているか
- 漏れている要件がないか

### 2. タスク粒度
- 各タスクが1-4時間で完了可能なサイズか
- タスクが大きすぎず、小さすぎないか
- 実装・テスト・ドキュメントが適切に分離されているか

### 3. 依存関係
- タスク間の依存が正しく定義されているか
- 循環依存がないか
- クリティカルパスが明確か

### 4. 並列実行可能性
- (P)マークが適切に付与されているか
- 並列実行可能なタスクが識別されているか
- ボトルネックとなるタスクが明確か

### 5. テスト包含
- 各機能タスクにテスト項目が含まれているか
- ユニットテスト・統合テストが適切に計画されているか
- E2Eテストの対象が明確か

### 6. 設計整合性
- design.mdのコンポーネント/インターフェースと一致しているか
- 実装順序が設計に沿っているか
- 型定義・インターフェースの作成タスクが含まれているか

## レビュー対象

### タスクドキュメント
{{TASKS_CONTENT}}

### 設計ドキュメント（参照用）
{{DESIGN_CONTENT}}

### 要件ドキュメント（参照用）
{{REQUIREMENTS_CONTENT}}

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "verdict": "APPROVED" | "NEEDS_REVISION",
  "coverage_analysis": {
    "requirements_covered": ["1.1", "1.2", "2.1"],
    "requirements_missing": ["3.1"],
    "requirements_partially_covered": ["2.2"]
  },
  "issues": [
    {
      "severity": "critical" | "medium" | "minor",
      "task_id": "Task X.X",
      "issue": "問題の説明",
      "suggestion": "修正案"
    }
  ],
  "task_quality": {
    "granularity_score": 1-5,
    "dependency_clarity": 1-5,
    "test_coverage": 1-5,
    "parallel_optimization": 1-5
  },
  "parallel_tasks": ["Task 1.1", "Task 1.2"],
  "critical_path": ["Task 2.1", "Task 2.2", "Task 3.1"],
  "estimated_parallelism": "X tasks can run in parallel",
  "strengths": ["良い点"],
  "summary": "全体評価（2-3文）"
}
```

## 判定基準

- **APPROVED**: critical = 0件 かつ medium ≦ 2件 かつ requirements_missing = 0
- **NEEDS_REVISION**: それ以外

## スコア基準

### granularity_score (粒度)
- 5: 全タスクが1-4時間サイズ
- 3: 一部タスクがサイズ不適切
- 1: 多くのタスクがサイズ不適切

### dependency_clarity (依存関係の明確さ)
- 5: 全依存が明確、循環なし
- 3: 一部不明確な依存あり
- 1: 依存関係が混乱

### test_coverage (テストカバレッジ)
- 5: 全機能タスクにテスト項目あり
- 3: 主要機能のみテストあり
- 1: テスト項目不足

### parallel_optimization (並列化最適化)
- 5: 最大限の並列化が計画されている
- 3: 一部並列化の余地あり
- 1: 並列化が考慮されていない

## 注意事項

1. issuesは最大5件まで、重要度順
2. requirements_missingがあれば必ずcriticalとして報告
3. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{TASKS_CONTENT}}` | tasks.mdの全内容 |
| `{{DESIGN_CONTENT}}` | design.mdの全内容 |
| `{{REQUIREMENTS_CONTENT}}` | requirements.mdの全内容 |

## 使用例

```bash
codex exec --full-auto "
$(cat prompts/tasks-review.md |
  sed "s/{{TASKS_CONTENT}}/$(cat .kiro/specs/my-feature/tasks.md)/" |
  sed "s/{{DESIGN_CONTENT}}/$(cat .kiro/specs/my-feature/design.md)/" |
  sed "s/{{REQUIREMENTS_CONTENT}}/$(cat .kiro/specs/my-feature/requirements.md)/")
"
```

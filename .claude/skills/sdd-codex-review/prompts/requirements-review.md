# 要件レビュープロンプト

このファイルはCodexに送信する要件レビュー用プロンプトテンプレートです。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --sandbox read-only`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）の要件レビュアーです。
以下の要件定義書をレビューし、構造化されたJSON形式でフィードバックを提供してください。

これはレビューゲートとして実行されている。blockingが1件でもあればok: falseとし、修正→再レビューで収束させる前提で指摘せよ。

## レビュー基準

### 1. 完全性 (Completeness)
- 全ての機能要件がカバーされているか
- ユーザーストーリーから導出された要件が網羅されているか
- エッジケースや例外ケースが考慮されているか

### 2. 明確性 (Clarity)
- 曖昧な表現や解釈の余地がないか
- 技術的に実装可能な具体性があるか
- 用語が一貫して使用されているか

### 3. テスト可能性 (Testability)
- 各受け入れ基準（AC）が検証可能か
- 定量的な基準（数値、閾値）が明記されているか
- テストケースを導出できる明確さがあるか

### 4. 一貫性 (Consistency)
- 要件間の矛盾がないか
- 優先順位が適切に設定されているか
- 依存関係が明確か

### 5. EARS形式準拠
- When/If/While/Where/The system shall 形式に従っているか
- 条件部と動作部が明確に分離されているか
- 主語が明確か（システム、ユーザー、外部システム等）

## レビュー対象ファイル

{{REQUIREMENTS_CONTENT}}

前回メモ: {{NOTES_FOR_NEXT_REVIEW}}

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "ok": true | false,
  "phase": "requirements",
  "summary": "レビューの要約（2-3文）",
  "issues": [
    {
      "severity": "blocking" | "advisory",
      "category": "correctness" | "security" | "perf" | "maintainability" | "testing" | "style",
      "location": "Requirement X.X / AC X",
      "problem": "問題の具体的な説明",
      "recommendation": "修正案（具体的な文言を含む）"
    }
  ],
  "coverage_analysis": {
    "functional_requirements_count": 0,
    "acceptance_criteria_count": 0,
    "missing_areas": ["不足している領域"]
  },
  "strengths": ["良い点1", "良い点2"],
  "notes_for_next_review": "次回レビュー時に参照すべきメモ"
}
```

## 判定基準

- **ok: true**: blocking = 0件
- **ok: false**: blocking ≧ 1件

## severity定義

- **blocking**: 修正必須。1件でもあれば ok: false
- **advisory**: 推奨・警告。ok: true でも出力可、レポートに記載のみ

## category定義

- **correctness**: 要件の正確性、論理的整合性
- **security**: セキュリティ関連
- **perf**: パフォーマンス関連
- **maintainability**: 保守性、拡張性
- **testing**: テスト可能性
- **style**: 形式、文体

## 注意事項

1. issuesは最大5件まで、最も重要なものを優先
2. recommendationは実際に適用可能な具体的な修正文を含めること
3. notes_for_next_reviewには、再レビュー時に確認すべきポイントを記載
4. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{REQUIREMENTS_CONTENT}}` | requirements.mdの全内容 |
| `{{FEATURE_NAME}}` | フィーチャー名 |
| `{{NOTES_FOR_NEXT_REVIEW}}` | 前回レビューのメモ（初回は空） |

## 使用例

```bash
codex exec --sandbox read-only "
$(cat prompts/requirements-review.md | sed 's/{{REQUIREMENTS_CONTENT}}/$(cat .kiro/specs/my-feature/requirements.md)/')
"
```

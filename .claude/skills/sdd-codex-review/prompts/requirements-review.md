# 要件レビュープロンプト

このファイルはCodexに送信する要件レビュー用プロンプトテンプレートです。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --full-auto`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）の要件レビュアーです。
以下の要件定義書をレビューし、構造化されたJSON形式でフィードバックを提供してください。

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

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "verdict": "OK" | "NEEDS_REVISION",
  "issues": [
    {
      "severity": "critical" | "medium" | "minor",
      "location": "Requirement X.X / AC X",
      "issue": "問題の具体的な説明",
      "suggestion": "修正案（具体的な文言を含む）",
      "traceability": "影響を受ける関連要件ID"
    }
  ],
  "coverage_analysis": {
    "functional_requirements_count": 0,
    "acceptance_criteria_count": 0,
    "missing_areas": ["不足している領域"]
  },
  "strengths": ["良い点1", "良い点2"],
  "summary": "全体評価（2-3文）"
}
```

## 判定基準

- **OK**: critical = 0件 かつ medium ≦ 2件
- **NEEDS_REVISION**: critical ≧ 1件 または medium ≧ 3件

## 注意事項

1. issuesは最大5件まで、最も重要なものを優先
2. suggestionは実際に適用可能な具体的な修正文を含めること
3. minor指摘は省略可（criticalとmediumを優先）
4. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{REQUIREMENTS_CONTENT}}` | requirements.mdの全内容 |
| `{{FEATURE_NAME}}` | フィーチャー名 |

## 使用例

```bash
codex exec --full-auto "
$(cat prompts/requirements-review.md | sed 's/{{REQUIREMENTS_CONTENT}}/$(cat .kiro/specs/my-feature/requirements.md)/')
"
```

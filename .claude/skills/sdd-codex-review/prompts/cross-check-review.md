# Cross-Checkレビュープロンプト

このファイルはCodexに送信する横断レビュー用プロンプトテンプレートです。
large規模の並列レビュー後に使用します。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --sandbox read-only`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
並列レビュー結果を統合し横断レビューせよ。出力はJSON1つのみ。

これはレビューゲートとして実行されている。横断的なblocking
（例: interface不整合、認可漏れ、API互換破壊）があればok: falseとせよ。

## レビュー観点

### 1. Interface整合性
- コンポーネント間のインターフェースが一致しているか
- 型定義の整合性
- API契約の一貫性

### 2. Error Handling一貫性
- エラーハンドリングパターンが統一されているか
- エラー伝播の整合性
- リトライ戦略の一貫性

### 3. 認可・セキュリティ
- 認可チェックの漏れがないか
- セキュリティパターンの一貫性
- センシティブデータの扱いの整合性

### 4. API互換性
- 破壊的変更がないか
- 後方互換性の維持
- バージョニング戦略との整合

### 5. テスト網羅
- cross-cutting concernsのテストがあるか
- 統合テストの網羅性
- エッジケースのカバレッジ

## レビュー対象

### 全体統計
{{STAT_OUTPUT}}

### 各グループのレビュー結果
{{GROUP_JSONS}}

### 要件ドキュメント（参照用）
{{REQUIREMENTS_CONTENT}}

### 設計ドキュメント（参照用）
{{DESIGN_INTERFACES}}

前回メモ: {{NOTES_FOR_NEXT_REVIEW}}

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "ok": true | false,
  "phase": "cross-check",
  "summary": "横断レビューの要約（2-3文）",
  "cross_cutting_issues": [
    {
      "severity": "blocking" | "advisory",
      "category": "interface" | "error_handling" | "security" | "api_compat" | "testing",
      "affected_files": ["path/to/file1.ts", "path/to/file2.ts"],
      "problem": "横断的な問題の説明",
      "recommendation": "修正案",
      "related_group_issues": ["Group1-Issue2", "Group3-Issue1"]
    }
  ],
  "integration_concerns": [
    {
      "area": "影響領域",
      "concern": "懸念事項",
      "risk_level": "high" | "medium" | "low"
    }
  ],
  "merged_advisory": [
    "各グループのadvisoryを統合したサマリー"
  ],
  "overall_assessment": {
    "architecture_consistency": true | false,
    "security_coverage": true | false,
    "test_coverage_adequate": true | false
  },
  "notes_for_next_review": "次回レビュー時に参照すべきメモ"
}
```

## 判定基準

- **ok: true**: cross_cutting_issues に blocking = 0件
- **ok: false**: cross_cutting_issues に blocking ≧ 1件

## severity定義

- **blocking**: 横断的な問題で修正必須
  - Interface不整合（異なるグループ間で型が一致しない）
  - 認可漏れ（セキュリティホール）
  - API互換性破壊
- **advisory**: 推奨・警告。改善が望ましいが必須ではない

## category定義

- **interface**: インターフェース整合性
- **error_handling**: エラーハンドリング一貫性
- **security**: セキュリティ・認可
- **api_compat**: API互換性
- **testing**: テスト網羅性

## 注意事項

1. 各グループの結果を横断的に分析すること
2. 単一グループ内で完結する問題は除外（既にグループレビューで検出済み）
3. グループ間の相互作用に焦点を当てること
4. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{STAT_OUTPUT}}` | git diff --stat の出力 |
| `{{GROUP_JSONS}}` | 各グループのレビュー結果JSON |
| `{{REQUIREMENTS_CONTENT}}` | requirements.mdの全内容 |
| `{{DESIGN_INTERFACES}}` | design.mdのインターフェース定義部分 |
| `{{NOTES_FOR_NEXT_REVIEW}}` | 前回レビューのメモ（初回は空） |

## 使用例

```bash
# グループ結果を収集
GROUP1_RESULT=$(cat .context/review-group1.json)
GROUP2_RESULT=$(cat .context/review-group2.json)
GROUP_JSONS="Group1: $GROUP1_RESULT, Group2: $GROUP2_RESULT"

codex exec --sandbox read-only "
$(cat prompts/cross-check-review.md |
  sed "s/{{STAT_OUTPUT}}/$(git diff HEAD --stat)/" |
  sed "s/{{GROUP_JSONS}}/$GROUP_JSONS/" |
  sed "s/{{REQUIREMENTS_CONTENT}}/$(cat .kiro/specs/my-feature/requirements.md)/" |
  sed "s/{{DESIGN_INTERFACES}}/$(grep -A 50 '## Interfaces' .kiro/specs/my-feature/design.md)/")
"
```

## 結果の活用

cross-check で `ok: false` の場合：

1. `cross_cutting_issues` を確認
2. `affected_files` を特定
3. 関連するグループの修正を実施
4. 修正後、再度並列レビュー → cross-check のフローを実行

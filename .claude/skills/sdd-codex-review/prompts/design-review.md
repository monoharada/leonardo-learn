# 設計レビュープロンプト

このファイルはCodexに送信する設計レビュー用プロンプトテンプレートです。
`.kiro/settings/rules/design-review.md`の基準に準拠しています。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --sandbox read-only`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）の設計レビュアーです。
以下の設計書をレビューし、GO/NO-GO判定を行ってください。

これはレビューゲートとして実行されている。blockingが1件でもあればok: falseとし、修正→再レビューで収束させる前提で指摘せよ。

## レビュー哲学

- **品質保証であり、完璧を求めるものではない**
- **Critical Focus**: 最も重要な懸念事項に限定
- **バランスの取れた評価**: 強みと弱みの両方を認識
- **明確な決定**: GO/NO-GOの明確な根拠

## レビュー基準

### 1. 既存アーキテクチャとの整合性 (Critical)
- 既存システム境界・レイヤーとの統合
- 確立されたアーキテクチャパターンとの一貫性
- 依存方向とカップリング管理
- 現在のモジュール構成との整合

### 2. 設計の一貫性と標準
- プロジェクトの命名規則・コード標準への準拠
- 一貫したエラーハンドリング・ログ戦略
- 統一された設定・依存性管理
- 確立されたデータモデリングパターンとの整合

### 3. 拡張性と保守性
- 将来要件への設計柔軟性
- 関心の分離と単一責任
- テスト容易性とデバッグ考慮
- 要件に対する適切な複雑さ

### 4. 型安全性とインターフェース設計
- 適切な型定義とインターフェース契約
- 安全でないパターンの回避（例: TypeScriptの`any`）
- 明確なAPI境界とデータ構造
- 入力検証とエラーハンドリングのカバレッジ

## 要件トレーサビリティ

以下の要件IDが設計で適切にカバーされているか確認してください：

{{REQUIREMENTS_IDS}}

## レビュー対象

### 設計ドキュメント
{{DESIGN_CONTENT}}

### 要件ドキュメント（参照用）
{{REQUIREMENTS_CONTENT}}

前回メモ: {{NOTES_FOR_NEXT_REVIEW}}

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "ok": true | false,
  "phase": "design",
  "summary": "全体評価（2-3文）",
  "issues": [
    {
      "severity": "blocking" | "advisory",
      "category": "correctness" | "security" | "perf" | "maintainability" | "testing" | "style",
      "location": "design.mdの該当セクション名",
      "problem": "具体的な問題の説明",
      "recommendation": "具体的な改善案",
      "traceability": "関連する要件ID（例: 1.1, 2.3）"
    }
  ],
  "requirements_coverage": {
    "covered": ["1.1", "1.2", "2.1"],
    "uncovered": ["3.1"],
    "partially_covered": ["2.2"]
  },
  "strengths": ["設計の良い点1", "設計の良い点2"],
  "notes_for_next_review": "次回レビュー時に参照すべきメモ"
}
```

## 判定基準

### ok: true (GO)
- blocking = 0件
- 重大なアーキテクチャ不整合がない
- 要件が適切にアドレスされている
- 実装パスが明確
- リスクが許容範囲内

### ok: false (NO_GO)
- blocking ≧ 1件
- 根本的な矛盾がある
- 重大なギャップがある
- 高い失敗リスク
- 不釣り合いな複雑さ

## severity定義

- **blocking**: 修正必須。1件でもあれば ok: false
- **advisory**: 推奨・警告。ok: true でも出力可、レポートに記載のみ

## category定義

- **correctness**: 設計の正確性、アーキテクチャ整合性
- **security**: セキュリティ設計
- **perf**: パフォーマンス設計
- **maintainability**: 保守性、拡張性
- **testing**: テスト容易性
- **style**: 形式、ドキュメント品質

## 注意事項

1. issuesは最大5件まで、最も重要なものを優先
2. 各issueは5-7行以内で簡潔に
3. 全体で約400語を目安
4. traceabilityは必須
5. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{DESIGN_CONTENT}}` | design.mdの全内容 |
| `{{REQUIREMENTS_CONTENT}}` | requirements.mdの全内容 |
| `{{REQUIREMENTS_IDS}}` | 要件IDリスト（1.1, 1.2, 2.1等） |
| `{{NOTES_FOR_NEXT_REVIEW}}` | 前回レビューのメモ（初回は空） |

## 使用例

```bash
# 要件IDを抽出
REQ_IDS=$(grep -oE "^### [0-9]+\.[0-9]+" requirements.md | sed 's/### //' | tr '\n' ', ')

codex exec --sandbox read-only "
$(cat prompts/design-review.md |
  sed "s/{{DESIGN_CONTENT}}/$(cat .kiro/specs/my-feature/design.md)/" |
  sed "s/{{REQUIREMENTS_CONTENT}}/$(cat .kiro/specs/my-feature/requirements.md)/" |
  sed "s/{{REQUIREMENTS_IDS}}/$REQ_IDS/")
"
```

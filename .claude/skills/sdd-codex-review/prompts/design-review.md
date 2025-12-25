# 設計レビュープロンプト

このファイルはCodexに送信する設計レビュー用プロンプトテンプレートです。
`.kiro/settings/rules/design-review.md`の基準に準拠しています。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --full-auto`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）の設計レビュアーです。
以下の設計書をレビューし、GO/NO-GO判定を行ってください。

## レビュー哲学

- **品質保証であり、完璧を求めるものではない**
- **Critical Focus**: 最も重要な3つの懸念事項に限定
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

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "verdict": "GO" | "NO_GO",
  "critical_issues": [
    {
      "id": 1,
      "title": "問題タイトル（簡潔に）",
      "concern": "具体的な問題の説明",
      "impact": "なぜ重要か、影響範囲",
      "suggestion": "具体的な改善案",
      "traceability": "関連する要件ID（例: 1.1, 2.3）",
      "evidence": "design.mdの該当セクション名"
    }
  ],
  "requirements_coverage": {
    "covered": ["1.1", "1.2", "2.1"],
    "uncovered": ["3.1"],
    "partially_covered": ["2.2"]
  },
  "strengths": ["設計の良い点1", "設計の良い点2"],
  "next_steps": ["次に取るべきアクション"],
  "summary": "全体評価（2-3文）"
}
```

## 判定基準

### GO
- 重大なアーキテクチャ不整合がない
- 要件が適切にアドレスされている
- 実装パスが明確
- リスクが許容範囲内

### NO_GO
- 根本的な矛盾がある
- 重大なギャップがある
- 高い失敗リスク
- 不釣り合いな複雑さ

## 注意事項

1. critical_issuesは最大3件まで
2. 各issueは5-7行以内で簡潔に
3. 全体で約400語を目安
4. traceabilityとevidenceは必須
5. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{DESIGN_CONTENT}}` | design.mdの全内容 |
| `{{REQUIREMENTS_CONTENT}}` | requirements.mdの全内容 |
| `{{REQUIREMENTS_IDS}}` | 要件IDリスト（1.1, 1.2, 2.1等） |

## 使用例

```bash
# 要件IDを抽出
REQ_IDS=$(grep -oE "^### [0-9]+\.[0-9]+" requirements.md | sed 's/### //' | tr '\n' ', ')

codex exec --full-auto "
$(cat prompts/design-review.md |
  sed "s/{{DESIGN_CONTENT}}/$(cat .kiro/specs/my-feature/design.md)/" |
  sed "s/{{REQUIREMENTS_CONTENT}}/$(cat .kiro/specs/my-feature/requirements.md)/" |
  sed "s/{{REQUIREMENTS_IDS}}/$REQ_IDS/")
"
```

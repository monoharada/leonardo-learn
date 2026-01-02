# 実装レビュープロンプト

このファイルはCodexに送信する実装レビュー用プロンプトテンプレートです。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --sandbox read-only`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）の実装レビュアーです。
実装されたコードが設計・要件に準拠しているかレビューしてください。

これはレビューゲートとして実行されている。blockingが1件でもあればok: falseとし、修正→再レビューで収束させる前提で指摘せよ。

## レビュー基準

### 1. 要件準拠
- 対象タスクの要件IDが満たされているか
- 受け入れ基準（AC）が実装されているか
- エッジケースが考慮されているか

### 2. 設計準拠
- design.mdのインターフェース定義に従っているか
- 型定義が設計と一致しているか
- コンポーネント境界が守られているか

### 3. コード品質
- TypeScript strict mode準拠
- エラーハンドリングが適切か
- 命名規則に従っているか
- 重複コードがないか
- 関数が単一責任を持っているか

### 4. テストカバレッジ
- ユニットテストが書かれているか
- テストケースが要件をカバーしているか
- エッジケースのテストがあるか

### 5. パフォーマンス
- 設計で定義された性能要件を満たすか
- 不要な再計算・再レンダリングがないか
- メモリリークの可能性がないか

### 6. セキュリティ
- 入力バリデーションが適切か
- XSS/インジェクション対策があるか
- センシティブデータの適切な扱い

## レビュー対象

### 対象タスク
Task {{TASK_ID}}: {{TASK_TITLE}}

### 変更ファイル一覧
{{CHANGED_FILES}}

### 実装コード（差分）
{{IMPLEMENTATION_DIFF}}

### タスク詳細
{{TASK_DETAILS}}

### 設計ドキュメント（参照用）
{{DESIGN_INTERFACES}}

前回メモ: {{NOTES_FOR_NEXT_REVIEW}}

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "ok": true | false,
  "phase": "impl",
  "summary": "全体評価（2-3文）",
  "requirements_validation": {
    "met": ["1.1", "1.2"],
    "unmet": [],
    "untested": ["1.3"]
  },
  "design_compliance": {
    "interfaces_followed": true,
    "type_safety": true,
    "boundary_respected": true,
    "issues": []
  },
  "issues": [
    {
      "severity": "blocking" | "advisory",
      "category": "correctness" | "security" | "perf" | "maintainability" | "testing" | "style",
      "file": "path/to/file.ts",
      "lines": "42-45",
      "problem": "問題の説明",
      "recommendation": "修正案",
      "code_snippet": "問題のあるコード断片"
    }
  ],
  "test_gaps": [
    {
      "requirement": "1.1",
      "missing_test": "不足しているテストケースの説明"
    }
  ],
  "strengths": ["実装の良い点"],
  "notes_for_next_review": "次回レビュー時に参照すべきメモ"
}
```

## 判定基準

- **ok: true**:
  - blocking = 0件
  - unmet = 0件
  - セキュリティ関連のblocking = 0件

- **ok: false**: それ以外

## severity定義

- **blocking**: 修正必須。1件でもあれば ok: false
- **advisory**: 推奨・警告。ok: true でも出力可、レポートに記載のみ

## category定義

- **correctness**: 論理エラー、要件未達成、設計違反
- **security**: セキュリティ脆弱性（自動的にblocking）
- **perf**: パフォーマンス懸念
- **maintainability**: 可読性、保守性の問題
- **testing**: テストカバレッジ不足
- **style**: コードスタイル、命名

## blockingとなる条件

### 自動的にblocking
- セキュリティ脆弱性（category: security）
- 型安全性違反（any使用、unsafe型キャスト）
- 要件未達成（unmet ≧ 1）
- 設計違反（インターフェース不一致）

### 状況によりblocking
- エラーハンドリング不足（重大な場合）
- テストカバレッジ不足（重要機能の場合）

### advisoryの例
- コードスタイル改善
- 命名の改善提案
- コメント追加提案
- 軽微なパフォーマンス改善

## 注意事項

1. issuesは最大10件まで、重要度順
2. 各issueには具体的なcode_snippetを含めること
3. recommendationは実際に適用可能なコードを含めること
4. 日本語で回答すること
```

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{TASK_ID}}` | タスクID（例: 1.1） |
| `{{TASK_TITLE}}` | タスクタイトル |
| `{{CHANGED_FILES}}` | 変更されたファイル一覧 |
| `{{IMPLEMENTATION_DIFF}}` | git diffの出力 |
| `{{TASK_DETAILS}}` | tasks.mdの該当タスク部分 |
| `{{DESIGN_INTERFACES}}` | design.mdのインターフェース定義部分 |
| `{{NOTES_FOR_NEXT_REVIEW}}` | 前回レビューのメモ（初回は空） |

## 使用例

```bash
# 変更ファイル一覧を取得
CHANGED_FILES=$(git diff --name-only HEAD~1)

# 差分を取得
IMPLEMENTATION_DIFF=$(git diff HEAD~1)

codex exec --sandbox read-only "
$(cat prompts/impl-review.md |
  sed "s/{{TASK_ID}}/1.1/" |
  sed "s/{{TASK_TITLE}}/セマンティックロールマッピング実装/" |
  sed "s/{{CHANGED_FILES}}/$CHANGED_FILES/" |
  sed "s/{{IMPLEMENTATION_DIFF}}/$IMPLEMENTATION_DIFF/" |
  sed "s/{{TASK_DETAILS}}/$(grep -A 20 'Task 1.1' .kiro/specs/my-feature/tasks.md)/" |
  sed "s/{{DESIGN_INTERFACES}}/$(grep -A 50 '## Interfaces' .kiro/specs/my-feature/design.md)/")
"
```

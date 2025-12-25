# 実装レビュープロンプト

このファイルはCodexに送信する実装レビュー用プロンプトテンプレートです。

## ⚠️ 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --full-auto`で実行すること。**
- ❌ Claudeがこのプロンプトを自分で処理してはいけない
- ❌ JSON verdictを自分で生成してはいけない
- ✅ Codex CLIを実行し、session IDを報告に含めること

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）の実装レビュアーです。
実装されたコードが設計・要件に準拠しているかレビューしてください。

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

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "verdict": "APPROVED" | "NEEDS_REVISION",
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
  "code_issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "severity": "critical" | "medium" | "minor",
      "category": "type-safety" | "error-handling" | "performance" | "security" | "style",
      "issue": "問題の説明",
      "suggestion": "修正案",
      "code_snippet": "問題のあるコード断片"
    }
  ],
  "test_gaps": [
    {
      "requirement": "1.1",
      "missing_test": "不足しているテストケースの説明"
    }
  ],
  "performance_concerns": [],
  "security_concerns": [],
  "strengths": ["実装の良い点"],
  "summary": "全体評価（2-3文）"
}
```

## 判定基準

- **APPROVED**:
  - critical = 0件
  - medium ≦ 2件
  - unmet = 0件
  - セキュリティ懸念 = 0件

- **NEEDS_REVISION**: それ以外

## カテゴリ別の重要度

### Critical（必ず修正）
- 型安全性違反（any使用、型キャストの乱用）
- セキュリティ脆弱性
- 要件未達成
- 設計違反（インターフェース不一致）

### Medium（修正推奨）
- エラーハンドリング不足
- テストカバレッジ不足
- パフォーマンス懸念
- 可読性の問題

### Minor（改善提案）
- コードスタイル
- 命名の改善
- コメント追加

## 注意事項

1. code_issuesは最大10件まで、重要度順
2. 各issueには具体的なcode_snippetを含めること
3. suggestionは実際に適用可能なコードを含めること
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

## 使用例

```bash
# 変更ファイル一覧を取得
CHANGED_FILES=$(git diff --name-only HEAD~1)

# 差分を取得
IMPLEMENTATION_DIFF=$(git diff HEAD~1)

codex exec --full-auto "
$(cat prompts/impl-review.md |
  sed "s/{{TASK_ID}}/1.1/" |
  sed "s/{{TASK_TITLE}}/セマンティックロールマッピング実装/" |
  sed "s/{{CHANGED_FILES}}/$CHANGED_FILES/" |
  sed "s/{{IMPLEMENTATION_DIFF}}/$IMPLEMENTATION_DIFF/" |
  sed "s/{{TASK_DETAILS}}/$(grep -A 20 'Task 1.1' .kiro/specs/my-feature/tasks.md)/" |
  sed "s/{{DESIGN_INTERFACES}}/$(grep -A 50 '## Interfaces' .kiro/specs/my-feature/design.md)/")
"
```

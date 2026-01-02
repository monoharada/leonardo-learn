# セクション実装レビュープロンプト

このファイルはCodexに送信するセクション単位の実装レビュー用プロンプトテンプレートです。

## 重要: シミュレート禁止

**このプロンプトは必ず`codex exec --sandbox read-only`で実行すること。**
- Claudeがこのプロンプトを自分で処理してはいけない
- JSON verdictを自分で生成してはいけない
- Codex CLIを実行し、session IDを報告に含めること

---

## プロンプト

```
あなたはcc-sdd（Spec-Driven Development）のセクション実装レビュアーです。
特定のセクション内の実装をレビューしてください。

これはレビューゲートとして実行されている。blockingが1件でもあればok: falseとし、修正→再レビューで収束させる前提で指摘せよ。

## レビュー範囲

**セクション**: {{SECTION_NAME}}
**セクションID**: {{SECTION_ID}}
**含まれるタスク**: {{SECTION_TASK_IDS}}

### 重要: セクション境界を尊重

このレビューでは **{{SECTION_NAME}}** の範囲内のみを評価してください。

- **評価対象**: このセクション内のタスクで実装された機能
- **評価対象外**: 後続セクションで対応予定の機能

後続セクションで対応予定の項目については blocking としないこと。

## セクションコンテキスト

### このセクションで実装すべき機能
{{IN_SCOPE_FEATURES}}

### 後続セクションで対応予定
{{OUT_OF_SCOPE_FEATURES}}

### 前提セクション（依存）
{{PREREQUISITE_SECTIONS}}

## レビュー基準

### 1. 要件準拠（セクション範囲内）
- 対象セクションのタスクが満たすべき要件IDが実装されているか
- 受け入れ基準（AC）がセクション範囲内で満たされているか
- セクション内で完結すべきエッジケースが考慮されているか

### 2. 設計準拠
- design.mdのインターフェース定義に従っているか
- 型定義が設計と一致しているか
- コンポーネント境界が守られているか

### 3. セクション間インターフェース
- 次セクションへの適切なインターフェースが定義されているか
- 前提セクションのインターフェースを正しく使用しているか
- セクション境界でのエラーハンドリングが適切か

### 4. コード品質
- TypeScript strict mode準拠
- エラーハンドリングが適切か
- 命名規則に従っているか
- 重複コードがないか
- 関数が単一責任を持っているか

### 5. テストカバレッジ
- ユニットテストが書かれているか
- テストケースがセクション内の要件をカバーしているか
- 境界条件のテストがあるか

### 6. セキュリティ
- 入力バリデーションが適切か
- XSS/インジェクション対策があるか
- センシティブデータの適切な扱い

## レビュー対象

### セクション内タスク
{{SECTION_TASKS_DETAILS}}

### 変更ファイル一覧
{{SECTION_FILES}}

### 実装コード（差分）
{{SECTION_DIFF}}

### 設計ドキュメント（参照用）
{{DESIGN_INTERFACES}}

### 前回メモ
{{NOTES_FOR_NEXT_REVIEW}}

## 出力形式

以下のJSON形式で厳密に回答してください：

```json
{
  "ok": true | false,
  "phase": "impl",
  "section_id": "{{SECTION_ID}}",
  "section_name": "{{SECTION_NAME}}",
  "summary": "セクション評価（2-3文）",
  "tasks_reviewed": ["1.1", "1.2", "1.3"],
  "requirements_validation": {
    "met": ["REQ-1.1", "REQ-1.2"],
    "unmet": [],
    "untested": [],
    "deferred_to_next_section": ["REQ-1.4"]
  },
  "design_compliance": {
    "interfaces_followed": true,
    "type_safety": true,
    "boundary_respected": true,
    "section_interface_ready": true,
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
      "requirement": "REQ-1.1",
      "missing_test": "不足しているテストケースの説明"
    }
  ],
  "section_boundary_notes": {
    "exposed_interfaces": ["インターフェース名"],
    "next_section_dependencies": ["次セクションへの申し送り事項"],
    "integration_points": ["統合ポイントの説明"]
  },
  "strengths": ["実装の良い点"],
  "notes_for_next_review": "次回レビュー時に参照すべきメモ"
}
```

## 判定基準

- **ok: true**:
  - blocking = 0件
  - unmet = 0件（deferred_to_next_sectionは除く）
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

## 注意事項

1. セクション境界を尊重し、後続セクションの責務は評価しない
2. issuesは最大10件まで、重要度順
3. 各issueには具体的なcode_snippetを含めること
4. recommendationは実際に適用可能なコードを含めること
5. section_boundary_notesで次セクションへの申し送りを明記
6. 日本語で回答すること
```

---

## 変数

| 変数名 | 説明 |
|--------|------|
| `{{SECTION_ID}}` | セクションID（例: section-1-core-foundation） |
| `{{SECTION_NAME}}` | セクション表示名（例: Section 1: Core Foundation） |
| `{{SECTION_TASK_IDS}}` | セクション内タスクID一覧（例: 1.1, 1.2, 1.3） |
| `{{SECTION_TASKS_DETAILS}}` | tasks.mdのセクション該当部分 |
| `{{SECTION_FILES}}` | セクション内タスクが作成/変更したファイル一覧 |
| `{{SECTION_DIFF}}` | セクション内ファイルのgit diff |
| `{{IN_SCOPE_FEATURES}}` | このセクションで実装すべき機能一覧 |
| `{{OUT_OF_SCOPE_FEATURES}}` | 後続セクションで対応予定の機能一覧 |
| `{{PREREQUISITE_SECTIONS}}` | 依存する前提セクション一覧 |
| `{{DESIGN_INTERFACES}}` | design.mdのインターフェース定義部分 |
| `{{NOTES_FOR_NEXT_REVIEW}}` | 前回レビューのメモ（初回は空） |

---

## 使用例

```bash
# セクション内のファイル一覧を取得
SECTION_FILES="src/types/base.ts src/utils/helpers.ts"

# セクション内ファイルの差分を取得
SECTION_DIFF=$(git diff HEAD~1 -- $SECTION_FILES)

# セクション情報を設定
SECTION_ID="section-1-core-foundation"
SECTION_NAME="Section 1: Core Foundation"
SECTION_TASK_IDS="1.1, 1.2"

codex exec --sandbox read-only "
$(cat prompts/section-impl-review.md |
  sed "s/{{SECTION_ID}}/$SECTION_ID/" |
  sed "s/{{SECTION_NAME}}/$SECTION_NAME/" |
  sed "s/{{SECTION_TASK_IDS}}/$SECTION_TASK_IDS/" |
  sed "s/{{SECTION_FILES}}/$SECTION_FILES/" |
  sed "s/{{SECTION_DIFF}}/$SECTION_DIFF/")
"
```

---

## impl-review.mdとの違い

| 観点 | impl-review.md | section-impl-review.md |
|------|----------------|------------------------|
| スコープ | 単一タスク | セクション内の全タスク |
| 境界考慮 | なし | 後続セクションを考慮 |
| 出力 | task_id | section_id, tasks_reviewed |
| 追加フィールド | なし | section_boundary_notes |
| 評価基準 | 絶対評価 | セクション範囲内での評価 |

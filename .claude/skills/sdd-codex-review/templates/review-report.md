# レビュー報告テンプレート

このファイルはCodexレビュー完了後のユーザー報告に使用するテンプレートです。

---

## Codexレビュー完了報告

### 基本情報

| 項目 | 値 |
|------|-----|
| フェーズ | {{PHASE}} |
| フィーチャー | {{FEATURE_NAME}} |
| レビュー回数 | {{REVIEW_COUNT}} / 3 |
| 最終判定 | {{VERDICT}} |
| 所要時間 | {{DURATION}} |

---

### レビュー結果サマリー

{{SUMMARY}}

---

### 解決済み指摘事項

{{#if RESOLVED_ISSUES}}
| # | 重要度 | 場所 | 問題 | 適用した修正 |
|---|--------|------|------|-------------|
{{#each RESOLVED_ISSUES}}
| {{@index}} | {{severity}} | {{location}} | {{issue}} | {{suggestion}} |
{{/each}}
{{else}}
指摘事項はありませんでした。
{{/if}}

---

### 残存警告（承認済み）

{{#if REMAINING_WARNINGS}}
以下の軽微な指摘は対応不要として承認されました：

{{#each REMAINING_WARNINGS}}
- **{{location}}**: {{issue}}
{{/each}}
{{else}}
残存警告はありません。
{{/if}}

---

### 品質スコア

{{#if QUALITY_SCORES}}
| 基準 | スコア | 評価 |
|------|--------|------|
{{#each QUALITY_SCORES}}
| {{name}} | {{score}}/5 | {{rating}} |
{{/each}}
{{/if}}

---

### 更新ファイル

{{#each MODIFIED_FILES}}
- `{{this}}`
{{/each}}

---

### spec.json更新内容

```json
{
  "phase": "{{NEW_PHASE}}",
  "approvals": {
    "{{PHASE}}": {
      "approved": true
    }
  },
  "codex_reviews": {
    "{{PHASE}}": {
      "review_count": {{REVIEW_COUNT}},
      "final_verdict": "{{VERDICT}}",
      "resolved_issues": {{RESOLVED_COUNT}},
      "timestamp": "{{TIMESTAMP}}"
    }
  }
}
```

---

### 次のステップ

{{NEXT_STEPS}}

---

## 変数一覧

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `{{PHASE}}` | レビューフェーズ | requirements, design, tasks, impl |
| `{{FEATURE_NAME}}` | フィーチャー名 | shade-ui-improvement |
| `{{REVIEW_COUNT}}` | 実行したレビュー回数 | 2 |
| `{{VERDICT}}` | 最終判定 | OK, GO, APPROVED |
| `{{DURATION}}` | 所要時間 | 3分42秒 |
| `{{SUMMARY}}` | Codexからのサマリー | 全体的に良好な要件定義... |
| `{{RESOLVED_ISSUES}}` | 解決済み指摘配列 | [{severity, location, issue, suggestion}] |
| `{{REMAINING_WARNINGS}}` | 残存警告配列 | [{location, issue}] |
| `{{QUALITY_SCORES}}` | 品質スコア配列 | [{name, score, rating}] |
| `{{MODIFIED_FILES}}` | 変更ファイル配列 | [requirements.md, spec.json] |
| `{{NEW_PHASE}}` | 新しいフェーズ値 | requirements-approved |
| `{{RESOLVED_COUNT}}` | 解決済み件数 | 3 |
| `{{TIMESTAMP}}` | タイムスタンプ | 2025-12-25T12:00:00.000Z |
| `{{NEXT_STEPS}}` | 次のアクション | /kiro:spec-design shade-ui-improvement |

---

## フェーズ別次のステップ

### requirements完了後
```markdown
要件定義が承認されました。次は設計フェーズです：

\`\`\`bash
/kiro:spec-design {{FEATURE_NAME}}
\`\`\`

設計完了後、再度 `/sdd-codex-review design {{FEATURE_NAME}}` を実行してください。
```

### design完了後
```markdown
設計が承認されました（GO判定）。次はタスク分解フェーズです：

\`\`\`bash
/kiro:spec-tasks {{FEATURE_NAME}}
\`\`\`

タスク分解完了後、再度 `/sdd-codex-review tasks {{FEATURE_NAME}}` を実行してください。
```

### tasks完了後
```markdown
タスク分解が承認されました。実装を開始できます：

\`\`\`bash
/kiro:spec-impl {{FEATURE_NAME}}
\`\`\`

各タスク実装後、`/sdd-codex-review impl {{FEATURE_NAME}}` でレビューを実行してください。
```

### impl完了後
```markdown
実装が承認されました。全フェーズが完了です。

最終確認：
- [ ] 全テストがパス
- [ ] ドキュメントが更新済み
- [ ] PRの作成準備完了

\`\`\`bash
git add . && git commit -m "feat({{FEATURE_NAME}}): implementation complete"
\`\`\`
```

---

## レビュー失敗時のテンプレート

### 最大リトライ超過

```markdown
## Codexレビュー: ユーザー介入が必要

### 状況
{{PHASE}}フェーズのレビューが3回のリトライ後も承認されませんでした。

### 未解決の指摘事項

| # | 重要度 | 場所 | 問題 |
|---|--------|------|------|
{{#each UNRESOLVED_ISSUES}}
| {{@index}} | {{severity}} | {{location}} | {{issue}} |
{{/each}}

### 推奨アクション

1. 上記の指摘事項を手動で確認・修正してください
2. 修正後、再度 `/sdd-codex-review {{PHASE}} {{FEATURE_NAME}}` を実行してください

### Codexの提案

{{CODEX_SUGGESTIONS}}
```

### Codex呼び出しエラー

```markdown
## Codexレビュー: エラー発生

### エラー内容
{{ERROR_MESSAGE}}

### トラブルシューティング

1. `codex` CLIがインストールされているか確認：
   \`\`\`bash
   which codex
   \`\`\`

2. 認証状態を確認：
   \`\`\`bash
   codex auth status
   \`\`\`

3. 手動でレビューを実行：
   \`\`\`bash
   codex exec --full-auto "レビュー依頼..."
   \`\`\`
```

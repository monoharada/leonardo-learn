# コンテキスト節約モード

**このスキルは、Codexレビュー実行時に自動的にコンテキスト節約を行います。**

オプション指定は不要。Claude Codeが自律的に判断して実行します。

---

## 自律的な動作フロー

```
[状態保存] → [バックグラウンド実行] → [圧縮提案] → [結果取得・復元] → [クリーンアップ]
```

---

## Step 1: 状態保存（自動）

レビュー開始前に自動実行：

```bash
mkdir -p .context

cat > .context/sdd-review-state.json << STATEEOF
{
  "feature_name": "[FEATURE]",
  "phase": "[PHASE]",
  "spec_path": ".kiro/specs/[FEATURE]/",
  "started_at": "[TIMESTAMP]",
  "restore_hints": {
    "spec_json": ".kiro/specs/[FEATURE]/spec.json",
    "steering": ".kiro/steering/"
  }
}
STATEEOF
```

---

## Step 2: バックグラウンド実行

```python
result = Bash(
    command='codex exec --sandbox read-only "[プロンプト]"',
    run_in_background=True
)
task_id = result.task_id
```

---

## Step 3: ユーザー通知

レビュー開始後、以下を表示：

```markdown
## Codexレビューをバックグラウンドで実行中

| 項目 | 値 |
|------|-----|
| フェーズ | [PHASE] |
| フィーチャー | [FEATURE] |
| タスクID | [TASK_ID] |

### コンテキスト節約の選択肢

1. **圧縮する**（推奨）- 「圧縮して」と言う
2. **別作業を続ける** - 他のファイル確認・編集
3. **待機する** - このまま待つ

結果は自動取得・処理します。
```

---

## Step 4: コンテキスト圧縮（オプション）

ユーザーが「圧縮して」と言った場合：

1. セッション要約を生成
2. `.context/session-summary.md`に保存
3. 通知を表示

---

## Step 5: 結果取得と自動復元

```python
# 結果取得（最大5分待機）
result = TaskOutput(task_id=task_id, block=True, timeout=300000)

# 状態復元
state = read(".context/sdd-review-state.json")
spec_json = read(state.restore_hints.spec_json)

# 圧縮していた場合はsteering/を再読み込み
if context_was_compressed:
    read_all(state.restore_hints.steering)

# 通常のレビュー後処理を継続
```

---

## Step 6: クリーンアップ（自動）

レビュー正常完了後：

```bash
rm .context/sdd-review-state.json
rm -f .context/session-summary.md
```

---

## セッション再開時の自動復元

`.context/sdd-review-state.json`が存在する場合：

```markdown
## 前回のレビューが中断されています

| 項目 | 値 |
|------|-----|
| フィーチャー | [FEATURE] |
| フェーズ | [PHASE] |
| 開始時刻 | [TIMESTAMP] |

選択してください：
1. 結果を確認して続行
2. 最初からやり直す
3. キャンセル
```

---

## エラーハンドリング

### タスクID無効（セッション終了）

```markdown
バックグラウンドタスクが見つかりません。
状態ファイルから復元して、レビューを再実行しますか？
```

### Codex実行エラー

```markdown
Codexの実行でエラーが発生しました。
エラー: [ERROR_MESSAGE]
リトライしますか？（3回まで可能）
```

---

## 注意事項

1. **シミュレート禁止は維持** - 必ずCodex CLIを実行、Session IDを報告
2. **自動実行が基本** - ユーザーオプション不要
3. **状態ファイルは一時的** - 完了後は自動削除、永続情報はspec.jsonに記録

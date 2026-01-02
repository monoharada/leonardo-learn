# 規模別レビュー戦略

implフェーズでは、変更規模に応じてレビュー戦略を自動選択します。

---

## 規模判定

### 判定コマンド

```bash
git diff main..HEAD --stat
git diff main..HEAD --name-status --find-renames
```

### 規模基準

| 規模 | ファイル数 | 変更行数 | 戦略 |
|------|-----------|---------|------|
| small | ≤3 | ≤100 | diff のみ |
| medium | 4-10 | 100-500 | arch → diff |
| large | >10 | >500 | arch → diff並列 → cross-check |

---

## small（≤3ファイル、≤100行）

シンプルなdiffレビュー。通常のimplレビューフローを実行。

```
[diff review] → [verdict] → [完了 or 修正ループ]
```

---

## medium（4-10ファイル、100-500行）

### フロー

```
[archフェーズ] → [diffフェーズ] → [完了 or 修正ループ]
```

### archフェーズ

アーキテクチャ整合性確認：
- 依存関係の妥当性
- 責務分割
- 破壊的変更
- セキュリティ設計

### archプロンプト

```
以下の変更のアーキテクチャ整合性をレビューせよ。出力はJSON1つのみ。

これはレビューゲートとして実行されている。blockingが1件でもあればok: falseとし、
修正→再レビューで収束させる前提で指摘せよ。

diff_range: HEAD
観点: 依存関係、責務分割、破壊的変更、セキュリティ設計
前回メモ: {{NOTES_FOR_NEXT_REVIEW}}
```

---

## large（>10ファイル、>500行）

### フロー

```
[archフェーズ]
    │
    ▼ ok: true
[ファイル分割] → 3-5グループに分割
    │
    ├─ Group 1: src/components/
    ├─ Group 2: src/services/
    ├─ Group 3: src/utils/
    └─ Group 4: tests/
    │
    ▼
[並列diffレビュー] → 各グループを並列実行
    │
    ▼
[結果統合]
    │
    ▼
[cross-checkフェーズ] → 横断的整合性確認
    │
    ▼
[完了 or 修正ループ]
```

---

## 並列レビュー詳細

### 分割ルール

| パラメータ | 値 | 説明 |
|-----------|-----|------|
| parallelism | 3-5 | 同時実行サブエージェント数 |
| max_files_per_group | 5 | 1グループあたり最大ファイル数 |
| max_lines_per_group | 300 | 1グループあたり最大行数 |
| split_by | directory | 分割単位（ディレクトリ優先） |

### 分割アルゴリズム

1. ディレクトリ単位でファイルをグループ化
2. 各グループが上限を超えないよう調整
3. 小さすぎるグループは隣接グループとマージ
4. cross-cutting concernsはcross-checkで検出

### 並列diffプロンプト

```
以下の変更をレビューせよ。出力はJSON1つのみ。

diff_range: HEAD
対象: {{TARGET_FILES}}
観点: {{REVIEW_FOCUS}}
前回メモ: {{NOTES_FOR_NEXT_REVIEW}}
```

---

## cross-checkフェーズ

並列レビュー結果を統合し、横断的な問題を検出。

### cross-checkプロンプト

```
並列レビュー結果を統合し横断レビューせよ。出力はJSON1つのみ。

全体stat: {{STAT_OUTPUT}}
各グループ結果: {{GROUP_JSONS}}
観点: interface整合、error handling一貫性、認可、API互換、テスト網羅
```

### 結果統合処理

1. 全グループの`issues`を集約
2. 重複する指摘をマージ
3. `blocking`件数を合計
4. 1件でも`blocking`があれば全体として`ok: false`
5. 統合結果をcross-checkに渡す

---

## エラーハンドリング

### リトライ戦略

| エラー | 対応 |
|--------|------|
| 通常エラー | 1回リトライ |
| タイムアウト | ファイル数を半分に分割してリトライ |
| 再失敗 | 該当ファイル群を「未レビュー」として記録 |

### スキップ時の処理

- **archスキップ時**: diffのみで続行
- **diffスキップ時**: そのファイル群を「未レビュー」としてレポート
- 未レビューファイルは手動確認推奨

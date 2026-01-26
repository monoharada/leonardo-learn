# CVD混同判定まわりのコード簡素化

## 目標
CVD混同リスク（ΔEOKしきい値 3.5/5.0）切替と、その周辺（要約/バッジ/アクセシビリティビュー）の実装を、**挙動を変えずに**読みやすく・重複少なくする。

## 背景
- しきい値切替（3.5/5.0）導入により、`parse/format` や `sortColorsWithValidation` 利用が散在してコードが肥大化。
- 特に `accessibility-view.ts` で「並べ替え結果だけ欲しい」箇所でも検証込みAPIを呼んでおり、意図が読み取りづらい。

## スコープ
- やること：
  - しきい値の `parse/format` を共通化して重複を削減
  - `accessibility-view.ts` で「ソートだけ」用途は検証なしのソートに切り替え（可読性UP）
  - 既存テストを保ちつつ必要なら最小限の回帰テスト追加
- やらないこと：
  - しきい値の意味/値（3.5/5.0）やUI文言・表示仕様の変更
  - CVD検出アルゴリズムの仕様変更（件数が変わるような変更）

## 前提 / 制約
- 既定は 3.5、切替で 5.0 を表示（同時併記しない）を維持
- `localStorage` キー `leonardo-cvdConfusionThreshold` は維持
- `src/accessibility/distinguishability.ts` の既定定数 `DISTINGUISHABILITY_THRESHOLD = 5.0` はそのまま（デモのUI閾値とは別）

## 変更内容（案）
### データ / バックエンド
- `src/ui/demo/utils/cvd-confusion-threshold.ts` を作り、以下を集約
  - `parseCvdConfusionThreshold(value): 3.5|5.0|null`
  - `formatCvdConfusionThreshold(threshold): string`
- `src/ui/demo/state.ts` と `src/ui/demo/cvd-controls.ts` はその共通関数を利用して重複削減

### UI / UX
- 見た目・配置・文言は変更なし（内部整理のみ）

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/accessibility-view.ts` の以下を整理
  - `getColorNameDistanceInSort` / `focusCvdComparisonIssue` の「ソートだけ」用途は `sortByHue/sortByDeltaE/sortByLightness` を直接使う or ローカル `sortNamedColors(colors, sortType)` を作って一本化
  - 「検証が必要」な箇所だけ `sortColorsWithValidation(..., { threshold })` を使う、という構造に揃える

## 受入基準
- [ ] `bun test` が通る
- [ ] `bun run build` が通る
- [ ] しきい値切替（3.5/5.0）が Studio要約/右ドロワーのバッジ/アクセシビリティビューの警告・説明文に連動する
- [ ] 並べ替え表示・フォーカス（該当ペアへスクロール等）の挙動が変わらない

## リスク / エッジケース
- `sortColorsWithValidation` から直接ソート関数に切り替える際、ソート種別の対応ミスで順序が変わるリスク
- `parse/format` 共通化で import 先が増え、循環依存を作るリスク（置き場所に注意）

## 作業項目（Action items）
1. 「しきい値 parse/format」が存在する箇所を洗い出し（完了条件: 対象ファイル/関数の一覧ができる）
2. `cvd-confusion-threshold` ユーティリティを追加（完了条件: `parse/format` が1箇所に集約）
3. `state.ts` / `cvd-controls.ts` を共通関数利用に置換（完了条件: 重複ロジック削除・型は維持）
4. `accessibility-view.ts` の「ソートだけ」用途を軽量化（完了条件: 検証不要箇所で `sortColorsWithValidation` を呼ばない）
5. 既存テストを更新（必要なら追加）して意図を固定（完了条件: 変更に伴うテスト修正が最小で通る）
6. `bun test` 実行（完了条件: 全テストpass）
7. `bun run build` 実行（完了条件: build成功）

## テスト計画
- 自動: `bun test` / `bun run build`
- 手動: デモで 3.5/5.0 を切り替え、`ΔE 4.5` が 3.5 では警告なし・5.0 では警告ありになることを確認

## オープンクエスチョン
該当なし（承認時に「このブランチで行ったことの簡素化」を優先して進める方針で合意）


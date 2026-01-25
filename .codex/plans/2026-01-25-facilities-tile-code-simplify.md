# 手続き案内（カテゴリタイル）周辺コードの簡素化（挙動維持）

Date: 2026-01-25
Scope: `src/ui/demo/views/palette-preview.ts` / `src/ui/styles/components.css` / `src/ui/demo/views/palette-preview.test.ts`

## 目標
- 「手続き案内」タイル（カテゴリ導線）の実装を、**挙動は変えずに**読みやすく・小さくする
- 重複（JSDOMセットアップ、CSSの同一指定、タイル生成処理）を削減する

## 背景
- UI反復の中で、同じ処理が複数箇所に現れ保守コストが上がっている
- データ（ラベル）に `<wbr>` を混ぜると意図が読み取りづらい

## スコープ
- やること：
  - タイル生成処理の整理（定数化 / `replaceChildren` / ラベル折返しヘルパー化）
  - Facilities タイルCSSの重複削減（親に幅集約、状態ルールを最小化）
  - テストのJSDOM globals セットアップを共通化
- やらないこと：
  - 見た目の変更、文言変更、DOM構造の変更、依存追加

## 前提 / 制約
- 簡素化は「手続き案内タイル周辺の3ファイル」に限定（ユーザー合意）
- DADSの `:focus-visible` 視認性は維持（クリップさせない）

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/ui/demo/views/palette-preview.ts`
  - アクセント判定を簡潔化
  - DOM更新を `replaceChildren` に統一
  - ラベルはプレーンテキストに戻し、描画時に `・` の直後へ `<wbr>` を差し込む
- `src/ui/styles/components.css`
  - 幅指定を親（リンク）に集約し、子要素は `width: 100%`
  - `:visited/:active` など重複する指定を削減（`:any-link` で担保）

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/palette-preview.test.ts`
  - JSDOM globals 差し替えの重複をヘルパー化

## 受入基準
- [ ] タイルのDOM要件（`a.preview-facility-tile` / `__box` / `__icon` / `__label`）が維持される
- [ ] ラベル表示（折返しヒント含む）とテストの期待値が維持される
- [ ] `bun test` がパスする

## リスク / エッジケース
- CSSの状態ルール削減で visited/hover 表現が戻る可能性（→ `:any-link` の詳細度で担保）
- ラベル折返しの実装変更で `textContent` が変わる可能性（→ テストで担保）

## 作業項目（Action items）
1. Plan保存（完了条件: 本ファイルが `.codex/plans/` に存在）
2. TS簡素化（完了条件: タイル生成が短く読みやすい）
3. CSS簡素化（完了条件: 重複プロパティが減る）
4. テスト簡素化（完了条件: JSDOMセットアップ重複が解消）
5. `bun test`（完了条件: 全テストパス）


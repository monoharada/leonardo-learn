# 未コミット差分（palette-preview周り）のコード簡素化

## 目標
- `palette-preview` 周辺の差分を、**挙動を変えずに** 重複・冗長さを減らして読みやすくする（特にテストの重複削減）。

## 背景
- 現在の未コミット差分は以下（`git status` 時点）:
  - `src/ui/demo/assets/illustration-people.svg`
  - `src/ui/demo/views/palette-preview.test.ts`
  - `src/ui/demo/views/palette-preview.ts`
  - `src/ui/styles/components.css`
- `palette-preview.test.ts` に同形の `mockColors` / `getDisplayHex` / `createPalettePreview` 呼び出しが複数回出ており、保守コストが上がりやすい。

## スコープ
- やること：
  - **このワークツリーで手を入れているファイル**（特にブラウザへ配信され得るTS/CSS/SVG）を対象に、挙動維持で簡素化する
  - テストについても、**挙動維持**の範囲でヘルパー導入・`describe` 整理を行う
  - `bun test` / `bun run type-check` / `bun run lint` が通る状態を維持
- やらないこと：
  - 仕様追加、依存追加、広域リネーム、無関係ファイルへの波及、ロックファイル更新

## 前提 / 制約
- 既存ユーティリティが見つからない場合は、共通化は **ファイル内ローカルヘルパー** に留める（新規共通ファイルの追加は原則しない）。
- 変更は最小限・レビューしやすく（不要な整形/リネームを避ける）。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- 該当なし（レイアウト・文言・色の意味は変えない）

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/palette-preview.test.ts`
  - `PalettePreviewColors` のベース生成ヘルパー化（重複削減）
  - `createPalettePreview` 呼び出しとCSS変数取得のヘルパー化
  - JSDOMセットアップのノイズ削減
  - `describe` 構造を整理（読む順序を自然に）
- `src/ui/demo/views/palette-preview.ts`
  - `getDisplayHex` 適用の重複を避け、表示色を単一ソースで扱う箇所を明確化
  - イラスト用CSS変数設定の見通し改善（同じ値の二重計算/二重取得を避ける）
- `src/ui/styles/components.css`
  - hover/focus-within 等の重複宣言を可能な範囲でまとめる（見た目は不変）
  - セレクタの冗長さを軽減（既存の書き方に合わせる）
- `src/ui/demo/assets/illustration-people.svg`
  - 原則変更なし（既に `--iv-*` 化済みのため、必要があれば最小限）

## 受入基準
- [ ] 対象は「このワークツリーで編集しているファイル」に限定されている
- [ ] `palette-preview.test.ts` の重複が減り、同等の検証を維持している
- [ ] `bun run lint` が通る
- [ ] `bun run type-check` が通る
- [ ] `bun test` が通る

## リスク / エッジケース
- CVDモードで **表示色（getDisplayHex後）** と **元色** を取り違えると、`--preview-illustration-bg` と `--iv-background` の一致が崩れる。
- テストの共通化で意図が不明瞭になると退行を見逃しやすい（共通化しすぎ注意）。
- JSDOMのグローバル差し替え範囲を誤ると他テストに影響する可能性。

## 作業項目（Action items）
1. 対象ファイルを確定（完了条件: `git status` を確認し、編集対象を列挙できる）
2. `palette-preview.test.ts` の重複箇所をヘルパー化（完了条件: 重複 `mockColors` 等が消える）
3. テストの `describe` を整理（完了条件: 読む順序が自然で、意図が保たれる）
4. `palette-preview.ts` の局所整理（完了条件: ロジック同一で見通しが良くなる）
5. `components.css` の重複整理（完了条件: 見た目不変で重複が減る）
6. `bun run lint`（完了条件: エラー0）
7. `bun run type-check`（完了条件: エラー0）
8. `bun test`（完了条件: 失敗0）

## テスト計画
- `bun run lint`
- `bun run type-check`
- `bun test`


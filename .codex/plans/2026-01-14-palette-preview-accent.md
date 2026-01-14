# パレットビュー: preview-kv の拡大 + アクセント色を最低1色保証

## Context
- パレットビューの「カラープレビュー」は `src/ui/demo/views/palette-view.ts` で `createPalettePreview()`（`src/ui/demo/views/palette-preview.ts`）を使って描画している。
- ヒーロー右側のキービジュアルは `preview-kv`（CSS: `src/ui/styles/components.css`）でサイズが制御されている。
- 現状 `state.palettes` に `Accent*` が無い場合、トークン一覧（Primary/Accent表示）にアクセントが出ない可能性がある。

## Scope
- やること：
  - `preview-kv` を大きくする（幅上限を引き上げ、カラム内の余白を減らす）
  - `Accent*` が無い場合でも、最低1色のアクセントをトークン一覧とプレビューで使えるようにする（Secondaryを流用）
  - 最小限のテスト更新
- やらないこと：
  - プレビュー全体の大規模リレイアウト
  - アクセント候補生成アルゴリズムの刷新

## Decisions (approved)
- 「左の画像」＝ `preview-kv` を拡大する。
- `Accent*` が無い場合、アクセントとして `Secondary` を流用してOK（ただし本来ロジック上はアクセントが必ず存在する想定）。

## Action items
1. `src/ui/styles/components.css` の `.preview-kv` を拡大（上限値を 360px → 480px 程度へ）
2. `src/ui/demo/views/palette-view.ts` で、アクセントHEXの解決ロジックを追加
   - 優先順: `Accent*` → `Secondary*` → 既存フォールバック
3. `extractPreviewColors()` と `extractPaletteTokenRows()` に上記ロジックを適用し、アクセントが最低1色必ず表示されるようにする
4. テストを最小更新（差分ファイル中心）

## Test plan
- `bun run type-check`
- `bun test`
- `bunx biome lint src/ui/styles/components.css src/ui/demo/views/palette-view.ts src/ui/demo/views/palette-view.test.ts`


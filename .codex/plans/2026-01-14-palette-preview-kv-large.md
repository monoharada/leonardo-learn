# パレットビュー: preview-kv を大きく（4:3）+ 色の「薄め」をやめる

## Context
- パレットビューのカラープレビュー（擬似サイト）内のキービジュアルは `preview-kv`（`src/ui/demo/views/palette-preview.ts`）で描画される。
- `preview-kv` のサイズとレイアウトは `src/ui/styles/components.css` の `.preview-hero__layout` と `.preview-kv` が支配する。
- 現状 `preview-kv` の primary/accent の装飾要素は `opacity` により半透明で、合成色として「薄く」見える。

## Scope
- やること：
  - `preview-kv` を 4:3 のまま横幅をさらに大きくする
  - 右カラム（ビジュアル側）が確保されるように、ヒーローの2カラム比率を調整する
  - `opacity`（半透明）による色の薄めをやめ、実色のまま表示する
- やらないこと：
  - プレビュー全体の大規模リレイアウト
  - 色生成ロジック（OKLCH変換等）の変更

## Decisions (approved)
- `preview-kv` は 4:3 を維持しつつ大きくする。
- キーカラー/アクセントカラーを半透明で「薄めて」見せるのはやめる。

## Action items
1. `src/ui/styles/components.css` の `.preview-hero__layout` の `grid-template-columns` を調整し、右カラムを広げる
2. `src/ui/styles/components.css` の `.preview-kv` の最大幅を増やす
3. `src/ui/styles/components.css` の `preview-kv` 内装飾要素の `opacity`（必要なら彩度フィルタも）を撤廃する
4. `bun run type-check` / `bun test` を実行し、差分の整合性を確認する

## Test plan
- `bun run type-check`
- `bun test`
- `bunx biome lint src/ui/styles/components.css`


# Export（CSS/Tailwind）にDADSセマンティックトークンを含める

## 目標
- Export の **CSS / Tailwind** に DADS の **semantic/link（Success/Error/Warning/Link）** を含める。
- Tailwind はよくあるパターンとして **ネスト + DEFAULT** を採用し、`text-success` 等で扱える形にする。

## 背景
- 現状 `getExportContent("json")` のみ semantic/link を追加しているが、`css/tailwind` は `generateExportColors()` のみで出力している（`src/ui/demo/export-handlers.ts`）。

## スコープ
- やること：
  - CSS/Tailwind の export 出力に semantic/link を追加。
  - Warning パターン（YL/OR/auto）を反映しつつ、キー名は固定（値のみ切替）。
  - Exportダイアログのプレビュー/Copy/Download と（存在する場合）直接DL経路も同じ内容に揃える。
- やらないこと：
  - JSON（DTCG）構造の変更（`semantic` / `link` のトップレベルは維持）。
  - 既存の palette token（`primary-50` 等）のキー構造変更。
  - DADS accent トークンの追加。

## 前提 / 制約
- DADS token キャッシュ（`loadDadsTokens()`）が無い場合は、semantic/link を追加せずに継続（例外にしない）。
- 追加するキー（CSSは `--color-` プレフィックスで出力）：
  - Success: `success`, `success-strong`
  - Error: `error`, `error-strong`
  - Warning: `warning`, `warning-strong`（YL/OR/auto に応じて値が切替）
  - Link: `link`, `link-visited`, `link-active`
- Tailwind はネスト + DEFAULT を採用：
  - `success: { DEFAULT, strong }`
  - `error: { DEFAULT, strong }`
  - `warning: { DEFAULT, strong }`
  - `link: { DEFAULT, visited, active }`

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/ui/demo/export-handlers.ts`
  - palette の export colors に semantic/link colors を merge して CSS/Tailwind に渡す。
  - Tailwind 用は semantic/link をネスト構造で追加する。
  - 直接DL経路（存在する場合）も `getExportContent()` を利用して統一する。
- `src/core/export/dtcg-exporter.ts`
  - DADS semantic/link の **Color値** を同期的に返すヘルパーを追加し、JSONとCSS/Tailwindで共通利用できるようにする。

### その他（Docs/Marketing/Infra など）
- 該当なし

## 受入基準
- [ ] Export の CSS に `--color-success` / `--color-error` / `--color-warning` / `--color-link` が含まれる。
- [ ] Export の Tailwind に `success.DEFAULT` / `success.strong` 等が含まれる（`DEFAULT` がある）。
- [ ] Warning パターン変更で `warning*` の値が切替わる（キーは固定）。
- [ ] DADS token 未ロード時でも例外が出ず、既存 palette export は継続する。
- [ ] フォーマット切替・Copy/Download の既存挙動が壊れない。

## リスク / エッジケース
- 追加キーがユーザー定義パレット名と衝突する可能性（低いがゼロではない）。
- DADS token のロード失敗時は semantic/link が空になり得るが、export 自体は継続する必要がある。

## 作業項目（Action items）
1. DADS semantic/link を Color で取得する同期ヘルパーを追加（完了条件: キャッシュ無しで `{}`、有りで color を返す）
2. CSS export に semantic/link のフラットキーを merge（完了条件: `--color-success` 等が出力に含まれる）
3. Tailwind export に semantic/link をネスト（DEFAULT付き）で追加（完了条件: config に `success: { DEFAULT: ... }` が含まれる）
4. 直接DL経路も `getExportContent()` に寄せて統一（完了条件: dialog/直DLで内容が一致する）
5. `src/ui/demo/export-handlers.test.ts` に CSS/Tailwind の追加テスト（完了条件: semantic/link のキー存在を検証）
6. `bun test src/ui/demo/export-handlers.test.ts` と `bun run type-check`（完了条件: green）

## テスト計画
- `bun test src/ui/demo/export-handlers.test.ts`
- `bun run type-check`

## オープンクエスチョン
- なし


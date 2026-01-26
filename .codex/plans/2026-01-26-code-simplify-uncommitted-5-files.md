# 未コミット差分（5ファイル）のコード簡素化（buildDadsPreviewMarkup含む）

## 目標
- 現在の未コミット差分（5ファイル）を対象に、**挙動・見た目を変えず**に重複/冗長さを減らして読みやすくする。
- `buildDadsPreviewMarkup()` の巨大なテンプレ文字列を、同一マークアップを保ったまま分割して保守しやすくする。

## 背景
- `git status` 上の未コミット差分:
  - `src/ui/demo/views/palette-preview.ts`
  - `src/ui/demo/views/studio-view.ts`
  - `src/ui/styles/app-components.css`
  - `src/ui/styles/components.css`
  - `src/ui/styles/dads-html-preview.css`
- 既に差分が存在するため、今回のゴールは「その差分を前提に、読みやすさ/重複の削減」を行うこと。

## スコープ
- やること：
  - 上記5ファイルに限定して、挙動維持の範囲でローカルヘルパー化/単一ソース化/分割整理を行う
  - `buildDadsPreviewMarkup()` をセクション毎の関数へ分割し、最終的な出力HTMLは同一に保つ
  - `bun run lint` / `bun run type-check` / `bun test` が通ることを担保する
- やらないこと：
  - 仕様追加、依存追加、ロックファイル更新、広域リネーム、全体フォーマット、無関係ファイルへの波及

## 前提 / 制約
- 既存ユーティリティが見つからない場合、共通化は**ファイル内ローカル関数**に留める（新規共通ファイルは原則作らない）。
- `buildDadsPreviewMarkup()` の分割により差分が大きくなりやすいので、**マークアップの内容（タグ/属性/テキスト）は維持**し、変更は構造整理に限定する。
- Biome の既存スタイル（タブインデント等）を維持する。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- 該当なし（見た目・文言・セマンティクスは現状差分のまま維持）

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/palette-preview.ts`
  - `buildDadsPreviewMarkup()` をセクション毎のローカル関数（例: header/hero/twocol/facilities/...）に分割し、最終的に連結して返す形へ整理
  - `getPropertyValue(...).trim() || getDisplayHex(...)` の繰り返しをローカルヘルパー化して単一ソース化
- `src/ui/demo/views/studio-view.ts`
  - a11y要約の「対象HEX配列」を単一ソース化し、`namedColors` と `failCount` の重複を削減（結果は同一）
- `src/ui/styles/*.css`
  - 追加の簡素化は、**見た目不変が確実な範囲のみ**（不要なら触らない）

## 受入基準
- [ ] 変更対象が `git diff` の5ファイルに限定されている
- [ ] `buildDadsPreviewMarkup()` の出力マークアップ（要素/属性/文言）が実質同一である
- [ ] `palette-preview.ts` のCSS変数取得/フォールバックの挙動が同一である
- [ ] `studio-view.ts` のa11y要約（Fail数/CVDペア数）が同一である
- [ ] `bun run lint` が通る
- [ ] `bun run type-check` が通る
- [ ] `bun test` が通る

## リスク / エッジケース
- `buildDadsPreviewMarkup()` 分割時に、微妙な閉じタグ漏れ/属性抜けでDOMが変わるリスク（テストと目視で検知）。
- `getPropertyValue()` の戻りが空のケースでフォールバックHEXを取り違えると表示色がズレる。
- a11y集計の単一ソース化で、表示用HEXと元HEXを混同すると判定が変わりうる（元HEXのまま集計する）。

## 作業項目（Action items）
1. 対象ファイルを確定（完了条件: 5ファイルで固定できている）
2. 既存ユーティリティ探索（完了条件: 採用可否を判断できる）
3. `buildDadsPreviewMarkup()` を分割整理（完了条件: 読みやすくなり、出力は同一）
4. `palette-preview.ts` の表示色取得ロジックをヘルパー化（完了条件: 重複が減り、挙動同一）
5. `studio-view.ts` のa11y集計を単一ソース化（完了条件: 重複が減り、結果同一）
6. CSS差分の簡素化要否を判断/最小適用（完了条件: 見た目不変で差分が減る、または触らない判断ができる）
7. `bun run lint`（完了条件: エラー0）
8. `bun run type-check`（完了条件: エラー0）
9. `bun test`（完了条件: 失敗0）

## テスト計画
- `bun run lint`
- `bun run type-check`
- `bun test`

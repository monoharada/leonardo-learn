# Facilities タイルリンク周辺の修正対応（安全性・テスト安定性・レスポンシブ順序）

Date: 2026-01-25
Branch: `monoharada/montreal`

## 目標
- Facilities タイルのラベル生成で `innerHTML` に依存しない（将来ラベルが動的でもXSS/崩れの足場を作らない）
- `withJSDOMGlobals()` を async でも安全にし、グローバル汚染・リークを確実に防ぐ
- Facilities セクションのモバイル表示順を「見出し → 左本文 → グリッド」に揃える
- ラベルが想定外の文字列でもはみ出しにくい最低限の折返しフォールバックを入れる
- 既存の見た目・a11y（特に `:focus-visible`）は維持する

## 背景
- 現状はラベルに `<wbr>` を入れるため HTML 文字列を `innerHTML` へ流しており、将来データ化したときに危険/読みづらい実装になりやすい。
- テスト側の JSDOM グローバル差し替えは改善済みだが、helper が sync 前提で将来の async 化で不安定化しうる。
- Facilities のモバイル時 `grid-template-areas` により、DOM順と表示順がズレる可能性がある。

## スコープ
- やること：
  - `src/ui/demo/views/palette-preview.ts` の Facilities タイル生成を DOM API ベースに寄せ、ラベル（`・` の直後 `<wbr>`）を安全に挿入する
  - `src/ui/demo/views/palette-preview.test.ts` の JSDOM globals helper を async-safe + close 対応し、必要なら関連テストを最小修正する
  - `src/ui/styles/components.css` の Facilities セクションに、モバイル表示順の調整とラベル折返しの保険を入れる
- やらないこと：
  - ルーティング/遷移先の実装
  - Facilities の大幅なデザイン変更（新コンポーネント化、構造大改修）
  - 依存追加

## 前提 / 制約
- 見た目の変更は最小限（今回の目的は“安全性/安定性/順序”の改善）
- DADS の `:focus-visible` は見切れさせない（`overflow` / `border-radius` / `outline-offset` に注意）
- ラベルは将来的に動的になっても安全になる実装を前提にする（文字列を HTML として扱わない）

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/ui/demo/views/palette-preview.ts`
  - ラベルの `<wbr>` 挿入は HTML 文字列ではなく DOM ノード（Text + `<wbr>`）で行う
  - Facilities タイルは `createElement` + `append` で組み立て、ラベルは常に text として扱う
- `src/ui/styles/components.css`
  - Facilities のモバイル表示順を「見出し → 左本文 → グリッド」へ調整
  - `.preview-facility-tile__label` に折返しフォールバック（はみ出し防止）を追加

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/views/palette-preview.test.ts`
  - `withJSDOMGlobals()` を async-safe に（Promiseでも restore を保証）
  - restore 時に `dom.window.close()` を呼ぶ
  - Facilities のラベルに `<wbr>` が挿入されていることを DOM で担保

## 受入基準
- [ ] Facilities タイルのラベルが HTML 文字列経由で挿入されない（将来の動的化でも安全）
- [ ] `・` を含むラベルで `<wbr>` が DOM 要素として挿入され、折返しヒントが維持される
- [ ] Facilities セクションのモバイル表示順が「見出し → 左本文 → グリッド」になっている
- [ ] ラベルが長い/区切りが少ない場合でも、はみ出しが発生しにくい（最低限のフォールバックが効く）
- [ ] `bun test` がパスする
- [ ] `bun run lint` と `bun run type-check` がパスする

## リスク / エッジケース
- DOM組み立てに寄せることで、微小な空白/改行の差が出てテストが落ちる（→ テストは textContent/DOM 検査中心にして安定化）
- `overflow-wrap` 追加でラベルの改行位置が変わる（→ “はみ出し防止”に限定して影響を最小化）

## 作業項目（Action items）
1. Planを保存（完了条件: 本ファイルが `.codex/plans/` に存在）
2. Facilities のモバイル表示順をCSSで修正（完了条件: モバイルで「見出し → 左本文 → グリッド」）
3. ラベル `<wbr>` を DOM ノードで挿入する helper を実装（完了条件: `innerHTML` にラベル文字列を流さない）
4. Facilities タイル生成を DOM API ベースに整理（完了条件: タイルDOM要件を満たし、読みやすい）
5. ラベル折返しフォールバックを追加（完了条件: はみ出しにくい）
6. JSDOM globals helper を async-safe + close 対応（完了条件: Promiseでも restore が保証される）
7. `<wbr>` 挿入をテストで担保（完了条件: DOM上で `wbr` の存在を検証）
8. `bun test` / `bun run lint` / `bun run type-check`（完了条件: 全てパス）

## テスト計画
- `bun test`
- `bun run lint`
- `bun run type-check`
- 目視: Facilities のタイル表示（PC/モバイル）、Tab移動時の `:focus-visible` 見切れ

## オープンクエスチョン
- 該当なし（モバイル順: 「見出し → 左本文 → グリッド」で確定）


# FB対応プラン（monoharada/e2e-failures）

## 目標
- 指摘点（軽微な可読性/安全性/意図の明文化）を潰し、**挙動を変えずに**レビュー通過しやすい状態にする
- `bun test` / `bun run type-check` / `bun run lint` / `bun run build` / `bun run test:e2e` を維持

## 対象（指摘箇所）
1. `src/core/key-color-derivation/deriver.ts:309`
   - sort条件が読み取りづらい（実質 `a.contrast - b.contrast` だが意図が見えにくい）
2. `src/ui/demo/color-detail-modal.ts:118`
   - 「適用完了」フィードバックの `setTimeout` が、モーダルclose/reopenや連打で競合し得る（タイマーがabortされない）
3. `src/ui/semantic-role/semantic-role-overlay.ts:117`
   - DADS semantic/link-onlyを円形化しない仕様変更が“意図”としてコード上で分かりにくい（将来の巻き戻しリスク）

## 方針
- 仕様変更はしない（見た目/DOM/文言は維持）
- 「読みやすさ」「close時のクリーンアップ」「仕様意図の固定（コメント or テスト）」に限定して最小差分

## 変更内容（案）
### 1) `deriver.ts`（可読性）
- `meetsTarget.sort(...)` の比較式を、意図が分かる形に書き換える
  - 例: `(a.contrast - targetContrast) - (b.contrast - targetContrast)` の形に戻す（または同値変形したうえでコメント補強）
- 並び順（挙動）が変わらないことを確認（同率時の `a.diff - b.diff` も維持）

### 2) `color-detail-modal.ts`（タイマー競合の封じ込み）
- 「適用完了」表示のタイマーを管理して、以下を保証する
  - 連打しても前のタイマーが後から上書きしない（開始前に `clearTimeout`）
  - モーダルclose時にタイマーを無効化/クリアし、ボタン状態を確実に初期化
  - タイマーコールバック内で `abortController.signal.aborted` を確認し、close後にDOMを書き換えない
- 追加の仕様変更はしない（表示時間1500msは維持）

### 3) `semantic-role-overlay.ts`（意図の明文化/固定）
- `shouldCircularize` の条件（brand harmonyがないと円形化しない）について、E2E仕様に合わせた意図コメントを追加
- 必要ならテストを1つだけ追加/補強（既存 `shades-view-integration.test.ts` の期待を根拠に、将来の巻き戻し防止）

## 受入基準
- [ ] `src/core/key-color-derivation/deriver.ts` の比較式が読みやすくなり、挙動は同一
- [ ] `src/ui/demo/color-detail-modal.ts` の「適用完了」表示が close/reopen・連打でも破綻しない（タイマー起因の復帰競合がない）
- [ ] `src/ui/semantic-role/semantic-role-overlay.ts` の仕様意図がコメント/テストで固定され、誤って戻されにくい
- [ ] `bun test` / `bun run type-check` / `bun run lint` / `bun run build` / `bun run test:e2e` がパス

## リスク / 注意点
- 2) はUIの“戻し”が変わりやすいので、close時の初期化で文言/クラスが過剰にリセットされないよう最小限にする
- 3) は仕様に踏み込むので、コメントは「E2E仕様に合わせる」程度に留め、ロジック自体は触らない

## 作業項目（Action items）
1. 対象箇所の修正内容を確定（同値変形/最小差分）
2. `color-detail-modal.ts` にタイマー管理（clear + close時reset + abortedガード）を追加
3. `deriver.ts` のsort比較式を可読化
4. `semantic-role-overlay.ts` に意図コメント（必要なら最小テスト補強）
5. 検証（`test/type-check/lint/build/e2e`）

## テスト計画
- `bun test`
- `bun run type-check`
- `bun run lint`
- `bun run build`
- `bun run test:e2e`（ローカルでポート競合がある場合は `E2E_PORT` を指定して実行）


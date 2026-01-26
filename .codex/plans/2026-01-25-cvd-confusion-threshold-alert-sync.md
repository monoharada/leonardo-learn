# アクセシビリティビューのアラートもしきい値(3.5/5.0)切替に連動させる

Date: 2026-01-25
Branch: `monoharada/cvd-snap-kbest`

## 目標

- 「混同判定 3.5 / 5.0」切替に合わせて、アクセシビリティビュー内のアラート（隣接境界/ΔEバッジ/!）もしきい値を連動させる
- 3.5選択時は ΔE=4.5 のような境界が警告扱いにならないようにする（スクショのケース）

## 背景

- 現状の隣接境界検証は `DISTINGUISHABILITY_THRESHOLD(=5.0)` 固定で判定している
  - `src/ui/accessibility/color-sorting.ts` の `validateBoundaries()` が固定しきい値で `isDistinguishable` を決める
  - `src/ui/demo/views/accessibility-view.ts` の説明文も “5.0未満” 固定
  - `detectColorConflicts(..., threshold)` の呼び出しも固定値を渡している
- そのため、ヘッダーで 3.5 を選んでもアラート表示だけ 5.0 基準のままになっている

## スコープ

- やること：
  - 隣接境界検証とシミュレーション帯の衝突検出、説明文を `state.cvdConfusionThreshold`（3.5/5.0）で統一する
- やらないこと：
  - ΔE計算式やCVDシミュレーション方式の変更
  - しきい値候補の追加（2択維持）

## 変更内容（案）

### データ / バックエンド

- `src/ui/accessibility/color-sorting.ts`
  - `validateBoundaries(colors, options?)` / `sortColorsWithValidation(colors, sortType, options?)` に threshold を追加（未指定時は従来どおり 5.0）

### UI / UX

- `src/ui/demo/views/accessibility-view.ts`
  - 隣接境界検証（表示/集計）に threshold を渡す
  - シミュレーション帯の衝突検出にも threshold を渡す
  - 説明文の「警告基準」を動的にし、現在の値（3.5/5.0）を表示する

## 受入基準

- [ ] しきい値=3.5 のとき、隣接境界の ΔE=4.5 が警告表示にならない
- [ ] しきい値=5.0 のとき、従来どおり ΔE<5.0 は警告表示になる
- [ ] アクセシビリティビューの説明文が 3.5/5.0 切替に追従する
- [ ] `bun test` / `bun run build` が通る

## 作業項目（Action items）

1. `color-sorting.ts` に threshold 引数を追加（完了条件: 互換性維持しつつ指定値で判定が変わる）
2. `accessibility-view.ts` に threshold を伝播（完了条件: UI警告が切替で変わる）
3. テスト更新（完了条件: 3.5/5.0で判定が反転するケースがテストされる）
4. `bun test` / `bun run build` 実行（完了条件: 両方pass）


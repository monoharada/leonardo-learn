# Review response: Studio生成のCVD閾値を固定（表示のみ切替）＋軽量化

Date: 2026-01-26
Branch: `monoharada/fix-ci-actions`

## 目標
- Studioのアクセント生成（DADSスナップ候補選択）は、しきい値スイッチ（`state.cvdConfusionThreshold`）と独立にする（=生成は固定しきい値）。
- その意図がコードから読めるようにし、将来デフォルトが変わっても意図が崩れないようにする。
- ついでに、候補探索の評価で不要なCVD計算を避けて軽量化する（挙動は変えない）。

## 背景（現状）
- `src/ui/demo/views/studio-view.ts` の `selectHarmonySnappedCandidates()` で、スコアリング用の `detectCvdConfusionPairs(namedColors)` が optionsなしで呼ばれており、暗黙に既定（=5.0）で評価される。
- 表示側（Studio要約 / バッジ / Accessibility view）は `state.cvdConfusionThreshold` で切り替わるように実装済み。
- 生成側までスイッチに追従させると、同一seedの再現性が変わる・体感性能が変わる可能性があるため、今回は表示のみ切替の方針とする。

## スコープ
### やること
- 生成側のCVDしきい値を固定値で明示し、`detectCvdConfusionPairs(..., { threshold })` を使用する
- `selectHarmonySnappedCandidates()` の評価処理に早期returnを入れて軽量化する（結果は不変）
- 回帰テストを追加して「生成はスイッチに影響されない」を固定する

### やらないこと
- スナップ候補探索の設計変更（beam search等）や係数調整
- しきい値候補追加やUI刷新

## 変更内容（案）
### 1) 生成側のしきい値を固定値で明示
- 対象: `src/ui/demo/views/studio-view.ts`
- 対応:
  - `GENERATION_CVD_CONFUSION_THRESHOLD = DISTINGUISHABILITY_THRESHOLD` を追加
  - `detectCvdConfusionPairs(namedColors, { threshold: GENERATION_CVD_CONFUSION_THRESHOLD })` に変更
  - コメントで「`state.cvdConfusionThreshold` は表示用。生成の再現性/安定性のため固定」と明記

### 2) 候補評価の軽量化（挙動不変の早期return）
- 対象: `src/ui/demo/views/studio-view.ts` の `evaluateCombo`
- 対応:
  - `baseScore`（CVD計算を除く項）を先に計算
  - `baseScore >= bestScore` の場合は `detectCvdConfusionPairs` を呼ばず return
  - ※ `cvdPairs.length` は常に非負なので、最終スコアは必ず `baseScore` 以上となり、早期returnしても最適解は変わらない

### 3) 回帰テスト追加（生成がスイッチに影響されない）
- 対象: `src/ui/demo/views/studio-view.accent-generation.test.ts`
- 追加テスト案:
  - `state.cvdConfusionThreshold=3.5` の状態でも、生成側が固定閾値で `detectCvdConfusionPairs(..., { threshold: 5.0 })` を呼ぶことを確認

## 受入基準
- [ ] Studio生成の結果が `state.cvdConfusionThreshold` に依存しない（テストで担保）
- [ ] コード上で「生成は固定しきい値」の意図が明示されている
- [ ] `bun test` が通る
- [ ] `bun run build` が通る

## テスト計画
- `bun test`
- `bun run build`


# CVD混同しきい値まわり レビュー指摘対応 Plan

## 目標
- 「混同判定」トグルの影響範囲（表示のみ/生成には影響しない）をユーザーに誤解なく伝える
- `findNearestDadsTokenCandidates(..., limit)` の `limit<=0` 時の挙動を期待どおりに整える
- `parseCvdConfusionThreshold` の入力受理を厳密化し、意図しない値を受け付けない
- `scripts/analyze-studio-cvd-confusion.ts` のブラウザ寄り依存（`palette-preview`）を解消し、スクリプトの結合/脆さを下げる
- 既存のテスト/ビルド成功を維持する（`bun test`, `bun run build`）

## 背景
- レビュー指摘は4点（①生成のしきい値固定とUIトグルの齟齬、②候補limitの下限1固定、③しきい値パースが緩い、④分析スクリプトが重いUIモジュールに依存）。
- 現状 `src/ui/demo/views/studio-view.ts` は「生成スコアは `DISTINGUISHABILITY_THRESHOLD(=5.0)` 固定、UIトグルは表示（要約/バッジ/a11y view）用」という設計をコードコメント＋テストで担保している。
- ただしUI上は「混同判定」ラベルのみで、ユーザーが“生成にも効く”と誤解しうる。

## スコープ
- やること：
  - UI文言（必要ならツールチップ）で「表示基準」であることを明確化
  - `parseCvdConfusionThreshold` を厳密化（例: `"3.5abc"` を拒否）
  - `findNearestDadsTokenCandidates` の `limit<=0` を `[]` にする（契約を自然に）
  - `createSeededRandom` を小さな util に抽出し、分析スクリプトの import を差し替える
  - 追加/更新テストで意図を固定し、既存テスト/ビルドを通す
- やらないこと：
  - 生成アルゴリズムの大幅変更（色選定ロジック/スコアリング再設計）
  - 依存追加
  - UIコンポーネントの大改修（デザイン刷新など）

## 前提 / 制約
- 前提: 生成の安定性（同seed/presetで結果が変わらない）を優先し、当面は「混同判定」トグルを“表示のみ”として維持する（※異なる方針なら別途計画修正）。
- 互換性: localStorage の保存値は `persistCvdConfusionThreshold` により `"5"` になりうるため、厳密化後も `"5"` と `"5.0"` の双方を受理する。
- 変更は最小限・レビューしやすさ優先（不要なリネーム/整形は避ける）。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `index.html` のラベルを「混同判定（表示）」等に変更し、必要なら `title` で「要約/バッジ/a11y表示の閾値。生成評価は固定(ΔE<5.0)」のツールチップを付与する。
- （任意）`src/ui/demo/views/studio-view.ts` の要約文言も「表示」ニュアンスを補強（例: `CVD混同リスク（表示 / ΔE<...）`）。

### その他（Docs/Marketing/Infra など）
- `src/ui/demo/utils/cvd-confusion-threshold.ts`：
  - `Number.parseFloat` をやめ、`value.trim()` の厳密一致（`"3.5"`, `"5"`, `"5.0"`）で `CvdConfusionThreshold` を返す。
- `src/ui/demo/utils/dads-snap.ts`：
  - `finalLimit` を `limit<=0` で `0` になるよう調整（`Number.isFinite` も併用し、NaNで壊れないようにする）。
- `src/ui/demo/utils/seeded-random.ts`（新規）：
  - `createSeededRandom(seed:number)` をここへ移動（DOM/SVG非依存）。
- `src/ui/demo/views/palette-preview.ts`：
  - `createSeededRandom` を util から import（既存API維持のため export は維持）。
- `src/ui/demo/views/studio-view-deps.ts`：
  - `createSeededRandom` の参照を util に寄せて、`palette-preview` 依存を少し軽くする（モック境界は維持）。
- `scripts/analyze-studio-cvd-confusion.ts`：
  - `createSeededRandom` の import を util に差し替え、`palette-preview` 依存を除去。
- テスト追加/更新：
  - `parseCvdConfusionThreshold` の厳密性（許可/不許可）をユニットテスト化
  - `findNearestDadsTokenCandidates(limit=0)` が `[]` を返すことをテスト化

## 受入基準
- [ ] ヘッダーの「混同判定」UIが「表示基準」であることを明確に示す（文言変更 + 必要ならツールチップ）
- [ ] 「混同判定」トグル変更で生成結果が変わらない（現状の意図を維持）
- [ ] `parseCvdConfusionThreshold("3.5abc") === null` になり、`"3.5"`, `"5"`, `"5.0"`（前後空白込み）は正しく受理される
- [ ] `findNearestDadsTokenCandidates(..., 0)` と `(..., -1)` が `[]` を返す
- [ ] `scripts/analyze-studio-cvd-confusion.ts` が `../src/ui/demo/views/palette-preview` を import しない
- [ ] `bun test` が成功する
- [ ] `bun run build` が成功する

## リスク / エッジケース
- しきい値パース厳密化により、過去に保存された想定外文字列（例 `"5.00"`）がデフォルトへフォールバックする可能性（必要なら許容文字列を増やして互換維持）。
- `limit<=0` を `[]` にすると、将来の呼び出し側が「最低1件」を暗黙期待していた場合に影響する（現状の主要呼び出しは `1`/`8` 固定なので影響は限定的）。
- RNG抽出で export/import 形態を崩すと既存参照が壊れる可能性（`palette-preview` 側の公開APIは維持する）。
- 文言変更がE2E/スナップショットに影響する可能性（該当があれば更新が必要）。

## 作業項目（Action items）
1. 承認済みPlanを保存（完了条件: `.codex/plans/` に本PlanのMarkdownが保存されている）
2. 方針確定: 「混同判定」は当面“表示のみ”で進める（完了条件: Planの前提どおりで実装が進む）
3. UI文言/ツールチップ追加（`index.html` + 必要なら `studio-view.ts`）（完了条件: 画面上で“表示基準”が読み取れる）
4. `parseCvdConfusionThreshold` の厳密化（完了条件: 許可/不許可ケースが実装どおりに動く）
5. `parseCvdConfusionThreshold` のテスト追加（完了条件: 追加テストが緑で、意図が固定されている）
6. `findNearestDadsTokenCandidates` の `limit<=0` 対応（完了条件: `limit<=0` で `[]` になる）
7. `findNearestDadsTokenCandidates(limit=0)` テスト追加（完了条件: 追加テストが緑で、契約が固定されている）
8. `createSeededRandom` を util に抽出し import を置換（`palette-preview.ts`, `analyze-studio-cvd-confusion.ts`）（完了条件: 分析スクリプトが `palette-preview` を import しない）
9. 回帰確認（完了条件: `bun test` と `bun run build` が成功する）

## テスト計画
- ユニット: `bun test`（新規追加分: しきい値パース、limit=0）
- ビルド: `bun run build`
- 動作確認（軽量）: 画面で「混同判定（表示）」の文言/ツールチップ確認、トグル変更が生成結果に影響しないことを確認
- スクリプト: `bun run scripts/analyze-studio-cvd-confusion.ts --iterations 1 --route none` 相当で import エラーが無いことを確認（実行コスト最小で）

## オープンクエスチョン
- 「混同判定」しきい値は、将来的にも **表示のみ** の方針で良いですか？（もし生成にも反映させるなら、`studio-view.accent-generation.test.ts` を含め設計/受入基準を組み替えます）


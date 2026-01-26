# UIデモ巨大モジュール分割（Views + Color Detail Modal）Plan

## 目標
- 行数が肥大化したUI「ページ/ビュー」モジュールを分割し、読みやすさ・変更容易性・テスト容易性を上げる
- 挙動/見た目/公開API（export）を変えずに、責務を整理して保守コストを下げる
- “分割完了”の現実的な目安として **1ファイル最大800行（合理性があれば許容）**、基本は 300〜600行を狙う

## 背景
- 現状、デモUIの主要ビューとモーダルが巨大化しており、変更時の影響範囲把握・レビュー・テストが難しい
- 行数の大きい“ページ相当”モジュール（`wc -l`）:
  - `src/ui/demo/views/studio-view.ts` 2116行
  - `src/ui/demo/views/manual-view.ts` 1649行
  - `src/ui/demo/views/palette-preview.ts` 1649行
  - `src/ui/demo/views/accessibility-view.ts` 1267行
  - `src/ui/demo/color-detail-modal.ts` 1261行（今回追加）
- 分割可能性の評価（結論）:
  - いずれも「セクション単位のDOM生成」「イベント配線」「純粋計算（色/コントラスト/スナップ）」「定数/型」が同居しており、**責務ごとに分割しやすい境界が既に存在**
  - `color-detail-modal.ts` はコメント区切りと `_testHelpers` が明確で、**scrubber/適用セクション/詳細更新ロジック**へ分割しやすい
  - 主要ビューはテストが存在し（`src/ui/demo/views/*.test.ts`, `src/ui/demo/color-detail-modal.test.ts`）、段階的リファクタリングの安全網がある

## スコープ
- やること：
  - まずUIデモの巨大モジュール5本を分割（4 views + color-detail-modal）
  - “薄いエントリファイル + サブモジュール群” の構成へ移行（exportは維持）
  - 定数/型/純粋関数/DOMセクション描画/イベント配線を分離し、循環依存を避ける
  - テスト・型チェック・lint・必要に応じてe2eで回帰確認
- やらないこと：
  - 新機能追加、UIデザイン変更、アルゴリズム（配色/スナップ/判定ロジック）の仕様変更
  - 依存追加、大規模リネーム、無関係な整形
  - `src/ui/styles/components.css`（5692行）の分割（次フェーズ）

## 前提 / 制約
- “目標行数”は厳密な制約ではなく、レビュー容易性を優先（最大800行は許容）
- `studio-view-deps.ts` はテストのモック境界として重要（分割後も境界を壊さない）
- DOMイベントの重複登録/解除漏れ（manual/studio/modal）は分割で壊れやすいので、cleanup/AbortController境界を明確にする
- `color-detail-modal.test.ts` は `openColorDetailModal` と `_testHelpers` の公開を前提にしているため、**公開形は維持**する
- SVGの `with { type: "text" }` import はファイル移動で相対パス崩壊のリスクがあるため、移動は慎重に行う

## 変更内容（案）
### データ / バックエンド
- 該当なし（ただしビュー内の“純粋計算”は抽出してテスト容易性を上げる）

### UI / UX
- 見た目・DOM構造・クラス名・ARIA文言は極力維持（差分最小化）
- 分割方針（例）
  - `src/ui/demo/views/studio-view.ts`
    - `toolbar/*`（設定、ロック、ボタン群）
    - `palette/*`（候補選択、再生成、ロック状態の解決）
    - `share-export/*`（URL/clipboard/export周り）
    - `state-derivation/*`（palette計算、preset/theme解決など“純粋寄り”）
  - `src/ui/demo/views/manual-view.ts`
    - `selection-state/*`（apply target状態・同期ロジック）
    - `toolbar/*` / `header-swatches/*`
    - `sections/*`（DADS hue / primary brand など）
  - `src/ui/demo/views/palette-preview.ts`
    - `assets.ts`（SVG/text import集中）
    - `color-mapping.ts`（mapPaletteToPreviewColors/getTextSafeColor等）
    - `sections/*`（hero/two-col/facilities/illustration/editorial）
  - `src/ui/demo/views/accessibility-view.ts`
    - `state.ts` / `explanation.ts` / `analysis/*`（distinguishability/boundary/conflict）
    - `render.ts`（最終のDOM組み立てのみ薄く）
  - `src/ui/demo/color-detail-modal.ts`
    - `apply-target-options.ts`（dropdown構築）
    - `scrubber/*`（描画・計算・イベント）
    - `detail-sync/*`（token/contrast計算、updateDetailHandler、palette名編集）
    - ルートは `openColorDetailModal` と `_testHelpers` の“組み立て”のみ薄く

### その他（Docs/Marketing/Infra など）
- import整理（バレルの見直し、循環依存回避）
- Plan/作業ログを `.codex/plans/` に保存（承認後）
- 次フェーズ候補として `src/ui/styles/components.css` 分割を別Planに切り出す

## 受入基準
- [ ] `src/ui/demo/views/index.ts` の公開API（export名/型/利用側のimport）が維持されている
- [ ] `src/ui/demo/color-detail-modal.ts` が `openColorDetailModal` と `_testHelpers` を同じ形で公開し続けている
- [ ] 対象5ファイルが「薄いエントリ」になり、主要ロジックがサブモジュールへ分割されている（目安: 1ファイル最大800行、基本300〜600行）
- [ ] `bun test` が通る
- [ ] `bun run type-check` が通る
- [ ] `bun run lint`（または `biome check`）が通る
- [ ] Studio/Manualの主要動線（生成→ロック→export、マニュアル適用、モーダル編集、a11y drawer表示、プレビュー表示）に明確な退行がない

## リスク / エッジケース
- 分割により循環依存が発生しやすい（特に `studio-view` ⇄ `palette-preview` 周辺）
- DOMイベントの重複登録/解除漏れ（manual/studio/modalで“再render”が多い）
- `color-detail-modal` は `AbortController` と `once: true` などが絡むため、分割でクリーンアップ順序を壊しやすい
- asset import の相対パス崩れ（`palette-preview`）

## 作業項目（Action items）
1. Planを確定して保存（完了条件: 承認後に `.codex/plans/` にPlan文書が保存されている）
2. ベースライン確認（完了条件: 現状の `test/type-check/lint/build` の結果を記録できる）
3. `color-detail-modal.ts` を先に分割（完了条件: `_testHelpers`/`openColorDetailModal` 維持のままテスト通過）
4. `studio-view.ts` を分割（完了条件: `renderStudioView`/`generateNewStudioPalette` 維持 + 関連テスト通過）
5. `manual-view.ts` を分割（完了条件: 既存export維持 + 関連テスト通過）
6. `palette-preview.ts` を assets・color-mapping・sections に分割（完了条件: 既存export維持 + 関連テスト通過）
7. `accessibility-view.ts` を state/analysis/render に分割（完了条件: a11y drawer経由の描画が維持 + 関連テスト通過）
8. import/依存の整理（完了条件: 循環依存がなく、読みやすい導線に落ちている）
9. 仕上げの回帰確認（完了条件: `build` と `e2e` を通し、明確な退行がない）
10. 次フェーズPlanの下書き（完了条件: `src/ui/styles/components.css` 分割方針の短いPlan草案ができている）

## テスト計画
- 単体/統合: `bun test`（特に `src/ui/demo/views/*.test.ts`, `src/ui/demo/color-detail-modal.test.ts`）
- 型: `bun run type-check`
- 静的解析: `bun run lint`（または `bun run check`）
- ビルド: `bun run build`
- E2E: `bun run test:e2e`

## オープンクエスチョン
該当なし


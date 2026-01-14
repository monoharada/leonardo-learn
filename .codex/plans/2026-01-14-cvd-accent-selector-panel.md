# CVD表示を AccentSelectorPanel の候補グリッドにも適用

## Context
- CVD切替は「表示（塗り）だけ変える」方針で統一されており、表示用ヘルパー `getDisplayHex` は `src/ui/demo/cvd-controls.ts` にある。
- `AccentCandidateGrid` は `getDisplayHex` オプションに対応しており、`src/ui/demo/views/harmony-view.ts` では渡している。
- 一方で `src/ui/accent-selector/accent-selector-panel.ts` 内の `AccentCandidateGrid` 生成は `getDisplayHex` 未指定のため、同パネル経由のスウォッチ表示がCVD状態と揃わない可能性がある。

## Scope
- やること：
  - `AccentSelectorPanel` に表示用HEX変換（`getDisplayHex`）を注入できるオプションを追加し、内部で生成する `AccentCandidateGrid` に渡す
  - デフォルトは恒等関数にして既存挙動を維持する（CVDを使う側だけが明示的に注入する）
  - 必要最小限のテスト更新
- やらないこと：
  - `src/ui/accent-selector/*` から `src/ui/demo/*` への直接依存追加（依存方向を崩さない）
  - CVD状態管理やクリック時に渡すHEXの仕様変更
  - パネル描画の大規模リファクタ（生成/再生成の構造変更など）

## Assumptions
- `AccentSelectorPanel` はデモ専用ではなく汎用UIとして保ち、CVD表示は外から `getDisplayHex` を渡す形にする。
- 既存のコンストラクタ呼び出し（引数1つ）は後方互換で維持する。
- 全体lintは既存診断で落ちる前提なので、差分ファイルのみのlint/format確認を優先する。

## Risks / Edge cases
- `getDisplayHex` を誤って候補データ側に適用すると、選択コールバックで返るHEXが変わるリスク（「塗りだけ」厳守）。
- `AccentSelectorPanel.render()` は毎回 `AccentCandidateGrid` を作り直すため、オプション渡し漏れがあると表示が揃わない。
- テスト環境（DOMなし）での no-op 条件を崩すと、既存のロジックテストが落ちる可能性。

## Action items
1. 承認済みPlanを `.codex/plans/2026-01-14-cvd-accent-selector-panel.md` に保存（完了条件: ファイルが作成され、今回の作業範囲が明記されている）
2. `new AccentCandidateGrid(...)` の全呼び出し箇所を再確認（完了条件: どの箇所で `getDisplayHex` が必要か一覧化できている）
3. `AccentSelectorPanel` に `getDisplayHex?: (hex: string) => string` を受けるオプションを追加（完了条件: 既存の `new AccentSelectorPanel(container)` がそのまま動く）
4. `AccentSelectorPanel.render()` 内で `AccentCandidateGrid` 生成時に `getDisplayHex` を渡す（完了条件: `accent-selector-panel.ts` の `new AccentCandidateGrid` がオプション付きになる）
5. テストを最小更新（必要なら追加）し、後方互換と読み込みが担保されるようにする（完了条件: `bun test` が通り、今回の変更点が最低限カバーされる）
6. `bun run type-check` を実行（完了条件: exit code 0）
7. `bun test` を実行（完了条件: exit code 0）
8. 変更ファイルのみ `bunx biome lint` を実行（完了条件: 対象ファイルで新規diagnosticなし）

## Test plan
- `bun run type-check`
- `bun test`
- `bunx biome lint src/ui/accent-selector/accent-selector-panel.ts src/ui/accent-selector/accent-selector-panel.test.ts`

## Open questions
- なし


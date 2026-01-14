# パレット色数/並べ替えUIのキーボード対応（DADSフォーカス+矢印キー）

Approved: 2026-01-14（User: "APPROVE PLAN"）
Note: アクセシビリティビュー側は `radiogroup` にせず、`tablist/tab` のまま実装する。

## Context
- 生成ビュー（`src/ui/demo/views/harmony-view.ts`）の「パレット色数」セグメントが、キーボードフォーカス時にフォーカスインジケーター（DADS標準: 黒アウトライン+黄リング）が見えない。
- 同UIを左右矢印キーでも切り替え可能にしたい（現状は再レンダリングでフォーカスが失われ、連続操作しづらい可能性が高い）。
- 修正後、アクセシビリティビューの `dads-a11y-sort-tabs`（`src/ui/demo/views/accessibility-view.ts` + `src/ui/styles/components.css`）も同一のセグメントUIに揃える。

## Scope
- やること：
  - `src/ui/styles/components.css` に `dads-segmented-control` のDADS標準フォーカスリングを追加。
  - `src/ui/demo/views/harmony-view.ts` の「パレット色数」切替で、左右矢印キー操作を保証しつつ、切替後も同コントロールにフォーカスを復元。
  - `src/ui/demo/views/accessibility-view.ts` の `dads-a11y-sort-tabs` を、見た目/操作性ともに `dads-segmented-control` と同一UI（同一スタイル/同等キーボード操作）へ寄せる（roleは tablist/tab のまま）。
  - 影響が出る場合は `e2e/accessibility-view-sorting.e2e.ts` を追従。
- やらないこと：
  - 生成ロジックやソートロジックの仕様変更、画面構造の大規模リファクタ。
  - デザイントークン追加や全体のフォーカス設計の見直し。

## Assumptions
- DADS標準フォーカスは既存の `.dads-button:focus-visible` と同等（`outline: 4px solid ...` + `box-shadow: 0 0 0 2px var(--color-primitive-yellow-300)`）を採用する。
- `:has()` は既にプロジェクト内で使用されているため追加しても問題ない。
- 生成ビューの「パレット色数」変更は現状どおり全体再レンダリングを維持し、UX改善としてフォーカス復元でキーボード操作性を担保する。

## Risks / Edge cases
- `.dads-segmented-control` は `overflow: hidden` のため、子要素側にアウトラインを出すとクリップされる（→ コントロール“外枠”にフォーカスリングを出す）。
- 生成ビューは再レンダリングでDOMが差し替わるため、フォーカス復元が無いと矢印キー操作が途切れる。
- `dads-a11y-sort-tabs` は現状「タブUI（role=tablist/tab）」のため、セマンティクス変更はしない前提で見た目/操作性を寄せる。
- アクセシビリティビューのE2Eは `.dads-a11y-sort-tab--active` 等に依存しているため、DOM/クラス変更で壊れる可能性がある。

## Action items
1. `src/ui/styles/components.css` に `.dads-segmented-control` のDADSフォーカスリングを追加（完了条件: Tabで当該コントロールに入ると黒+黄のリングが視認できる）
2. `src/ui/demo/views/harmony-view.ts` のパレット色数コントロールに、矢印キーで値を前後できるハンドリングを追加（完了条件: フォーカス中に`←/→`で 4↔5↔6 が切替わる）
3. 同変更で再レンダリング後に対象ラジオへフォーカスを復元（完了条件: 連続して`←/→`を押しても操作が途切れない）
4. `src/ui/demo/views/accessibility-view.ts` の `renderSortTabs` を、`dads-segmented-control` と同一見た目になるクラス構成へ変更（完了条件: 並べ替えUIが生成ビューのセグメントと同一トーンに見える）
5. `src/ui/styles/components.css` の `dads-a11y-sort-tabs / tab` 既存スタイルを競合しない形に整理（完了条件: アクセシビリティ側が旧スタイルにならず、二重定義で崩れない）
6. 必要に応じて `e2e/accessibility-view-sorting.e2e.ts` を追従（完了条件: `bun run test:e2e` が通る）
7. 回帰確認（完了条件: `bun test` と主要ビューの手動キーボード操作で明らかな崩れがない）

## Test plan
- `bun test`
- `bun run test:e2e`（特に `e2e/accessibility-view-sorting.e2e.ts`）
- 手動確認（生成ビュー）: Tabで「パレット色数」に入り、フォーカスリング表示→`←/→`で切替→連続操作できること
- 手動確認（アクセシビリティビュー）: 並べ替えUIが同一見た目、Tab/矢印で切替でき、境界検証表示が更新されること


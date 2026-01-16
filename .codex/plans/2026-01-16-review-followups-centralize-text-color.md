# Plan: レビュー対応（テキスト色反映の集中化 / overflow対策 / バリデーション日本語化 / ドキュメント整合）
Date: 2026-01-16

## Context
- `applyDemoTextColor(...)` が複数Viewのrender経路に散在しており、重複・漏れが起きやすい。
- `.background-color-selector__section` が shrink しない指定になっており、エラー文などで横方向の溢れが起き得る。
- UIが日本語化された一方、入力バリデーションのエラー文が英語のまま。
- `darkBackgroundColor` が実質「テキスト色」用途で使われているのに、型/コメントが「ダーク背景色」のままで混乱しやすい。

## Scope
- やること
  - 「`state.darkBackgroundColor` 変更 → `--demo-text-color` 更新」を単一箇所に集約し、View側renderからの `applyDemoTextColor` 呼び出しを撤去する。
  - `.background-color-selector__section` の溢れ対策（`minmax(0, 1fr)` / shrink許可 / errorの折返し）を入れる。
  - `validateBackgroundColor` のエラー文を日本語化（表示/ariaと整合）。
  - `darkBackgroundColor` のJSDoc（`types.ts` / `state.ts` / `background-color-selector.ts`）を実態（テキスト色）に合わせる。
- やらないこと
  - `darkBackgroundColor` の大規模リネーム（挙動影響が出やすいので今回は見送り、ドキュメント整合まで）。

## Action items
1. `src/ui/demo/state.ts` に「`darkBackgroundColor` 更新時に `applyDemoTextColor` を必ず反映する仕組み（setter相当）」を追加。
2. `src/ui/demo/index.ts` / 各View（palette/shades/harmony/accessibility）から `applyDemoTextColor(...)` の散在呼び出しを削除。
3. `src/ui/styles/components.css` の `.background-color-selector__section` を `grid-template-columns: auto minmax(0, 1fr)` にし、`flex` を shrink 可能に調整。`.background-color-selector__error` に `overflow-wrap` 等を追加。
4. `src/ui/demo/state.ts` の `validateBackgroundColor` エラーメッセージを日本語化。
5. `src/ui/demo/types.ts` / `src/ui/demo/state.ts` / `src/ui/demo/background-color-selector.ts` の `darkBackgroundColor` 説明を「テキスト色（現状の意味）」に修正。

## Test plan
- `bun test`
- `bun run type-check`

## Approval
- User: validation errors 日本語化 OK / リネーム無し（ドキュメント整合のみ）OK
- User approved: `APPROVE PLAN`


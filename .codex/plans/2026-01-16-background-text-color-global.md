# Plan: 背景色セレクターの枠削除 + テキスト色を全Viewへ反映

Date: 2026-01-16

## Context / 要望
- 背景色/テキスト色の入力UIの「枠っぽさ（ボーダー等）」を一旦なくす
- 「テキスト色」を変更しても各viewに反映されていないので、アプリ全体の黒字テキストが変更色に寄るようにしたい

## Plan
1) CSS: `.background-color-selector` のボーダー等、枠っぽい見た目を削除（背景/角丸/余白も必要なら削除）
2) テキスト色の反映方式を統一: `--demo-text-color` を追加し、黒字系（neutral 900/800）指定を `var(--demo-text-color, 既存色)` に寄せる
3) JS: `state.darkBackgroundColor` 変更時に `--demo-text-color` を更新（初期化時も反映）
4) 検証: `bun test src/ui/demo/background-color-selector.test.ts` / `bun run type-check`

## Approval
- User approved: `APPROVE PLAN`（枠っぽさも一旦削除）


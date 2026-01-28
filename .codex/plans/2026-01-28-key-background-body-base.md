# Plan: Key Background を body 背景ベースで生成し export に含める

Date: 2026-01-28

## Context / 要望
- 現在の背景色（`state.lightBackgroundColor`）を **body 背景色**として扱い、生成・調整ロジックの基準背景を一貫させたい
- 「キーカラー背景色（Key Background）」をアクセシビリティ要件に配慮して生成し、**プレビュー**/ **エクスポート（CSS/Tailwind/JSON）**に含めたい
- 可能な限り **DADS トークンから選択**し、キーカラーが独自色の場合も同等ロジックで生成できるようにしたい

## Decision（承認時の決定）
- Key Background は **Primary 起点**で作る
- エクスポートする CSS 変数名は `--color-key-background`

## Plan
1) 生成の基準背景を単一ソース化（`DEFAULT_STUDIO_BACKGROUND` 固定 → `state.lightBackgroundColor` ベース）
2) Key Background 算出ユーティリティ追加（DADS あり/なし両対応、`contrast(text, keyBg) >= 4.5` を最低ライン）
3) DADS 優先選択ロジック（同色相スケールから「目標色に近い + コントラスト満たす」候補を選ぶ）
4) 独自色フォールバック（混色 + 明度調整）で `contrast(text, keyBg) >= 4.5` を満たす HEX を生成
5) プレビュー反映（白混色固定をやめ、生成済み Key Background を `--preview-*-bg` に反映）
6) エクスポート反映（CSS/Tailwind/JSON に `--color-key-background` を含める）
7) テスト追加/更新（Key Background 生成のユニットテスト + 既存テスト更新）
8) ドキュメント追記（変数/ロール一覧に Key Background を追記）

## Acceptance Criteria
- Studio で背景色を変更すると、Primary 選定・Secondary/Tertiary 導出・セマンティックの調整がその背景（body 背景）を基準に行われる
- Key Background が生成され、プレビューに反映される（少なくとも `--preview-hero-bg` / `--preview-kv-bg` が body 背景ベースで決まる）
- エクスポート（CSS/Tailwind/JSON）に `--color-key-background` が含まれる
- DADS トークン由来の Primary の場合、Key Background は原則 DADS（同色相スケール）から選ばれ、出力では `var(--color-primitive-...-step)` 参照になれる
- 独自 Primary でも Key Background が生成される（DADS に寄せられない場合は HEX 直値で OK）
- `bun test` が通る

## Approval
- User approved: `APPROVE PLAN`（Primary 起点 / `--color-key-background`）


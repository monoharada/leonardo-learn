# Main Visual: 肌色を元画像に固定（Approved）

Date: 2026-01-18
Branch: main
Status: Approved (User: "APPROVE PLAN")

## Context
- Studio KV のメインビジュアルは `.context/generated/main-visual.svg` を優先利用している。
- 現状、背景（`--mv-bg`）に紐づく色の一部に人物の肌パーツが混ざっており、`Shuffle` 等で背景色が変わると「男性/立っている女性の肌」が背景と同化して見える。
- 元画像（`.context/attachments/l_01_square_white-v1.png`）の肌色は固定で問題ない。

## Goal
- 人物の肌色を **元画像と同じ色** に固定し、`--mv-bg` の影響を受けないようにする。
- 変数は既存の4つ（`--mv-bg`, `--mv-cloth-1`, `--mv-cloth-2`, `--mv-accent`）のまま維持する。

## Scope
- 対象: 男性/立っている女性の肌（必要なら同じ肌色パーツ全体）
- 非対象: 背景楕円/服/差し色（既存の変数運用を維持）

## Approach
1. 元画像を 2048px に最近傍リサイズし、肌色（`#FFD2C8`）のマスクを生成する。
2. その肌マスクを Potrace でベクター化し、SVG 内に固定色パスとして追加する（CSS変数は使わない）。
3. 背景楕円用のマスクから肌マスク領域を差し引き、背景色パスに肌領域が混ざらないようにする。
4. 生成物を `src/ui/demo/assets/main-visual.svg` にも同期し、`.context` が無い環境でも同様に表示されるようにする。

## Deliverables
- `.context/generated/main-visual.svg`（肌が固定色）
- `.context/generated/main-visual.vars.md`（変数対応表の更新）
- `src/ui/demo/assets/main-visual.svg`（同等の内容へ同期）

## Checks
- Studio の `Shuffle` で背景色を変えても、男性/女性の肌が消えない
- `bun run build` が通る

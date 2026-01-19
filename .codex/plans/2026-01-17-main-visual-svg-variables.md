# Main Visual: PNG→SVG化 + CSS変数化（Approved）

Date: 2026-01-17
Branch: main
Status: Approved (User: "APPROVE PLAN")

## Context
- Input: `.context/attachments/l_01_square_white.png`（5120×5120, RGBA）
- Usage: Webにinlineで埋め込み、外側からCSS変数で色を差し替えたい
- Variable化したい範囲: 背景＋服＋差し色（肌/髪/白〜グレー等は固定）

## Goal
- ベクターSVGを生成し、配色は `--mv-*` 変数で後から差し替え可能にする（初期値は現状色をフォールバック）。

## Variables（対象）
- `--mv-bg`（背景楕円）
- `--mv-cloth-1`（服の主要色1）
- `--mv-cloth-2`（服の主要色2）
- `--mv-accent`（差し色）

## Approach
1. PNGを前処理（縮小＋色数整理）してトレースを安定化
2. マルチカラーSVGへトレース（パス生成）
3. 対象色だけ `fill` / `style` を `var(--mv-*, <fallback>)` に置換
4. inline埋め込み前提で `viewBox` を固定し、外側CSS変数上書きが効くことを確認

## Deliverables
- `.context/generated/main-visual.svg`
- `.context/generated/main-visual.tokens.css`
- `.context/generated/main-visual.vars.md`

## Checks
- エッジのにじみ/崩れが許容範囲
- 対象外の色（肌・髪など）が意図せず `--mv-*` で変わらない
- パス数が過剰なら簡易化（必要な範囲で）


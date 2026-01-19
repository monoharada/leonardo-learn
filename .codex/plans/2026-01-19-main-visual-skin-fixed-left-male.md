# Main Visual: 左の男性の肌色を固定（Approved）

Date: 2026-01-19
Branch: main
Status: Approved (User: "APPROVE PLAN")

## Goal
- 左の男性の「顔・手」の肌色が背景色（`--mv-bg`）に影響されず、常に固定色で表示されるようにする。

## Context
- メインビジュアルSVGは背景色を `--mv-bg` で差し替える設計だが、左男性の肌パーツが背景側の色レイヤーに巻き込まれ、背景色によって肌色が同化して見えるケースがある。
- 実行環境によっては `file://` で fetch できず、バンドルSVGがフォールバック表示になるため、バンドルSVG側の修正が必須。

## Constraints / Assumptions
- 男性の肌色は固定色 `#FFB695`（`.context/generated/main-visual.vars.md` の `Skin (male)`）を採用する（テーマ化しない）。
- SVGのパスを手作業で部分修正するのはリスクが高いので、生成済みの“固定色分離済み”SVGをソースとして同期する。

## Scope
### Do
- `src/ui/demo/assets/main-visual.svg` を“男性肌 `#FFB695` が固定で分離されている版”に同期する。
- 必要に応じて `dist/assets/main-visual.svg` も同期し、環境差（fetch可否）で見え方がブレないようにする。
- 回帰防止の軽いテストを追加する。

### Don't
- 肌色をCSS変数化（テーマ化）しない。
- 形状・レイアウトの変更など、色の扱い以外のデザイン変更をしない。

## Checks (Acceptance)
- 背景色を変えても左男性の顔・手が `#FFB695`（固定）で表示される。
- `--mv-bg` を肌に近い色（黄/ベージュ/ピンク系）にしても、男性の肌が背景に同化しない。
- `bun test` が通る。
- メインビジュアルのレイアウト崩れがない。


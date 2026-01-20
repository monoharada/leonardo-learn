# Studio: 識別性スコアを色変更で自動更新

Date: 2026-01-20
Branch: monoharada/a11y-score-recalc
Status: Approved (User: "APPROVE PLAN")

## 目標
- Studioビューで配色（Primary/Accent など）が変更されたとき、ヘッダーの「識別性スコア」がビュー遷移なしで即時に再計算・表示更新されるようにする。

## 背景
- 「識別性スコア」は `src/ui/demo/cvd-controls.ts` の `updateCVDScoreDisplay()` が `#cvd-score-value` / `#cvd-score-grade` を更新している。
- いまは主に `src/ui/demo/index.ts` の `renderMain()` 実行タイミング（ビュー遷移など）で `updateCVDScoreDisplay()` が呼ばれるため、Studioビュー内で配色が変わっても `renderMain()` を通らない経路（`renderStudioView()` の自己再描画）だとスコアが更新されない。

## スコープ
- やること：
  - Studioビューで `state.palettes`（配色）が更新されたタイミングで `updateCVDScoreDisplay()` を呼び、ヘッダーのスコア表示を同期する。
  - 回帰防止のテストを追加する（可能なら）。
- やらないこと：
  - スコア算出ロジック（`calculateCVDScore`）の変更
  - スコアの対象色セット（キーカラーのみ/セマンティック含む等）の再定義
  - 状態管理の大規模刷新（イベントバス導入など）

## 前提 / 制約
- Studioビューの配色更新は `src/ui/demo/views/studio-view.ts` 内の `rebuildStudioPalettes()` 経由で行われている（Primary変更、アクセント数変更、シャッフル等）。
- `updateCVDScoreDisplay()` は対象DOMが無い場合は何もしないため、アクセシビリティビューで `#cvd-controls` が非表示でも呼び出して問題は起きにくい想定。
- 変更は最小限（依存関係の追加は必要最低限）で行う。

## 変更内容（案）
### データ / バックエンド
- 該当なし

### UI / UX
- `src/ui/demo/views/studio-view.ts` の配色更新ポイント（第一候補: `rebuildStudioPalettes()` の末尾）に `updateCVDScoreDisplay()` を追加し、Studio内操作だけでヘッダーのスコアが更新されるようにする。

### その他（Docs/Marketing/Infra など）
- （可能なら）`src/ui/demo/views/studio-view.test.ts` を追加し、Studio内の配色変更操作で `#cvd-score-value` が更新されることを確認する。

## 受入基準
- [ ] Studioビューで「配色シャッフル」後、ヘッダーの「識別性スコア」が即時に更新される（ビュー遷移不要）
- [ ] StudioビューでPrimary入力（テキスト/カラーピッカー）変更後、スコアが即時に更新される
- [ ] Studioビューでアクセント数変更後、スコアが即時に更新される
- [ ] 既存のビュー遷移時のスコア更新・アクセシビリティビューでの `#cvd-controls` 非表示挙動は維持される

## リスク / エッジケース
- Studioビューは非同期で再レンダリングが多く、同時レンダリングが起きうるため、呼び出し位置によってはスコア更新が多重になる（ただし計算コストは小さく、実害は低い見込み）。
- `studio-view.ts` から `cvd-controls.ts` への import 追加で循環依存が発生しないか要確認（現状 `studio-view.ts` は `getDisplayHex` を import 済みなので、同モジュールへの依存増は比較的安全そう）。

## 作業項目（Action items）
1. 現状の再現手順を固定（Studioで配色変更→スコア不更新→アクセシビリティへ移動で更新）（完了条件: 再現ステップと期待値が明文化される）
2. 更新されない経路を特定（`renderMain()` を通らない `renderStudioView()` 自己再描画を確認）（完了条件: 根因と対象関数が確定する）
3. `src/ui/demo/views/studio-view.ts` にスコア更新フックを追加（第一候補: `rebuildStudioPalettes()` 末尾）（完了条件: Studio内の配色更新だけでスコアDOMが更新される）
4. Studio内の主要経路（シャッフル/Primary変更/アクセント数変更）が `rebuildStudioPalettes()` を経由していることを確認（完了条件: 受入基準3項目がこの1点でカバーできると確認できる）
5. 回帰テストを追加（可能ならStudioビューのイベント発火で `#cvd-score-value` 更新を検証）（完了条件: 変更が無いと落ち、変更後に通るテストが1つ以上ある）
6. `bun test` を実行して既存テスト含めて通す（完了条件: テストがグリーン）
7. 手動でUI確認（Studio操作のみでスコアが追従、ビュー遷移も問題なし）（完了条件: 受入基準を満たすことを確認）

## テスト計画
- 単体: `bun test`（必要なら `src/ui/demo/views/studio-view.test.ts` を追加）
- 手動: Studioビューで「配色シャッフル」「Primary変更」「アクセント数変更」を行い、ヘッダーの「識別性スコア」が即時更新されることを確認

## オープンクエスチョン
- 対象範囲: Studio内の配色変更（Primary/Accent）のみでOK（ユーザー回答）


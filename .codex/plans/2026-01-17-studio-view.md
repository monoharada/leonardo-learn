# Studio View（Huemint風）実装計画（Approved）

Date: 2026-01-17
Branch: monoharada/palette-view

## Goal
- Huemint `brand-3` を参考に、**プレビュー中心**の新しいビュー（5つ目）を追加する。
- 「Random → 気に入ったら微調整 → Export」という体験を、既存機能の組み合わせで実現する。
- 生成AI機能（モデル選択/Creativity等）は実装しない。

## Core principles / constraints
- **勝手な色の創作はしない**
  - Generate（ランダム）は **DADSトークンからのみ**選択する。
  - Accent/Error/Success/Warning は **DADSトークンのみ**で扱う。
  - ユーザーが「自作」を許可するのは **キーカラー（Primary）のみ**。
- 既存機能を最大限再利用し、変更は最小限にする。

## UI outline
- Toolbar（Huemint風の上部ツールバー）
  - Swatches: Primary / Accent / Error / Success / Warning
  - Lock: Primary/Accent（将来拡張余地として全swatchに表示しても良いが、初期はPrimary/Accentが対象）
  - WCAG badges（AAA/AA/AA Large/Fail）
  - Generate（ランダム）
  - Export（既存export modalを開く）
- Main:
  - Website Preview（既存 `createPalettePreview()` を大きく表示）
  - A11y summary（主要コントラスト＋CVD衝突の要約、必要ならアクセシビリティビューへの導線）

## Reuse (existing code)
- Preview: `src/ui/demo/views/palette-preview.ts`（`createPalettePreview`, `mapPaletteToPreviewColors`）
- Random: `src/core/tokens/random-color-picker.ts`（`getRandomDadsToken` / `getRandomDadsColor`）
- Accent candidates: `src/core/accent/accent-candidate-service.ts`（`generateCandidates`）
- Modal (primary only editable): `src/ui/demo/color-detail-modal.ts`（`openColorDetailModal`）
- Export: `src/ui/demo/export-handlers.ts`（既存のexport dialog + handler）
- CVD: `src/ui/demo/cvd-controls.ts`（`getDisplayHex`）

## Implementation steps
1. Add new view mode and navigation
   - `ViewMode` に `studio` を追加し、ルーティングとナビボタンを増やす。
2. Implement `studio` view
   - ツールバー（5 swatches + Generate + Export）
   - プレビュー領域（`createPalettePreview()`）
   - a11yサマリ
3. Generate logic (no AI)
   - Primary（ロックされていなければ）: DADSトークンからランダム選択
   - Accent（ロックされていなければ）: `generateCandidates()` 上位Nからランダムに1つ採用
   - 生成結果は `state.palettes` に反映（Primary + Secondary + Tertiary + Accent 1）
4. Guardrails for “no invented colors”
   - Primary以外は「DADSにない色」へ更新できないようにする（編集UIをread-onlyまたはDADS選択に限定）。
5. Tests
   - ビューのレンダリングとGenerate/Lockの最小テストを追加し、既存テストを必要最小限更新。

## Test plan
- `bun run type-check`
- `bun test`
- 影響がある場合のみ `bun run test:e2e`


# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### 新ハーモニータイプの追加（Adobe Color調査対応）
- **Monochromatic（モノクロマティック）**: 同一色相で彩度・明度を変化させるパレット生成
- **Shades（シェード）**: 同一色相で明度のみを段階的に変化させるパレット生成
- **Compound（コンパウンド）**: 類似色（+30°）と補色（+180°）を組み合わせたハイブリッドパレット生成

#### 役割ベースパレット選択システム
- `PaletteRole`型の導入（accent, accentLight, accentDark, secondary, baseMuted等）
- 各ハーモニータイプに最適化されたRoleConfig定義
- `stepOffset`による明度バリエーション生成（DADSトークンのステップを活用）
- `src/core/accent/palette-role.ts`の新規作成

#### HarmonyFilterCalculator拡張
- `HarmonyFilterType`に3タイプ追加: monochromatic, shades, compound
- `HARMONY_TYPES`配列を8要素に拡張（all含む）
- 各タイプの色相オフセット定義:
  - monochromatic: [0]（同一色相）
  - shades: [0]（同一色相）
  - compound: [30, 180]（類似色+補色）

#### UI改善
- ハーモニーカードを4種類から7種類に拡張
- 新タイプのプレビュースウォッチ（3色）対応
- `harmonyNames` Recordに日本語名追加

### Changed

#### HarmonyPaletteGenerator
- `generateMonochromaticPalette()`の実装
- `generateShadesPalette()`の実装
- `generateCompoundPalette()`の実装
- `STEP_TARGETS`定義による明度分布制御

#### テスト
- harmony-filter-calculator.test.ts: 新3タイプの色相計算テスト追加
- harmony-palette-generator.test.ts: 新ジェネレータのテスト追加
- harmony-type-card.test.ts: 7カード+詳細選択カードのテスト追加
- 全85テストケース合格確認

### Technical Details

#### DADSトークン制約への対応
- DADSカラートークン（130色: 10色相 × 13ステップ）は変更不可
- 生成された色はDADSトークンにスナップ
- ハーモニースコア優先でアクセント候補を選択し、ステップ（明度）を調整してバリエーションを生成

#### 設計方針
- Adobe Color調査レポート（docs/research/adobe-color-investigation-2026-01-05.md）に基づく実装
- 役割ベース選択により、実用的で多様性のあるパレットを生成
- 既存のハーモニータイプ（complementary, triadic, analogous, split-complementary）との一貫性を維持

### References
- Adobe Color調査レポート: `docs/research/adobe-color-investigation-2026-01-05.md`
- 実装タスク: `.kiro/specs/accent-auto-selection/tasks.md` Section 10

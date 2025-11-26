# Gap Analysis: Advanced Color System Generation

## Executive Summary

### スコープ
advanced-color-system-generation機能の10要件と既存コードベースとの差分を分析し、実装戦略を評価する。

### 主要な発見
1. **既存の強み**: OKLCH色空間、コントラスト計算、ハーモニー生成、APCA対応が実装済み
2. **主要なギャップ**: ロール別L/C調整、M3/DADSモード、衝突回避、エクスポート機能が未実装
3. **アーキテクチャ**: 現在のTheme/Color構造は拡張可能だが、ロール管理レイヤーが必要
4. **推奨アプローチ**: ハイブリッド（Option C）- 既存コアを拡張しつつ新しいシステム生成レイヤーを追加

### 工数・リスク
- **工数**: L（1〜2週間）
- **リスク**: Medium

---

## 1. Current State Investigation

### 1.1 ディレクトリ構造と主要ファイル

```
src/
├── core/
│   ├── color.ts          # Color クラス（OKLCH基盤）
│   ├── theme.ts          # Theme クラス（コントラスト比ベースのパレット生成）
│   ├── solver.ts         # 二分探索によるコントラスト解決
│   ├── interpolation.ts  # culori.js を使用した色補間
│   ├── harmony.ts        # ハーモニー生成 + SystemPalette生成
│   └── background.ts     # BackgroundColor クラス
├── utils/
│   ├── color-space.ts    # OKLCH変換、gamut clamp
│   └── wcag.ts           # WCAG 2.1 コントラスト計算
├── accessibility/
│   ├── wcag2.ts          # WCAG準拠判定
│   └── apca.ts           # APCA（Lc値）計算
└── ui/
    └── demo.ts           # デモUI（Vanilla TS、約1000行）
```

### 1.2 既存の機能と規約

#### コアアーキテクチャ
- **Color クラス**: OKLCH内部状態、Hex/CSS出力、コントラスト計算
- **Theme クラス**: keyColors + ratios → コントラスト比ベースのスケール生成
- **Solver**: 二分探索でLightness調整し目標コントラスト達成
- **Harmony**: 色相回転によるハーモニー生成（complementary, triadic等）
- **SystemPalette**: Primary/Secondary/Accent/Neutral/Semantic の基本構造

#### 技術的規約
- culori.js による色空間変換（OKLCH, RGB, Hex）
- gamut clamp は binary search で最大Chroma を探索
- テストファイル: 現時点で`.test.ts`ファイルなし
- UIはVanilla TSでDOM操作（React移行の余地あり）

#### 依存関係
- `culori`: 色空間変換、補間
- `apca-w3`: APCA計算

### 1.3 統合サーフェス

- **データモデル**: `Color`, `Theme`, `SystemPaletteColor` の型定義
- **API境界**: `generateSystemPalette()`, `findColorForContrast()`, `getAPCA()`
- **UI統合**: `demo.ts` が直接 core/accessibility を呼び出し

---

## 2. Requirements Feasibility Analysis

### 2.1 要件と既存機能のマッピング

| 要件 | 既存機能 | ギャップ | 複雑度 |
|------|----------|----------|--------|
| **R1: 役割別L/C調整** | `harmony.ts` にロール概念あり（primary/secondary/accent/neutral/semantic） | ロール別のL/C範囲パラメータ、調整ロジックが未実装 | Medium |
| **R2: ニュートラルスケール** | `generateSystemPalette()` でGray/Slateを生成（C=0.01, 0.03固定） | 11段階スケール生成、ウォーム/クール切替が未実装 | Low-Medium |
| **R3: セマンティック衝突回避** | なし | 完全新規。ΔH/ΔC/ΔL計算、CVDシミュレーション、調整ロジック | High |
| **R4: M3準拠シェード** | `contrastRanges` でステップ定義あり | HCT→OKLCH変換、13段階トーン、Key Colors自動生成 | Medium-High |
| **R5: DADSアクセシビリティ** | WCAG/APCA計算は実装済み | AAA自動調整、ロール別コントラスト基準、インタラクティブ状態生成 | Medium |
| **R6: ロール自動割当** | なし | 完全新規。Lightnessベースのロール推奨、コントラスト検証 | Medium |
| **R7: エクスポート** | `demo.ts` に stub のみ | CSS/DTCG/Tailwind/JSON出力、広色域fallback | Medium |
| **R8: プレビューUI** | `demo.ts` に基本プレビューあり | 100msリアルタイム更新、AA/AAAインジケーター、修正提案 | Medium |
| **R9: パフォーマンス** | なし（計測未実施） | キャッシュ、並列処理、非同期生成 | Medium |
| **R10: バージョニング** | なし | パラメータ保存/復元、決定論的生成、差分比較 | Low-Medium |

### 2.2 主要なギャップ

#### Missing（完全新規）
1. **ロール別パラメータ設定システム** (R1)
2. **セマンティック衝突検出・回避エンジン** (R3)
3. **M3トーンスケール生成（HCT変換含む）** (R4)
4. **ロール自動割当ロジック** (R6)
5. **エクスポートフォーマッター** (R7)
6. **パラメータシリアライズ/再現機能** (R10)

#### Extension Required（既存拡張）
1. **ニュートラルスケール**: 現在の2色（Gray/Slate）→ 11段階スケール
2. **DADSモード**: 既存APCA計算を活用した自動調整
3. **プレビューUI**: 既存demo.tsの大幅拡張
4. **パフォーマンス**: 既存ロジックへのキャッシュ/並列化追加

#### Research Needed
1. **HCT→OKLCH変換の精度検証** - Material Design公式のHCT実装参照が必要
2. **CVDシミュレーション** - Brettel法などの色覚シミュレーションライブラリ選定
3. **Web Worker vs Main Thread** - 大規模パレット生成のパフォーマンス測定

### 2.3 複雑度シグナル

- **アルゴリズムロジック**: 衝突回避、M3トーン、自動調整（High）
- **外部連携**: HCT変換、CVDシミュレーション（Medium）
- **データ変換**: 複数エクスポート形式（Medium）
- **UI/UX**: リアルタイムプレビュー（Medium）

---

## 3. Implementation Approach Options

### Option A: Extend Existing Components

**対象ファイル:**
- `harmony.ts` にロール別パラメータを追加
- `theme.ts` にM3/DADSモードを追加
- `demo.ts` にエクスポート機能を追加

**メリット:**
- ✅ ファイル数が増えない
- ✅ 既存パターンを活用

**デメリット:**
- ❌ `harmony.ts` が肥大化（現在330行 → 1000行以上）
- ❌ 単一責任の原則違反
- ❌ テストが複雑化

**評価:** 適していない。機能が多すぎて既存クラスが肥大化する。

---

### Option B: Create New Components

**新規ファイル:**
```
src/
├── core/
│   ├── role-config.ts        # ロール別L/C/Hパラメータ定義
│   ├── collision-detector.ts # セマンティック衝突検出
│   ├── m3-generator.ts       # M3トーンスケール生成
│   ├── dads-optimizer.ts     # DADSアクセシビリティ最適化
│   └── role-assigner.ts      # ロール自動割当
├── export/
│   ├── css-exporter.ts       # CSS Custom Properties
│   ├── dtcg-exporter.ts      # W3C Design Tokens
│   ├── tailwind-exporter.ts  # Tailwind設定
│   └── json-exporter.ts      # Raw JSON
├── system/
│   ├── color-system.ts       # 統合エントリーポイント
│   └── parameter-store.ts    # バージョニング/再現性
└── ui/
    └── preview-controller.ts # リアルタイムプレビュー制御
```

**メリット:**
- ✅ 明確な責任分離
- ✅ 各モジュールが独立してテスト可能
- ✅ 将来の拡張が容易

**デメリット:**
- ❌ ファイル数が大幅に増加（10+ファイル）
- ❌ 統合の複雑さ
- ❌ 既存コードとのインターフェース設計が必要

**評価:** 理想的だが、初期実装コストが高い。

---

### Option C: Hybrid Approach（推奨）

**フェーズ1: 最小限の拡張**
- `harmony.ts` の `generateSystemPalette()` をリファクタリング
- `role-config.ts` を新規作成（ロール別パラメータ）
- `color-system.ts` を新規作成（統合エントリーポイント）

**フェーズ2: 新機能追加**
- `collision-detector.ts` 新規作成
- `m3-generator.ts` 新規作成（research後）
- `dads-optimizer.ts` 新規作成

**フェーズ3: エクスポート/UI**
- `export/` ディレクトリを追加
- `demo.ts` をリファクタリング or React化

**メリット:**
- ✅ 段階的な実装が可能
- ✅ 既存機能を壊さない
- ✅ 各フェーズでテスト・検証可能
- ✅ 優先度に応じた実装順序調整が可能

**デメリット:**
- ❌ フェーズ間の整合性管理が必要
- ❌ 最終的なファイル構造が予測しにくい

**評価:** 推奨。リスクを最小化しながら段階的に機能を追加できる。

---

## 4. Implementation Complexity & Risk

### 工数評価: L（1〜2週間）

**根拠:**
- 新規アルゴリズム（衝突回避、M3トーン）の実装が必要
- 10個の要件エリアをカバーする必要あり
- 既存コードとの統合作業が発生
- エクスポート機能は4形式をサポート

**内訳（目安）:**
| 項目 | 工数 |
|------|------|
| R1-R2: ロール/ニュートラル | 1.5日 |
| R3: 衝突回避 | 2日 |
| R4: M3トーン | 1.5日（HCT research含む） |
| R5-R6: DADS/ロール割当 | 1.5日 |
| R7: エクスポート | 1.5日 |
| R8: プレビューUI | 1日 |
| R9-R10: パフォーマンス/バージョニング | 1日 |
| テスト・統合 | 2日 |
| **合計** | **12日（約2週間）** |

### リスク評価: Medium

**リスク要因:**
1. **HCT→OKLCH変換の精度** - Material Design公式実装との差異が生じる可能性
2. **CVDシミュレーション** - 適切なライブラリ選定が必要
3. **パフォーマンス目標（50ms/300ms）** - 達成可能性の検証が必要
4. **UIの複雑化** - demo.ts のリファクタリング範囲が不明確

**軽減策:**
- HCT変換はresearch phaseで検証し、許容誤差を明確化
- CVDはまず単純な変換マトリクスで実装し、後で精度向上
- パフォーマンスは早期にベンチマークを取り、必要に応じてWebWorker化
- UIはまず機能実装を優先し、後でReact化を検討

---

## 5. Recommendations for Design Phase

### 5.1 推奨アプローチ

**Option C（ハイブリッド）を採用**

以下の構造で設計を進める：

```
src/
├── core/                    # 既存（一部拡張）
├── system/                  # 新規：統合レイヤー
│   ├── color-system.ts      # メインエントリーポイント
│   ├── role-config.ts       # ロール別パラメータ
│   ├── collision-detector.ts
│   ├── m3-generator.ts
│   ├── dads-optimizer.ts
│   └── role-assigner.ts
├── export/                  # 新規：エクスポート
└── ui/                      # 既存（大幅拡張）
```

### 5.2 キーとなる設計決定

1. **ColorSystem クラスの設計**
   - ファサードパターンで既存core機能をラップ
   - M3/DADSモードの状態管理
   - 生成パラメータのシリアライズ

2. **ロールパラメータの型定義**
   ```typescript
   interface RoleConfig {
     name: string;
     chromaRange: [number, number];
     lightnessRange: [number, number];
     hueRange?: [number, number]; // semantic用
   }
   ```

3. **衝突検出の戦略**
   - ペアワイズ比較 vs グローバル最適化
   - 調整優先順位（Chroma→Lightness→Hue）の実装

4. **エクスポートのプラグイン化**
   - Exporter インターフェースを定義し、各形式を実装

### 5.3 Research Items（設計フェーズで調査）

1. **HCT色空間の実装**
   - Material Design の `@material/material-color-utilities` を参照
   - OKLCH との変換精度を検証

2. **CVDシミュレーション**
   - `color-blind` npm パッケージの評価
   - Brettel法 vs Viénot法の比較

3. **キャッシュ戦略**
   - Map vs WeakMap vs LRU Cache
   - キーのハッシュ化方法

4. **非同期生成の手法**
   - Web Worker vs `requestIdleCallback`
   - SharedArrayBuffer の活用可能性

### 5.4 優先順位の提案

**Phase 1（コア機能）:**
- R1: 役割別L/C調整
- R2: ニュートラルスケール
- R4: M3準拠シェード（基本）

**Phase 2（アクセシビリティ）:**
- R3: セマンティック衝突回避
- R5: DADSアクセシビリティ
- R6: ロール自動割当

**Phase 3（出力/UX）:**
- R7: エクスポート
- R8: プレビューUI
- R9: パフォーマンス
- R10: バージョニング

---

## 6. Conclusion

### サマリー

既存コードベースはOKLCH色空間、コントラスト計算、基本的なハーモニー生成において強固な基盤を持っています。主要なギャップは以下の通りです：

1. **ロール管理レイヤーの欠如** - 現在は固定パラメータでの生成のみ
2. **高度なアルゴリズム** - 衝突回避、M3トーン、自動調整が未実装
3. **出力・再現性** - エクスポート機能とバージョニングがない

### 次のステップ

1. 本ギャップ分析をレビューし、優先順位を確認
2. `/kiro:spec-design advanced-color-system-generation` で技術設計書を作成
3. 設計フェーズでResearch Itemsを調査し、実装詳細を決定

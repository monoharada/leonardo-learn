# Gap Analysis: CUD-aware Harmony Generator

## 分析サマリー

### 概要
本機能は既存のCUD検証・スナップ機能（表示時適用）を拡張し、**生成時**にCUD最適化を行う新しいアルゴリズムを追加する。既存のアーキテクチャとの親和性が高く、ハイブリッドアプローチ（既存拡張＋新規モジュール追加）が最適。

### 主要な発見
- **既存CUDモジュール**: 検証・スナップの基盤が整備済み（service.ts, snapper.ts, validator.ts）
- **ハーモニー生成**: HCT色空間ベースの生成ロジックが完成済み（harmony.ts）
- **UIコンポーネント**: 3モードセレクター、バッジ、検証パネルが実装済み
- **不足機能**: 最適化アルゴリズム、調和スコア計算、アンカーカラー管理、Soft Snapモード

---

## 1. 現状調査

### 1.1 既存アセット構造

```
src/core/cud/
├── colors.ts          # CUD 20色定義（OKLab/OKLCH値含む）
├── service.ts         # findNearestCudColor(), MatchLevel (exact/near/moderate/off)
├── snapper.ts         # snapToCudColor(), snapPaletteToCud(), snapPaletteUnique()
├── validator.ts       # validatePalette(), 各種検証チェック
├── cvd.ts             # CVDシミュレーター
└── classifier.ts      # 色分類器（HueCluster, LightnessBucket）

src/core/
├── harmony.ts         # generateHarmonyPalette(), HarmonyType, HCT色空間操作
├── color.ts           # Colorクラス（OKLCH操作）
├── solver.ts          # findColorForContrast()（コントラスト比ソルバー）
└── base-chroma.ts     # snapToBaseChroma(), BASE_CHROMAS定義

src/ui/
├── cud-components.ts  # createCudModeSelector(), createCudBadge(), 3モード対応
└── demo.ts            # UI統合、state.cudModeによるモード切り替え

src/core/export/
├── json-exporter.ts   # CUDメタデータ付きJSON出力
├── css-exporter.ts    # CSSカスタムプロパティ出力
└── tailwind-exporter.ts

src/utils/
└── color-space.ts     # deltaEok(), toOklab(), clampChroma()
```

### 1.2 既存のパターンと規約

| 項目 | 規約 |
|------|------|
| 命名規則 | camelCase（関数）、PascalCase（型/interface） |
| テスト配置 | 同一ディレクトリに `*.test.ts` |
| 依存方向 | UI → Core → Utils（逆依存禁止） |
| 色空間 | OKLCH/OKLabをプライマリ、deltaEokで色差計算 |
| 型安全性 | TypeScript strict mode、explicit型定義 |

### 1.3 重要な既存API

```typescript
// CUD Service
type MatchLevel = "exact" | "near" | "moderate" | "off";
findNearestCudColor(hex: string): CudSearchResult;  // deltaE + matchLevel

// CUD Snapper
type SnapOptions = { mode: "strict" | "prefer"; threshold?: number };
snapToCudColor(hex: string, options: SnapOptions): SnapResult;
snapPaletteUnique(palette: string[], options): SnapResult[];

// Harmony
generateHarmonyPalette(keyColor: Color, harmonyType: HarmonyType): SystemPaletteColor[];

// UI
type CudCompatibilityMode = "off" | "guide" | "strict";
createCudModeSelector(onModeChange, initialMode): HTMLElement;
processPaletteWithCudMode(palette, mode): { processed, snapResults? };
```

---

## 2. 要件-アセットマッピング

| 要件ID | 要件名 | 既存アセット | ギャップ |
|--------|--------|--------------|----------|
| **Req 1** | アンカーカラー設定 | `findNearestCudColor()` | **Missing**: アンカー状態管理、ブランド/CUD優先選択UI |
| **Req 2** | CUD許容ゾーン定義 | `DELTA_E_THRESHOLDS` (service.ts) | **Partial**: Safe/Warning/Off概念なし、閾値カスタマイズなし |
| **Req 3** | CUD-aware最適化 | `rotateHueWithHCT()` | **Missing**: 最適化アルゴリズム、目的関数計算 |
| **Req 4** | ブランド調和スコア | `hueDistance()` (harmony.ts) | **Missing**: スコア計算、重み付け、閾値警告 |
| **Req 5** | Soft Snapモード | `snapToCudColor({ mode: "prefer" })` | **Partial**: 戻り係数なし、ゾーン別処理なし |
| **Req 6** | 4段階モードセレクター | `CudCompatibilityMode` (3モード) | **Partial**: Soft Snapモード追加が必要 |
| **Req 7** | 生成結果エクスポート | `json-exporter.ts` | **Partial**: 準拠率、CSSコメント、モード情報なし |
| **Req 8** | 非機能要件 | - | **Missing**: パフォーマンス計測、ADR文書 |

---

## 3. 実装アプローチ選択肢

### Option A: 既存コンポーネント拡張

**対象ファイル:**
- `src/core/cud/service.ts` - ゾーン判定関数追加
- `src/core/cud/snapper.ts` - Soft Snap（戻り係数）ロジック追加
- `src/core/harmony.ts` - CUD最適化パイプライン追加
- `src/ui/cud-components.ts` - 4モード対応、新UIコンポーネント

**トレードオフ:**
- ✅ ファイル数最小、既存テストの再利用可能
- ✅ 既存パターンとの一貫性維持
- ❌ 既存ファイルの肥大化リスク（harmony.ts: 784行）
- ❌ 責務の混在（ハーモニー生成 + CUD最適化）

### Option B: 新規コンポーネント作成

**新規ファイル:**
- `src/core/cud/optimizer.ts` - CUD最適化アルゴリズム
- `src/core/cud/harmony-score.ts` - 調和スコア計算
- `src/core/cud/anchor.ts` - アンカーカラー管理
- `src/core/cud/zone.ts` - ゾーン定義・判定

**トレードオフ:**
- ✅ 明確な責務分離（単一責任原則）
- ✅ テストしやすい（モジュール単位）
- ✅ 既存コードへの影響最小
- ❌ ファイル数増加
- ❌ 新規インターフェース設計が必要

### Option C: ハイブリッドアプローチ（推奨）

**戦略:**
1. **コア最適化ロジック**: 新規モジュールとして作成（責務分離）
2. **既存API拡張**: 後方互換性を維持しつつ新機能を追加
3. **UI統合**: 既存コンポーネントを拡張

**具体的な分割:**

| 責務 | 方針 | ファイル |
|------|------|----------|
| アンカーカラー管理 | 新規 | `src/core/cud/anchor.ts` |
| ゾーン定義・判定 | 新規 | `src/core/cud/zone.ts` |
| 最適化アルゴリズム | 新規 | `src/core/cud/optimizer.ts` |
| 調和スコア計算 | 新規 | `src/core/cud/harmony-score.ts` |
| Soft Snap拡張 | 拡張 | `src/core/cud/snapper.ts` |
| 4モードUI | 拡張 | `src/ui/cud-components.ts` |
| エクスポート拡張 | 拡張 | `src/core/export/json-exporter.ts`, `css-exporter.ts` |

**トレードオフ:**
- ✅ 責務分離と既存活用のバランス
- ✅ 段階的な実装・テストが可能
- ✅ 既存機能への影響を最小化
- ❌ 計画の複雑さ（新規/拡張の判断が必要）

---

## 4. 技術的詳細分析

### 4.1 アンカーカラー（Req 1）

**既存:**
- `findNearestCudColor(hex)` でCUD最近接色を検索可能

**不足:**
- アンカー状態（originalHex, cudTarget, priority: "brand" | "cud"）の保持
- ブランド/CUD優先選択のUI

**実装方針:**
```typescript
// 新規: src/core/cud/anchor.ts
interface AnchorColorState {
  originalHex: string;
  nearestCud: CudSearchResult;
  priority: "brand" | "cud";
  effectiveHex: string;  // priority に応じた実際に使用する色
}

function createAnchorColor(hex: string): AnchorColorState;
function setAnchorPriority(anchor: AnchorColorState, priority): AnchorColorState;
```

### 4.2 CUDゾーン（Req 2）

**既存:**
```typescript
// service.ts
const DELTA_E_THRESHOLDS = {
  exact: 0.03,
  near: 0.10,
  moderate: 0.20,
};
```

**不足:**
- Safe/Warning/Off Zone概念（新しい閾値: 0.05/0.12）
- カスタマイズ可能な閾値設定

**実装方針:**
```typescript
// 新規: src/core/cud/zone.ts
type CudZone = "safe" | "warning" | "off";

interface ZoneThresholds {
  safe: number;     // default: 0.05
  warning: number;  // default: 0.12
}

function getZone(deltaE: number, thresholds?: ZoneThresholds): CudZone;
function createZoneConfig(custom?: Partial<ZoneThresholds>): ZoneThresholds;
```

### 4.3 最適化アルゴリズム（Req 3）

**既存:**
- `generateHarmonyPalette()` でHCTベースの候補生成
- `snapToCudColor()` で個別色のスナップ

**不足:**
- 多目的最適化（CUD距離 + 調和スコア）
- λ重み係数による調整

**実装方針:**
```typescript
// 新規: src/core/cud/optimizer.ts
interface OptimizationOptions {
  lambda: number;  // CUD vs Harmony weight (0-1)
  mode: "soft" | "strict";
  zoneThresholds?: ZoneThresholds;
}

interface OptimizationResult {
  palette: OptimizedColor[];
  objectiveValue: number;
  cudComplianceRate: number;
  harmonyScore: number;
}

function optimizePaletteForCud(
  candidates: Color[],
  anchor: AnchorColorState,
  options: OptimizationOptions
): OptimizationResult;
```

### 4.4 調和スコア（Req 4）

**既存:**
- `hueDistance(hue1, hue2)` - 色相距離計算
- `getContrastRatio(hex1, hex2)` - コントラスト比計算

**不足:**
- 総合スコア計算式
- 重み付けカスタマイズ

**実装方針:**
```typescript
// 新規: src/core/cud/harmony-score.ts
interface HarmonyScoreWeights {
  hue: number;        // default: 0.4
  lightness: number;  // default: 0.3
  contrast: number;   // default: 0.3
}

interface HarmonyScoreResult {
  total: number;  // 0-100
  breakdown: {
    hueScore: number;
    lightnessScore: number;
    contrastScore: number;
  };
}

function calculateHarmonyScore(
  anchor: Color,
  palette: Color[],
  weights?: HarmonyScoreWeights
): HarmonyScoreResult;
```

### 4.5 Soft Snap拡張（Req 5）

**既存:**
```typescript
// snapper.ts
type SnapOptions = { mode: "strict" | "prefer"; threshold?: number };
```

**不足:**
- 戻り係数（returnFactor: 0.0-1.0）
- ゾーンベースの処理分岐

**実装方針:**
```typescript
// 拡張: src/core/cud/snapper.ts
interface SoftSnapOptions extends SnapOptions {
  mode: "strict" | "prefer" | "soft";
  returnFactor?: number;  // 0.0-1.0, default: 0.5
  zoneThresholds?: ZoneThresholds;
}

interface SoftSnapResult extends SnapResult {
  zone: CudZone;
  explanation: string;  // 自動生成説明文
}

function softSnapToCudColor(hex: string, options: SoftSnapOptions): SoftSnapResult;
```

### 4.6 UIモード拡張（Req 6）

**既存:**
```typescript
// cud-components.ts
type CudCompatibilityMode = "off" | "guide" | "strict";
```

**拡張:**
```typescript
// 拡張: src/ui/cud-components.ts
type CudCompatibilityMode = "off" | "guide" | "soft" | "strict";

// LocalStorage永続化
const STORAGE_KEY = "cud-compatibility-mode";
function saveCudMode(mode: CudCompatibilityMode): void;
function loadCudMode(): CudCompatibilityMode;
```

---

## 5. 実装複雑度とリスク

### 努力見積もり: **M（3-7日）**

| タスク | 見積もり |
|--------|----------|
| アンカーカラー（anchor.ts） | 0.5日 |
| ゾーン定義（zone.ts） | 0.5日 |
| 最適化アルゴリズム（optimizer.ts） | 2日 |
| 調和スコア（harmony-score.ts） | 1日 |
| Soft Snap拡張（snapper.ts） | 1日 |
| UI拡張（cud-components.ts） | 1日 |
| エクスポート拡張 | 0.5日 |
| テスト・統合 | 1日 |

**根拠:**
- 既存パターンとの高い親和性（HCT/OKLab基盤が整備済み）
- 明確な数式ベースの実装（目的関数、調和スコア）
- UIは既存コンポーネントの拡張で対応可能

### リスク評価: **Medium**

| リスク | 詳細 | 緩和策 |
|--------|------|--------|
| 最適化パフォーマンス | 20色パレットで200ms以内の要件 | 早期にベンチマーク、必要ならキャッシュ導入 |
| 調和スコアの妥当性 | 主観的品質をスコア化する難しさ | ゴールデンテストで基準パターンを定義 |
| UIの複雑化 | 4モード + 各種表示の管理 | 状態管理の整理、コンポーネント分割 |

---

## 6. 設計フェーズへの推奨事項

### 推奨アプローチ: **Option C（ハイブリッド）**

1. **新規モジュール作成:**
   - `src/core/cud/anchor.ts` - アンカーカラー状態管理
   - `src/core/cud/zone.ts` - ゾーン定義・判定
   - `src/core/cud/optimizer.ts` - CUD最適化アルゴリズム
   - `src/core/cud/harmony-score.ts` - 調和スコア計算

2. **既存モジュール拡張:**
   - `src/core/cud/snapper.ts` - Soft Snap機能追加
   - `src/ui/cud-components.ts` - 4モードUI、LocalStorage永続化
   - `src/core/export/json-exporter.ts` - 準拠率、モード情報追加
   - `src/core/export/css-exporter.ts` - CUDコメント追加

### 設計フェーズでの研究項目

1. **最適化アルゴリズムの選定**
   - 貪欲法 vs 遺伝的アルゴリズム vs 勾配降下
   - 20色パレットでの計算量評価

2. **調和スコアの重み付け検証**
   - CUD公式の「良い例」パターンでの検証
   - ユーザーテストでの妥当性確認

3. **Soft Snap戻り係数の最適値**
   - 視覚的品質と CUD準拠のバランス点を探索

### 決定事項

| 項目 | 決定 |
|------|------|
| アーキテクチャ | ハイブリッド（新規4 + 拡張4モジュール） |
| ゾーン閾値 | Safe: ≤0.05, Warning: ≤0.12, Off: >0.12 |
| 調和スコア式 | w1×hue + w2×lightness + w3×contrast (要検証) |
| UIモード | off / guide / soft / strict の4段階 |

---

## 7. 次のステップ

1. `/kiro:spec-design cud-aware-harmony-generator` で技術設計書を作成
2. ADRとして最適化アルゴリズムの選定理由を文書化
3. 実装タスクの分解と優先順位付け

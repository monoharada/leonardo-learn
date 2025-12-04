# Gap Analysis: CUD Color Integration

## 1. 現状調査

### 1.1 関連する既存アセット

| モジュール | パス | 再利用可能な機能 |
|-----------|------|-----------------|
| CVD Simulator | `src/accessibility/cvd-simulator.ts` | `simulateCVD()`, protanopia/deuteranopia/tritanopia/achromatopsia対応済み |
| Distinguishability | `src/accessibility/distinguishability.ts` | `calculateDeltaE()`, `calculateSimpleDeltaE()`, CVDスコア計算 |
| Color Space | `src/utils/color-space.ts` | `toOklch`, `toHex`, `parseColor`, culori.js統合 |
| WCAG Utils | `src/utils/wcag.ts` | `getContrast()`, 閾値定数 |
| Base Chroma | `src/core/base-chroma.ts` | 色定義パターン、`BaseChromaDefinition`型 |
| JSON Exporter | `src/core/export/json-exporter.ts` | OKLCH/sRGB/P3エクスポート |
| CSS Exporter | `src/core/export/css-exporter.ts` | CSS Custom Properties生成 |
| Demo UI | `src/ui/demo.ts` | DADSモード、CVDシミュレーション表示 |

### 1.2 アーキテクチャパターン

```
src/
├── core/           # ドメインロジック（色生成、ハーモニー）
├── accessibility/  # アクセシビリティ機能（CVD、コントラスト）
├── utils/          # 汎用ユーティリティ（色空間変換、WCAG計算）
└── ui/             # UIコンポーネント
```

**依存関係方向**: `ui/ → core/ → utils/` / `ui/ → accessibility/ → core/`

### 1.3 既存の命名規則

- **型定義**: `interface XxxDefinition`, `type XxxType`
- **定数**: `UPPER_SNAKE_CASE` (例: `BASE_CHROMAS`, `DADS_CHROMAS`)
- **関数**: `camelCase` (例: `findNearestChroma`, `simulateCVD`)
- **ファイル**: `kebab-case.ts` (例: `cvd-simulator.ts`, `color-space.ts`)

## 2. 要件と既存アセットのマッピング

| 要件 | 状態 | 既存アセット | ギャップ |
|------|------|-------------|---------|
| Req 1: CUDカラーデータ管理 | **Missing** | `base-chroma.ts`の設計パターン | 20色定義、OKLCH/OKLabキャッシュ、統計関数が必要 |
| Req 2: CUDカラーサービスAPI | **Missing** | - | get/find/nearest API全体が新規 |
| Req 3: CVDシミュレーション | **Partial** | `cvd-simulator.ts` | 戻り値にOKLab/OKLCH形式追加が必要 |
| Req 4: パレット検証エンジン | **Partial** | `distinguishability.ts` | CUD固有チェック（7種のissue）が新規 |
| Req 5: 色相・明度分類 | **Missing** | - | HueCluster/LightnessBucket分類ロジック全体が新規 |
| Req 6: DADS UI統合 | **Partial** | `demo.ts`のDADSモード | CUDバッジ、診断結果3カラム表示が新規 |
| Req 7: アクセシビリティビュー | **Partial** | `demo.ts`のCVD表示 | cvd_confusion_risk表示、小さい文字切替が新規 |
| Req 8: エクスポート拡張 | **Partial** | `json-exporter.ts`, `css-exporter.ts` | `cudMetadata`オプション追加が必要 |
| Req 9: deltaEok計算 | **Partial** | `calculateSimpleDeltaE` | OKLab純粋ユークリッド関数を`color-space.ts`に追加 |
| Req 10: テスト/ドキュメント | **Missing** | - | CUD専用テスト、リファレンスドキュメントが新規 |

### 2.1 詳細ギャップ分析

#### Req 3: CVDシミュレーション (Partial)

**既存**: `simulateCVD(color, type): Color`
**必要**: 戻り値を`{ hex, oklab, oklch }`形式に拡張

**オプション**:
- A: 既存関数を拡張（後方互換性の考慮必要）
- B: 新規関数`simulateCvdWithFormats()`を追加（推奨）

#### Req 4: パレット検証エンジン (Partial)

**既存**:
- `checkPaletteDistinguishability()` - CVDペア識別性
- `calculateSimpleDeltaE()` - 色差計算

**新規必要**:
- CUDセット整合チェック (`not_in_cud_set`)
- コントラストチェック (`low_contrast`, `small_text_low_contrast`)
- 役割バランスチェック (`ambiguous_role`, `too_many_similar_hues`)
- 良い例判定 (`cud_good_example_like`)

#### Req 9: deltaEok計算 (Partial)

**既存**: `calculateSimpleDeltaE()` - OKLCH座標を直交変換してユークリッド距離

**必要**: OKLab空間での純粋なユークリッド距離 `deltaEok(oklab1, oklab2)`

```ts
// 現在（OKLCH→直交座標変換）
const a = oklch.c * Math.cos(h);
const b = oklch.c * Math.sin(h);

// 必要（OKLab直接）
sqrt((L2-L1)² + (a2-a1)² + (b2-b1)²)
```

## 3. 実装アプローチの選択肢

### Option A: 既存コンポーネント拡張

**対象**: Req 3, 8, 9

| 拡張対象 | 変更内容 |
|---------|---------|
| `cvd-simulator.ts` | `simulateCvdWithFormats()`追加 |
| `color-space.ts` | `toOklab()`, `deltaEok()`追加 |
| `json-exporter.ts` | `cudMetadata`オプション追加 |

**Trade-offs**:
- ✅ ファイル数増加を抑制
- ✅ 既存パターンを活用
- ❌ 既存ファイルの肥大化リスク
- ❌ 循環依存に注意が必要

### Option B: 新規コンポーネント作成

**対象**: Req 1, 2, 4, 5

```
src/core/cud/
├── types.ts        # CudColor, CudGroup, PaletteIssue型
├── colors.ts       # CUD_COLOR_SET定数、OKLCHキャッシュ
├── service.ts      # get/find/nearest API
├── classifier.ts   # HueCluster/LightnessBucket分類
├── checker.ts      # checkPaletteAgainstCudGuidelines
└── index.ts        # 公開API
```

**Trade-offs**:
- ✅ 明確な責任分離
- ✅ テストが容易
- ✅ 循環依存を回避
- ❌ ファイル数増加
- ❌ 新しいディレクトリ構造の学習コスト

### Option C: ハイブリッドアプローチ（推奨）

**新規作成**: `src/core/cud/`（データ層、サービス層、チェッカー）
**既存拡張**: `color-space.ts`, `json-exporter.ts`, `demo.ts`

**フェーズ分割**:
1. **Phase 1**: データ層 + deltaEok（依存なし）
2. **Phase 2**: サービス層 + CVD拡張（Phase 1に依存）
3. **Phase 3**: チェッカー層（Phase 1, 2に依存）
4. **Phase 4**: UI統合 + エクスポート拡張（Phase 1-3に依存）

## 4. 複雑性とリスク評価

### 4.1 実装工数見積もり

| 要件 | 工数 | 根拠 |
|------|------|------|
| Req 1: CUDデータ管理 | **S** | 定数定義、既存パターン踏襲 |
| Req 2: CUDサービスAPI | **S** | 単純なCRUD的API |
| Req 3: CVD拡張 | **S** | 既存関数のラッパー追加 |
| Req 4: パレット検証 | **M** | 7種のチェックロジック、複雑な判定 |
| Req 5: 色分類 | **S** | 閾値ベースの分類ロジック |
| Req 6: DADS UI統合 | **M** | 既存UIへの複数箇所変更 |
| Req 7: アクセシビリティUI | **S** | 限定的なUI追加 |
| Req 8: エクスポート拡張 | **S** | オプション追加のみ |
| Req 9: deltaEok | **S** | 数式実装のみ |
| Req 10: テスト/ドキュメント | **M** | スナップショット、ゴールデンパターン |

**総合工数**: **M**（3-7日）

### 4.2 リスク評価

| リスク | レベル | 対策 |
|--------|--------|------|
| OKLCH変換の精度 | Low | culori.js依存、既存実装で実績あり |
| UI表示崩れ（issue数過多） | Medium | アコーディオン形式、段階的開示 |
| 循環依存 | Low | 新規ディレクトリで分離 |
| 後方互換性 | Low | 新規API追加、既存関数は非破壊 |

**総合リスク**: **Low**

## 5. 設計フェーズへの推奨事項

### 5.1 推奨アプローチ

**Option C（ハイブリッド）を推奨**

- 新規`src/core/cud/`ディレクトリで明確な責任分離
- 既存`color-space.ts`に`deltaEok`追加で再利用性向上
- フェーズ分割で段階的検証が可能

### 5.2 設計フェーズで検討すべき項目

1. **CUD 20色の正確な値**: HEX値の出典確認、OKLCH/OKLab変換の再現性検証
2. **deltaE閾値の妥当性**: 0.03/0.06の閾値は知覚的に適切か（Research Needed）
3. **UI表示パターン**: issue数が多い場合のUX設計
4. **エクスポートフォーマット**: cudMetadataのスキーマ定義

### 5.3 追加調査項目（Research Needed）

- [ ] CUD ver.4公式HEX値の出典URL確認
- [ ] Brettel vs Machado行列のパフォーマンス比較（既存はBrettel採用済み）
- [ ] OKLab deltaE閾値の知覚的妥当性検証

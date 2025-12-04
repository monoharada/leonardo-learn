# CUD機能 概要ドキュメント

## 1. 機能概要

**CUD（カラーユニバーサルデザイン）推奨配色セット ver.4** を DADSハーモニーシステムに統合し、色覚多様性に配慮したパレット検証・生成を提供する機能。

公式参照: https://jfly.uni-koeln.de/colorset/

---

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  src/ui/demo.ts          - メインUI統合                      │
│  src/ui/cud-components.ts - CUD専用UIコンポーネント          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       Core Layer                             │
│  src/core/cud/                                               │
│  ├── colors.ts     - CUD 20色データ定義                     │
│  ├── service.ts    - 検索API（完全一致・最近接色）           │
│  ├── classifier.ts - 色分類器（色相・明度・彩度）            │
│  ├── cvd.ts        - CVDシミュレーター（P型/D型）            │
│  ├── validator.ts  - パレット検証エンジン                    │
│  └── snapper.ts    - CUD互換モード（スナップ機能）           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. コアモジュール詳細

| ファイル | 役割 | 主要関数/型 |
|----------|------|-------------|
| **colors.ts** | CUD推奨色20色のデータ定義 | `CUD_COLOR_SET`, `CudColor`, `CudGroup` |
| **service.ts** | CUD色の検索・取得API | `getCudColorSet()`, `findNearestCudColor()`, `findExactCudColorByHex()`, `MatchLevel` |
| **classifier.ts** | 色の分類（色相クラスタ、明度/彩度バケット） | `classifyColor()`, `classifyHue()`, `HueCluster`, `LightnessBucket` |
| **cvd.ts** | CVD（色覚特性）シミュレーション | `simulateCvd()`, `simulateCvdWithFormats()` |
| **validator.ts** | パレット全体の検証エンジン | `validatePalette()`, `ValidationResult`, `ValidationIssue` |
| **snapper.ts** | CUD推奨色へのスナップ機能 | `snapToCudColor()`, `snapPaletteToCud()`, `snapPaletteUnique()` |

---

## 4. ロジック詳細

### 4.1 CUD色データ（colors.ts）

```
20色 = アクセント9色 + ベース7色 + 無彩色4色

各色のデータ構造:
- id: 一意識別子
- hex: HEXカラーコード
- nameJa: 日本語名
- nameEn: 英語名
- group: accent | base | neutral
- oklch: OKLCH色空間値
- oklab: OKLAB色空間値
```

### 4.2 マッチレベル判定（service.ts）

deltaE（OKLAB色差）による4段階判定:

| レベル | deltaE閾値 | 意味 | UI表示 |
|--------|-----------|------|--------|
| exact | ≤ 0.03 | CUD推奨色と同等 | 警告なし |
| near | ≤ 0.10 | 近い色 | info（水色バッジ） |
| moderate | ≤ 0.20 | やや離れている | warning（オレンジバッジ） |
| off | > 0.20 | 離れている | warning（グレーバッジ） |

### 4.3 パレット検証（validator.ts）

5種類のチェックを実行:

| チェック種別 | 説明 | 深刻度 |
|-------------|------|--------|
| not_in_cud_set | CUD推奨色セット外かどうか | info/warning |
| low_contrast | コントラスト比不足 | error |
| cvd_confusion_risk | CVD状態での混同リスク | warning |
| too_similar | 類似色の検出 | warning |
| cud_good_example | CUD推奨パターン検出 | info |

### 4.4 CVDシミュレーション（cvd.ts）

Brettel法による色覚シミュレーション:

- **protan (P型)**: 赤色覚異常シミュレーション
- **deutan (D型)**: 緑色覚異常シミュレーション

混同リスク判定: シミュレーション後のdeltaE < 0.1 で警告

### 4.5 スナップ機能（snapper.ts）

生成色をCUD推奨色にマッピング:

| 関数 | 説明 |
|------|------|
| `snapToCudColor()` | 単一色をCUD推奨色にスナップ |
| `snapPaletteToCud()` | パレット全体をスナップ |
| `snapPaletteUnique()` | 重複回避スナップ（20色を最大限活用） |
| `findCudColorByHue()` | 色相に基づくCUD色選択 |
| `generateCudHarmonyPalette()` | CUD互換ハーモニーパレット生成 |

---

## 5. UI機能（表出している機能）

### 5.1 CUDモードセレクター

| モード | 動作 |
|--------|------|
| **通常モード（off）** | CUD機能無効。自由な色生成 |
| **CUDガイドモード（guide）** | バッジ表示 + 検証パネル。警告レベル段階化 |
| **CUD互換モード（strict）** | 全色をCUD推奨色20色にスナップ + 検証 |

### 5.2 CUDバッジ

| バッジ | 背景色 | 意味 |
|--------|--------|------|
| `CUD` | 緑 (#35A16B) | CUD推奨色と完全一致 |
| `≈CUD` | 水色 (#66CCFF) | CUD推奨色に近い（info） |
| `~CUD` | オレンジ (#FF9900) | やや離れている（warning） |
| `!CUD` | グレー (#84919E) | CUD推奨色セット外 |

### 5.3 検証パネル

- **3カラムレイアウト**: エラー / 警告 / 情報
- **CVD混同リスク分析**: P型/D型での混同可能性を表示
- **strictモード**: 「スナップ適用済み」タイトル表示

### 5.4 CUD範囲ガイド

- CUD推奨色セットの概要説明
- バッジ凡例の表示

---

## 6. ファイル一覧

### コアモジュール（src/core/cud/）

| ファイル | 説明 |
|----------|------|
| colors.ts | CUD 20色データ定義（OKLCH/OKLAB値含む） |
| service.ts | 検索API（完全一致・最近接色・マッチレベル判定） |
| classifier.ts | 色分類器（色相クラスタ・明度/彩度バケット） |
| cvd.ts | CVDシミュレーター（Brettel法） |
| validator.ts | パレット検証エンジン（5種類のチェック） |
| snapper.ts | CUD互換モード（スナップ機能） |

### テストファイル（src/core/cud/）

| ファイル | 説明 |
|----------|------|
| colors.test.ts | 色データの整合性検証 |
| service.test.ts | 検索API検証 |
| classifier.test.ts | 分類器の動作検証 |
| cvd.test.ts | CVDシミュレーション精度検証 |
| validator.test.ts | 検証ロジックのユニットテスト |
| validator-golden.test.ts | ゴールデンテスト（期待値検証） |
| snapper.test.ts | スナップ機能テスト（18テスト） |
| snapshot.test.ts | スナップショットテスト |
| circular-import.test.ts | 循環参照チェック |

### UIモジュール（src/ui/）

| ファイル | 説明 |
|----------|------|
| cud-components.ts | CUD専用UIコンポーネント（バッジ、検証パネル、モードセレクター） |
| demo.ts | メインUI（CUD機能統合箇所） |

---

## 7. データフロー

```
ユーザー入力（ブランドカラー）
         ↓
   ハーモニー生成（generateHarmonyPalette）
         ↓
┌────────────────────────────────────────┐
│ CUDモード判定                          │
│ ├─ off:    そのまま表示               │
│ ├─ guide:  バッジ + 検証パネル表示     │
│ └─ strict: スナップ → バッジ + 検証    │
└────────────────────────────────────────┘
         ↓
   パレット検証（validatePalette）
   ├─ CUD推奨色チェック
   ├─ コントラスト比チェック
   ├─ CVD混同リスクチェック
   ├─ 類似色チェック
   └─ 推奨パターン検出
         ↓
   結果表示
   ├─ バッジ（各色に表示）
   ├─ 検証パネル（3カラム）
   └─ CVD混同リスク詳細
```

---

## 8. CUD推奨色セット一覧

### アクセント色（9色）

| ID | 日本語名 | HEX | 用途 |
|----|---------|-----|------|
| red | 赤 | #FF2800 | 警告・エラー |
| orange | オレンジ | #FF9900 | 注意・警告 |
| yellow | 黄 | #FFFF00 | 注意・ハイライト |
| green | 緑 | #35A16B | 成功・確認 |
| blue | 青 | #0041FF | 情報・リンク |
| sky | 空色 | #66CCFF | 補助情報 |
| pink | ピンク | #FF99A0 | 装飾 |
| purple | 紫 | #9A0079 | 装飾 |
| brown | 茶 | #663300 | 装飾 |

### ベース色（7色）

| ID | 日本語名 | HEX |
|----|---------|-----|
| light_pink | 明るいピンク | #FFD1D1 |
| cream | クリーム | #FFFF99 |
| light_yellow_green | 明るい黄緑 | #CBFF99 |
| light_green | 明るい緑 | #77D9A8 |
| light_sky | 明るい空色 | #B4EBFA |
| beige | ベージュ | #EDC58F |
| light_purple | 明るい紫 | #C9ACE6 |

### 無彩色（4色）

| ID | 日本語名 | HEX |
|----|---------|-----|
| white | 白 | #FFFFFF |
| light_gray | 明るいグレー | #C8C8CB |
| gray | グレー | #84919E |
| black | 黒 | #000000 |

---

## 9. 今後の拡張ポイント

- [ ] エクスポート時のCUDメタデータ出力
- [ ] ダークモード対応（背景色切り替え時の再計算）
- [ ] CUD色への自動スナップ（生成時に適用）
- [ ] Figmaトークン出力でのCUD情報付与
- [ ] E2Eテスト追加（Playwright）
- [ ] PDF/CMYKデータの完全サポート

---

## 10. 参照資料

- [CUD推奨配色セット ver.4 公式ガイドブック](https://jfly.uni-koeln.de/colorset/)
- [OKLAB色空間](https://bottosson.github.io/posts/oklab/)
- [Brettel CVDシミュレーション](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html)

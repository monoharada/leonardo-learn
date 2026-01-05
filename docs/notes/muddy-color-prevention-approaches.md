# アクセントカラーの「汚い色」対策アプローチ

## 問題

ハーモニー計算で生成されるアクセントカラーが、特定の色相帯（特に黄緑〜茶色）で濁った・くすんだ印象になる。

### 問題が起きやすい色相帯（HCT色空間）
- **茶色帯**: 20-60°
- **黄色帯**: 60-120°（最も顕著）
- **黄緑帯**: 120-150°

---

## 実装済みアプローチ（現在の方式）

### 方式: 色相帯別の明度・彩度自動調整

**ファイル**: `src/core/harmony.ts` - `getVibrancyAdjustment()`

```typescript
interface VibrancyAdjustment {
  toneBoost: number;       // 明度ブースト（0-15）
  chromaMultiplier: number; // 彩度乗数（1.0-1.2）
  toneBlendFactor: number;  // 最適Toneへのブレンド係数
}
```

| 色相帯 | HCT Hue | toneBoost | chromaMultiplier | toneBlendFactor |
|--------|---------|-----------|------------------|-----------------|
| 茶色帯 | 20-60° | 最大8 | 1.1 | 0.7-0.85 |
| 黄色帯 | 60-120° | 最大15 | 1.15-1.2 | 0.85-0.95 |
| 黄緑帯 | 120-150° | 最大10 | 1.1 | 0.75-0.85 |

**メリット**:
- 既存のハーモニー計算ロジックに統合
- 色相ごとに連続的な調整（急激な変化なし）
- HCTの知覚均等性を活用

**デメリット**:
- パラメータ調整が経験的
- 極端なケースでの効果が限定的

---

## 代替アプローチ（未実装）

### 1. 問題色相帯の候補除外

**概要**: アクセント候補生成時に、問題のある色相帯の候補を除外またはペナルティ

```typescript
// accent-candidate-service.ts での実装案
function isProblemHue(hue: number): boolean {
  const h = ((hue % 360) + 360) % 360;
  return (h >= 20 && h <= 60) ||   // 茶色
         (h >= 75 && h <= 105) ||  // 黄色コア
         (h >= 120 && h <= 140);   // 黄緑
}

// スコア計算時にペナルティ
if (isProblemHue(candidate.hue)) {
  score.total *= 0.7; // 30%減点
}
```

**メリット**: シンプル、確実に問題色を回避
**デメリット**: 色の選択肢が減る、ブランドカラーが問題帯の場合に困る

---

### 2. OKLCH色空間での回転

**概要**: HCTではなくOKLCHで色相回転を行う

```typescript
// harmony.ts での実装案
function rotateHueWithOKLCH(sourceHex: string, hueShift: number): Color {
  const oklch = toOklch(sourceHex);
  if (!oklch) return new Color(sourceHex);

  const newHue = ((oklch.h ?? 0) + hueShift) % 360;

  // OKLCHの明度・彩度をそのまま使用
  const newOklch = { ...oklch, h: newHue };
  return new Color(formatHex(newOklch));
}
```

**メリット**:
- OKLCHの方がWeb標準に近い
- culori.jsと統一的に扱える

**デメリット**:
- HCTの知覚均等性を失う
- Material Designとの互換性が下がる

---

### 3. DADSトークンのプリフィルタリング

**概要**: 130のDADSトークンから、視覚的に「汚く」見えるものを事前に除外

```typescript
// 除外リスト（手動キュレーション）
const EXCLUDED_DADS_TOKENS = [
  'olive-600',
  'brown-500',
  'khaki-400',
  // ... 視覚的に濁っているトークン
];

// generateCandidates()での除外
candidates = candidates.filter(c =>
  !EXCLUDED_DADS_TOKENS.includes(c.dadsSourceName)
);
```

**メリット**: 確実に問題トークンを除外
**デメリット**: 手動メンテナンスが必要、主観的

---

### 4. 後処理での彩度ブースト

**概要**: 生成後のパレット全体に対して彩度を上げる

```typescript
// harmony-palette-generator.ts での実装案
function boostSaturation(hex: string, factor: number = 1.2): string {
  const oklch = toOklch(hex);
  if (!oklch) return hex;

  const boostedChroma = Math.min((oklch.c ?? 0) * factor, 0.4);
  return formatHex({ ...oklch, c: boostedChroma });
}

// パレット生成後に適用
result.accentColors = result.accentColors.map(c =>
  boostSaturation(c, 1.15)
);
```

**メリット**: 全体的に鮮やかな印象に
**デメリット**: アクセシビリティ（コントラスト）に影響する可能性

---

### 5. 知覚的色差メトリクスによるフィルタリング

**概要**: ΔE00（CIEDE2000）を使って、グレーに近い色を検出・除外

```typescript
// 純粋なグレーとの色差が小さい = 彩度が低い = 濁っている
function isMuddy(hex: string): boolean {
  const oklch = toOklch(hex);
  if (!oklch) return false;

  // 彩度が低く、明度が中間域
  const lowChroma = (oklch.c ?? 0) < 0.05;
  const midLightness = oklch.l > 0.3 && oklch.l < 0.7;

  return lowChroma && midLightness;
}
```

**メリット**: 客観的な基準
**デメリット**: 彩度だけでは「濁り」を完全に捉えられない

---

### 6. 候補スコアリングの重み付け調整

**概要**: `accent-candidate-service.ts`のスコア計算で、問題帯にペナルティ

```typescript
// score計算に vibrancy factor を追加
const vibrancyScore = calculateVibrancyScore(candidate.hue, candidate.lightness);

score.total = (
  score.contrast * 0.3 +
  score.harmony * 0.3 +
  score.distinctiveness * 0.2 +
  vibrancyScore * 0.2  // 新規追加
);
```

**メリット**: 既存のスコアリング機構を活用
**デメリット**: 重み調整が複雑

---

### 7. MLベースの色品質スコアリング

**概要**: 機械学習モデルで「美しい色」をスコアリング

```typescript
// 仮想的な実装
async function predictColorQuality(hex: string): Promise<number> {
  // 事前学習済みモデルで推論
  const features = extractColorFeatures(hex);
  return await model.predict(features);
}
```

**メリット**: 人間の感覚に近い判定が可能
**デメリット**: モデルの準備・メンテナンスが大変、ブラウザでの実行が重い

---

## 検証方法

### 視覚的テスト
1. 問題が起きやすいブランドカラーでテスト:
   - `#3366cc` (青) → 補色が黄色帯
   - `#bb87ff` (ラベンダー) → 補色が黄緑帯
   - `#0c472a` (ダークグリーン) → 補色が赤茶帯

2. 生成されたパレットのスクリーンショットを比較

### 定量的テスト
- OKLCHのchroma値の分布を測定
- 問題帯の色がどれだけ選ばれているかをカウント

---

## 参考資料

- [HCT Color Space - Material Design](https://material.io/blog/science-of-color-design)
- [OKLCH in CSS - Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [Color Appearance Models - CIE](http://cie.co.at/)

---

## 変更履歴

- 2026-01-04: 初版作成（方式1「色相帯別の明度・彩度自動調整」を実装）

# パステルプリセット コントラスト比問題 - 調査完了・修正計画

## エグゼクティブサマリー

**問題**: パステルプリセット選択時、Studioプレビューのテキストが読めないほどコントラスト比が低い

**根本原因**: 数学的限界 + フォールバックロジックの設計不備
- パステル色の明度（L≥0.75）と白背景の明度（L≈0.999）が近すぎる
- 最大でも1.986:1のコントラストしか得られない（目標3:1に対して67%不足）
- フォールバック時にコントラスト条件を完全に無視している

**影響範囲**: パステルプリセットのみ（他4プリセットは問題なし）

**推奨修正**: フォールバックロジックの改善（明度自動調整）

---

## 調査結果の詳細

### Phase 1: 数値的検証（定量評価）

#### 検証データ
- 対象: DADSトークンからパステル条件（L≥0.75, C≤0.1）を満たす**29色**
- 背景: 白（#ffffff）および暗い背景（#1a1a1a）

#### 結果

| 指標 | 白背景 | 暗い背景 |
|------|--------|----------|
| 最小コントラスト | 1.066:1 | 8.59:1 |
| 最大コントラスト | 1.986:1 | 16.00:1 |
| 平均コントラスト | 1.45:1 | 12.3:1 |
| 3:1達成率 | **0%** | **100%** |
| 7:1達成率 | **0%** | **100%** |

#### 数学的証明
```
WCAG コントラスト比 = (L1 + 0.05) / (L2 + 0.05)
- 白背景: L1 ≈ 1.0
- パステル色: L2 ≥ 0.75（定義上）

最大理論コントラスト = (1.0 + 0.05) / (0.75 + 0.05) = 1.3125:1

実測最大値 1.986:1 は、彩度による微小な明度差で説明可能
→ **3:1は数学的に不可能**
```

### Phase 2: 視覚的検証（定性評価）

#### プリセット比較

| プリセット | 識別性スコア | 見出しコントラスト | 状態 |
|-----------|-------------|-------------------|------|
| **Pastel** | 85/100 | **極端に低い** | ⚠️ 警告 |
| Default | 100/100 | 高い | ✅ 正常 |
| Vibrant | 100/100 | 高い | ✅ 正常 |
| Dark | 95/100 | 良好 | ✅ 正常 |
| High Contrast | 100/100 | 非常に高い | ✅ 正常 |

#### パステルプリセットの具体的な問題

| UI要素 | 問題 | 深刻度 |
|--------|------|--------|
| ヒーロー見出し | 薄い緑テキスト×薄い緑背景で完全に同化、読めない | 🔴 重大 |
| ナビゲーションリンク | パステル色が薄い背景に溶け込む | 🟠 高 |
| コンテンツリンク | ピンク/オレンジが白背景に低コントラスト | 🟠 高 |
| アプリ自己診断 | 「背景に対してFail: 2色」と表示 | - |

---

## 問題の技術的分析

### 現在のコードフロー

```
[ユーザーがパステル選択]
    ↓
[selectRandomPrimaryFromDads] src/ui/demo/views/studio-view.ts:296-330
    ↓
[matchesPreset で L≥0.75, C≤0.1 フィルタ] src/ui/demo/utils/dads-snap.ts:30-48
    ↓
[wcagContrast >= 3:1 フィルタ]
    ↓
[contrastFiltered が空の場合 → baseList にフォールバック] ← ★問題箇所
    ↓
[コントラスト条件を無視した色が選択される]
    ↓
[Studioプレビューに低コントラストの色が表示]
```

### 問題のコード (`studio-view.ts` 308-311行目)

```typescript
const contrastFiltered = baseList.filter((t) => {
  const ratio = wcagContrast(backgroundHex, t.hex);
  return ratio >= minContrast;  // 3:1
});
const finalList = contrastFiltered.length > 0 ? contrastFiltered : baseList;
// ↑ フィルタ結果が空なら、コントラスト条件を完全に無視
```

**同じパターンが3箇所に存在**:
1. `selectRandomPrimaryFromDads` (line 310-311)
2. `selectRandomAccentCandidates` (line 385-386)
3. `selectHueDistantColors` in dads-snap.ts (line 210-211)

---

## 修正計画 (Phase 3)

### 推奨対策: フォールバックロジックの改善

**概要**: コントラスト不足の色を選択する際、明度を自動調整して最低限のコントラストを確保

**メリット**:
- パステルの「柔らかさ」を可能な限り維持
- 既存のUIフローを変更不要
- 他のプリセットに影響なし

### 実装タスク

#### Task 1: ユーティリティ関数の追加
**ファイル**: `src/ui/demo/utils/dads-snap.ts`

```typescript
/**
 * 色の明度を調整してターゲットコントラストを達成する
 * パステル色と明るい背景の組み合わせで使用
 */
export function adjustLightnessForContrast(
  colorHex: string,
  backgroundHex: string,
  targetContrast: number
): string {
  // 1. 現在のコントラストを計算
  // 2. 不足している場合、明度を下げる方向で調整
  // 3. 色相・彩度は維持
  // 4. 調整後のHEXを返す
}
```

#### Task 2: Primary色選択の修正
**ファイル**: `src/ui/demo/views/studio-view.ts`
**関数**: `selectRandomPrimaryFromDads` (line 296-330)

```typescript
// Before
const finalList = contrastFiltered.length > 0 ? contrastFiltered : baseList;

// After
let finalList: DadsToken[];
if (contrastFiltered.length > 0) {
  finalList = contrastFiltered;
} else {
  // フォールバック: 明度調整してコントラスト確保
  finalList = baseList.map(t => ({
    ...t,
    hex: adjustLightnessForContrast(t.hex, backgroundHex, minContrast)
  }));
}
```

#### Task 3: Accent色選択の修正
**ファイル**: `src/ui/demo/views/studio-view.ts`
**関数**: `selectRandomAccentCandidates` (line 362-401)

同様のパターンで修正

#### Task 4: Hue-Distant色選択の修正
**ファイル**: `src/ui/demo/utils/dads-snap.ts`
**関数**: `selectHueDistantColors` (line 183-246)

同様のパターンで修正

#### Task 5: テストの追加
**ファイル**: `src/ui/demo/utils/dads-snap.test.ts`

```typescript
describe("adjustLightnessForContrast", () => {
  it("パステル色を暗くして3:1コントラストを達成", () => {
    const pastelPink = "#FFD1DC";  // L≈0.89
    const white = "#FFFFFF";
    const adjusted = adjustLightnessForContrast(pastelPink, white, 3);
    expect(wcagContrast(white, adjusted)).toBeGreaterThanOrEqual(3);
  });

  it("既にコントラスト十分な場合は元の色を返す", () => {
    const darkColor = "#333333";
    const white = "#FFFFFF";
    const adjusted = adjustLightnessForContrast(darkColor, white, 3);
    expect(adjusted).toBe(darkColor);
  });

  it("色相と彩度を維持する", () => {
    const pastelBlue = "#AED9E0";
    const white = "#FFFFFF";
    const adjusted = adjustLightnessForContrast(pastelBlue, white, 3);
    const originalOklch = new Color(pastelBlue).oklch;
    const adjustedOklch = new Color(adjusted).oklch;
    expect(adjustedOklch.h).toBeCloseTo(originalOklch.h, 1);
    expect(adjustedOklch.c).toBeCloseTo(originalOklch.c, 2);
  });
});
```

#### Task 6: E2Eテストの追加
**ファイル**: `e2e/pastel-contrast.e2e.ts`

```typescript
test("パステルプリセットでもコントラスト3:1以上を確保", async ({ page }) => {
  // 1. Studioビューを開く
  // 2. パステルプリセットを選択
  // 3. 生成された色のコントラストを検証
  // 4. アプリの自己診断で「Fail: 0色」を確認
});
```

### 成功基準

| 項目 | 基準 |
|------|------|
| 最低コントラスト | パステルプリセットで3:1以上 |
| 色相維持 | 調整後も元の色相を維持（±5°以内） |
| 彩度維持 | 調整後も元の彩度を可能な限り維持 |
| 他プリセット | 影響なし（既存テストがパス） |
| パフォーマンス | 色生成が200ms以内 |

---

## 代替案（不採用理由付き）

### 案B: 背景色の自動調整
**内容**: パステル選択時に背景を暗く自動変更
**不採用理由**: ユーザーの意図しない背景色変更はUX上好ましくない

### 案C: 明度制約の緩和
**内容**: L≥0.75 → L≥0.55 等に緩和
**不採用理由**: 「パステル」の定義が崩れ、期待と異なる色が生成される

### 案D: 警告表示のみ
**内容**: 低コントラストを警告し、ユーザーに対応を委ねる
**不採用理由**: 問題の解決にならない、ユーザー体験が悪化

---

## 関連ファイル一覧

| ファイル | 役割 | 修正要否 |
|---------|------|----------|
| `src/ui/demo/utils/dads-snap.ts` | プリセット定義、フィルタリング | ✅ 修正 |
| `src/ui/demo/views/studio-view.ts` | Studio UI、色選択ロジック | ✅ 修正 |
| `src/ui/demo/views/palette-preview.ts` | プレビュー色マッピング | 確認のみ |
| `src/core/solver.ts` | コントラスト計算アルゴリズム | 参照のみ |
| `src/ui/demo/utils/dads-snap.test.ts` | ユニットテスト | ✅ 追加 |
| `e2e/pastel-contrast.e2e.ts` | E2Eテスト | ✅ 新規作成 |

---

## 調査成果物

| ファイル | 内容 |
|---------|------|
| `.context/attachments/phase1-report.md` | Phase 1 数値検証の詳細レポート |
| `.context/phase2-visual-verification-report.md` | Phase 2 視覚検証の詳細レポート |
| `scripts/analyze-pastel-contrast.ts` | パステル色コントラスト分析スクリプト |

---

## 次のステップ

1. このプランの承認を得る
2. Task 1-6 を順番に実装
3. 全テストがパスすることを確認
4. E2E動画エビデンスを取得
5. PRを作成

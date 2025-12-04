# DADSハーモニー × CUD適合 仕様書

## 0. 背景と目的

Leonardo の DADS ハーモニーは、デジタル庁デザインシステム準拠の色生成エンジンとして育ってきたが、**色覚多様性への実装判断が暗黙知**のままで、CUD（カラーユニバーサルデザイン推奨配色セット ver.4）の知見がプロダクトに落ちていない。  
本仕様書は、ユーザーから提供された CUD 情報（Okabe & Ito / CUDO / jfly）と OKLCH ベース設計の方針を統合し、以下を達成するための開発計画を定義する。

1. **CUD 推奨配色セット 20 色を正確にデータ化**し、DADS ハーモニーでも参照できるランドマークとする。
2. **任意パレットを CUD/公的ガイドライン観点で自動検証**できる API/ロジックを提供し、UI からも利用できるようにする。

## 1. スコープ

- 対象: `src/core`（色生成/評価ロジック）、`src/ui`（ハーモニー/アクセシビリティビュー）、`docs`（仕様/ナレッジ）
- 色空間: **OKLCH/OKLab を単一の真実**とし、sRGB/HEX は I/O 専用
- 参照セット: CUD ver.4（9 アクセント＋7 ベース＋4 無彩色 = 20 色）
- 検証観点: CUD ガイドブック、川崎市ガイドライン、WCAG、P/D 型シミュレーション、役割バランス
- 非対象: CUD PDF にある全文表の完全再現（将来拡張用フックのみ確保）

## 2. 成果物

| 成果 | 内容 |
|------|------|
| データ層 | `src/core/cud/colors.ts`（CUD_COLOR_SET 定義＋OKLCHキャッシュ＋stats） |
| サービス層 | `src/core/cud/service.ts`（get/find/nearest API） |
| 検証層 | `src/core/cud/checker.ts`（PaletteCheck API 群＋ルール実装） |
| UI連携 | DADS ハーモニー/アクセシビリティビューで CUD データと診断を可視化 |
| テスト | `tests/cud/*.test.ts`（データ整合、距離算出、チェッカーのゴールデンパターン） |
| ドキュメント | 本仕様書＋`docs/reference/cud-color-set.md`（値ソースと変換手順） |

## 3. アーキテクチャ概観

```
sRGB HEX (入力/出力)
        │
        ▼
┌──────────────────────────┐
│ CUD Color Registry        │  ← 20色＋OKLCH/OKLab派生値＋stats
└──────────────────────────┘
        │  exposes
        ▼
┌──────────────────────────┐
│ CudPaletteService         │  get/find/nearest/cluster helpers
└──────────────────────────┘
        │  consumed by
        ├───────────────┐
        ▼               ▼
┌────────────────┐  ┌────────────────────┐
│ DADS Harmony    │  │ Palette Checker    │
│ (generator)     │  │ (guideline logic) │
└────────────────┘  └────────────────────┘
        │               │
        ▼               ▼
┌─────────────────────────────────────────┐
│ UI (ハーモニー/アクセシビリティ view)     │
└─────────────────────────────────────────┘
```

## 4. データ仕様

### 4.1 `CudColor` 型

```ts
type CudGroup = "accent" | "base" | "neutral";

interface OklchColor { l: number; c: number; h: number; }
interface OklabColor { l: number; a: number; b: number; }

interface CudColor {
  id: string;
  group: CudGroup;
  nameJa: string;
  nameEn: string;
  hex: string;
  rgb: [number, number, number];
  oklch: OklchColor;
  oklab: OklabColor;
  jpmaCode?: string;
  cmykProcessNote?: string;
  munsell?: string;
}
```

- 起動時（またはビルド時）に HEX → OKLab/OKLCH へ変換し、`CUD_ACCENT_COLORS` 等へ格納する。
- 公式値との突合せ用に `docs/reference/cud-color-set.md` に出典 URL・取得方法を記載。

### 4.2 色リスト

- ユーザー提示の 20 色をそのまま採用。HEX と RGB は sRGB（奥村研究室の公開値）。
- グルーピング: `accent` 9 色、`base` 7 色、`neutral` 4 色。
- `CUD_COLOR_SET = [...ACCENT, ...BASE, ...NEUTRAL]` を必ずエクスポート。

### 4.3 統計情報

`computeOklchStats(group: CudGroup): { lRange, cRange, hueMean, hueStd }` を提供し、「ベースらしさ」「アクセントらしさ」の判定に再利用する。DADS ハーモニー生成時にも選択肢として利用できるように、`src/core/harmony.ts` から参照可能な形でエクスポート。

## 5. API 仕様

### 5.1 ベーシック API

```ts
function getCudColorSet(): CudColor[];
function getCudColorsByGroup(group: CudGroup): CudColor[];
function findExactCudColorByHex(hex: string): CudColor | null;
function findNearestCudColor(hex: string): { nearest: CudColor; deltaE: number };
```

- 入力 HEX は正規化（大文字/小文字、#有無）して比較。
- `deltaE` は OKLab ユークリッド距離（`deltaEok`）で算出。閾値は以下の通り:
  - `≤ 0.03`: ほぼ一致
  - `0.03 < … ≤ 0.06`: 近似（warning）
  - `> 0.06`: 逸脱（error）

### 5.2 CVD シミュレーション

```ts
type CvdType = "protan" | "deutan" | "tritan"?;
function simulateCvd(hex: string, type: CvdType): { hex: string; oklab: OklabColor; oklch: OklchColor };
```

- sRGB へ降りて Brettel (1997) などの行列を適用後、再び OKLab/OKLCH に戻す。
- `PaletteChecker` は `simulateCvd` を通じて ΔE を判定。

### 5.3 パレット検証 API

```ts
interface PaletteColor {
  hex: string;
  role?: "accent" | "base" | "neutral" | "text" | "border" | "background";
  label?: string;
}

type IssueSeverity = "info" | "warning" | "error";

type PaletteIssueType =
  | "not_in_cud_set"
  | "low_contrast"
  | "small_text_low_contrast"
  | "cvd_confusion_risk"
  | "too_many_similar_hues"
  | "ambiguous_role"
  | "cud_good_example_like";

interface PaletteIssue {
  type: PaletteIssueType;
  severity: IssueSeverity;
  message: string;
  colors: PaletteColor[];
  details?: Record<string, unknown>;
}

interface PaletteCheckOptions {
  context?: "chart" | "map" | "ui" | "text-heavy";
  assumeSmallText?: boolean;
}

interface PaletteCheckResult {
  ok: boolean;
  summary: string;
  issues: PaletteIssue[];
}

function checkPaletteAgainstCudGuidelines(
  colors: PaletteColor[],
  options?: PaletteCheckOptions,
): PaletteCheckResult;
```

## 6. チェックロジック詳細

### 6.1 CUD セット整合

- `findExactCudColorByHex` で一致判定。未一致の場合は `findNearestCudColor` を走らせ、ΔE に応じて `warning`/`error` を発行。
- `details`: `{ nearestId, deltaE }`

### 6.2 明度・コントラスト（一般）

- sRGB（OKLCH→sRGB）→相対輝度→WCAG 比。
- 役割が `text|border|accent` で背景指定がある場合、4.5:1（通常）、3:1（大文字）を下限とする。
- `context === "ui"` では `text`/`background` ペアを優先チェック。
- `low_contrast` issue には `contrastRatio` と `threshold` を含む。

### 6.3 小さい文字/細線

- `assumeSmallText` または `context === "chart"` 時、閾値を 7:1 に引き上げ。
- ベースカラー同士＋無彩色同士の境界も `small_text_low_contrast` で検知。

### 6.4 CVD 混同リスク

- 各色ペアについて `simulateCvd` 結果の ΔE を計算。
- 一般色覚で ΔE ≥ 0.15 かつ CVD 後で ΔE < 0.10 のペアを `warning`。
- `details`: `{ type: "protan" | "deutan", deltaNormal, deltaSimulated }`

### 6.5 色相クラスター × 明度バケット

```ts
type HueCluster =
  | "warm_red_orange"
  | "yellow"
  | "yellow_green"
  | "green"
  | "cyan_sky"
  | "blue"
  | "magenta_purple"
  | "brown"
  | "neutral";

type LightnessBucket = "very_light" | "light" | "medium" | "dark";
```

- Hue 判定は OKLCH の h。c < 0.03 の場合は `neutral`。
- Lightness 分類例: `≥0.9 → very_light`, `≥0.7 → light`, `≥0.45 → medium`, その他 `dark`。
- `too_many_similar_hues` は「同クラスター & 同バケット & ΔEok < 0.04」のペアを対象。  
  特に下記は `warning` 優先:
  - `yellow` × `yellow_green` × high lightness
  - `warm_red_orange` クラスターで `very_light`
  - `neutral` かつ `very_light`（白＋ライトグレー）、`neutral` かつ `dark`（黒＋濃色）

### 6.6 役割バランス / 数量ヒューリスティクス

- `context === "chart"`: アクセント系の distinct 数が >6 で `info` (カテゴリ過多)。
- `context === "map"`: ベースカラー >7 かつ `too_many_similar_hues` が出ている場合は `warning`。
- `ambiguous_role`: role 未指定 or `role` と CUD グループが激しく乖離（例: 明度 0.95 だが `accent` 指定）時に表示。

### 6.7 良い例フィードバック

- 以下の条件に合致したら `cud_good_example_like` (`info`, message に推奨理由):
  - アクセントに `accent-orange/red/blue/brown` のいずれかが含まれ、ベースに `base-cream/light-green/light-sky/beige` 等が揃う。
  - 暖色アクセント + 寒色ベースで Lightness 差 ≥ 0.2。

## 7. DADS ハーモニーへの組み込み

1. **Harmony Type 拡張**  
   - 既存 `HarmonyType.DADS` を温存しつつ、CUD ベースのバリエーションを `CUD` サブモードとして追加検討。  
   - ハーモニー UI では「DADS（公式）」＋「DADS + CUD 安全域ガイド」などの表示を提供。

2. **Palette ビュー拡張**  
   - DADS で生成した色を `findNearestCudColor` に通し、バッジ表示（`exact / near / off`）を追加。
   - `checkPaletteAgainstCudGuidelines` の結果を 3 カラム（問題 / 注意 / 推奨例）にレンダリング。

3. **アクセシビリティビュー**  
   - 既存 CVD シミュレーションセクションに `cvd_confusion_risk` issue を表示。
   - コントラスト表に「小さい文字基準」ボタンを追加し、`assumeSmallText` 切替。

4. **データ出力**  
   - エクスポート（CSS/JSON）に `cudMetadata` を含める（nearest id, deltaE, group）。

## 8. 実装ステップ案

1. **データレイヤー**  
   - `src/core/cud` ディレクトリを新設し、20 色の定数とユーティリティを実装。  
   - `pnpm test` で import 循環がないことを確認。
2. **サービス/チェッカー**  
   - API 群＋`deltaEok` 実装（`src/utils/color-space` へ共通化）。  
   - Palette Checker は純関数としてまとめ、`src/core/cud/checker.ts` を公開。
3. **UI 統合**  
   - `src/ui/demo.ts`（ハーモニー/アクセシビリティビュー）に診断出力。  
   - 既存の DADS cards / badges スタイルを流用し、issue タイプごとに色付け。
4. **テスト**  
   - データスナップショットテスト（HEX/RGB OKLCH が逸脱しないこと）。  
   - チェッカーの最小ケース（CUD 完全一致 → ok = true、危険組合せ → issue 生成）。
5. **ドキュメント**  
   - `docs/reference/cud-color-set.md` に取得手順 / 変換式 / 閾値 rationale を記述。

## 9. 受け入れ条件

- [ ] `pnpm test` で CUD 関連テストが追加され、全て成功する。
- [ ] Harmony UI で DADS モード選択時に CUD メタ情報が視覚化される。
- [ ] `checkPaletteAgainstCudGuidelines` の戻り値が Storybook/Playground から確認できる（例: `window.__dadsDebug.cudCheck`）。
- [ ] 仕様の全要件（セクション 4〜7）がコード化されていることをレビューで確認できる。

## 10. リスクと未決事項

| リスク/課題 | メモ |
|-------------|------|
| CVD アルゴリズム選定 | Brettel or Machado 行列いずれかを実装。性能/サイズを考慮。 |
| 追加データ（JPMA/CMYK） | PDF 入力が必要。将来用にフィールドのみ空で保持。 |
| UI ノイズ | Issue 数が多い場合の表示崩れ。段階的開示（アコーディオン）を検討。 |
| OKLCH 変換の再現性 | `culori` に依存。ビルド時に stats を固定化するか検討。 |

## 11. 今後の拡張余地

- `hardConfusingPairs` / `recommendedPairs` を JSON 化しチェッカーに接続。
- `simulateCvd("tritan")` を追加し、`options` で有効化可能に。
- パレット自動生成時に CUD 安全域にスナップする「CUD モード」の提供。
- xAPI/Telemetry に issue 発生傾向を送信し、次の改善サイクルに活かす。

---

以上、DADS ハーモニーに CUD 推奨配色セットと OKLCH 中心設計を統合するための実装仕様である。これを基にバックログを分割し、段階的に開発・検証を進める。***

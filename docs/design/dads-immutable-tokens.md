# Design Doc: DADSカラートークン不変性対応

| 項目 | 内容 |
|------|------|
| **Status** | Draft |
| **Author** | Claude Code |
| **Created** | 2025-12-04 |
| **Issue** | [#11](https://github.com/monoharada/leonardo-learn/issues/11) |
| **Branch** | `feature/dads-immutable-tokens` |

## 1. 概要

### 1.1 背景

DADSプリミティブカラートークン（例: `Red100`–`Red1000`, `Orange500`）は**不変のID**として扱うべきことが明確化された。現行のCUD-awareハーモニージェネレーターは、ブランドカラーを最適化した結果を既存パレットエントリに「上書き」する形で出力しており、これはDADSトークンの不変性原則に違反する。

### 1.2 目的

- DADSプリミティブカラーを読み取り専用の参照として扱う
- ジェネレーター出力を「派生ブランドトークン」として明確に分離する
- エクスポートに派生トークンとDADS参照の両方を含める

### 1.3 原則

1. **DADSトークンは不変**: 値も名前も変更しない
2. **参照と派生を分離**: 出力は常に「派生」であり、DADS参照を持つ
3. **使い方は自由**: どのDADSトークンをどう使うかはプロダクト側の責任

## 2. 現行アーキテクチャの問題

### 2.1 現行フロー

```
ブランドカラー  ──→ Snapper/Optimizer ──→ 出力色
(#FF5500)           (Soft/Strict)        (#FF2800)
                          │                  │
                          ▼                  ▼
                    "Red500を置換"     --color-red-500: #FF2800;

問題: DADSトークンを「上書き」しているように見える
```

### 2.2 問題箇所

| ファイル | 問題点 |
|---------|--------|
| `src/core/cud/snapper.ts:46-57` | `SnapResult`は`cudColor`を参照するが、出力`hex`が「派生」か「置換」か不明 |
| `src/core/cud/optimizer.ts:53-66` | `OptimizedColor`にDADS/Brandの区別がない |
| `src/core/export/css-exporter.ts` | 変数名`--color-*`がDADS固有か、Brand固有か不明 |
| `src/core/export/json-exporter.ts:51-64` | `nearestId`はあるが「参照」という概念が弱い |

## 3. 提案アーキテクチャ

### 3.1 概念モデル

```
┌─────────────────────────────────────────────────────────────────────┐
│ 提案フロー（DADS不変）                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────┐                                              │
│  │ DADS Primitives   │  ← 読み取り専用、変更不可                     │
│  │ (Red, Orange, …)  │                                              │
│  └─────────┬─────────┘                                              │
│            │ 参照                                                   │
│            ▼                                                        │
│  ブランドカラー ──→ Generator ──→ BrandToken                        │
│  (#FF5500)              │         {                                │
│                         │           id: "brand-primary-500",       │
│                         │           hex: "#FF3000",                │
│                         │           dadsReference: {               │
│                         │             id: "red",                   │
│                         │             hex: "#FF2800",              │
│                         │             deltaE: 0.08                 │
│                         │           }                              │
│                         │         }                                │
│                         ▼                                          │
│                    エクスポート                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 トークン階層

```
TokenHierarchy
├── DadsToken (不変)
│   ├── id: "dads-red"
│   ├── hex: "#FF2800" (読み取り専用)
│   └── source: "dads"
│
└── BrandToken (プロダクト所有)
    ├── id: "brand-primary-500"
    ├── hex: "#FF3000" (派生値)
    ├── source: "brand"
    └── dadsReference
        ├── tokenId: "dads-red"
        ├── deltaE: 0.080
        └── derivationType: "soft-snap"
```

## 4. データモデル設計

### 4.1 DADSグループ型とCUDグループ型の分離

**重要**: DADSプリミティブカラーとCUD推奨20色は**別系統のデータセット**である。

| 観点 | DADS Primitives | CUD推奨色 |
|------|-----------------|-----------|
| 色数 | 10色相 × 13スケール + 中間色 = 130+色 | 固定20色 |
| 階層 | スケール付き（50-1200） | フラット |
| 用途 | デザインシステム基盤 | 色覚多様性対応 |
| 管理元 | DADS仕様 | CUDガイドライン |

#### 実際のDADSプリミティブカラー構成

```
DADS Primitive Colors (from @digital-go-jp/design-tokens)
├── Chromatic (10色相 × 13スケール)
│   ├── blue (50-1200)        --color-primitive-blue-{scale}
│   ├── light-blue (50-1200)  --color-primitive-light-blue-{scale}
│   ├── cyan (50-1200)        --color-primitive-cyan-{scale}
│   ├── green (50-1200)       --color-primitive-green-{scale}
│   ├── lime (50-1200)        --color-primitive-lime-{scale}
│   ├── yellow (50-1200)      --color-primitive-yellow-{scale}
│   ├── orange (50-1200)      --color-primitive-orange-{scale}
│   ├── red (50-1200)         --color-primitive-red-{scale}
│   ├── magenta (50-1200)     --color-primitive-magenta-{scale}
│   └── purple (50-1200)      --color-primitive-purple-{scale}
│
├── Neutral
│   ├── white                  --color-neutral-white
│   ├── black                  --color-neutral-black
│   ├── solid-gray (50-900)   --color-neutral-solid-gray-{scale}
│   └── opacity-gray (50-900) --color-neutral-opacity-gray-{scale}
│
└── Semantic (プリミティブ参照)
    ├── success-1, success-2   → green-600, green-800
    ├── error-1, error-2       → red-800, red-900
    ├── warning-yellow-1, -2   → yellow-700, yellow-900
    └── warning-orange-1, -2   → orange-600, orange-800
```

**スケール値**: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200
（一部のグレーには420, 536などの中間値あり）

CUD推奨20色との関係は、DADSプリミティブの一部がCUD推奨色に近似している可能性があるが、1:1の対応ではない。本Design Docでは、CUD互換性検証のためにDADSプリミティブとCUD推奨色の距離（deltaE）を計算する。

```typescript
// src/core/tokens/types.ts

/**
 * トークンソースの識別子
 */
export type TokenSource = "dads" | "brand";

/**
 * DADSカラー色相（10色相）
 */
export type DadsColorHue =
  | "blue"
  | "light-blue"
  | "cyan"
  | "green"
  | "lime"
  | "yellow"
  | "orange"
  | "red"
  | "magenta"
  | "purple";

/**
 * DADSカラーカテゴリ
 */
export type DadsColorCategory =
  | "chromatic"  // 有彩色（10色相 × 13スケール）
  | "neutral"    // 無彩色（white, black, gray）
  | "semantic";  // セマンティック（success, error, warning）

/**
 * DADSスケール値
 *
 * 有彩色（chromatic）: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200
 * 無彩色（neutral gray）: 上記 + 420, 536（アクセシビリティ用中間値）
 */
export type DadsChromaScale =
  | 50 | 100 | 200 | 300 | 400 | 500
  | 600 | 700 | 800 | 900 | 1000 | 1100 | 1200;

export type DadsNeutralScale =
  | 50 | 100 | 200 | 300 | 400 | 420 | 500 | 536
  | 600 | 700 | 800 | 900;

// 統合型（互換性のため）
export type DadsScaleValue = DadsChromaScale | DadsNeutralScale;

/**
 * DADSカラー分類
 */
export interface DadsColorClassification {
  /** カテゴリ */
  category: DadsColorCategory;
  /** 色相（chromaticの場合） */
  hue?: DadsColorHue;
  /** スケール値（50-1200） */
  scale?: DadsScaleValue;
  /** CUD推奨20色に近い場合のマッピング情報 */
  cudMapping?: {
    /** 最も近いCUD色のID */
    nearestCudId: string;
    /** 距離（deltaE） */
    deltaE: number;
  };
}

/**
 * 派生タイプ
 */
export type DerivationType =
  | "strict-snap"   // CUD色に完全スナップ
  | "soft-snap"     // 部分的スナップ
  | "reference"     // 参照のみ（値変更なし）
  | "manual";       // 手動設定

/**
 * DADSトークン（不変）
 * DADSが提供するプリミティブカラー
 *
 * 注意: CudColorとは独立した型として定義。
 * 現時点ではCUD推奨20色をDADSプリミティブとして採用するが、
 * 将来的にはDADS固有のスケール付き色などが追加される可能性がある。
 */
export interface DadsToken {
  readonly id: string;                    // "dads-red", "dads-orange"
  readonly hex: string;                   // "#FF2800" (不変、常に#RRGGBB形式)
  readonly nameJa: string;                // "赤"
  readonly nameEn: string;                // "Red"
  readonly classification: DadsColorClassification;
  readonly source: "dads";                // 常に "dads"
  /**
   * 透明度（0-1、オプション）
   * opacity-grayなどの透過色で使用
   * 省略時は1（完全不透明）として扱う
   */
  readonly alpha?: number;
}

/**
 * rgba()形式の色値をパースしてHEXとalphaに分離する
 *
 * @param rgba - "rgba(R, G, B, A)" 形式の文字列
 * @returns { hex: "#RRGGBB", alpha: number } または null（パース失敗時）
 *
 * @example
 * parseRgba("rgba(0, 0, 0, 0.5)")
 * // => { hex: "#000000", alpha: 0.5 }
 */
function parseRgba(rgba: string): { hex: string; alpha: number } | null {
  const match = rgba.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (!match) return null;

  const [, r, g, b, a] = match;
  const toHex = (n: string) => parseInt(n, 10).toString(16).padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  const alpha = parseFloat(a);

  return { hex, alpha };
}

/**
 * DADSプリミティブカラーをインポートする
 *
 * @digital-go-jp/design-tokens のCSSからパースして
 * DadsToken配列を生成する
 *
 * 3つのカテゴリを処理:
 * - chromatic: --color-primitive-{hue}-{scale}
 * - neutral: --color-neutral-{type} または --color-neutral-{type}-gray-{scale}
 * - semantic: --color-semantic-{name}
 */
export function importDadsPrimitives(cssText: string): DadsToken[] {
  const tokens: DadsToken[] = [];

  // 1. Chromatic colors: --color-primitive-{hue}-{scale}
  const chromaticRegex = /--color-primitive-([a-z-]+)-(\d+):\s*(#[0-9a-fA-F]{6})/g;
  let match: RegExpExecArray | null;
  while ((match = chromaticRegex.exec(cssText)) !== null) {
    const [, hue, scaleStr, hex] = match;
    const scale = parseInt(scaleStr, 10) as DadsChromaScale;

    tokens.push({
      id: `dads-${hue}-${scale}`,
      hex: hex.toUpperCase(),
      nameJa: `${hue}-${scale}`,
      nameEn: `${hue}-${scale}`,
      classification: {
        category: "chromatic",
        hue: hue as DadsColorHue,
        scale,
      },
      source: "dads",
    });
  }

  // 2. Neutral colors: --color-neutral-{white|black} or --color-neutral-{solid|opacity}-gray-{scale}
  // 2a. white/black
  const neutralBaseRegex = /--color-neutral-(white|black):\s*(#[0-9a-fA-F]{6})/g;
  while ((match = neutralBaseRegex.exec(cssText)) !== null) {
    const [, name, hex] = match;
    tokens.push({
      id: `dads-neutral-${name}`,
      hex: hex.toUpperCase(),
      nameJa: name === "white" ? "白" : "黒",
      nameEn: name.charAt(0).toUpperCase() + name.slice(1),
      classification: {
        category: "neutral",
      },
      source: "dads",
    });
  }

  // 2b. solid-gray / opacity-gray
  const neutralGrayRegex = /--color-neutral-(solid|opacity)-gray-(\d+):\s*(#[0-9a-fA-F]{6}|rgba\([^)]+\))/g;
  while ((match = neutralGrayRegex.exec(cssText)) !== null) {
    const [, type, scaleStr, value] = match;
    const scale = parseInt(scaleStr, 10) as DadsNeutralScale;

    // HEXまたはrgba()をパース
    // hexフィールドは常に#RRGGBB形式、alphaは別フィールドに格納
    let hex: string;
    let alpha: number | undefined;

    if (value.startsWith("#")) {
      hex = value.toUpperCase();
    } else {
      // rgba()形式をパース
      const parsed = parseRgba(value);
      if (parsed) {
        hex = parsed.hex;
        alpha = parsed.alpha;
      } else {
        // パース失敗時はスキップ（警告ログ出力推奨）
        console.warn(`Failed to parse rgba value: ${value}`);
        continue;
      }
    }

    tokens.push({
      id: `dads-${type}-gray-${scale}`,
      hex,
      nameJa: `${type === "solid" ? "ソリッド" : "透過"}グレー-${scale}`,
      nameEn: `${type.charAt(0).toUpperCase() + type.slice(1)} Gray ${scale}`,
      classification: {
        category: "neutral",
        scale,
      },
      source: "dads",
      ...(alpha !== undefined && { alpha }),
    });
  }

  // 3. Semantic colors: --color-semantic-{name}: var(--color-primitive-{ref})
  const semanticRegex = /--color-semantic-([a-z-]+(?:-\d)?):.*var\(--color-primitive-([a-z-]+)-(\d+)\)/g;
  while ((match = semanticRegex.exec(cssText)) !== null) {
    const [, semanticName, refHue, refScale] = match;

    tokens.push({
      id: `dads-semantic-${semanticName}`,
      hex: `var(--color-primitive-${refHue}-${refScale})`, // 参照を保持
      nameJa: semanticName,
      nameEn: semanticName,
      classification: {
        category: "semantic",
        // セマンティックは参照先を記録
      },
      source: "dads",
    });
  }

  return tokens;
}

/**
 * CUD推奨色との距離を計算してマッピング情報を付加
 *
 * 注意: セマンティックトークンは var(--color-primitive-...) 形式で
 * HEX値を持たないため、CUDマッピング処理はスキップされる。
 * セマンティックトークンのCUDマッピングが必要な場合は、
 * 先にプリミティブ参照を解決する必要がある。
 */
export function enrichWithCudMapping(
  dadsTokens: DadsToken[],
  cudColors: CudColor[]
): DadsToken[] {
  return dadsTokens.map(token => {
    // セマンティックトークン（var参照）はスキップ
    // hex値が#で始まらない場合はCUDマッピング不可
    if (!token.hex.startsWith("#")) {
      return token;
    }

    const nearest = findNearestCudColor(token.hex);
    return {
      ...token,
      classification: {
        ...token.classification,
        cudMapping: {
          nearestCudId: nearest.nearest.id,
          deltaE: nearest.deltaE,
        },
      },
    };
  });
}

/**
 * セマンティックトークンのプリミティブ参照を解決する
 *
 * var(--color-primitive-{hue}-{scale}) 形式の参照を
 * 対応するプリミティブトークンのHEX値に展開する。
 *
 * ## 使用タイミング
 *
 * この関数は以下のケースで呼び出す:
 *
 * 1. **CUDマッピング前**: enrichWithCudMappingを呼ぶ前にセマンティック
 *    トークンの参照を解決し、HEX値を取得する必要がある場合
 *
 * 2. **エクスポート前**: セマンティックトークンを具体的なHEX値として
 *    出力したい場合（CSS変数ではなくインライン値として）
 *
 * 3. **色計算時**: セマンティックトークンの実際の色値を使って
 *    deltaE計算やゾーン分類を行う場合
 *
 * ## 注意事項
 *
 * - セマンティックトークンはenrichWithCudMappingでスキップされる
 * - CUDマッピングが必要な場合は、この関数で先に解決すること
 * - 解決後のHEX値は一時的な計算用であり、トークン自体は変更しない
 *
 * @param semanticToken - セマンティックトークン
 * @param primitives - 解決済みプリミティブトークン配列
 * @returns 参照解決済みのHEX値、または解決不可の場合はnull
 *
 * @example
 * // CUDマッピング前にセマンティックトークンを解決
 * const tokens = importDadsPrimitives(cssText);
 * const primitives = tokens.filter(t => t.classification.category !== "semantic");
 * const semantics = tokens.filter(t => t.classification.category === "semantic");
 *
 * // セマンティックトークンのCUDマッピングを行う場合
 * for (const semantic of semantics) {
 *   const resolvedHex = resolveSemanticReference(semantic, primitives);
 *   if (resolvedHex) {
 *     const nearest = findNearestCudColor(resolvedHex);
 *     // マッピング情報を利用...
 *   }
 * }
 *
 * // プリミティブのみenrichWithCudMappingに渡す
 * const enrichedPrimitives = enrichWithCudMapping(primitives, cudColors);
 */
export function resolveSemanticReference(
  semanticToken: DadsToken,
  primitives: DadsToken[]
): string | null {
  // var(--color-primitive-{hue}-{scale}) 形式をパース
  const varMatch = semanticToken.hex.match(
    /var\(--color-primitive-([a-z-]+)-(\d+)\)/
  );
  if (!varMatch) return null;

  const [, hue, scale] = varMatch;
  const targetId = `dads-${hue}-${scale}`;

  // 対応するプリミティブを検索
  const primitive = primitives.find(p => p.id === targetId);
  return primitive?.hex ?? null;
}

/**
 * DADS参照情報
 * ブランドトークンがどのDADSトークンを参照しているか
 */
export interface DadsReference {
  /** 参照先DADSトークンID */
  tokenId: string;               // "dads-red"
  /** 参照先DADSトークンのHEX（不変値） */
  tokenHex: string;              // "#FF2800"
  /**
   * 参照先DADSトークンの透明度（オプション）
   * opacity-grayなど透過トークン参照時に設定
   * 省略時は1（完全不透明）
   */
  tokenAlpha?: number;           // 0.5
  /** 色差（deltaE） */
  deltaE: number;                // 0.080
  /** 派生タイプ */
  derivationType: DerivationType;
  /** CUDゾーン */
  zone: CudZone;
}

/**
 * ブランドトークン（プロダクト所有）
 * プロダクトが定義する派生カラー
 */
export interface BrandToken {
  /** トークンID */
  id: string;                    // "brand-primary-500"
  /** 色値（派生値、変更可能） */
  hex: string;                   // "#FF3000"
  /**
   * 透明度（オプション）
   * 透過ブランドトークンの場合に設定
   * 省略時は1（完全不透明）
   */
  alpha?: number;                // 0.8
  /** ソース */
  source: "brand";               // 常に "brand"
  /** DADS参照情報 */
  dadsReference: DadsReference;
  /** 元の入力色（最適化前） */
  originalHex?: string;          // "#FF5500"
}

/**
 * 統合カラートークン型
 */
export type ColorToken = DadsToken | BrandToken;

/**
 * トークンがDADSトークンかどうかを判定
 */
export function isDadsToken(token: ColorToken): token is DadsToken {
  return token.source === "dads";
}

/**
 * トークンがブランドトークンかどうかを判定
 */
export function isBrandToken(token: ColorToken): token is BrandToken {
  return token.source === "brand";
}
```

### 4.2 ブランドトークンID生成規則

ブランドトークンIDの生成には明確なルールが必要。衝突回避と一意性保証のためのアルゴリズムを定義する。

#### 4.2.1 ID構造

```
brand-{namespace}-{role}-{shade}[-{suffix}]

例:
- brand-primary-500          (基本形)
- brand-myapp-primary-500    (名前空間付き)
- brand-primary-500-alt      (重複回避サフィックス)
```

#### 4.2.2 ID生成アルゴリズム

```typescript
// src/core/tokens/id-generator.ts

/**
 * ブランドトークンID生成オプション
 */
export interface BrandTokenIdOptions {
  /** 名前空間（プロダクト名など） */
  namespace?: string;
  /** ロール名（primary, secondary, accent, etc.） */
  role: string;
  /** シェード値（100-900, 500がデフォルト） */
  shade?: number;
  /** 既存IDセット（重複チェック用） */
  existingIds?: Set<string>;
}

/**
 * ブランドトークンIDを生成する
 *
 * @param options - 生成オプション
 * @returns 一意なブランドトークンID
 *
 * @example
 * generateBrandTokenId({ role: "primary" });
 * // => "brand-primary-500"
 *
 * generateBrandTokenId({ namespace: "myapp", role: "accent", shade: 300 });
 * // => "brand-myapp-accent-300"
 *
 * generateBrandTokenId({
 *   role: "primary",
 *   shade: 500,
 *   existingIds: new Set(["brand-primary-500"])
 * });
 * // => "brand-primary-500-2" (重複回避)
 */
export function generateBrandTokenId(options: BrandTokenIdOptions): string {
  const { namespace, role, shade = 500, existingIds } = options;

  // 基本ID構築
  const parts = ["brand"];
  if (namespace) {
    parts.push(sanitizeIdPart(namespace));
  }
  parts.push(sanitizeIdPart(role));
  parts.push(String(shade));

  let baseId = parts.join("-");

  // 重複チェックと回避
  if (existingIds) {
    let finalId = baseId;
    let counter = 2;
    while (existingIds.has(finalId)) {
      finalId = `${baseId}-${counter}`;
      counter++;
    }
    return finalId;
  }

  return baseId;
}

/**
 * ID部品をサニタイズする
 * - 小文字に変換
 * - スペースをハイフンに変換
 * - 英数字とハイフン以外を削除
 */
function sanitizeIdPart(part: string): string {
  return part
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
```

#### 4.2.3 パレット生成時のID割り当てフロー

```typescript
/**
 * パレット生成コンテキスト
 * 複数パレットを扱う場合のID一意性を管理
 */
export interface PaletteGenerationContext {
  /** 使用済みID */
  usedIds: Set<string>;
  /** 名前空間 */
  namespace?: string;
  /** デフォルトロール名の自動割り当てルール */
  roleAssignment: "sequential" | "by-hue" | "manual";
}

/**
 * ロール自動割り当てルール
 *
 * sequential: 順番に primary, secondary, tertiary, accent-1, accent-2, ...
 * by-hue:     色相に基づいて warm, cool, neutral 等に分類
 * manual:     ユーザーが明示的に指定
 */
const SEQUENTIAL_ROLES = [
  "primary",
  "secondary",
  "tertiary",
  "accent-1",
  "accent-2",
  "accent-3",
  "accent-4",
  "accent-5",
];

/**
 * パレット内の色にIDを割り当てる
 */
export function assignBrandTokenIds(
  colors: OptimizedColor[],
  context: PaletteGenerationContext
): Map<OptimizedColor, string> {
  const idMap = new Map<OptimizedColor, string>();

  colors.forEach((color, index) => {
    const role = context.roleAssignment === "sequential"
      ? SEQUENTIAL_ROLES[index] ?? `color-${index + 1}`
      : `color-${index + 1}`;  // fallback

    const id = generateBrandTokenId({
      namespace: context.namespace,
      role,
      shade: 500,
      existingIds: context.usedIds,
    });

    context.usedIds.add(id);
    idMap.set(color, id);
  });

  return idMap;
}
```

### 4.3 Snapper出力の変更

```typescript
// src/core/cud/snapper.ts 変更案

/**
 * Soft Snap結果（拡張版）
 */
export interface SoftSnapResult {
  // 既存フィールド（後方互換性維持）
  hex: string;
  originalHex: string;
  cudColor: CudColor;
  snapped: boolean;
  deltaE: number;
  zone: CudZone;
  deltaEChange: number;
  explanation: string;

  // 新規: ブランドトークン生成用情報
  derivation: {
    /** 派生タイプ */
    type: DerivationType;
    /** 参照先DADSトークンID */
    dadsTokenId: string;
    /** 参照先DADSトークンHEX（不変） */
    dadsTokenHex: string;
    /** 派生値HEX（ブランドトークンの値） */
    brandTokenHex: string;
  };
}
```

### 4.4 Optimizer出力の変更

```typescript
// src/core/cud/optimizer.ts 変更案

/**
 * 最適化された色（拡張版）
 */
export interface OptimizedColor {
  // 既存フィールド
  hex: string;
  originalHex: string;
  zone: CudZone;
  deltaE: number;
  snapped: boolean;
  cudTarget?: CudColor;

  // 新規: ブランドトークン情報
  brandToken: {
    /** 推奨トークンID（PaletteGenerationContextで確定） */
    suggestedId: string;         // "brand-primary-500"
    /** DADS参照 */
    dadsReference: DadsReference;
  };
}
```

## 5. エクスポート設計

### 5.1 CSS出力

```css
/**
 * DADS Primitives（参照用、プロダクトでは変更不可）
 * これらの値は変更しないでください。
 * 独自の色が必要な場合は brand-* トークンを作成してください。
 */
:root {
  /* Chromatic colors */
  --dads-red: #FF2800;
  --dads-orange: #FF9900;
  --dads-yellow: #FAF500;
  --dads-green: #35A16B;
  --dads-blue: #0041FF;
  --dads-sky-blue: #66CCFF;
  --dads-pink: #FF99A0;
  --dads-purple: #9A0079;
  --dads-brown: #663300;

  /* Neutral colors with alpha */
  /* 透過トークンはrgba()形式で出力 */
  --dads-opacity-gray-536: rgba(26, 26, 28, 0.56);
  --dads-opacity-gray-700: rgba(26, 26, 28, 0.7);

  /* Solid neutrals (no alpha) */
  --dads-solid-gray-500: #757575;
}

/**
 * Brand Tokens（プロダクト所有、派生値）
 * これらのトークンはDADSプリミティブから派生しています。
 */
:root {
  /* Primary: Derived from --dads-red (ΔE=0.080, soft-snap) */
  --brand-primary-500: #FF3000;

  /* Secondary: Strict snap to --dads-green */
  --brand-secondary-500: #35A16B;

  /* Accent: Derived from --dads-orange (ΔE=0.120, soft-snap) */
  --brand-accent-500: #FF8800;

  /* Overlay: Reference to opacity token (alpha preserved) */
  --brand-overlay-500: rgba(26, 26, 28, 0.56);
}
```

#### 5.1.1 Alpha値のCSS出力ルール

| トークン種別 | alpha値 | CSS出力形式 |
|-------------|---------|-------------|
| DadsToken / BrandToken | なし（undefined） | `#RRGGBB` |
| DadsToken / BrandToken | あり（0-1） | `rgba(R, G, B, alpha)` |

**エクスポーター実装例:**

```typescript
function formatCssValue(token: DadsToken | BrandToken): string {
  if (token.alpha === undefined || token.alpha === 1) {
    return token.hex;
  }
  // HEXをRGBに変換してrgba()形式で出力
  const r = parseInt(token.hex.slice(1, 3), 16);
  const g = parseInt(token.hex.slice(3, 5), 16);
  const b = parseInt(token.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${token.alpha})`;
}
```

### 5.2 JSON出力

```json
{
  "metadata": {
    "version": "2.0.0",
    "generatedAt": "2025-12-04T09:00:00.000Z",
    "tokenSchema": "dads-brand-v1"
  },

  "dadsTokens": {
    "red": {
      "id": "dads-red",
      "hex": "#FF2800",
      "nameJa": "赤",
      "nameEn": "Red",
      "group": "accent",
      "source": "dads",
      "immutable": true
    },
    "opacity-gray-536": {
      "id": "dads-opacity-gray-536",
      "hex": "#1A1A1C",
      "alpha": 0.56,
      "nameJa": "透過グレー-536",
      "nameEn": "Opacity Gray 536",
      "group": "neutral",
      "source": "dads",
      "immutable": true
    }
  },

  "brandTokens": {
    "brand-primary-500": {
      "id": "brand-primary-500",
      "hex": "#FF3000",
      "source": "brand",
      "originalHex": "#FF5500",
      "dadsReference": {
        "tokenId": "dads-red",
        "tokenHex": "#FF2800",
        "deltaE": 0.080,
        "derivationType": "soft-snap",
        "zone": "warning"
      }
    },
    "brand-secondary-500": {
      "id": "brand-secondary-500",
      "hex": "#35A16B",
      "source": "brand",
      "originalHex": "#2D8F5E",
      "dadsReference": {
        "tokenId": "dads-green",
        "tokenHex": "#35A16B",
        "deltaE": 0.000,
        "derivationType": "strict-snap",
        "zone": "safe"
      }
    },
    "brand-overlay-500": {
      "id": "brand-overlay-500",
      "hex": "#1A1A1C",
      "alpha": 0.56,
      "source": "brand",
      "dadsReference": {
        "tokenId": "dads-opacity-gray-536",
        "tokenHex": "#1A1A1C",
        "tokenAlpha": 0.56,
        "deltaE": 0.000,
        "derivationType": "reference",
        "zone": "safe"
      }
    }
  },

  "cudSummary": {
    "complianceRate": 100,
    "mode": "soft",
    "zoneDistribution": {
      "safe": 1,
      "warning": 1,
      "off": 0
    }
  }
}
```

### 5.3 DTCG (Design Tokens Community Group) 形式

```json
{
  "$schema": "https://design-tokens.org/schema.json",

  "dads": {
    "$description": "DADS Primitive Colors (Immutable)",
    "red": {
      "$value": "#FF2800",
      "$type": "color",
      "$extensions": {
        "com.dads.immutable": true,
        "com.dads.group": "accent",
        "com.dads.nameJa": "赤"
      }
    }
  },

  "brand": {
    "$description": "Brand Derived Colors",
    "primary": {
      "500": {
        "$value": "#FF3000",
        "$type": "color",
        "$extensions": {
          "com.dads.reference": "{dads.red}",
          "com.dads.deltaE": 0.080,
          "com.dads.derivationType": "soft-snap"
        }
      }
    }
  }
}
```

## 6. 命名規則

### 6.1 推奨案: 両方に接頭辞（Option C）

| カテゴリ | パターン | 例 |
|---------|----------|-----|
| DADS Primitive | `dads-{color}` | `--dads-red`, `--dads-blue` |
| Brand Token | `brand-{role}-{shade}` | `--brand-primary-500`, `--brand-accent-300` |

**理由:**
- 衝突なし: DADSとBrandが名前空間で完全分離
- 出自が明確: 変数名だけでソースがわかる
- 拡張性: 将来的に他のソース（`system-*`, `theme-*`）を追加可能

### 6.2 代替案

| Option | DADS | Brand | 備考 |
|--------|------|-------|------|
| A | `dads-red-500` | `red-500` | プロダクトが自然な名前を使える |
| B | `red-500` | `brand-primary-500` | DADSが「デフォルト言語」 |
| **C** (推奨) | `dads-red` | `brand-primary-500` | 衝突なし、出自明確 |

## 7. UI設計

### 7.1 DADSトークン保護

```typescript
// src/ui/cud-components.ts 変更案

/**
 * トークン編集ガードレール
 */
interface TokenEditGuard {
  /** 編集可能か */
  canEdit: boolean;
  /** 編集不可の場合の理由 */
  reason?: string;
  /** 代替アクションの案内 */
  suggestion?: string;
}

/**
 * トークンの編集可否を判定
 */
function checkTokenEditability(token: ColorToken): TokenEditGuard {
  if (isDadsToken(token)) {
    return {
      canEdit: false,
      reason: "DADSプリミティブカラーは変更できません",
      suggestion: "独自の色が必要な場合は「ブランドトークンを作成」を選択してください"
    };
  }

  return { canEdit: true };
}
```

### 7.2 UI表示案

```
┌─────────────────────────────────────────────────────────────────────┐
│ カラーパレット                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────┐                             │
│ │ DADS Primitives  🔒                 │                             │
│ │ (参照専用・編集不可)                │                             │
│ ├─────────────────────────────────────┤                             │
│ │ 🔴 赤      #FF2800                  │                             │
│ │ 🟠 オレンジ #FF9900                  │                             │
│ │ 🟡 黄      #FAF500                  │                             │
│ │ 🟢 緑      #35A16B                  │                             │
│ │ 🔵 青      #0041FF                  │                             │
│ │ ...                                 │                             │
│ └─────────────────────────────────────┘                             │
│                                                                     │
│ ┌─────────────────────────────────────┐                             │
│ │ Brand Tokens  ✏️                    │                             │
│ │ (プロダクト所有・編集可能)          │                             │
│ ├─────────────────────────────────────┤                             │
│ │ 🔴 Primary-500  #FF3000             │                             │
│ │    └─ 参照: dads-red (ΔE=0.080)     │                             │
│ │ 🟢 Secondary-500 #35A16B            │                             │
│ │    └─ 参照: dads-green (完全一致)   │                             │
│ │                                     │                             │
│ │ [+ ブランドトークンを追加]          │                             │
│ └─────────────────────────────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 8. マイグレーション

### 8.1 既存出力からの移行

```typescript
// src/utils/migration.ts

/**
 * v1形式（上書き型）からv2形式（参照型）への移行
 */
export interface MigrationResult {
  /** 移行されたブランドトークン */
  brandTokens: BrandToken[];
  /** 警告（推定が必要だった箇所） */
  warnings: string[];
  /** 移行できなかった色 */
  unmigrated: string[];
}

/**
 * 既存のOptimizedColor配列をBrandToken配列に変換
 */
export function migrateOptimizedColors(
  colors: OptimizedColor[],
  options: {
    /** ブランド名接頭辞 */
    brandPrefix?: string;
    /** ロール名（primary, secondary, etc.） */
    roles?: string[];
  }
): MigrationResult {
  // 実装...
}
```

### 8.2 後方互換性

- v1 API（`OptimizedColor`）は非推奨（deprecated）としつつ維持
- v2 API（`BrandToken`）を推奨
- エクスポーターは`version`フラグで出力形式を切り替え

## 9. API互換性設計

### 9.1 v1/v2 API並行運用

既存のv1 API（`OptimizedColor`ベース）とv2 API（`BrandToken`ベース）を並行運用し、段階的に移行する。

```typescript
// src/core/api-version.ts

/**
 * APIバージョン
 */
export type ApiVersion = "v1" | "v2";

/**
 * グローバルAPIバージョン設定
 * デフォルトはv1（後方互換性維持）
 */
let currentApiVersion: ApiVersion = "v1";

export function setApiVersion(version: ApiVersion): void {
  currentApiVersion = version;
}

export function getApiVersion(): ApiVersion {
  return currentApiVersion;
}
```

### 9.2 processPaletteWithMode互換性

`processPaletteWithMode`はUIから呼ばれる主要APIであり、v1/v2両方をサポートする。

```typescript
// src/core/cud/service.ts 変更案

/**
 * v1出力形式（後方互換）
 */
export interface ProcessPaletteResultV1 {
  /** @deprecated v2ではbrandTokensを使用 */
  palette: OptimizedColor[];
  cudComplianceRate: number;
  harmonyScore: HarmonyScoreResult;
  warnings: string[];
}

/**
 * v2出力形式（推奨）
 */
export interface ProcessPaletteResultV2 {
  /** ブランドトークン配列 */
  brandTokens: BrandToken[];
  /** DADS参照サマリー */
  dadsReferences: Map<string, DadsToken>;
  /** CUD準拠率 */
  cudComplianceRate: number;
  /** 調和スコア */
  harmonyScore: HarmonyScoreResult;
  /** 警告 */
  warnings: string[];
}

/**
 * 統合出力形式（両バージョン対応）
 */
export type ProcessPaletteResult<V extends ApiVersion> =
  V extends "v1" ? ProcessPaletteResultV1 : ProcessPaletteResultV2;

/**
 * アンカーカラー指定方法
 *
 * v1: 配列の最初の色が暗黙的にアンカーになる（既存動作）
 * v2: anchorHexまたはanchorIndexで明示的に指定
 */
export interface AnchorSpecification {
  /**
   * アンカーカラーのHEX値（直接指定）
   * これを指定すると、colorsに含まれていなくてもアンカーとして使用
   */
  anchorHex?: string;
  /**
   * アンカーカラーのインデックス（colors配列内の位置）
   * デフォルト: 0（最初の色）
   */
  anchorIndex?: number;
  /**
   * アンカーを固定するか（最適化で変更しない）
   *
   * - true（デフォルト）: アンカーを保持、他の色のみ最適化
   * - false: 【現在は無視される】trueと同じ動作をする
   *
   * ## 重要: 現在の動作
   *
   * **isFixed=falseは現在無視されます。** 指定しても内部的にはtrueとして
   * 扱われ、アンカーは常に保持されます。将来のバージョンでfalseの動作が
   * 実装される可能性がありますが、その動作に依存しないでください。
   *
   * isFixed=falseを指定すると警告がコンソールに出力されます。
   */
  isFixed?: boolean;
}

/**
 * パレット処理オプション（拡張）
 */
export interface ProcessPaletteOptions {
  mode: CudCompatibilityMode;
  /** APIバージョン（デフォルト: グローバル設定に従う） */
  apiVersion?: ApiVersion;
  /**
   * アンカーカラー指定（v1/v2共通）
   *
   * v1動作: 省略時はcolors[0]がアンカー
   * v2動作: 省略時はcolors[0]がアンカー、anchorHexで明示的に指定可能
   */
  anchor?: AnchorSpecification;
  /** ブランドトークン生成コンテキスト（v2のみ） */
  generationContext?: PaletteGenerationContext;
}

/**
 * パレットをCUDモードで処理する
 *
 * アンカーカラーの扱い:
 * - アンカーはブランドの「基準色」として機能
 * - 現行実装ではアンカーは常に保持される（最適化で変更されない）
 * - ハーモニースコア計算の基準点になる
 *
 * isFixedオプションについて:
 * - isFixed=true（デフォルト）: アンカーを保持、他の色のみ最適化
 * - isFixed=false: **現在は無視される**（trueと同じ動作、警告出力）
 *
 * **注意**: isFixed=falseは現在実装されていません。指定しても
 * アンカーは常に保持され、trueと同じ動作をします。
 * 将来の動作変更に依存しないでください。
 *
 * @example v1（後方互換、最初の色がアンカー）
 * const result = processPaletteWithMode(colors, { mode: "soft" });
 * // colors[0]がアンカーとして使用される（常に保持）
 *
 * @example v1（アンカー明示指定）
 * const result = processPaletteWithMode(colors, {
 *   mode: "soft",
 *   anchor: { anchorHex: "#FF5500" }  // 配列外の色をアンカーに
 * });
 *
 * @example v2（推奨、アンカー明示指定）
 * const result = processPaletteWithMode(colors, {
 *   mode: "soft",
 *   apiVersion: "v2",
 *   anchor: { anchorIndex: 0 },  // isFixed省略時はtrue（保持）
 *   generationContext: { usedIds: new Set(), roleAssignment: "sequential" }
 * });
 * console.log(result.brandTokens); // BrandToken[]
 */
export function processPaletteWithMode<V extends ApiVersion = "v1">(
  colors: string[],
  options: ProcessPaletteOptions & { apiVersion?: V }
): ProcessPaletteResult<V> {
  const version = options.apiVersion ?? getApiVersion();

  // アンカーカラーを解決
  const anchorSpec = options.anchor ?? {};
  const anchorHex = anchorSpec.anchorHex ?? colors[anchorSpec.anchorIndex ?? 0];
  const anchor = createAnchorColor(anchorHex);

  // isFixed=false の場合の警告
  // 現在はfalseを指定しても無視され、trueと同じ動作をする
  if (anchorSpec.isFixed === false) {
    console.warn(
      "[Ignored] isFixed=false is currently not implemented. " +
      "The anchor will be preserved (same behavior as isFixed=true). " +
      "Do not rely on future isFixed=false behavior."
    );
  }

  // 内部処理は共通
  // 現行のoptimizePaletteはアンカーを常に保持する設計
  // isFixed=falseは現在無視され、アンカーは常に保持される
  const optimizationResult = optimizePalette(colors, anchor, {
    lambda: getLambdaForMode(options.mode),
    mode: options.mode === "strict" ? "strict" : "soft",
  });

  if (version === "v1") {
    // v1形式で返却
    return {
      palette: optimizationResult.palette,
      cudComplianceRate: optimizationResult.cudComplianceRate,
      harmonyScore: optimizationResult.harmonyScore,
      warnings: optimizationResult.warnings,
    } as ProcessPaletteResult<V>;
  }

  // v2形式で返却
  const context = options.generationContext ?? {
    usedIds: new Set<string>(),
    roleAssignment: "sequential" as const,
  };

  const idMap = assignBrandTokenIds(optimizationResult.palette, context);
  const brandTokens = optimizationResult.palette.map((color) =>
    convertToBrandToken(color, idMap.get(color)!)
  );

  return {
    brandTokens,
    dadsReferences: collectDadsReferences(brandTokens),
    cudComplianceRate: optimizationResult.cudComplianceRate,
    harmonyScore: optimizationResult.harmonyScore,
    warnings: optimizationResult.warnings,
  } as ProcessPaletteResult<V>;
}
```

### 9.3 エクスポーターv1/v2切り替え

```typescript
// src/core/export/json-exporter.ts 変更案

export interface JSONExportOptionsV2 extends JSONExportOptions {
  /** 出力形式バージョン */
  outputVersion?: "v1" | "v2";
  /** v2: DADSトークンを含めるか */
  includeDadsTokens?: boolean;
  /** v2: ブランドトークン名前空間 */
  brandNamespace?: string;
}

/**
 * JSON形式でエクスポート（v1/v2対応）
 */
export function exportToJSON(
  colors: Record<string, Color> | BrandToken[],
  options: JSONExportOptionsV2 = {}
): JSONExportResult | JSONExportResultV2 {
  const version = options.outputVersion ?? "v1";

  if (version === "v1") {
    // 既存のv1ロジック
    return exportToJSONv1(colors as Record<string, Color>, options);
  }

  // v2: BrandToken配列を受け取る
  return exportToJSONv2(colors as BrandToken[], options);
}
```

### 9.4 UI統合の互換性レイヤー

```typescript
// src/ui/cud-components.ts 変更案

/**
 * UI向け互換性アダプター
 *
 * UIコンポーネントは内部的にv2 APIを使用しつつ、
 * 既存のOptimizedColor形式も受け付ける。
 */
export class CudPaletteAdapter {
  private apiVersion: ApiVersion;

  constructor(options: { apiVersion?: ApiVersion } = {}) {
    this.apiVersion = options.apiVersion ?? getApiVersion();
  }

  /**
   * パレット結果を統一形式に変換
   */
  normalize(
    input: ProcessPaletteResultV1 | ProcessPaletteResultV2
  ): NormalizedPaletteResult {
    if ("palette" in input) {
      // v1形式 → 内部形式に変換
      return this.fromV1(input);
    }
    // v2形式
    return this.fromV2(input);
  }

  /**
   * エクスポート用に変換
   */
  toExportFormat(
    palette: NormalizedPaletteResult,
    format: "css" | "json" | "dtcg"
  ): string {
    // 統一形式からエクスポート
  }
}
```

### 9.5 移行スケジュール

| フェーズ | 期間 | 状態 |
|---------|------|------|
| **Phase A** | 〜v2.0 | v1デフォルト、v2オプトイン |
| **Phase B** | v2.0〜v2.x | v2デフォルト、v1非推奨警告 |
| **Phase C** | v3.0〜 | v1削除 |

```typescript
// v1 API使用時の非推奨警告（Phase B）
if (options.apiVersion === "v1" || !options.apiVersion) {
  console.warn(
    "[DEPRECATED] v1 API is deprecated and will be removed in v3.0. " +
    "Please migrate to v2 API by setting apiVersion: 'v2'."
  );
}
```

## 10. 実装フェーズ

| Phase | 内容 | 優先度 | 推定工数 |
|-------|------|--------|----------|
| **1** | 型定義（`types.ts`, `id-generator.ts`）作成 | High | S |
| **2** | Snapper出力に`derivation`追加 | High | M |
| **3** | Optimizer出力に`brandToken`追加 | High | M |
| **4** | `processPaletteWithMode` v2対応 | High | M |
| **5** | CSS Exporter v2形式対応 | Medium | M |
| **6** | JSON Exporter v2形式対応 | Medium | M |
| **7** | UI互換性アダプター | Medium | M |
| **8** | UI保護ガードレール | Medium | S |
| **9** | マイグレーションユーティリティ | Low | M |
| **10** | ドキュメント更新 | Low | S |

## 11. 未解決事項

### 11.1 検討中

- [ ] DADSトークンのスケール表現（`Red100`〜`Red1000`）は必要か？
- [ ] ブランドトークンに複数のDADS参照を持たせるケース（グラデーションなど）
- [ ] セマンティックトークン（`error`, `success`）とブランドトークンの関係

### 11.2 今後の議論

- DADS側でのバージョニング（v4 → v5移行時の対応）
- 複数プロダクト間でのブランドトークン共有

## 12. 参考資料

- [Issue #11: DADSカラートークンの不変性対応](https://github.com/monoharada/leonardo-learn/issues/11)
- [CUD推奨配色セット ver.4](https://jfly.uni-koeln.de/colorset/)
- [Design Tokens Community Group](https://design-tokens.github.io/community-group/)

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-12-05 | 0.6 | レビュー指摘3件対応: CSS出力alpha対応ルール追加、resolveSemanticReference使用タイミング文書化、isFixed=false無視動作明確化 |
| 2025-12-05 | 0.5 | レビュー指摘2件対応: DadsReference/BrandTokenにalpha伝播、isFixed仕様明確化（現行動作=常に保持、false=将来機能） |
| 2025-12-05 | 0.4 | レビュー指摘3件対応: セマンティックトークンvar()参照スキップ、createAnchorColor API例修正、rgba()→HEX+alpha分離 |
| 2025-12-04 | 0.3 | 追加レビュー指摘対応: スケール型分離（chromatic/neutral）、neutral/semanticインポート対応、anchor引数フロー明確化 |
| 2025-12-04 | 0.2 | レビュー指摘対応: DADSグループ型分離、ID生成規則追加、API互換性設計追加 |
| 2025-12-04 | 0.1 | 初版作成 |

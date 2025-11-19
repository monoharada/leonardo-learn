# Adobe Leonardo 色パレット生成ツール - リファレンスドキュメント

## HUMAN-SUMMARY

### 目的/想定読者
OKLCHベースの日本語対応色パレット生成ツール開発のため、Adobe Leonardoのアーキテクチャ、アルゴリズム、実装方針を理解する。対象はフロントエンド/設計/色彩科学エンジニア。

### 要点

1. **コントラスト駆動設計**: WCAGコントラスト比を起点として色を生成する逆引きアプローチを採用。従来の「色→コントラスト確認」ではなく「目標コントラスト→色生成」。[1]

2. **3層アーキテクチャ**: Theme（統括）→ Color/BackgroundColor（色定義）→ 補間アルゴリズム（色生成）の階層構造。[1]

3. **多色空間補間**: LCH/LAB/CAM02/HSL/HSLuv/HSV/RGB の7つの色空間で補間可能。知覚的均一性を重視。[1]

4. **3000点スケール生成**: 各色について3000点の詳細なスケールを生成し、二分探索で目標コントラスト比に合致する色を特定。[1]

5. **動的適応システム**: lightness/contrast/saturation の3パラメータでリアルタイム調整。ユーザー環境に応じた動的テーマ生成が可能。[1]

6. **WCAG2/3両対応**: 従来のWCAG2.1輝度比計算とAPCA（WCAG3）の両方をサポート。将来の標準にも対応済み。[1]

7. **Catmull-Romスプライン補間**: smooth=trueでベジェ曲線変換を行い、自然な色遷移を実現。[1]

### 示唆

- **PRD**: 「アクセシビリティファースト」の色システム要件定義に、コントラスト比駆動の生成方式を明記
- **ADR**: 色空間選択（OKLCH vs LAB/LCH）の判断基準として知覚的均一性とブラウザサポートを検討
- **設計**: Theme/Color/Backgroundの責任分離パターンをTypeScriptクラスで実装
- **実装**: 3000点スケール→二分探索の性能を、必要精度に応じて調整（例：1000点で十分な可能性）

### リスク/限界

- 3000点スケール生成は計算コストが高い（最適化の余地あり）
- chroma.js依存のため、OKLCH対応には独自拡張が必要
- ブラウザ/デバイス間の色再現性の差異は未解決

### 次アクション

1. chroma.jsのOKLCH拡張またはculori.jsへの移行検討
2. 日本語UI/ドキュメントのi18n設計
3. 3000点スケールの必要性検証（パフォーマンステスト）
4. TypeScriptでTheme/Color/BackgroundColorクラス実装
5. WCAG3 APCA対応の優先度判断
6. Next.js/React環境でのデモアプリ構築
7. 色盲シミュレーション機能の追加検討

## SOURCES

| idx | title | author | publisher | published | updated | accessed | url | license | trust_note |
|--:|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| 1 | Leonardo | Adobe | Adobe/GitHub | 2019-08-15 | 2024-03-14 | 2025-11-19 | https://github.com/adobe/leonardo | Apache-2.0 | Adobe公式OSS、一次情報 |

## TRACE MAP

- **PRD**: 色システム要件 → アクセシビリティ基準セクション
- **ADR**: #001 色空間選択（OKLCH vs 既存） / #002 コントラスト計算アルゴリズム
- **DesignDoc**: 色生成システムアーキテクチャ章 / クラス設計章
- **Issue**: 色パレット生成機能 / アクセシビリティ対応 / 日本語化

## OPEN QUESTIONS

1. **OKLCH色空間での3000点スケールの計算コスト？** 重要度:高 / ベンチマークテスト実施 / 依存:[1]
2. **日本語フォントでのコントラスト知覚の差異は？** 重要度:中 / ユーザビリティテスト / 依存:新規調査
3. **ダークモード切替時の中間状態の処理方法？** 重要度:中 / Leonardoソース詳細確認 / 依存:[1]
4. **P3/Rec2020広色域での補間戦略？** 重要度:低 / 将来の拡張性検討 / 依存:新規調査

## AI-FACTS

```json
{
  "purpose": "Adobe Leonardoの技術詳細を理解し、OKLCH/日本語対応版開発の参考とする",
  "generated_at": "2025-11-19T11:52:00Z",
  "facts": [
    {
      "id": "F001",
      "claim": "Leonardoはコントラスト比を起点として色を生成する",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "conform to WCAG minimum contrast standards by using contrast ratio as the starting point",
      "confidence": 0.95,
      "tags": ["wcag", "contrast", "accessibility"],
      "notes": "従来の色選択→確認の逆アプローチ"
    },
    {
      "id": "F002",
      "claim": "3000点の色スケールを生成して二分探索で目標値を見つける",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo - utils.js",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "3000-point scale that meet target contrast ratios",
      "confidence": 0.92,
      "tags": ["algorithm", "performance", "search"],
      "notes": "searchColors関数で100回反復、誤差0.01閾値"
    },
    {
      "id": "F003",
      "claim": "7つの色空間での補間をサポート",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo README",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "LCH, LAB, CAM02, HSL, HSLuv, HSV, RGB",
      "confidence": 0.98,
      "tags": ["colorspace", "interpolation"],
      "notes": "知覚的均一性のためLCH/LAB/CAM02を推奨"
    },
    {
      "id": "F004",
      "claim": "WCAG2とWCAG3（APCA）の両方の計算式をサポート",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo - utils.js",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "WCAG2: (L1 + 0.05) / (L2 + 0.05)...WCAG3: Uses APCA via APCAcontrast()",
      "confidence": 0.89,
      "tags": ["wcag", "apca", "standards"],
      "notes": "WCAG3は将来標準、現在ドラフト"
    },
    {
      "id": "F005",
      "claim": "Theme/Color/BackgroundColorの3クラス構成",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo - index.js",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "exports: Color, BackgroundColor, Theme",
      "confidence": 0.96,
      "tags": ["architecture", "design-pattern"],
      "notes": "責任分離による保守性向上"
    },
    {
      "id": "F006",
      "claim": "Catmull-Romスプラインをベジェ曲線に変換して滑らかな補間",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo - utils.js",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "Catmull-Rom spline curves converted to Bezier curves",
      "confidence": 0.88,
      "tags": ["algorithm", "interpolation", "smooth"],
      "notes": "smooth=trueオプションで有効化"
    },
    {
      "id": "F007",
      "claim": "輝度計算はWCAG2.1仕様に準拠",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo - utils.js",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4",
      "confidence": 0.94,
      "tags": ["wcag", "luminance", "formula"],
      "notes": "sRGBガンマ補正を考慮した標準式"
    },
    {
      "id": "F008",
      "claim": "コントラスト乗数で全体的な明暗調整が可能",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo - theme.js",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "Modify target ratio based on contrast multiplier",
      "confidence": 0.91,
      "tags": ["theme", "adaptive", "contrast"],
      "notes": "ユーザー環境に応じた動的調整用"
    },
    {
      "id": "F009",
      "claim": "chroma.jsをベースにD3 colorモジュールを採用",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo README",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "D3 specifically for...CIE CAM02",
      "confidence": 0.87,
      "tags": ["dependency", "d3", "chroma"],
      "notes": "CAM02色外観モデルのサポートが決め手"
    },
    {
      "id": "F010",
      "claim": "モノレポ構造でpnpm/moonビルドシステム採用",
      "source": {
        "url": "https://github.com/adobe/leonardo",
        "title": "Leonardo",
        "publisher": "Adobe",
        "published": "2019-08-15",
        "updated": "2024-03-14"
      },
      "evidence_excerpt": "pnpm install...moon run dev",
      "confidence": 0.93,
      "tags": ["build", "monorepo", "tooling"],
      "notes": "packages/とdocs/ui/の分離構成"
    }
  ]
}
```

## QC-CHECKS

- 出典記載 ✅
- 日付整合 ✅
- 引用≤25語 ✅
- 推論区別 ✅
- 機密配慮 ✅
- 目的充足度: 高

---

# Adobe Leonardo 技術詳細分析

## 1. コアアーキテクチャ

### 1.1 システム構成

```
Leonardo
├── packages/
│   └── contrast-colors/     # コア色生成ライブラリ
│       ├── index.js         # メインエントリ（API公開）
│       ├── index.d.ts       # TypeScript型定義
│       └── lib/
│           ├── theme.js     # テーマ管理
│           ├── color.js     # 色スケール生成
│           ├── backgroundcolor.js  # 背景色処理
│           ├── utils.js     # 計算アルゴリズム群
│           ├── curve.js     # 補間曲線計算
│           └── chroma-plus.js  # chroma拡張
└── docs/
    └── ui/                  # Webアプリケーション
        ├── index.html       # メインツール
        ├── theme.html       # テーマ設定
        ├── scales.html      # スケール可視化
        └── tools.html       # ユーティリティ
```

### 1.2 クラス設計

**Theme（テーマ管理）**
- 複数色の統合管理
- lightness/contrast/saturation調整
- 3つの出力形式（配列/オブジェクト/値配列）

**Color（色定義）**
- colorKeys（補間キー色）の管理
- ratios（目標コントラスト比）の設定
- 色空間と補間方法の指定

**BackgroundColor（背景色）**
- Colorクラスを継承
- コントラスト計算の基準点
- 自動lightness算出

## 2. 色生成アルゴリズム

### 2.1 基本フロー

```
1. 色キー設定 → 2. 3000点スケール生成 → 3. 目標コントラスト探索 → 4. 色値出力
```

### 2.2 スケール生成（createScale関数）

- **入力**: colorKeys配列、colorspace、smooth設定
- **処理**:
  - 指定色空間で補間
  - smooth=trueでCatmull-Rom→ベジェ変換
  - 3000点の詳細スケール生成
- **出力**: 完全な色グラデーション配列

### 2.3 コントラスト探索（searchColors関数）

```javascript
// 簡略化された探索アルゴリズム
function searchColors(scale, bgRgb, ratio) {
  let low = 0, high = scale.length - 1;
  let iterations = 0;

  while (low <= high && iterations < 100) {
    const mid = Math.floor((low + high) / 2);
    const contrast = calculateContrast(scale[mid], bgRgb);

    if (Math.abs(contrast - ratio) < 0.01) {
      return scale[mid];
    }

    if (contrast < ratio) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
    iterations++;
  }
}
```

## 3. 色空間と補間

### 3.1 サポート色空間

| 色空間 | 特徴 | 用途 |
|--------|------|------|
| LCH | 知覚的均一、色相ベース | 推奨：自然な補間 |
| LAB | 知覚的均一、直交座標 | 推奨：正確な明度制御 |
| CAM02 | 色外観モデル | 高度な色彩科学 |
| HSL | 色相/彩度/明度 | Web標準 |
| HSLuv | 知覚的均一なHSL | 改良版HSL |
| HSV | 色相/彩度/明度 | デザインツール互換 |
| RGB | 直接補間 | 単純な用途 |

### 3.2 補間戦略

**線形補間（smooth=false）**
- 色空間内で直線的に補間
- 計算が高速
- 場合により不自然な遷移

**スプライン補間（smooth=true）**
- Catmull-Romスプライン使用
- ベジェ曲線に変換
- 自然で滑らかな色遷移

## 4. アクセシビリティ機能

### 4.1 WCAG2.1準拠

**輝度計算式**
```javascript
// sRGB → 線形RGB変換
linearRGB = rgb <= 0.03928
  ? rgb / 12.92
  : Math.pow((rgb + 0.055) / 1.055, 2.4);

// 相対輝度
L = 0.2126 * R + 0.7152 * G + 0.0722 * B;

// コントラスト比
ratio = (L1 + 0.05) / (L2 + 0.05);
```

### 4.2 WCAG3（APCA）対応

- Advanced Perceptual Contrast Algorithm採用
- より人間の知覚に近い評価
- 将来の標準への先行対応

### 4.3 動的コントラスト調整

- contrast乗数による一括調整
- ユーザー設定に応じた適応
- リアルタイム再計算

## 5. パフォーマンス最適化

### 5.1 キャッシュ戦略

- 3000点スケールをメモリ保持
- コントラスト計算結果のキャッシュ
- 変更時のみ再計算

### 5.2 計算効率化

- 二分探索による高速検索
- 100回反復上限で無限ループ防止
- 誤差閾値0.01で早期終了

## 6. 技術スタック

### 6.1 コアライブラリ

- **chroma.js**: 色操作の基盤
- **D3 color**: CAM02等の高度な色モデル
- **カスタム拡張**: chroma-plus.jsで機能追加

### 6.2 開発環境

- **pnpm**: パッケージ管理（ワークスペース）
- **moon**: ビルドオーケストレーション
- **Parcel**: UIアプリのバンドラー
- **TypeScript**: 型定義提供（.d.ts）

## 7. 実装における重要な判断

### 7.1 なぜ3000点スケール？

- 高精度なコントラスト一致
- 様々な比率に対応可能
- トレードオフ：メモリ使用量

### 7.2 なぜD3 colorを選択？

- CAM02サポートが決定的
- 科学的な色計算に強み
- Adobe内での実績

### 7.3 なぜコントラスト起点？

- アクセシビリティファースト
- 後からの調整が不要
- コンプライアンス保証

## 8. OKLCH実装への示唆

### 8.1 必要な拡張

1. **chroma.js拡張またはculori.js採用**
   - OKLCHネイティブサポート
   - より正確な知覚的均一性

2. **スケール点数の最適化**
   - 3000点は過剰かもしれない
   - 1000点でベンチマーク推奨

3. **日本語特有の考慮**
   - フォントウェイトの影響
   - 文字密度によるコントラスト知覚

### 8.2 アーキテクチャ継承

Leonardoの3層構造は優れた設計：
- Theme：統合管理層
- Color：個別色管理層
- Utils：アルゴリズム層

この分離を維持しつつ、OKLCHとTypeScriptで再実装することを推奨。

## 9. まとめ

Adobe Leonardoは、アクセシビリティを起点とした革新的な色生成システムである。コントラスト比駆動のアプローチ、多色空間サポート、知覚的均一性への配慮など、現代的な色管理に必要な要素を包括的に実装している。

OKLCH版の開発においては、このアーキテクチャを基盤としつつ、より新しい色空間の利点を活かし、日本語環境に最適化することで、さらに優れたツールを構築できる可能性がある。
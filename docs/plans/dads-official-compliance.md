# DADS公式準拠計画書

## 概要

本計画書は、プロジェクトのスタイリングをデジタル庁デザインシステム（DADS）公式仕様に準拠させるためのロードマップを定義する。

### 現状

| 項目 | 現状 | 目標 |
|------|------|------|
| クラス命名 | `dads-*` 採用済み | 維持 |
| トークン体系 | DADSパターン参考 | 公式トークン値に置換 |
| カラー値 | 汎用的な値 | 公式プリミティブカラー |
| フォント | システムフォント | Noto Sans JP |
| スペーシング | 汎用rem値 | 公式スペーシングトークン |

### 参照リソース

- **公式サイト**: https://design.digital.go.jp/dads/
- **デザイントークン**: https://github.com/digital-go-jp/design-tokens
- **npm**: `@digital-go-jp/design-tokens` v1.1.2
- **HTML Storybook**: https://design.digital.go.jp/dads/html/
- **React Storybook**: https://design.digital.go.jp/dads/react/

---

## Phase 1: デザイントークンの公式値への置換

### 1.1 プリミティブカラーの置換

**対象ファイル**: `src/ui/styles/tokens.css`

#### ニュートラルカラー（グレースケール）

```css
/* 現状（汎用値） */
--dads-primitive-neutral-900: #1a1a1a;
--dads-primitive-neutral-800: #333333;
/* ... */

/* 公式値に置換 */
--color-neutral-solid-gray-900: #1a1a1a;  /* 公式と一致 */
--color-neutral-solid-gray-800: #333333;  /* 要確認・調整 */
```

**公式ニュートラルトークン（確認済み）**:
- `--color-neutral-base-white`: #ffffff
- `--color-neutral-base-black`: #000000
- `--color-neutral-solid-gray-50` 〜 `--color-neutral-solid-gray-900`: 11段階
- `--color-neutral-opacity-gray-*`: 透過版（5%〜90%）

#### セマンティックカラー

```css
/* 公式値 */
--color-semantic-success-1: var(--color-primitive-green-600);
--color-semantic-success-2: var(--color-primitive-green-800);
--color-semantic-error-1: var(--color-primitive-red-800);
--color-semantic-error-2: var(--color-primitive-red-900);
--color-semantic-warning-1: var(--color-primitive-yellow-700); /* or orange-600 */
--color-semantic-warning-2: var(--color-primitive-yellow-900); /* or orange-800 */
```

#### プリミティブカラー（色相別）

公式は13段階（50〜950）を各色で定義：
- Blue: #e8f1fe 〜 #000060
- Light Blue: #f0f9ff 〜 #00234b
- Cyan: #e9f7f9 〜 #003741
- Green: #e6f5ec 〜 #032213
- Lime: #ebfad9 〜 #1e2d00
- Yellow: #fbf5e0 〜 #604b00
- Orange: #ffeee2 〜 #541e00
- Red: #fdeeee 〜 #620000
- Magenta: #f3e5f4 〜 #3b003b
- Purple: #f1eafa 〜 #21004b

### 1.2 スペーシングの置換

**公式スペーシングトークン（要確認）**:
```css
/* 現状 */
--dads-spacing-xs: 0.25rem;
--dads-spacing-sm: 0.5rem;
--dads-spacing-md: 1rem;

/* 公式（要調査） */
/* @digital-go-jp/design-tokens から抽出して置換 */
```

### 1.3 ボーダーラディウスの置換

**公式ボーダーラディウス（確認済み）**:
```css
--radius-1: 0.25rem;   /* 4px */
--radius-2: 0.5rem;    /* 8px */
--radius-3: 0.75rem;   /* 12px */
--radius-4: 1rem;      /* 16px */
--radius-5: 1.25rem;   /* 20px */
--radius-6: 1.5rem;    /* 24px */
--radius-7: 2rem;      /* 32px */
--radius-full: 9999px;
```

### 1.4 シャドウ（Elevation）の置換

**公式Elevationトークン（確認済み）**:
```css
--elevation-1: /* 最小の影 */
--elevation-2:
--elevation-3:
--elevation-4:
--elevation-5:
--elevation-6:
--elevation-7:
--elevation-8: /* 最大の影 */
```

---

## Phase 2: タイポグラフィの公式準拠

### 2.1 フォントファミリーの導入

**対象**: Noto Sans JP（公式推奨フォント）

#### 導入方法

**方法A: Google Fonts CDN（推奨）**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
```

**方法B: ローカルホスティング**
```css
@font-face {
  font-family: 'Noto Sans JP';
  src: url('/fonts/NotoSansJP-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Noto Sans JP';
  src: url('/fonts/NotoSansJP-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

#### トークン置換
```css
/* 現状 */
--dads-font-family: -apple-system, BlinkMacSystemFont, ...;

/* 公式準拠 */
--font-family-sans: 'Noto Sans JP', sans-serif;
--font-family-mono: 'Noto Sans Mono', monospace;
```

### 2.2 フォントサイズの置換

**公式フォントサイズ（確認済み）**:
```css
--font-size-50: 0.875rem;   /* 14px */
--font-size-75: 1rem;       /* 16px */
--font-size-100: 1.125rem;  /* 18px */
--font-size-200: 1.25rem;   /* 20px */
--font-size-300: 1.5rem;    /* 24px */
--font-size-400: 1.75rem;   /* 28px */
--font-size-500: 2rem;      /* 32px */
--font-size-600: 2.25rem;   /* 36px */
--font-size-700: 2.5rem;    /* 40px */
--font-size-800: 2.75rem;   /* 44px */
--font-size-900: 3rem;      /* 48px */
--font-size-1000: 4rem;     /* 64px */
```

### 2.3 行高（Line Height）の置換

**公式ラインハイト（確認済み）**:
```css
--line-height-100: 1;
--line-height-120: 1.2;
--line-height-130: 1.3;
--line-height-140: 1.4;
--line-height-150: 1.5;
--line-height-160: 1.6;
--line-height-170: 1.7;
--line-height-175: 1.75;
```

### 2.4 フォントウェイト

**公式フォントウェイト**:
```css
--font-weight-400: 400;  /* Regular */
--font-weight-700: 700;  /* Bold */
```

---

## Phase 3: コンポーネントスタイルの公式準拠

### 3.1 フォーカスリングの統一

**公式フォーカススタイル**:
```css
/* フォーカスリング標準 */
:focus-visible {
  outline: 4px solid var(--color-neutral-base-black);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primitive-yellow-300);
}
```

**対象コンポーネント**:
- `.dads-button`
- `.dads-swatch`
- `.dads-color-scale__item`
- `.dads-mini-scale__item`
- すべてのインタラクティブ要素

### 3.2 ボタンスタイルの確認

公式HTML Storybookを参照し、以下を確認・適用：
- padding
- border-radius
- font-size
- hover/active/disabled状態

### 3.3 カードスタイルの確認

公式を参照し、以下を確認・適用：
- padding
- border-radius
- shadow
- border

---

## Phase 4: アプリ固有拡張の分離

### 4.1 命名規則の整理

| 接頭辞 | 用途 |
|--------|------|
| `dads-` | DADS公式準拠コンポーネント |
| `app-` | アプリ固有の拡張・カスタムコンポーネント |

### 4.2 アプリ固有コンポーネントの特定

以下はDADS公式に相当するコンポーネントがないため、`app-` 接頭辞を検討：
- 色相スクラバー（hue scrubber）
- CVDストリップ（color vision deficiency strip）
- カラースケール（独自拡張部分）

### 4.3 ファイル分離

```
src/ui/styles/
├── tokens.css         # 公式トークン（Phase 1で置換）
├── components.css     # DADS準拠コンポーネント
├── app-components.css # アプリ固有拡張（新規作成）
└── index.css          # エントリポイント
```

---

## Phase 5: ハイコントラストモード対応

### 5.1 @media (prefers-contrast: more) の追加

```css
@media (prefers-contrast: more) {
  :root {
    --dads-focus-ring-width: 4px;
    --dads-border-default: var(--color-neutral-base-black);
  }
}
```

### 5.2 Windows ハイコントラストモード

```css
@media (forced-colors: active) {
  .dads-button {
    border: 2px solid ButtonText;
  }
  .dads-swatch {
    outline: 2px solid CanvasText;
  }
}
```

---

## 実装ステップ

### Step 1: npm パッケージの導入（推奨）

```bash
npm install @digital-go-jp/design-tokens
```

`node_modules/@digital-go-jp/design-tokens/css/tokens.css` を参照し、必要なトークンを抽出。

### Step 2: tokens.css の差分作成

1. 公式トークン値を抽出
2. 現在のtokens.cssとの差分を特定
3. 段階的に置換（破壊的変更を避ける）

### Step 3: フォント導入

1. Noto Sans JP の読み込み方法を決定
2. index.html または CSS に追加
3. フォールバックを設定

### Step 4: フォーカスリングの統一

1. 共通のフォーカスユーティリティを作成
2. 全インタラクティブ要素に適用
3. ハイコントラストモードでテスト

### Step 5: コンポーネントの確認・調整

1. HTML Storybookを参照
2. 各コンポーネントのスタイルを比較
3. 差異を修正

### Step 6: アプリ固有拡張の分離

1. `app-` 接頭辞が必要な要素を特定
2. 新ファイルに分離
3. インポート順序を調整

---

## リスクと注意事項

### サイズ感の変化

公式のpadding/margin値を適用すると、既存UIのサイズ感が変わる可能性がある。
- **対策**: 各コンポーネントで「公式をそのまま使う / アプリ独自値を許容」を明示的に決定

### 色の変化

セマンティックカラー（success/error/warning）の色相が変わる可能性がある。
- **対策**: 変更前後のスクリーンショットを記録し、アクセシビリティテストを実施

### フォント読み込みの影響

Noto Sans JP の追加でページ読み込み時間が増加する可能性がある。
- **対策**: `font-display: swap` を使用し、FOUT を許容

### 破壊的変更の回避

一度に全てを変更せず、Phase単位で段階的に適用する。

---

## 検証チェックリスト

### Phase 1 完了後
- [ ] 全カラートークンが公式値に置換されている
- [ ] 既存UIの表示が崩れていない
- [ ] コントラスト比が維持されている

### Phase 2 完了後
- [ ] Noto Sans JP が正しく読み込まれる
- [ ] フォールバックが機能する
- [ ] 読み込み速度が許容範囲内

### Phase 3 完了後
- [ ] 全フォーカスリングが統一されている
- [ ] キーボードナビゲーションが正常
- [ ] ハイコントラストモードで視認可能

### Phase 4 完了後
- [ ] `dads-` と `app-` が明確に分離
- [ ] ファイル構成がドキュメント通り

### Phase 5 完了後
- [ ] ハイコントラストモードでUI全体が使用可能
- [ ] Windows ナレーターでテスト済み

---

## 参考リンク

- [デジタル庁デザインシステムβ版](https://design.digital.go.jp/dads/)
- [design-tokens GitHub](https://github.com/digital-go-jp/design-tokens)
- [HTML Storybook](https://design.digital.go.jp/dads/html/)
- [React Storybook](https://design.digital.go.jp/dads/react/)
- [@digital-go-jp/design-tokens npm](https://www.npmjs.com/package/@digital-go-jp/design-tokens)

---

## バージョン管理

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-11-25 | 1.0.0 | 初版作成 |

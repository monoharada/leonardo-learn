# DADS公式準拠計画書

## 概要

本計画書は、プロジェクトのスタイリングをデジタル庁デザインシステム（DADS）公式仕様に**包括的に**準拠させるためのロードマップを定義する。トークン値だけでなく、基本スタイリング、コンポーネント設計パターン、ユーティリティクラスまでを網羅する。

### 現状と目標

| 項目 | 現状 | 目標 |
|------|------|------|
| クラス命名 | `dads-*` 採用済み | 維持 |
| トークン体系 | DADSパターン参考（独自値） | 公式トークン値に完全置換 |
| カラー値 | 汎用的な値 | 公式プリミティブカラー（12色相×13段階） |
| フォント | システムフォント | Noto Sans JP / Noto Sans Mono |
| ベーススタイル | 独自リセット | 公式global.cssパターン準拠 |
| フォーカススタイル | 簡易実装 | 公式パターン（黒outline + 黄shadow） |
| リンクスタイル | 未実装 | 公式4状態（unvisited/visited/hover/active） |
| ユーティリティ | なし | 公式ユーティリティクラス導入 |
| コンポーネント | 独自実装 | 公式パターン準拠（data属性ベース） |

### 参照リソース

| リソース | URL | 用途 |
|----------|-----|------|
| 公式サイト | https://design.digital.go.jp/dads/ | 仕様確認 |
| デザイントークンGitHub | https://github.com/digital-go-jp/design-tokens | トークン値抽出 |
| HTMLコンポーネントGitHub | https://github.com/digital-go-jp/design-system-example-components-html | コンポーネントCSS参照 |
| npm | `@digital-go-jp/design-tokens` v1.1.2 | パッケージ導入 |
| HTML Storybook | https://design.digital.go.jp/dads/html/ | 実装例確認 |
| React Storybook | https://design.digital.go.jp/dads/react/ | 実装例確認 |

---

## ファイル構成（目標）

```
src/ui/styles/
├── global.css          # 新規: グローバルスタイル（リセット、ベース、リンク）
├── tokens.css          # 既存: 公式トークン値に置換
├── utilities.css       # 新規: ユーティリティクラス
├── components.css      # 既存: DADS準拠コンポーネント
├── app-components.css  # 新規: アプリ固有拡張
└── index.css           # 新規: エントリポイント（@import管理）

index.html での読み込み順:
1. tokens.css
2. global.css
3. utilities.css
4. components.css
5. app-components.css
```

---

## Phase 0: 公式リソースの導入

### 0.1 npmパッケージのインストール

```bash
npm install @digital-go-jp/design-tokens
```

### 0.2 公式tokens.cssの取得

`node_modules/@digital-go-jp/design-tokens/css/tokens.css` を参照。
または examples ディレクトリから直接コピー。

### 0.3 ソース管理

```
docs/reference/
└── dads-tokens-v1.1.2.css  # 公式トークンのスナップショット（差分追跡用）
```

---

## Phase 1: グローバルスタイル（global.css）の作成

### 1.1 HTMLルート設定

**公式パターン**:
```css
html {
  scrollbar-gutter: stable;
  font-family: var(--font-family-sans);
}

html.is-modal-open {
  overflow: hidden;
  scrollbar-gutter: auto;
}
```

**現状との差分**:
- `scrollbar-gutter: stable` が未設定
- モーダル時のスクロール制御が未実装

### 1.2 ボディ設定

**公式パターン**:
```css
body {
  font-family: var(--font-family-sans);
  color: var(--color-neutral-solid-gray-800);
}
```

**現状**:
```css
body {
  font-family: var(--dads-font-family);
  background: var(--dads-surface-secondary);
  color: var(--dads-text-primary);
}
```

### 1.3 リンクスタイル（重要: 未実装）

**公式パターン**:
```css
a {
  color: var(--color-primitive-blue-900);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

a:visited {
  color: var(--color-primitive-magenta-900);
}

a:hover {
  color: var(--color-primitive-blue-1000);
  text-decoration-thickness: 3px;
}

a:active {
  color: var(--color-primitive-orange-900);
}

a:focus-visible {
  outline: 4px solid var(--color-neutral-base-black);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primitive-yellow-300);
}
```

**作業項目**:
- [ ] リンクの4状態スタイルを追加
- [ ] text-underline-offset/thickness の適用
- [ ] フォーカススタイルの統一

---

## Phase 2: デザイントークンの完全置換

### 2.1 トークン命名規則の変更

**現状** → **公式**:
| 現状 | 公式 |
|------|------|
| `--dads-primitive-neutral-900` | `--color-neutral-solid-gray-900` |
| `--dads-primitive-white` | `--color-neutral-base-white` |
| `--dads-primitive-black` | `--color-neutral-base-black` |
| `--dads-primitive-success-600` | `--color-semantic-success-1` |
| `--dads-primitive-error-600` | `--color-semantic-error-1` |
| `--dads-spacing-md` | （公式スペーシング名を確認） |
| `--dads-radius-md` | `--radius-2` (0.5rem) |
| `--dads-shadow-md` | `--elevation-3` など |

### 2.2 プリミティブカラー（全12色相）

**公式カラー構成（各色13段階: 50〜1200）**:

| 色相 | 50 | 100 | 200 | ... | 900 | 1000 | 1100 | 1200 |
|------|----|----|----|----|----|----|----|----|
| Blue | #e8f1fe | ... | ... | ... | ... | ... | ... | #000060 |
| Light Blue | #f0f9ff | ... | ... | ... | ... | ... | ... | #00234b |
| Cyan | #e9f7f9 | ... | ... | ... | ... | ... | ... | #003741 |
| Green | #e6f5ec | ... | ... | ... | ... | ... | ... | #032213 |
| Lime | #ebfad9 | ... | ... | ... | ... | ... | ... | #1e2d00 |
| Yellow | #fbf5e0 | ... | ... | ... | ... | ... | ... | #604b00 |
| Orange | #ffeee2 | ... | ... | ... | ... | ... | ... | #541e00 |
| Red | #fdeeee | ... | ... | ... | ... | ... | ... | #620000 |
| Magenta | #f3e5f4 | ... | ... | ... | ... | ... | ... | #3b003b |
| Purple | #f1eafa | ... | ... | ... | ... | ... | ... | #21004b |

### 2.3 ニュートラルカラー

**Solid Gray（11段階）**:
```css
--color-neutral-solid-gray-50: #f2f2f2;
--color-neutral-solid-gray-100: #e6e6e6;
--color-neutral-solid-gray-200: #cccccc;
--color-neutral-solid-gray-300: #b3b3b3;
--color-neutral-solid-gray-400: #999999;
--color-neutral-solid-gray-420: /* Storybook参照 */;
--color-neutral-solid-gray-500: #808080;
--color-neutral-solid-gray-600: #666666;
--color-neutral-solid-gray-700: #4d4d4d;
--color-neutral-solid-gray-800: #333333;
--color-neutral-solid-gray-900: #1a1a1a;
```

**Opacity Gray（透過版）**:
```css
--color-neutral-opacity-gray-50: rgba(0, 0, 0, 0.05);
/* ... 90% まで */
--color-neutral-opacity-gray-900: rgba(0, 0, 0, 0.9);
```

### 2.4 セマンティックカラー

```css
--color-semantic-success-1: var(--color-primitive-green-600);
--color-semantic-success-2: var(--color-primitive-green-800);
--color-semantic-error-1: var(--color-primitive-red-800);
--color-semantic-error-2: var(--color-primitive-red-900);
--color-semantic-warning-1: var(--color-primitive-yellow-700);
--color-semantic-warning-2: var(--color-primitive-yellow-900);
/* または orange-600/orange-800 */
```

### 2.5 タイポグラフィトークン

**フォントファミリー**:
```css
--font-family-sans: "Noto Sans JP", /* フォールバック */;
--font-family-mono: "Noto Sans Mono", monospace;
```

**フォントサイズ（12段階）**:
```css
--font-size-50: 0.875rem;   /* 14px */
--font-size-75: 1rem;       /* 16px - base */
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

**フォントウェイト**:
```css
--font-weight-400: 400;
--font-weight-700: 700;
```

**ラインハイト（8段階）**:
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

### 2.6 ボーダーラディウス

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

### 2.7 エレベーション（シャドウ: 8段階）

```css
--elevation-1: /* 最小 - ほぼフラット */;
--elevation-2: /* ... */;
--elevation-3: /* ... */;
--elevation-4: /* ... */;
--elevation-5: /* ... */;
--elevation-6: /* ... */;
--elevation-7: /* ... */;
--elevation-8: /* 最大 - 大きな浮き */;
```

---

## Phase 3: ユーティリティクラス（utilities.css）

### 3.1 アクセシビリティユーティリティ

**Visually Hidden**:
```css
.dads-u-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**フォーカスアウトライン**:
```css
.dads-u-focus-outline:focus-visible {
  outline: 4px solid var(--color-neutral-base-black);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primitive-yellow-300);
}

.dads-u-focus-within-outline:focus-within {
  outline: 4px solid var(--color-neutral-base-black);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primitive-yellow-300);
}
```

### 3.2 タイポグラフィユーティリティ

**命名規則**: `.dads-u-{family}-{size}{weight}-{lineHeight}`

**例**:
```css
/* Display系（大見出し） */
.dads-u-dsp-64N-140 {
  font-size: var(--font-size-1000);
  font-weight: var(--font-weight-400);
  line-height: var(--line-height-140);
}

/* Standard系（本文・小見出し） */
.dads-u-std-24B-150 {
  font-size: var(--font-size-300);
  font-weight: var(--font-weight-700);
  line-height: var(--line-height-150);
  letter-spacing: 0.02em;
}

.dads-u-std-16N-175 {
  font-size: var(--font-size-75);
  font-weight: var(--font-weight-400);
  line-height: var(--line-height-175);
  letter-spacing: 0.02em;
}

/* Dense系（コンパクト表示） */
.dads-u-dns-14B-120 {
  font-size: var(--font-size-50);
  font-weight: var(--font-weight-700);
  line-height: var(--line-height-120);
}

/* Outline系（ラベル等） */
.dads-u-oln-14N-100 {
  font-size: var(--font-size-50);
  font-weight: var(--font-weight-400);
  line-height: var(--line-height-100);
  letter-spacing: 0.02em;
}

/* Mono系（コード） */
.dads-u-mono-16N-150 {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-75);
  font-weight: var(--font-weight-400);
  line-height: var(--line-height-150);
}
```

---

## Phase 4: コンポーネントスタイルの公式準拠

### 4.1 共通フォーカススタイル

**公式パターン（全コンポーネント共通）**:
```css
:focus-visible {
  outline: 4px solid var(--color-neutral-base-black);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primitive-yellow-300);
}
```

### 4.2 ボタンコンポーネント（.dads-button）

**公式パターン（data属性ベース）**:

```css
.dads-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-700);
  font-size: 1rem;
  font-family: var(--font-family-sans);
  width: fit-content;
  cursor: pointer;
}

/* サイズバリエーション */
.dads-button[data-size="lg"] {
  min-width: 8.5rem;
  min-height: 3.5rem;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.dads-button[data-size="md"] {
  min-width: 6rem;
  min-height: 3rem;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}

.dads-button[data-size="sm"] {
  min-width: 5rem;
  min-height: 2.25rem;
  border-radius: 0.375rem;
  padding: 0.125rem 0.75rem;
}

.dads-button[data-size="xs"] {
  min-width: 4.5rem;
  min-height: 1.75rem;
  border-radius: 0.25rem;
  padding: 0.125rem 0.5rem;
}

/* タイプバリエーション: solid-fill */
.dads-button[data-type="solid-fill"] {
  background-color: var(--color-primitive-blue-900);
  color: var(--color-neutral-base-white);
  border: none;
}

.dads-button[data-type="solid-fill"]:hover {
  background-color: var(--color-primitive-blue-1000);
  text-decoration: underline;
}

.dads-button[data-type="solid-fill"]:active {
  background-color: var(--color-primitive-blue-1100);
}

.dads-button[data-type="solid-fill"]:disabled {
  background-color: var(--color-neutral-solid-gray-400);
  color: var(--color-neutral-solid-gray-100);
  cursor: default;
}

/* タイプバリエーション: outline */
.dads-button[data-type="outline"] {
  background-color: var(--color-neutral-base-white);
  color: var(--color-primitive-blue-900);
  border: 1px solid var(--color-primitive-blue-900);
}

.dads-button[data-type="outline"]:hover {
  background-color: var(--color-primitive-blue-50);
  color: var(--color-primitive-blue-1000);
  text-decoration: underline;
}

/* タイプバリエーション: text */
.dads-button[data-type="text"] {
  background-color: transparent;
  color: var(--color-primitive-blue-900);
  text-decoration: underline;
  border: none;
}

.dads-button[data-type="text"]:hover {
  background-color: var(--color-primitive-blue-50);
  color: var(--color-primitive-blue-1000);
  text-decoration-thickness: 3px;
}

/* フォーカス（全タイプ共通） */
.dads-button:focus-visible {
  outline: 4px solid var(--color-neutral-base-black);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primitive-yellow-300);
}
```

**現状との差分**:
- `data-type` 属性ベースの分岐がない
- サイズバリエーションの min-width/min-height が異なる
- hover時の underline がない
- フォーカススタイルが簡易的

### 4.3 インプットコンポーネント（.dads-input）

**公式パターン**:
```css
.dads-input-text__input {
  border: 1px solid var(--color-neutral-solid-gray-600);
  border-radius: 0.5rem; /* 8px */
  padding: 0 0.5rem;
}

.dads-input-text__input[data-size="sm"] { height: 2.5rem; }
.dads-input-text__input[data-size="md"] { height: 3rem; }
.dads-input-text__input[data-size="lg"] { height: 3.5rem; }

.dads-input-text__input:focus {
  outline: 4px solid var(--color-neutral-base-black);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primitive-yellow-300);
}

.dads-input-text__input:hover:not(:disabled):not(:read-only) {
  border-color: var(--color-neutral-base-black);
}

.dads-input-text__input:invalid,
.dads-input-text__input[aria-invalid="true"] {
  border-color: var(--color-semantic-error-1);
}

.dads-input-text__input:disabled {
  background-color: var(--color-neutral-solid-gray-50);
  border-color: var(--color-neutral-solid-gray-300);
  color: var(--color-neutral-solid-gray-500);
}

.dads-input-text__input:read-only {
  border-style: dashed;
}
```

### 4.4 バッジコンポーネント（.dads-badge）

**現状維持可能**（data-level属性で制御済み）

追加検討:
- サイズバリエーション
- アウトラインバリエーション

---

## Phase 5: アプリ固有拡張の分離

### 5.1 DADS準拠コンポーネント vs アプリ固有

| コンポーネント | 分類 | 理由 |
|----------------|------|------|
| `.dads-button` | DADS | 公式準拠可能 |
| `.dads-input` | DADS | 公式準拠可能 |
| `.dads-badge` | DADS | 公式準拠可能 |
| `.dads-dialog` | DADS | 公式準拠可能 |
| `.dads-layout` | App | アプリ固有レイアウト |
| `.dads-sidebar` | App | アプリ固有レイアウト |
| `.dads-color-scale` | App | DADS相当なし |
| `.dads-swatch` | App | DADS相当なし |
| `.dads-mini-scale` | App | DADS相当なし |
| `.dads-scrubber` | App | DADS相当なし |
| `.dads-cvd-*` | App | DADS相当なし |
| `.dads-contrast-card` | App | DADS相当なし |

### 5.2 命名規則の変更

```css
/* DADS公式準拠 */
.dads-button { ... }
.dads-input { ... }

/* アプリ固有拡張 */
.app-layout { ... }
.app-sidebar { ... }
.app-color-scale { ... }
.app-swatch { ... }
.app-mini-scale { ... }
.app-scrubber { ... }
.app-cvd-controls { ... }
.app-contrast-card { ... }
```

### 5.3 ファイル分離

```css
/* components.css - DADS準拠のみ */
.dads-button { ... }
.dads-input { ... }
.dads-badge { ... }
.dads-dialog { ... }

/* app-components.css - アプリ固有 */
.app-layout { ... }
.app-sidebar { ... }
.app-color-scale { ... }
/* ... */
```

---

## Phase 6: フォント導入

### 6.1 Google Fonts CDN（推奨）

```html
<!-- index.html <head> に追加 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### 6.2 フォールバック設定

```css
--font-family-sans: "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-family-mono: "Noto Sans Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### 6.3 font-display設定

`display=swap` をGoogle Fonts URLに含めることでFOUT（Flash of Unstyled Text）を許容し、読み込み体験を改善。

---

## Phase 7: ハイコントラストモード対応

### 7.1 prefers-contrast対応

```css
@media (prefers-contrast: more) {
  :root {
    /* フォーカスリングを太く */
    --focus-outline-width: 6px;
    /* ボーダーを濃く */
    --border-color-default: var(--color-neutral-base-black);
  }
}
```

### 7.2 Windows ハイコントラスト（forced-colors）

```css
@media (forced-colors: active) {
  .dads-button {
    border: 2px solid ButtonText;
  }

  .dads-input {
    border: 2px solid FieldText;
  }

  .app-swatch {
    outline: 2px solid CanvasText;
  }

  a:focus-visible {
    outline: 3px solid LinkText;
  }
}
```

---

## 実装ステップ（推奨順序）

### Step 1: 準備
- [ ] `npm install @digital-go-jp/design-tokens`
- [ ] 公式tokens.cssを `docs/reference/` にコピー（差分追跡用）
- [ ] 現状のスクリーンショットを記録

### Step 2: Phase 0 - ファイル構成変更
- [ ] `global.css` 新規作成
- [ ] `utilities.css` 新規作成
- [ ] `app-components.css` 新規作成
- [ ] `index.css` 新規作成（@import管理）
- [ ] `index.html` の読み込み順序を変更

### Step 3: Phase 1 - グローバルスタイル
- [ ] HTMLルート設定
- [ ] リンクスタイル追加

### Step 4: Phase 2 - トークン置換
- [ ] プリミティブカラー置換
- [ ] ニュートラルカラー置換
- [ ] セマンティックカラー置換
- [ ] タイポグラフィトークン置換
- [ ] スペーシング/ラディウス/エレベーション置換

### Step 5: Phase 3 - ユーティリティ
- [ ] visually-hidden追加
- [ ] フォーカスユーティリティ追加
- [ ] タイポグラフィユーティリティ追加

### Step 6: Phase 4 - コンポーネント
- [ ] フォーカススタイル統一
- [ ] ボタン公式パターン適用
- [ ] インプット公式パターン適用
- [ ] その他コンポーネント確認

### Step 7: Phase 5 - 分離
- [ ] アプリ固有コンポーネント特定
- [ ] 命名規則変更（dads- → app-）
- [ ] ファイル分離

### Step 8: Phase 6 - フォント
- [ ] Google Fonts導入
- [ ] フォールバック設定
- [ ] 読み込み速度確認

### Step 9: Phase 7 - アクセシビリティ
- [ ] prefers-contrast対応
- [ ] forced-colors対応
- [ ] スクリーンリーダーテスト

### Step 10: 検証
- [ ] 全ページの表示確認
- [ ] キーボードナビゲーションテスト
- [ ] ハイコントラストモードテスト
- [ ] パフォーマンス計測

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| サイズ感の変化 | UIレイアウト崩れ | 各コンポーネントで公式/独自を明示決定 |
| 色の変化 | アクセシビリティ低下 | 変更前後のコントラスト比チェック |
| フォント読み込み遅延 | 初期表示のFOUT | font-display: swap + preconnect |
| 命名規則変更 | JSとの整合性 | demo.ts内のクラス名も同時に変更 |
| 破壊的変更 | 一時的な表示崩れ | Phase単位で段階的に適用 |

---

## 検証チェックリスト

### 各Phase完了後
- [ ] 表示が崩れていない
- [ ] インタラクションが正常
- [ ] キーボード操作可能
- [ ] フォーカスが見える

### 全Phase完了後
- [ ] DADS Storybookと同等の見た目
- [ ] ハイコントラストモードで使用可能
- [ ] Lighthouseアクセシビリティスコア90以上
- [ ] Core Web Vitals合格

---

## 参考リンク

- [デジタル庁デザインシステムβ版](https://design.digital.go.jp/dads/)
- [design-tokens GitHub](https://github.com/digital-go-jp/design-tokens)
- [HTML Components GitHub](https://github.com/digital-go-jp/design-system-example-components-html)
- [HTML Storybook](https://design.digital.go.jp/dads/html/)
- [React Storybook](https://design.digital.go.jp/dads/react/)
- [@digital-go-jp/design-tokens npm](https://www.npmjs.com/package/@digital-go-jp/design-tokens)

---

## バージョン管理

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-11-25 | 1.0.0 | 初版作成 |
| 2025-11-25 | 2.0.0 | 基本スタイリング・コンポーネント詳細を追加 |

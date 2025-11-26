# インラインスタイル改善計画: DADS準拠フル移行

**作成日**: 2025-11-25
**最終更新**: 2025-11-25
**ブランチ**: `feat/issue-5-color-scale-adjustment`
**参考**: [DADS HTML Components](https://github.com/digital-go-jp/design-system-example-components-html)

---

## 概要

`demo.ts` の315行以上のインラインスタイルと `index.html` の約200箇所のインラインスタイルを、デジタル庁デザインシステム（DADS）準拠のCSS設計に移行する。

## 現状の問題

- **demo.ts**: 約2,100行中315行以上がインラインスタイル（約15%）
- **index.html**: 約170箇所のインラインstyle属性 + `<style>`ブロック約50行
- **重複コード**: `contrastRanges`が5箇所、ボタン状態スタイルが6箇所以上
- **外部CSSファイル**: なし
- **CSS変数**: 未使用
- **動的カラー連携**: Leonardo生成カラーとUI静的スタイルの境界が不明確

## 目標

1. DADS準拠のCSS変数体系を導入（静的トークン）
2. BEM + データ属性パターンでクラス設計
3. 静的スタイルを外部CSSに分離
4. 重複コードを定数・関数に集約
5. index.html のインラインスタイルをクラス化

## スコープ外（別計画で対応）

- **動的パレット同期**: Leonardo 生成カラーを CSS 変数に反映する機能（`syncGeneratedPaletteToCssVars` 等）
- 生成カラーの `--generated-*` トークン体系
- npm パッケージ配布時のパス整合性

---

## ビルド設定とエイリアス

### ビルド環境

このプロジェクトは **Bun** を使用してビルドします（Viteではない）:

```bash
# package.json scripts
"build": "bun build src/index.ts --outdir=dist --target=browser --minify --sourcemap && tsc --emitDeclarationOnly --outDir dist"
```

### パスエイリアス（tsconfig.json）

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/core/*": ["./src/core/*"],
    "@/utils/*": ["./src/utils/*"],
    "@/ui/*": ["./src/ui/*"]
  }
}
```

### CSSアセット配置戦略

Bun は TypeScript からの CSS import を直接バンドルしないため、以下の戦略を採用:

#### ローカル開発・デモアプリ

`index.html` はリポジトリルートに配置され、`./dist/index.js` を読み込む構成。
CSS は `src/ui/styles/` から直接読み込む:

```html
<!-- index.html に追加（ルートから src/ を参照） -->
<link rel="stylesheet" href="./src/ui/styles/tokens.css">
<link rel="stylesheet" href="./src/ui/styles/components.css">
```

#### npm パッケージ配布

npm パッケージ利用者向けに、CSS を `dist/` にもコピー:

```json
// package.json に追加するスクリプト
"postbuild": "cp -r src/ui/styles dist/styles"
```

利用者は以下のように読み込み:
```html
<link rel="stylesheet" href="node_modules/leonardo-learn/dist/styles/tokens.css">
```

**注**: 本計画のスコープは「ローカルデモアプリのインラインスタイル除去」であり、
`index.html` + `src/ui/styles/` の構成で完結する。npm 配布時のパス整合性は別途対応。

---

## 要素―クラス対応表（Element-Class Mapping）

### index.html の対応

#### レイアウト構造

| 現在の要素 (行番号) | インラインスタイル内容 | 移行先クラス | data属性 |
|-------------------|---------------------|-------------|---------|
| `div[style="display: flex; height: 100vh..."]` (55) | display:flex, height:100vh, overflow:hidden | `.dads-layout` | - |
| Sidebar `div[style="width: 340px..."]` (57-58) | width:340px, background:white, border-right, flex-direction:column | `.dads-sidebar` | - |
| Sidebar Header `div[style="padding: 1.5rem..."]` (59) | padding, border-bottom | `.dads-sidebar__header` | - |
| Palette List Container (95) | flex:1, overflow-y:auto, padding | `.dads-sidebar__content` | - |
| Sidebar Controls (108) | padding, border-top, background | `.dads-sidebar__footer` | - |
| Main Content (132) | flex:1, flex-direction:column, height:100vh, overflow:hidden, background | `.dads-main` | - |
| Main Header (135) | background:white, border-bottom, padding, display:flex | `.dads-main__header` | - |
| Content Area (170) | flex:1, overflow-y:auto, padding | `.dads-main__content` | - |

#### フォームコントロール

| 現在の要素 (行番号) | インラインスタイル内容 | 移行先クラス | data属性 |
|-------------------|---------------------|-------------|---------|
| Brand Color Label (64) | display:block, font-weight:bold, font-size, margin-bottom | `.dads-label` | - |
| Key Color Input (66-68) | flex:1, padding, border, border-radius, font-size | `.dads-input` | - |
| Generate Button (69-71) | padding, background, color, border:none, border-radius, cursor, font-weight | `.dads-button[data-variant="primary"]` | `data-variant="primary"` |

#### ボタングループ（Harmony/Contrast/CVD選択）

| 現在の要素 (行番号) | インラインスタイル内容 | 移行先クラス | data属性 |
|-------------------|---------------------|-------------|---------|
| Harmony Buttons Container (78) | display:flex, flex-wrap:wrap, gap | `.dads-button-group` | - |
| Harmony Button (79-87各) | padding, border, border-radius, background, cursor, font-size | `.dads-button[data-size="sm"]` | `data-active="true/false"`, `data-value="..."` |
| Contrast Buttons Container (143) | display:flex, gap | `.dads-button-group` | - |
| Contrast Button (144-148各) | padding, border, border-radius, background, cursor, font-size | `.dads-button[data-size="sm"]` | `data-active="true/false"`, `data-value="..."` |
| CVD Buttons Container (154) | display:flex, gap | `.dads-button-group` | - |
| CVD Button (155-159各) | padding, border, border-radius, background, cursor, font-size | `.dads-button[data-size="sm"]` | `data-active="true/false"`, `data-cvd="..."` |

#### View Switcher

| 現在の要素 (行番号) | インラインスタイル内容 | 移行先クラス | data属性 |
|-------------------|---------------------|-------------|---------|
| View Switcher Container (136) | display:flex, background:#f0f0f0, padding:4px, border-radius | `.dads-view-switcher` | - |
| View Button (137-139各) | padding, border:none, border-radius, background, box-shadow, font-weight | `.dads-view-switcher__button` | `data-active="true/false"` |

#### Dialogs

| 現在の要素 (行番号) | インラインスタイル内容 | 移行先クラス | data属性 |
|-------------------|---------------------|-------------|---------|
| Export Dialog (178-186) | padding, border-radius, border:none, box-shadow, max-width, width | `.dads-dialog` | - |
| Color Detail Dialog (191-207) | position:fixed, bottom:0, width:100%, max-height, border:none, border-radius | `.dads-dialog.dads-dialog--drawer` | - |
| Mini Scale Container (251) | display:flex, height:32px, background, border-bottom | `.dads-mini-scale` | - |
| Detail Header (256-275) | padding, border-bottom, background | `.dads-dialog__header` | - |
| Detail Content (280) | flex:1, padding | `.dads-dialog__body` | - |
| Contrast Cards (287-328) | background, border, border-radius, padding, display:flex, flex-direction:column, gap | `.dads-contrast-card` | `data-bg="white/black"` |
| Tuner Scrubber Container (339-354) | position:relative, width, height, background, border-radius, overflow, cursor | `.dads-scrubber` | - |
| Action Buttons (357-364) | display:flex, gap, justify-content | `.dads-dialog__actions` | - |

#### その他

| 現在の要素 (行番号) | インラインスタイル内容 | 移行先クラス | data属性 |
|-------------------|---------------------|-------------|---------|
| Add Palette Button (101-104) | width:100%, padding, border:dashed, background:none, cursor, border-radius, color | `.dads-button.dads-button--dashed` | - |
| Export Buttons (118-126各) | width:100%, margin-bottom, padding, background:white, border, border-radius, cursor | `.dads-button.dads-button--block` | - |
| `<style>` Block (8-51) | body, .palette, .swatch, .swatch-info, .contrast-badge | tokens.css + components.css に移行後削除 | - |

---

### demo.ts の対応

#### Sidebar 描画 (renderSidebar)

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| container `div` (92-93) | marginBottom:4px | `.dads-palette-item` | - |
| btn `div` (96-106) | padding, cursor, borderRadius, fontWeight, fontSize, display:flex, alignItems, justifyContent | `.dads-palette-item__button` | `data-active="true/false"` |
| dot `span` (108-114) | width:12px, height:12px, borderRadius:50%, display:inline-block, marginRight | `.dads-palette-item__dot` | - |
| Active state (124-126) | background:#e3f2fd, color:#0052cc, fontWeight:bold | (CSSで定義) | `data-active="true"` |
| Inactive state (127-130) | background:transparent, color:#333 | (CSSで定義) | `data-active="false"` |

#### Button State Updates (updateEditor)

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| Harmony button active (162-165) | background:#e3f2fd, borderColor:#0052cc, fontWeight:bold | `.dads-button[data-active="true"]` | `data-active="true"` |
| Harmony button inactive (167-170) | background:white, borderColor:#ccc, fontWeight:normal | `.dads-button[data-active="false"]` | `data-active="false"` |
| Contrast button active (192-194) | background:#e3f2fd, borderColor:#0052cc, fontWeight:bold | `.dads-button[data-active="true"]` | `data-active="true"` |
| Contrast button inactive (196-198) | background:white, borderColor:#ccc, fontWeight:normal | `.dads-button[data-active="false"]` | `data-active="false"` |

#### View Button Updates (updateViewButtons)

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| Reset all buttons (305-309) | background:transparent, boxShadow:none | `.dads-view-switcher__button` (default) | `data-active="false"` |
| Active button (319-320) | background:white, boxShadow:0 1px 3px | `.dads-view-switcher__button[data-active="true"]` | `data-active="true"` |

#### Palette View (renderPaletteView)

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| container (519-521) | display:flex, flexDirection:column, gap:2rem | `.dads-section` | - |
| section heading (551-555) | fontSize:1.1rem, marginBottom:1rem, color:#333, fontWeight:600 | `.dads-section__heading` | - |
| cardsContainer (559-563) | display:grid, gridTemplateColumns:repeat(auto-fill, minmax(200px, 1fr)), gap:1rem | `.dads-grid[data-columns="auto-fill"]` | `data-columns="auto-fill"` |
| card button (566-576) | background:white, borderRadius:8px, boxShadow, overflow:hidden, cursor:pointer, border:none, padding:0, textAlign:left, width:100% | `.dads-card[data-interactive="true"]` | `data-interactive="true"` |
| swatch (1101-1105) | height:120px, backgroundColor:(dynamic) | `.dads-card__swatch` | - |
| info (1107-1108) | padding:1rem | `.dads-card__body` | - |
| tokenName h3 (1119-1122) | margin:0 0 0.5rem 0, fontSize:1rem | `.dads-card__title` | - |
| hexCode code (1124-1127) | color:#666, fontSize:0.85rem | `.dads-text-mono` | - |

#### Shades View (renderShadesView)

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| container (1153-1155) | display:flex, flexDirection:column, gap:2rem | `.dads-section` | - |
| header h2 (1164-1176) | fontSize:1.1rem, marginBottom:1rem, color:#333 | `.dads-section__heading` | - |
| scaleContainer (1244-1247) | display:flex, borderRadius:8px, overflow:visible | `.dads-scale` | - |
| swatch button (1253-1266) | flex:1, aspectRatio:1, display:flex, alignItems:center, justifyContent:center, flexDirection:column, fontSize:0.75rem, position:relative, border:none, padding:0, margin:0, outline:none | `.dads-swatch` | `data-text="light/dark"` |
| key color circle (1353-1361) | width:100%, height:100%, borderRadius:50%, backgroundColor:(dynamic), display:flex, alignItems:center, justifyContent:center | `.dads-swatch__key-indicator` | - |
| label span (1363-1368) | color:(dynamic), fontWeight:bold, fontSize:0.75rem | `.dads-swatch__label` | - |
| badgeContainer (1309-1316) | display:flex, gap:2px, fontSize:0.55rem, position:absolute, bottom:4px, left:50%, transform:translateX(-50%) | `.dads-swatch__badges` | - |
| badge (1318-1328, 1332-1342) | padding:2px 4px, borderRadius:4px, fontWeight:bold, backgroundColor:transparent, color, border | `.dads-contrast-indicator` | `data-level="AAA/AA/L"`, `data-color="white/black"` |

#### Color Detail Dialog Updates

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| miniScale item div (1012-1015) | flex:1, backgroundColor:(dynamic), position:relative | `.dads-mini-scale__item` | - |
| check mark div (1024-1033) | position:absolute, top:50%, left:50%, transform:translate(-50%,-50%), color, fontSize:12px, fontWeight:bold | `.dads-mini-scale__check` | - |
| badge styling (1496-1526) | backgroundColor, color | `.dads-badge` | `data-level="success/warning/error"` |

#### Accessibility View (renderAccessibilityView)

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| container (1754-1756) | display:flex, flexDirection:column, gap:3rem | `.dads-section` | - |
| explanationSection (1759-1764) | marginBottom:3rem, padding:1.5rem, background:#f8f9fa, borderRadius:8px, border:1px solid #e9ecef | `.dads-a11y-explanation` | - |
| explanationHeading (1766-1769) | marginTop:0, marginBottom:1rem | `.dads-a11y-explanation__heading` | - |
| explanationContent内HTML (1773-1791) | インラインstyle多数 | `.dads-a11y-explanation__content` 内はDADS準拠の子要素スタイルで対応 | - |
| keyColorsHeading (1797-1800) | marginBottom:1rem | `.dads-section__heading` | - |
| keyColorsDesc (1803-1807) | marginBottom:1.5rem, color:#666 | `.dads-section__description` | - |
| pContainer (1840-1845) | marginBottom:3rem, padding:1.5rem, background:white, borderRadius:8px, boxShadow | `.dads-a11y-palette-card` | - |
| pTitle (1847-1850) | marginTop:0, marginBottom:1rem | `.dads-a11y-palette-card__title` | - |

#### Distinguishability Analysis (renderDistinguishabilityAnalysis)

| 現在のコード (行番号) | インラインスタイル | 移行先クラス | data属性 |
|---------------------|------------------|-------------|---------|
| normalRow (1931) | marginBottom:2rem | `.dads-cvd-row` | - |
| normalLabel (1933-1936) | fontWeight:bold, marginBottom:0.5rem | `.dads-cvd-row__label` | - |
| normalStrip (1939-1943) | display:flex, height:60px, borderRadius:8px, overflow:hidden | `.dads-cvd-strip` | - |
| swatch (1945-1957) | flex:1, backgroundColor:(dynamic), display:flex, alignItems:center, justifyContent:center, color:(dynamic), fontSize:0.7rem | `.dads-cvd-strip__swatch` | - |
| simContainer (1963-1966) | display:grid, gridTemplateColumns:1fr, gap:1.5rem | `.dads-cvd-simulations` | - |
| row label (1971-1975) | fontWeight:bold, marginBottom:0.5rem, fontSize:0.9rem | `.dads-cvd-row__label` | - |
| stripContainer (1978-1980) | position:relative, height:60px | `.dads-cvd-strip-container` | - |
| strip (1982-1986) | display:flex, height:100%, borderRadius:8px, overflow:hidden | `.dads-cvd-strip` | - |
| overlay (2025-2031) | position:absolute, top:0, left:0, width:100%, height:100%, pointerEvents:none | `.dads-cvd-overlay` | - |
| conflict line (2038-2048) | position:absolute, left:(dynamic), top:10%, bottom:10%, width:2px, backgroundColor:white, borderLeft/Right, zIndex:10 | `.dads-cvd-conflict-line` | - |
| conflict icon (2050-2069) | position:absolute, width:20px, height:20px, backgroundColor:#fff, border:2px solid #c5221f, borderRadius:50%, color:#c5221f, fontWeight:bold, display:flex, alignItems:center, justifyContent:center, fontSize:12px, zIndex:11, boxShadow | `.dads-cvd-conflict-icon` | - |

---

### 定義予定のクラス一覧

#### Layout Classes
- `.dads-layout` - メインレイアウトコンテナ（flex, 100vh）
- `.dads-sidebar` - サイドバー（width:340px, flex-column）
- `.dads-sidebar__header` - サイドバーヘッダー
- `.dads-sidebar__content` - サイドバーコンテンツ（スクロール可能）
- `.dads-sidebar__footer` - サイドバーフッター
- `.dads-main` - メインコンテンツエリア
- `.dads-main__header` - メインヘッダー
- `.dads-main__content` - メインコンテンツ（スクロール可能）

#### Section Classes
- `.dads-section` - セクションコンテナ
- `.dads-section__heading` - セクション見出し

#### Button Classes
- `.dads-button` - 基本ボタン
- `.dads-button[data-active="true"]` - アクティブ状態
- `.dads-button[data-variant="primary"]` - プライマリボタン
- `.dads-button[data-size="sm"]` - 小サイズボタン
- `.dads-button--dashed` - 破線ボーダーボタン
- `.dads-button--block` - ブロック幅ボタン
- `.dads-button-group` - ボタングループ

#### View Switcher Classes
- `.dads-view-switcher` - ビュー切り替えコンテナ
- `.dads-view-switcher__button` - ビュー切り替えボタン
- `.dads-view-switcher__button[data-active="true"]` - アクティブビュー

#### Card Classes
- `.dads-card` - 基本カード
- `.dads-card[data-interactive="true"]` - インタラクティブカード
- `.dads-card__swatch` - カード内のスウォッチエリア
- `.dads-card__body` - カード本文
- `.dads-card__title` - カードタイトル

#### Palette Item Classes
- `.dads-palette-item` - パレットリストアイテム
- `.dads-palette-item__button` - パレット選択ボタン
- `.dads-palette-item__dot` - カラードット

#### Scale/Swatch Classes
- `.dads-scale` - スケールコンテナ
- `.dads-swatch` - スウォッチボタン
- `.dads-swatch[data-text="light"]` - 明るいテキスト用
- `.dads-swatch[data-text="dark"]` - 暗いテキスト用
- `.dads-swatch__label` - スウォッチラベル
- `.dads-swatch__key-indicator` - キーカラー表示
- `.dads-swatch__badges` - コントラストバッジコンテナ
- `.dads-contrast-indicator` - コントラスト表示バッジ
- `.dads-mini-scale` - ミニスケール（ダイアログ上部）
- `.dads-mini-scale__item` - ミニスケールアイテム
- `.dads-mini-scale__check` - 選択チェックマーク

#### Dialog Classes
- `.dads-dialog` - 基本ダイアログ
- `.dads-dialog--drawer` - ドロワースタイルダイアログ
- `.dads-dialog__header` - ダイアログヘッダー
- `.dads-dialog__body` - ダイアログ本文
- `.dads-dialog__actions` - アクションボタンエリア
- `.dads-contrast-card` - コントラスト表示カード
- `.dads-contrast-card[data-bg="white"]` - 白背景
- `.dads-contrast-card[data-bg="black"]` - 黒背景
- `.dads-scrubber` - 色相スクラバーコンテナ

#### Form Classes
- `.dads-input` - テキスト入力
- `.dads-label` - ラベル

#### Badge Classes
- `.dads-badge` - 基本バッジ
- `.dads-badge[data-level="success"]` - 成功（AAA/AA）
- `.dads-badge[data-level="warning"]` - 警告（Large Text）
- `.dads-badge[data-level="error"]` - エラー（Fail）

#### Utility Classes
- `.dads-sr-only` - スクリーンリーダー専用
- `.dads-text-mono` - 等幅フォント
- `.dads-flex` - Flexコンテナ
- `.dads-flex--column` - 縦方向Flex
- `.dads-flex--center` - 中央揃え
- `.dads-gap-sm` / `.dads-gap-md` - ギャップユーティリティ
- `.dads-grid` - グリッドコンテナ
- `.dads-grid[data-columns="auto-fill"]` - 自動カラムグリッド

#### Accessibility View Classes (renderAccessibilityView)
- `.dads-a11y-explanation` - 説明セクションコンテナ
- `.dads-a11y-explanation__heading` - 説明セクション見出し
- `.dads-a11y-explanation__content` - 説明コンテンツ（リスト・段落のスタイル含む）
- `.dads-a11y-palette-card` - パレット別分析カード
- `.dads-a11y-palette-card__title` - パレットカードタイトル
- `.dads-section__description` - セクション説明文（グレー、マージン付き）

#### CVD Simulation Classes (renderDistinguishabilityAnalysis)
- `.dads-cvd-row` - CVD行コンテナ
- `.dads-cvd-row__label` - CVD行ラベル（太字）
- `.dads-cvd-strip` - カラーストリップ（flex, 60px高さ, 角丸）
- `.dads-cvd-strip__swatch` - ストリップ内のスウォッチ（flex:1, 動的背景色）
- `.dads-cvd-simulations` - シミュレーショングリッド
- `.dads-cvd-strip-container` - ストリップ＋オーバーレイのコンテナ
- `.dads-cvd-overlay` - 衝突マーカー用オーバーレイ
- `.dads-cvd-conflict-line` - 衝突位置のライン
- `.dads-cvd-conflict-icon` - 衝突警告アイコン（!マーク、赤枠円形）

---

## Phase 1: CSS変数体系の構築（DADS準拠・静的トークン）

### 1.1 新規ファイル作成: `src/ui/styles/tokens.css`

DADS の token 体系（surface, border, text, focus ring）に準拠:

```css
:root {
  /* ============================================
   * DADS準拠 プリミティブトークン（静的）
   * - UI固定色（ニュートラル、セマンティック）
   * ============================================ */

  /* ニュートラル（グレースケール） */
  --dads-primitive-neutral-900: #1a1a1a;
  --dads-primitive-neutral-800: #333333;
  --dads-primitive-neutral-700: #4d4d4d;
  --dads-primitive-neutral-600: #666666;
  --dads-primitive-neutral-500: #808080;
  --dads-primitive-neutral-400: #999999;
  --dads-primitive-neutral-300: #b3b3b3;
  --dads-primitive-neutral-200: #cccccc;
  --dads-primitive-neutral-100: #e6e6e6;
  --dads-primitive-neutral-50: #f5f5f5;
  --dads-primitive-white: #ffffff;
  --dads-primitive-black: #000000;

  /* セマンティック固定色（アクセシビリティ結果表示用） */
  --dads-primitive-success-600: #137333;
  --dads-primitive-success-100: #e6f4ea;
  --dads-primitive-warning-600: #b06000;
  --dads-primitive-warning-100: #fef7e0;
  --dads-primitive-error-600: #c5221f;
  --dads-primitive-error-100: #fce8e6;
  --dads-primitive-info-600: #0052cc;
  --dads-primitive-info-100: #e3f2fd;

  /* ============================================
   * DADS準拠 セマンティックトークン
   * - surface: 背景色
   * - border: 境界線
   * - text: テキスト色
   * - focus: フォーカスリング
   * ============================================ */

  /* Surface（背景） */
  --dads-surface-primary: var(--dads-primitive-white);
  --dads-surface-secondary: var(--dads-primitive-neutral-50);
  --dads-surface-tertiary: var(--dads-primitive-neutral-100);
  --dads-surface-inverse: var(--dads-primitive-neutral-900);

  /* Border（境界線） */
  --dads-border-default: var(--dads-primitive-neutral-200);
  --dads-border-strong: var(--dads-primitive-neutral-400);
  --dads-border-subtle: var(--dads-primitive-neutral-100);
  --dads-border-active: var(--dads-primitive-info-600);

  /* Text（テキスト） */
  --dads-text-primary: var(--dads-primitive-neutral-900);
  --dads-text-secondary: var(--dads-primitive-neutral-600);
  --dads-text-tertiary: var(--dads-primitive-neutral-400);
  --dads-text-inverse: var(--dads-primitive-white);
  --dads-text-link: var(--dads-primitive-info-600);

  /* Focus Ring */
  --dads-focus-ring-color: var(--dads-primitive-info-600);
  --dads-focus-ring-offset: 2px;
  --dads-focus-ring-width: 2px;

  /* ============================================
   * コンポーネントトークン
   * - ボタン、バッジ、カード等の具体的なスタイル
   * ============================================ */

  /* Button */
  --dads-button-bg: var(--dads-surface-primary);
  --dads-button-bg-hover: var(--dads-surface-secondary);
  --dads-button-bg-active: var(--dads-primitive-info-100);
  --dads-button-border: var(--dads-border-default);
  --dads-button-border-active: var(--dads-border-active);
  --dads-button-text: var(--dads-text-primary);

  /* Badge */
  --dads-badge-success-bg: var(--dads-primitive-success-100);
  --dads-badge-success-text: var(--dads-primitive-success-600);
  --dads-badge-warning-bg: var(--dads-primitive-warning-100);
  --dads-badge-warning-text: var(--dads-primitive-warning-600);
  --dads-badge-error-bg: var(--dads-primitive-error-100);
  --dads-badge-error-text: var(--dads-primitive-error-600);

  /* Card */
  --dads-card-bg: var(--dads-surface-primary);
  --dads-card-border: var(--dads-border-subtle);

  /* ============================================
   * スペーシング・タイポグラフィ
   * ============================================ */

  /* Spacing */
  --dads-spacing-xs: 0.25rem;
  --dads-spacing-sm: 0.5rem;
  --dads-spacing-md: 1rem;
  --dads-spacing-lg: 1.5rem;
  --dads-spacing-xl: 2rem;
  --dads-spacing-2xl: 3rem;

  /* Border Radius */
  --dads-radius-sm: 4px;
  --dads-radius-md: 8px;
  --dads-radius-lg: 12px;
  --dads-radius-xl: 20px;
  --dads-radius-full: 9999px;

  /* Shadow */
  --dads-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --dads-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --dads-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Typography */
  --dads-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --dads-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --dads-font-size-xs: 0.75rem;
  --dads-font-size-sm: 0.875rem;
  --dads-font-size-md: 1rem;
  --dads-font-size-lg: 1.125rem;
  --dads-font-size-xl: 1.25rem;
  --dads-font-weight-normal: 400;
  --dads-font-weight-medium: 500;
  --dads-font-weight-semibold: 600;
  --dads-font-weight-bold: 700;
}
```

---

### 1.2 新規ファイル作成: `src/ui/styles/components.css`

BEM + データ属性パターン、DADS セマンティックトークン参照:

```css
/* ============================================
 * Base Styles
 * ============================================ */

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  font-family: var(--dads-font-family);
  background: var(--dads-surface-secondary);
  color: var(--dads-text-primary);
  margin: 0;
  padding: 0;
}

/* ============================================
 * Button Component
 * ============================================ */

.dads-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--dads-spacing-sm);
  padding: var(--dads-spacing-sm) var(--dads-spacing-md);
  border: 1px solid var(--dads-button-border);
  border-radius: var(--dads-radius-sm);
  background: var(--dads-button-bg);
  color: var(--dads-button-text);
  font-size: var(--dads-font-size-sm);
  font-weight: var(--dads-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dads-button:hover {
  background: var(--dads-button-bg-hover);
}

.dads-button:focus-visible {
  outline: var(--dads-focus-ring-width) solid var(--dads-focus-ring-color);
  outline-offset: var(--dads-focus-ring-offset);
}

.dads-button[data-active="true"] {
  background: var(--dads-button-bg-active);
  border-color: var(--dads-button-border-active);
  font-weight: var(--dads-font-weight-bold);
}

.dads-button[data-variant="primary"] {
  background: var(--dads-primitive-info-600);
  border-color: var(--dads-primitive-info-600);
  color: var(--dads-text-inverse);
}

.dads-button[data-variant="primary"]:hover {
  filter: brightness(1.1);
}

.dads-button[data-size="sm"] {
  padding: var(--dads-spacing-xs) var(--dads-spacing-sm);
  font-size: var(--dads-font-size-xs);
}

/* ============================================
 * Badge Component
 * ============================================ */

.dads-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: var(--dads-radius-sm);
  font-size: var(--dads-font-size-xs);
  font-weight: var(--dads-font-weight-bold);
}

.dads-badge[data-level="success"] {
  background: var(--dads-badge-success-bg);
  color: var(--dads-badge-success-text);
}

.dads-badge[data-level="warning"] {
  background: var(--dads-badge-warning-bg);
  color: var(--dads-badge-warning-text);
}

.dads-badge[data-level="error"] {
  background: var(--dads-badge-error-bg);
  color: var(--dads-badge-error-text);
}

/* ============================================
 * Card Component
 * ============================================ */

.dads-card {
  background: var(--dads-card-bg);
  border: 1px solid var(--dads-card-border);
  border-radius: var(--dads-radius-md);
  box-shadow: var(--dads-shadow-sm);
  overflow: hidden;
}

.dads-card[data-interactive="true"] {
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.dads-card[data-interactive="true"]:hover {
  box-shadow: var(--dads-shadow-md);
  transform: translateY(-1px);
}

.dads-card[data-interactive="true"]:focus-visible {
  outline: var(--dads-focus-ring-width) solid var(--dads-focus-ring-color);
  outline-offset: var(--dads-focus-ring-offset);
}

.dads-card__header {
  padding: var(--dads-spacing-md);
  border-bottom: 1px solid var(--dads-border-subtle);
}

.dads-card__body {
  padding: var(--dads-spacing-md);
}

/* ============================================
 * Layout Components
 * ============================================ */

.dads-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.dads-sidebar {
  width: 340px;
  background: var(--dads-surface-primary);
  border-right: 1px solid var(--dads-border-subtle);
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.dads-sidebar__header {
  padding: var(--dads-spacing-lg);
  border-bottom: 1px solid var(--dads-border-subtle);
}

.dads-sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--dads-spacing-md);
}

.dads-sidebar__footer {
  padding: var(--dads-spacing-lg);
  border-top: 1px solid var(--dads-border-subtle);
  background: var(--dads-surface-secondary);
}

.dads-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--dads-surface-secondary);
}

.dads-main__header {
  background: var(--dads-surface-primary);
  border-bottom: 1px solid var(--dads-border-subtle);
  padding: var(--dads-spacing-md) var(--dads-spacing-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dads-main__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--dads-spacing-xl);
}

/* ============================================
 * Grid Component
 * ============================================ */

.dads-grid {
  display: grid;
  gap: var(--dads-spacing-md);
}

.dads-grid[data-columns="auto-fill"] {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.dads-grid[data-columns="2"] {
  grid-template-columns: repeat(2, 1fr);
}

.dads-grid[data-columns="3"] {
  grid-template-columns: repeat(3, 1fr);
}

/* ============================================
 * Swatch Component（カラープレビュー用）
 * ============================================ */

.dads-swatch {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  font-size: var(--dads-font-size-xs);
  font-family: var(--dads-font-mono);
  position: relative;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.dads-swatch:hover {
  transform: scale(1.05);
  z-index: 1;
}

.dads-swatch:focus-visible {
  outline: var(--dads-focus-ring-width) solid var(--dads-primitive-white);
  outline-offset: calc(-1 * var(--dads-focus-ring-offset));
  z-index: 2;
}

.dads-swatch__label {
  padding: 2px 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
}

.dads-swatch[data-text="dark"] .dads-swatch__label {
  background: rgba(255, 255, 255, 0.3);
  color: black;
}

/* ============================================
 * Form Controls
 * ============================================ */

.dads-input {
  padding: var(--dads-spacing-sm);
  border: 1px solid var(--dads-border-default);
  border-radius: var(--dads-radius-sm);
  font-size: var(--dads-font-size-sm);
  font-family: var(--dads-font-family);
  background: var(--dads-surface-primary);
  color: var(--dads-text-primary);
}

.dads-input:focus {
  outline: var(--dads-focus-ring-width) solid var(--dads-focus-ring-color);
  outline-offset: var(--dads-focus-ring-offset);
  border-color: var(--dads-border-active);
}

.dads-label {
  display: block;
  font-weight: var(--dads-font-weight-semibold);
  font-size: var(--dads-font-size-sm);
  margin-bottom: var(--dads-spacing-xs);
  color: var(--dads-text-primary);
}

/* ============================================
 * Button Group (Harmony/Contrast選択等)
 * ============================================ */

.dads-button-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dads-spacing-xs);
}

.dads-button-group .dads-button {
  flex: 0 0 auto;
}

/* ============================================
 * View Switcher (タブ風切り替え)
 * ============================================ */

.dads-view-switcher {
  display: flex;
  background: var(--dads-surface-tertiary);
  padding: 4px;
  border-radius: var(--dads-radius-md);
}

.dads-view-switcher__button {
  padding: var(--dads-spacing-sm) var(--dads-spacing-lg);
  border: none;
  border-radius: var(--dads-radius-sm);
  background: transparent;
  color: var(--dads-text-secondary);
  cursor: pointer;
  font-weight: var(--dads-font-weight-medium);
  transition: all 0.2s ease;
}

.dads-view-switcher__button:hover {
  color: var(--dads-text-primary);
}

.dads-view-switcher__button[data-active="true"] {
  background: var(--dads-surface-primary);
  color: var(--dads-text-primary);
  font-weight: var(--dads-font-weight-bold);
  box-shadow: var(--dads-shadow-sm);
}

/* ============================================
 * Dialog/Modal
 * ============================================ */

.dads-dialog {
  border: none;
  border-radius: var(--dads-radius-lg);
  box-shadow: var(--dads-shadow-lg);
  padding: var(--dads-spacing-xl);
  max-width: 500px;
  width: 100%;
}

.dads-dialog::backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.dads-dialog--drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  top: auto;
  width: 100%;
  max-width: 100%;
  max-height: 85vh;
  border-radius: var(--dads-radius-xl) var(--dads-radius-xl) 0 0;
  padding: 0;
  margin: 0;
}

/* ============================================
 * Utility Classes
 * ============================================ */

.dads-sr-only {
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

.dads-text-mono {
  font-family: var(--dads-font-mono);
}

.dads-flex {
  display: flex;
}

.dads-flex--column {
  flex-direction: column;
}

.dads-flex--center {
  align-items: center;
  justify-content: center;
}

.dads-gap-sm {
  gap: var(--dads-spacing-sm);
}

.dads-gap-md {
  gap: var(--dads-spacing-md);
}

/* ============================================
 * Section Component
 * ============================================ */

.dads-section {
  display: flex;
  flex-direction: column;
  gap: var(--dads-spacing-xl);
}

.dads-section__heading {
  font-size: var(--dads-font-size-lg);
  font-weight: var(--dads-font-weight-semibold);
  color: var(--dads-text-primary);
  margin: 0 0 var(--dads-spacing-md) 0;
}

/* ============================================
 * Palette Item Component (Sidebar List)
 * ============================================ */

.dads-palette-item {
  margin-bottom: var(--dads-spacing-xs);
}

.dads-palette-item__button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--dads-spacing-sm) var(--dads-spacing-md);
  border: none;
  border-radius: var(--dads-radius-sm);
  background: transparent;
  color: var(--dads-text-primary);
  font-size: var(--dads-font-size-sm);
  font-weight: var(--dads-font-weight-medium);
  cursor: pointer;
  transition: background 0.2s ease;
}

.dads-palette-item__button:hover {
  background: var(--dads-surface-secondary);
}

.dads-palette-item__button[data-active="true"] {
  background: var(--dads-button-bg-active);
  color: var(--dads-primitive-info-600);
  font-weight: var(--dads-font-weight-bold);
}

.dads-palette-item__dot {
  width: 12px;
  height: 12px;
  border-radius: var(--dads-radius-full);
  display: inline-block;
  margin-right: var(--dads-spacing-sm);
  flex-shrink: 0;
}

/* ============================================
 * Scale Component (Shades View)
 * ============================================ */

.dads-scale {
  display: flex;
  border-radius: var(--dads-radius-md);
  overflow: visible;
}

.dads-swatch__key-indicator {
  width: 100%;
  height: 100%;
  border-radius: var(--dads-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.dads-swatch__badges {
  display: flex;
  gap: 2px;
  font-size: 0.55rem;
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.dads-contrast-indicator {
  padding: 2px 4px;
  border-radius: var(--dads-radius-sm);
  font-weight: var(--dads-font-weight-bold);
  background: transparent;
}

.dads-contrast-indicator[data-color="white"] {
  color: white;
  border: 1px solid white;
}

.dads-contrast-indicator[data-color="black"] {
  color: black;
  border: 1px solid black;
}

.dads-contrast-indicator[data-level="L"] {
  border-style: dashed;
}

/* ============================================
 * Mini Scale Component (Dialog)
 * ============================================ */

.dads-mini-scale {
  display: flex;
  height: 32px;
  min-height: 32px;
  background: var(--dads-surface-tertiary);
  border-bottom: 1px solid var(--dads-border-subtle);
  flex-shrink: 0;
}

.dads-mini-scale__item {
  flex: 1;
  position: relative;
  cursor: pointer;
}

.dads-mini-scale__check {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: var(--dads-font-weight-bold);
}

/* ============================================
 * Dialog Sub-components
 * ============================================ */

.dads-dialog__header {
  padding: var(--dads-spacing-md) var(--dads-spacing-lg);
  border-bottom: 1px solid var(--dads-border-subtle);
  background: var(--dads-surface-primary);
  flex-shrink: 0;
}

.dads-dialog__body {
  flex: 1;
  padding: var(--dads-spacing-lg);
  overflow-y: auto;
}

.dads-dialog__actions {
  display: flex;
  gap: var(--dads-spacing-md);
  justify-content: flex-start;
  margin-top: var(--dads-spacing-md);
}

/* ============================================
 * Contrast Card Component (Dialog)
 * ============================================ */

.dads-contrast-card {
  border-radius: var(--dads-radius-md);
  padding: var(--dads-spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--dads-spacing-sm);
  height: 100%;
}

.dads-contrast-card[data-bg="white"] {
  background: var(--dads-primitive-white);
  border: 1px solid var(--dads-border-subtle);
}

.dads-contrast-card[data-bg="black"] {
  background: var(--dads-primitive-black);
  border: 1px solid var(--dads-primitive-neutral-800);
}

/* ============================================
 * Scrubber Component (Hue Tuner)
 * ============================================ */

.dads-scrubber {
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 40px;
  background: var(--dads-surface-secondary);
  border-radius: var(--dads-radius-md);
  overflow: hidden;
  cursor: ew-resize;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dads-scrubber canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.dads-scrubber__indicator {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
  transform: translateX(-50%);
  pointer-events: none;
}

/* ============================================
 * Card Sub-components
 * ============================================ */

.dads-card__swatch {
  height: 120px;
  /* backgroundColor is dynamic */
}

.dads-card__title {
  margin: 0 0 var(--dads-spacing-sm) 0;
  font-size: var(--dads-font-size-md);
  font-weight: var(--dads-font-weight-semibold);
  color: var(--dads-text-primary);
}

/* ============================================
 * Button Variants
 * ============================================ */

.dads-button--dashed {
  border-style: dashed;
  background: none;
  color: var(--dads-text-secondary);
}

.dads-button--dashed:hover {
  background: var(--dads-surface-secondary);
  color: var(--dads-text-primary);
}

.dads-button--block {
  width: 100%;
  margin-bottom: var(--dads-spacing-sm);
}

.dads-button--block:last-child {
  margin-bottom: 0;
}

/* ============================================
 * Accessibility View Components
 * ============================================ */

.dads-a11y-explanation {
  margin-bottom: var(--dads-spacing-2xl);
  padding: var(--dads-spacing-lg);
  background: var(--dads-surface-secondary);
  border-radius: var(--dads-radius-md);
  border: 1px solid var(--dads-border-subtle);
}

.dads-a11y-explanation__heading {
  margin-top: 0;
  margin-bottom: var(--dads-spacing-md);
  font-size: var(--dads-font-size-lg);
  font-weight: var(--dads-font-weight-semibold);
  color: var(--dads-text-primary);
}

.dads-a11y-explanation__content {
  color: var(--dads-text-primary);
  line-height: 1.6;
}

.dads-a11y-explanation__content p {
  margin-bottom: var(--dads-spacing-md);
}

.dads-a11y-explanation__content h3 {
  font-size: var(--dads-font-size-md);
  margin: var(--dads-spacing-lg) 0 var(--dads-spacing-sm);
}

.dads-a11y-explanation__content ul {
  margin: 0 0 var(--dads-spacing-lg) var(--dads-spacing-lg);
  line-height: 1.6;
}

.dads-a11y-explanation__content strong {
  font-weight: var(--dads-font-weight-semibold);
}

.dads-section__description {
  margin-bottom: var(--dads-spacing-lg);
  color: var(--dads-text-secondary);
}

.dads-a11y-palette-card {
  margin-bottom: var(--dads-spacing-2xl);
  padding: var(--dads-spacing-lg);
  background: var(--dads-surface-primary);
  border-radius: var(--dads-radius-md);
  box-shadow: var(--dads-shadow-sm);
}

.dads-a11y-palette-card__title {
  margin-top: 0;
  margin-bottom: var(--dads-spacing-md);
  font-size: var(--dads-font-size-lg);
  font-weight: var(--dads-font-weight-semibold);
  color: var(--dads-text-primary);
}

/* ============================================
 * CVD Simulation Components
 * ============================================ */

.dads-cvd-row {
  margin-bottom: var(--dads-spacing-xl);
}

.dads-cvd-row__label {
  font-weight: var(--dads-font-weight-bold);
  margin-bottom: var(--dads-spacing-sm);
  font-size: var(--dads-font-size-sm);
  color: var(--dads-text-primary);
}

.dads-cvd-strip {
  display: flex;
  height: 60px;
  border-radius: var(--dads-radius-md);
  overflow: hidden;
}

.dads-cvd-strip__swatch {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  /* backgroundColor is dynamic */
}

.dads-cvd-simulations {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--dads-spacing-lg);
}

.dads-cvd-strip-container {
  position: relative;
  height: 60px;
}

.dads-cvd-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.dads-cvd-conflict-line {
  position: absolute;
  top: 10%;
  bottom: 10%;
  width: 2px;
  background-color: white;
  border-left: 1px solid rgba(0, 0, 0, 0.5);
  border-right: 1px solid rgba(0, 0, 0, 0.5);
  z-index: 10;
  /* left is dynamic */
}

.dads-cvd-conflict-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background-color: var(--dads-primitive-white);
  border: 2px solid var(--dads-primitive-error-600);
  border-radius: var(--dads-radius-full);
  color: var(--dads-primitive-error-600);
  font-weight: var(--dads-font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  z-index: 11;
  box-shadow: var(--dads-shadow-sm);
  /* left is dynamic */
}
```

---

## Phase 2: 定数・ユーティリティの集約

### 2.1 新規ファイル作成: `src/ui/style-constants.ts`

```typescript
/**
 * スタイル関連の定数と型定義
 *
 * @module @/ui/style-constants
 */

export type ContrastIntensity = "subtle" | "moderate" | "strong" | "vivid";

/**
 * コントラスト強度ごとの比率配列
 * 13段階のステップに対応
 */
export const CONTRAST_RANGES: Record<ContrastIntensity, readonly number[]> = {
  subtle: [1.05, 1.1, 1.15, 1.2, 1.3, 1.5, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0, 12.0],
  moderate: [1.05, 1.1, 1.2, 1.35, 1.7, 2.5, 3.5, 4.5, 6.0, 8.5, 11.0, 14.0, 17.0],
  strong: [1.1, 1.2, 1.3, 1.5, 2.0, 3.0, 4.5, 6.0, 8.0, 11.0, 14.0, 17.0, 21.0],
  vivid: [1.15, 1.25, 1.4, 1.7, 2.5, 3.5, 5.0, 7.0, 9.0, 12.0, 15.0, 18.0, 21.0],
} as const;

/**
 * ステップ名（トークン番号）
 */
export const STEP_NAMES = [1200, 1100, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50] as const;

/**
 * コントラスト強度から比率配列を取得
 */
export function getContrastRatios(intensity: ContrastIntensity): number[] {
  return [...(CONTRAST_RANGES[intensity] || CONTRAST_RANGES.moderate)];
}

/**
 * ボタンのアクティブ状態を設定（data属性経由）
 */
export function setButtonActive(btn: HTMLElement, isActive: boolean): void {
  btn.dataset.active = String(isActive);
}

/**
 * バッジのレベルを設定（data属性経由）
 * WCAG 2.1 基準:
 * - AAA: 7.0以上
 * - AA: 4.5以上
 * - AA Large Text: 3.0以上
 * - Fail: 3.0未満
 */
export function setBadgeLevel(badge: HTMLElement, ratio: number): void {
  const level = ratio >= 4.5 ? "success" : ratio >= 3.0 ? "warning" : "error";
  badge.dataset.level = level;
  badge.textContent = ratio >= 7.0 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3.0 ? "AA Large" : "Fail";
}

/**
 * スウォッチのテキストカラーを判定（明度ベース）
 */
export function getSwatchTextMode(lightness: number): "light" | "dark" {
  return lightness > 0.5 ? "dark" : "light";
}
```

---

## Phase 3: demo.ts のリファクタリング

### 3.1 import追加

```typescript
// エイリアスを使用（tsconfig.json paths 準拠）
// 注: CSS は index.html で <link> 読み込み（Bunはcss importを直接バンドルしない）

import {
  CONTRAST_RANGES,
  STEP_NAMES,
  getContrastRatios,
  setButtonActive,
  setBadgeLevel,
  getSwatchTextMode
} from "@/ui/style-constants";
```

### 3.2 置換パターン

| Before (インラインスタイル) | After (クラス + data属性) |
|---------------------------|--------------------------|
| `btn.style.background = "#e3f2fd"; btn.style.border = "2px solid #0052cc"; btn.style.fontWeight = "bold"` | `btn.classList.add("dads-button"); setButtonActive(btn, true)` |
| `badge.style.backgroundColor = "#e6f4ea"; badge.style.color = "#137333"` | `badge.classList.add("dads-badge"); setBadgeLevel(badge, ratio)` |
| `card.style.background = "white"; card.style.borderRadius = "8px"` | `card.classList.add("dads-card")` |
| `const contrastRanges = {...}` | `import { CONTRAST_RANGES }` |
| `const stepNames = [...]` | `import { STEP_NAMES }` |
| `grid.style.display = "grid"; grid.style.gap = "1rem"` | `grid.classList.add("dads-grid")` |
| `input.style.padding = "0.5rem"` | `input.classList.add("dads-input")` |

### 3.2.1 アクセシビリティビュー置換パターン (renderAccessibilityView / renderDistinguishabilityAnalysis)

| Before (インラインスタイル) | After (クラス + data属性) |
|---------------------------|--------------------------|
| `container.style.display = "flex"; container.style.flexDirection = "column"; container.style.gap = "3rem"` | `container.classList.add("dads-section")` |
| `explanationSection.style.marginBottom = "3rem"; explanationSection.style.padding = "1.5rem"; ...` | `explanationSection.classList.add("dads-a11y-explanation")` |
| `explanationHeading.style.marginTop = "0"; explanationHeading.style.marginBottom = "1rem"` | `explanationHeading.classList.add("dads-a11y-explanation__heading")` |
| `keyColorsDesc.style.marginBottom = "1.5rem"; keyColorsDesc.style.color = "#666"` | `keyColorsDesc.classList.add("dads-section__description")` |
| `pContainer.style.marginBottom = "3rem"; pContainer.style.padding = "1.5rem"; ...` | `pContainer.classList.add("dads-a11y-palette-card")` |
| `pTitle.style.marginTop = "0"; pTitle.style.marginBottom = "1rem"` | `pTitle.classList.add("dads-a11y-palette-card__title")` |
| `normalRow.style.marginBottom = "2rem"` | `normalRow.classList.add("dads-cvd-row")` |
| `normalLabel.style.fontWeight = "bold"; normalLabel.style.marginBottom = "0.5rem"` | `normalLabel.classList.add("dads-cvd-row__label")` |
| `normalStrip.style.display = "flex"; normalStrip.style.height = "60px"; ...` | `normalStrip.classList.add("dads-cvd-strip")` |
| `swatch.style.flex = "1"; swatch.style.backgroundColor = color.toCss(); ...` | `swatch.classList.add("dads-cvd-strip__swatch"); swatch.style.backgroundColor = color.toCss()` |
| `simContainer.style.display = "grid"; simContainer.style.gridTemplateColumns = "1fr"; ...` | `simContainer.classList.add("dads-cvd-simulations")` |
| `stripContainer.style.position = "relative"; stripContainer.style.height = "60px"` | `stripContainer.classList.add("dads-cvd-strip-container")` |
| `overlay.style.position = "absolute"; overlay.style.top = "0"; ...` | `overlay.classList.add("dads-cvd-overlay")` |
| `line.style.position = "absolute"; line.style.width = "2px"; ...` | `line.classList.add("dads-cvd-conflict-line"); line.style.left = \`calc(\${leftPos}% - 1px)\`` |
| `icon.style.position = "absolute"; icon.style.width = "20px"; ...` | `icon.classList.add("dads-cvd-conflict-icon"); icon.style.left = \`calc(\${leftPos}% - 10px)\`` |

**注**: `swatch.style.backgroundColor`, `icon.style.left`, `line.style.left` は動的に変化する値のためインラインで残す。

### 3.3 動的スタイルの扱い

**インラインで残すもの**（生成カラーの直接適用）:
```typescript
// これらはインラインで残す（動的に変化するため）
swatch.style.backgroundColor = color.toCss();
preview.style.backgroundColor = selectedColor.toHex();
```

**注**: 生成パレットの CSS 変数連携（`--generated-*`）は本計画のスコープ外。

---

## Phase 4: index.html のインラインスタイル移行

### 4.1 対象箇所の分類

| 箇所 | 行数 | 対応方針 |
|------|------|----------|
| `<style>` ブロック | 8-51行 | tokens.css/components.css に移行、削除 |
| レイアウト構造 | 55-175行 | `.dads-layout`, `.dads-sidebar`, `.dads-main` クラス化 |
| ボタン群 (Harmony等) | 79-87行 | `.dads-button`, `.dads-button-group` クラス化 |
| View Switcher | 137-139行 | `.dads-view-switcher` クラス化 |
| CVD Controls | 151-166行 | `.dads-button-group` クラス化 |
| Dialog | 178-370行 | `.dads-dialog`, `.dads-dialog--drawer` クラス化 |

### 4.2 修正後の index.html 構造（抜粋）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Color token Generator</title>
    <link rel="stylesheet" href="./src/ui/styles/tokens.css">
    <link rel="stylesheet" href="./src/ui/styles/components.css">
</head>
<body>
    <div class="dads-layout">
        <!-- Sidebar -->
        <div class="dads-sidebar">
            <div class="dads-sidebar__header">
                <h1>Color token Generator</h1>
                <!-- Form controls use .dads-input, .dads-label -->
            </div>
            <div class="dads-sidebar__content">
                <!-- Palette list -->
            </div>
            <div class="dads-sidebar__footer">
                <!-- Export buttons use .dads-button -->
            </div>
        </div>

        <!-- Main Content -->
        <div class="dads-main">
            <div class="dads-main__header">
                <div class="dads-view-switcher">
                    <button class="dads-view-switcher__button" data-active="true">パレット</button>
                    <button class="dads-view-switcher__button">シェード</button>
                    <button class="dads-view-switcher__button">アクセシビリティ</button>
                </div>
                <div class="dads-button-group">
                    <!-- Contrast/CVD buttons -->
                </div>
            </div>
            <div class="dads-main__content">
                <div id="app" class="dads-grid"></div>
            </div>
        </div>
    </div>

    <!-- Dialogs -->
    <dialog id="export-dialog" class="dads-dialog">...</dialog>
    <dialog id="color-detail-dialog" class="dads-dialog dads-dialog--drawer">...</dialog>

    <script type="module" src="./dist/index.js"></script>
</body>
</html>
```

---

## Phase 5: ファイル構成と実装順序

### 最終ファイル構成

```
src/ui/
├── styles/
│   ├── tokens.css      # DADS準拠 CSS変数（静的 + 動的プレースホルダ）
│   └── components.css  # BEM + data属性 コンポーネントスタイル
├── style-constants.ts  # TypeScript 定数・ユーティリティ
└── demo.ts             # リファクタリング済み

index.html              # クラス化済み
```

### 実装順序

1. **tokens.css 作成** - CSS変数の定義
2. **components.css 作成** - コンポーネントスタイルの定義
3. **style-constants.ts 作成** - TypeScript定数・関数
4. **index.html 修正**
   - `<link>` でCSS読み込み追加
   - `<style>` ブロック削除
   - インラインstyle属性をクラスに置換
5. **demo.ts 修正** - 段階的にクラス化
   - まず `contrastRanges`/`stepNames` の置換（5箇所）
   - 次にボタンスタイル（6箇所）
   - 次にバッジスタイル（8箇所）
   - カード・グリッド・セクション
   - アクセシビリティビュー（renderAccessibilityView, renderDistinguishabilityAnalysis）
6. **動作確認** - ブラウザで全機能テスト

**注**: `package.json` への postbuild スクリプト追加は本計画のスコープ外（npm配布時に別途対応）

### コミット戦略

大規模リファクタリングのため、**機能単位で段階的にコミット**する:

| コミット番号 | 内容 | 検証ポイント |
|------------|------|------------|
| 1 | `src/ui/styles/tokens.css` 作成 | ファイル存在、CSS構文エラーなし |
| 2 | `src/ui/styles/components.css` 作成 | ファイル存在、CSS構文エラーなし |
| 3 | `src/ui/style-constants.ts` 作成 | `npm run type-check` 通過 |
| 4 | `index.html`: CSS `<link>` 追加 + `<style>` ブロック削除 | ブラウザでスタイル適用確認 |
| 5 | `index.html`: レイアウト構造のクラス化（サイドバー/メイン） | レイアウト崩れなし |
| 6 | `index.html`: フォームコントロールのクラス化 | 入力・ボタン動作確認 |
| 7 | `index.html`: ダイアログのクラス化 | モーダル開閉確認 |
| 8 | `demo.ts`: 定数インポート（CONTRAST_RANGES, STEP_NAMES） | `npm run type-check` 通過 |
| 9 | `demo.ts`: renderSidebar のクラス化 | サイドバー表示確認 |
| 10 | `demo.ts`: updateEditor のボタン状態クラス化 | Harmony/Contrast ボタン動作確認 |
| 11 | `demo.ts`: renderPaletteView のクラス化 | パレットカード表示確認 |
| 12 | `demo.ts`: renderShadesView のクラス化 | シェードスウォッチ表示確認 |
| 13 | `demo.ts`: ダイアログ関連のクラス化 | 詳細ダイアログ動作確認 |
| 14 | `demo.ts`: renderAccessibilityView のクラス化 | アクセシビリティタブ表示・警告アイコン確認 |
| 15 | 最終動作確認・クリーンアップ | 全機能テスト |

**コミットメッセージ例**:
```
refactor(ui): add DADS tokens.css with semantic variables

- Define primitive neutral/semantic colors
- Add surface, border, text, focus tokens
- Add component tokens (button, badge, card)
- Add spacing, radius, shadow, typography tokens
```

**原則**:
- 各コミット後にブラウザで動作確認
- エラーが出たら即座に修正、再コミット
- コミット粒度は「1つの論理的変更 = 1コミット」
- 途中で問題発生時、`git revert` で個別にロールバック可能な単位を維持

---

## 期待される効果

| 指標 | Before | After |
|------|--------|-------|
| インラインスタイル行数 (demo.ts) | 315+ | 約30（動的な色のみ） |
| インラインスタイル行数 (index.html) | 170+ | 0 |
| 重複コード | 多数 | 0 |
| CSS変数 | 0 | 80+ |
| コンポーネントクラス | 10 | 30+ |
| DADS準拠 | × | ○（token体系準拠） |
| 保守性 | 低 | 高 |

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| スタイルの見た目変更 | 段階的に適用し、各フェーズで動作確認 |
| TypeScript型エラー | `ContrastIntensity`型を`style-constants.ts`で定義しexport |
| Bun CSS バンドル非対応 | `<link>` で直接読み込み + postbuild でコピー |
| エイリアス解決 | CSS は `<link>` (HTML直接), TS は `@/ui/*` (Bun/tsc解決) |
| index.html 大規模変更 | 機能グループごとに段階的に修正、各段階でテスト |

---

## 検証チェックリスト

- [ ] `src/ui/styles/tokens.css` が作成され、CSS変数が定義されている
- [ ] `src/ui/styles/components.css` が作成され、`.dads-*` クラスが定義されている
- [ ] `src/ui/style-constants.ts` が TypeScript コンパイルを通過する
- [ ] `index.html` で CSS が正しく読み込まれる
- [ ] ブラウザで demo.ts が起動し、全機能が正常動作する
- [ ] ボタン（Harmony選択等）のアクティブ状態が正しく表示される
- [ ] バッジ（コントラスト判定）が正しい色で表示される
- [ ] カラースウォッチが正しく表示される（動的色）
- [ ] Dialog/Drawer が正しく開閉する
- [ ] アクセシビリティビューが正しく表示される（説明セクション、警告アイコン含む）
- [ ] `npm run build` が成功し、`dist/` に成果物が生成される

---

## 参考リソース

- [DADS HTML Components](https://github.com/digital-go-jp/design-system-example-components-html)
- [DADS Storybook](https://design.digital.go.jp/dads/html/)
- [DeepWiki - DADS解説](https://deepwiki.com/digital-go-jp/design-system-example-components-html)

---

## Critical Files

実装時に読むべきファイル:
1. `src/ui/demo.ts` - メインのリファクタリング対象
2. `index.html` - CSS読み込み追加 + インラインスタイル移行
3. `src/ui/color-system-demo.ts` - 同様パターンの参考
4. `tsconfig.json` - パスエイリアス確認
5. `package.json` - ビルドスクリプト確認

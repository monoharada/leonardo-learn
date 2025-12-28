# Gap Analysis: demo-ts-refactor

## 1. 分析サマリー

- **スコープ**: `src/ui/demo.ts`（3,429行）を機能単位に分割
  - **要件定義**: 16ファイル（ルート11 + views5）
  - **本分析の提案**: 17ファイル（要件 + `views/utils.ts`追加）
- **主要課題**: 単一巨大ファイルからの機能抽出、`runDemo`直下の25関数の外部化
- **リスク評価**: M（中）- 既存パターン活用可能、ただしネスト関数の状態共有解決が必要
- **推奨アプローチ**: Option B（新規ディレクトリ構造）を採用し、実装は段階的に進める
- **工数見積**: M（3-7日）- 16〜17ファイル作成 + E2Eテスト検証

---

## 2. 現状調査

### 2.1 対象ファイル構造

**`src/ui/demo.ts`の構成**:
- **行数**: 3,429行（要件制約: 500行以下に分割）
- **トップレベル定義**:
  - `KeyColorWithStep` interface (L63-67)
  - `PaletteConfig` interface (L68-77)
  - `LightnessDistribution` type (L78)
  - `ViewMode` type (L79)
  - `HarmonyTypeConfig` interface (L82-88)
  - `HARMONY_TYPES` const (L91-156)
  - `CVDSimulationType` type (L159)
  - `state` const (L162-174)
  - `runDemo` export function (L176-3429)

### 2.2 抽出対象一覧

本セクションでは`runDemo`から抽出する対象を以下の3カテゴリに分類します：
- **2.2.1** `runDemo`直下で定義された関数（25関数）
- **2.2.2** 関数外のコードブロック（イベントハンドラ登録・初期化処理等、3項目）
- **2.2.3** ネストされたローカル関数（親関数と共に抽出、個別一覧化なし）

#### 2.2.1 runDemo直下で定義された関数（25関数）

> **カウント基準**: ユニーク関数名でカウント。`updateCVDScoreDisplay`はL1021で空関数として初期定義（`let updateCVDScoreDisplay = () => {}`）、L2967で実装を再代入する前方宣言パターンのため、1関数としてカウント。

| 関数名 | 行 | 抽出先（要件） | 備考 |
|--------|-----|---------------|------|
| `getActivePalette` | L194 | state.ts (R1) | Pure helper |
| `parseKeyColor` | L200 | state.ts (R1) | Pure helper |
| `renderSidebar` | L208 | sidebar.ts (R7) | DOM操作 |
| `updateEditor` | L246 | editor.ts (R7) | ハーモニーボタン操作 |
| `handleGenerate` | L285 | palette-generator.ts (R9) | パレット生成 |
| `announceViewChange` | L387 | navigation.ts (R8) | スクリーンリーダー通知 |
| `updateViewButtons` | L396 | navigation.ts (R8) | ビュー切替UI |
| `generateExportColors` | L484 | export-handlers.ts (R3) | エクスポート色生成 |
| `downloadFile` | L542 | export-handlers.ts (R3) | ファイルダウンロード |
| `updateExportPreview` | L614 | export-handlers.ts (R3) | プレビュー更新 |
| `renderMain` | L705 | index.ts (R10) | ビュールーティング |
| `renderHarmonyView` | L756 | views/harmony-view.ts (R2) | ハーモニービュー |
| `applySimulation` | L1024 | cvd-controls.ts (R5) | CVDシミュレーション適用 |
| `updateCVDScoreDisplay` | L2967 | cvd-controls.ts (R5) | スコア表示更新 |
| `renderEmptyState` | L1034 | views/utils.ts | 共通ユーティリティ |
| `openColorDetailModal` | L1071 | color-detail-modal.ts (R4) | モーダル本体 |
| `renderPaletteView` | L1517 | views/palette-view.ts (R2) | パレットビュー |
| `renderShadesView` | L2305 | views/shades-view.ts (R2) | シェードビュー |
| `renderDadsHueSection` | L2382 | views/shades-view.ts (R2) | 色相セクション描画 |
| `renderBrandColorSection` | L2550 | views/shades-view.ts (R2) | ブランドカラー描画 |
| `_legacyRenderShadesView` | L2623 | *(設計時判断)* | 未使用（grep検証済み、詳細は7.4参照） |
| `generateKeyColors` | L2947 | cvd-controls.ts (R5) | キーカラー生成 |
| `renderAccessibilityView` | L3025 | views/accessibility-view.ts (R2) | アクセシビリティビュー |
| `renderDistinguishabilityAnalysis` | L3290 | views/accessibility-view.ts (R2) | 識別性分析 |
| `renderAdjacentShadesAnalysis` | L3415 | views/accessibility-view.ts (R2) | 隣接シェード分析 |

#### 2.2.2 関数外のコードブロック（3項目）

| 項目 | 行 | 抽出先（要件） | 備考 |
|------|-----|---------------|------|
| エクスポートダイアログ初期化 | L600-650 | export-handlers.ts (R3) | DOM取得、showModal呼び出し |
| エクスポートボタンハンドラ | L654付近 | export-handlers.ts (R3) | フォーマット選択イベント |
| CVDボタンハンドラ | L3004-3019 | cvd-controls.ts (R5) | state更新、renderMain呼び出し |

#### 2.2.3 ネストされたローカル関数（親関数と共に抽出）

各関数内にネストされたローカル関数（`drawScrubber`, `handleScrubberStart`, `syncPalette`, `updateCard`等）が存在します。これらは親関数と共に抽出されるため、個別には一覧化していません。

### 2.3 状態管理パターン

**現在の`state`オブジェクト（L162-174）**:
```typescript
const state = {
  palettes: [] as PaletteConfig[],
  shadesPalettes: [] as PaletteConfig[],
  activeId: "",
  activeHarmonyIndex: 0,
  contrastIntensity: "moderate" as ContrastIntensity,
  lightnessDistribution: "linear" as LightnessDistribution,
  viewMode: "harmony" as ViewMode,
  cvdSimulation: "normal" as CVDSimulationType,
  selectedHarmonyConfig: null as HarmonyTypeConfig | null,
  cudMode: "guide" as CudCompatibilityMode,
};
```

**課題**:
- `state`は`runDemo`スコープ外（モジュールレベル）で定義
- ネスト関数は`state`を直接参照（クロージャ依存）
- 抽出後はモジュール間で`state`を共有する必要あり

**設計フェーズでの決定事項**:
- 状態共有パターン: グローバルエクスポート vs 依存性注入（要検討）

### 2.4 既存モジュール参照パターン

**同じディレクトリの既存モジュール（再利用可能パターン）**:
- `src/ui/cud-components.ts` (1,618行): 型・関数・コンポーネントの混合エクスポート
- `src/ui/style-constants.ts` (73行): 型定義と定数のみの軽量モジュール
- `src/ui/semantic-role/*.ts`: 機能特化型の小モジュール群

**パターン適用**:
- `types.ts`: `style-constants.ts`パターン（型・型ガードのみ）
- `constants.ts`: `style-constants.ts`パターン（定数のみ）
- `views/*.ts`: `semantic-role/*.ts`パターン（機能特化）

### 2.5 依存関係の整理

**`demo.ts`のインポート（L1-61）**:
- Core層: `@/core/semantic-role/*`, `@/core/solver`, `@/core/color`, `@/core/cud/*`, `@/core/export/*`, `@/core/harmony`, `@/core/tokens/*`
- Accessibility層: `../accessibility/apca`, `../accessibility/cvd-simulator`, `../accessibility/wcag2`
- UI層: `./cud-components`, `./semantic-role/*`, `./style-constants`

**依存方向の制約（要件R2準拠）**:
```
views/* → state, constants, types, cud-components, style-constants
他のモジュール → state, constants, types
```
- 循環依存禁止（`madge --circular`で検証可能）
- views/*はCUD componentsを含む共通依存をインポート可能

### 2.6 E2Eテストの現状

**Playwrightテスト（`e2e/`）**:
- `cud-harmony-generator.e2e.ts` (473行): CUDモード切替、エクスポートフロー検証
- `semantic-role-overlay.e2e.ts` (1,779行): シェードビュー、円形スウォッチ、コントラスト境界検証

**テスト対象DOM要素**:
- `#mode-selector-container`, `#palette-preview`, `#export-output`
- `[data-testid^='swatch-']`, `.dads-swatch--circular`, `.cud-mode-selector`
- `[data-testid='role-info-bar']`, `[data-testid^='contrast-boundary-']`

**検証ポイント**:
- リファクタリング後もDOM構造（id, class, data-*属性）を維持必須
- イベントハンドラの動作を変更禁止

**E2Eカバレッジの制限**:
- E2Eテストは主要なユーザーフローをカバーしていますが、100%のカバレッジではありません
- E2Eテストがパスすれば**主要な挙動の同一性を検証**できますが、全ての挙動を保証するものではありません
- 補完として、型チェック（`bun run type-check`）とリント（`bun run lint`）の通過も必須

---

## 3. 要件ごとのギャップ分析

### R1: 状態管理モジュールの分離 (`state.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `state`オブジェクト | L162-174で定義 | モジュールレベル変数 | `state.ts`にエクスポート |
| `getActivePalette` | L194（ネスト関数） | `state`参照 | stateと共にエクスポート |
| `parseKeyColor` | L200（ネスト関数） | Pure function | そのまま抽出可能 |

**設計時決定事項**: 状態共有パターン（グローバルエクスポート vs 依存性注入 vs オブザーバ）

### R2: ビューレンダリングモジュールの分離 (`views/`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `renderHarmonyView` | L756（ネスト関数） | state, DOM refs, ヘルパー関数への依存 | 必要な依存をパラメータ化 |
| `renderPaletteView` | L1517 | 同上 | 同上 |
| `renderShadesView` | L2305 | `roleMapper`, `loadDadsTokens`への依存 | 非同期関数として抽出 |
| `renderAccessibilityView` | L3025 | CVD制御、スコア計算への依存 | cvd-controls.tsをインポート |
| 共通依存インポート | 要件R2 AC2 | CUD components等を各ビューでインポート | `cud-components`をインポート |

**課題**: 各ビュー関数が多くのヘルパー関数・DOM要素参照を使用

### R3: エクスポート機能モジュールの分離 (`export-handlers.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `generateExportColors` | L484 | `getActivePalette`呼び出し | state.tsからインポート |
| `downloadFile` | L542 | Pure function | そのまま抽出可能 |
| `updateExportPreview` | L614 | DOM要素参照 | DOM要素をパラメータ化 |
| エクスポートダイアログ初期化 | L600-650 | DOM取得、showModal呼び出し | 初期化関数として抽出 |
| エクスポートボタンハンドラ | L654付近 | フォーマット選択、ダウンロード実行 | イベントハンドラを抽出 |

**対応策**: エクスポート関連をまとめて抽出、ダイアログ初期化ロジックとボタンハンドラも含める

### R4: 色詳細モーダルモジュールの分離 (`color-detail-modal.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `openColorDetailModal` | L1071 | 大きな関数（スクラバー、同期ロジック含む） | 複数のヘルパー関数に分割 |
| スクラバー関数群 | L1107〜 | Canvas操作、イベントハンドラ | モジュール内で閉じた形に |
| `syncPalette`, `updateCard` | ネスト関数内 | state更新、DOM更新 | stateをパラメータ化 |

**リスク**: モーダル内の複雑なインタラクションロジック

### R5: CVDシミュレーション関連の整理 (`cvd-controls.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `applySimulation` | L1024 | `state.cvdSimulation`参照 | state.tsからインポート |
| `generateKeyColors` | L2947 | 複数のパレット参照 | stateをパラメータ化 |
| `updateCVDScoreDisplay` | L2967 | 関数変数として定義 | 通常の関数として抽出 |
| CVDボタンハンドラ | L3004-3019 | state更新、renderMain呼び出し | イベントハンドラを抽出 |
| CVD関連UI初期化 | 分散 | 複数箇所に散在 | 1つの初期化関数にまとめる |

**対応策**: CVD関連をすべて1モジュールに集約し、初期化関数`initCVDControls`を提供

### R6: 定数・型定義の分離 (`types.ts`, `constants.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| 型定義 | L63-89, L159 | トップレベル定義済み | そのまま抽出可能 |
| `HARMONY_TYPES` | L91-156 | トップレベル定義済み | そのまま抽出可能 |
| `DEFAULT_STATE` | 暗黙的（L162-174） | 明示的なデフォルト値オブジェクトなし | 新規作成 |

### R7: サイドバー・エディタモジュールの分離 (`sidebar.ts`, `editor.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `renderSidebar` | L208 | DOM操作、state参照 | DOM要素とstateをパラメータ化 |
| `updateEditor` | L246 | ハーモニーボタン操作 | イベントハンドラの分離 |

### R8: ビュー切替・ナビゲーション機能の分離 (`navigation.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `updateViewButtons` | L396 | DOM操作、state.viewMode | DOM要素をパラメータ化 |
| `announceViewChange` | L387 | `#live-region`参照 | DOM要素をパラメータ化 |

### R9: パレット生成ロジックの分離 (`palette-generator.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `handleGenerate` | L285 | ハーモニー生成、state更新 | Core層関数呼び出しとstate更新の分離 |

### R10: エントリポイント構造の整理 (`index.ts`)

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| `runDemo` | 全体を包含 | 抽出後は初期化・登録のみに | 各モジュールをインポートして組み立て |
| `demo.ts`（既存） | エントリポイント | 後方互換性維持 | `export * from "./demo/index"`のみに |

**目標**: `index.ts`を300行以下に

### R11: ディレクトリ構造の整備

**要件のディレクトリ構造（16ファイル: ルート11 + views5）**:
```
src/ui/demo/
├── index.ts              # エントリポイント（runDemo実装）
├── state.ts              # 状態管理
├── types.ts              # 型定義
├── constants.ts          # 定数（HARMONY_TYPES, DEFAULT_STATE）
├── navigation.ts         # ビュー切替
├── sidebar.ts            # サイドバー
├── editor.ts             # エディタ
├── palette-generator.ts  # パレット生成
├── export-handlers.ts    # エクスポート
├── cvd-controls.ts       # CVD制御
├── color-detail-modal.ts # 色詳細モーダル
└── views/
    ├── index.ts          # ビューのre-export
    ├── harmony-view.ts
    ├── palette-view.ts
    ├── shades-view.ts
    └── accessibility-view.ts
```

**本分析での追加提案（17ファイル: ルート11 + views6）**:
- `views/utils.ts`を追加（`renderEmptyState`等の共通ユーティリティ配置先）
- 要件構造に1ファイル追加となるため、設計フェーズで要否を判断

### R12: テスト互換性の維持

| 項目 | 現状 | ギャップ | 対応策 |
|------|------|---------|--------|
| E2Eテスト | 2ファイル（計2,252行） | DOM構造に強く依存 | DOM構造を一切変更しない |
| 型チェック | `bun run type-check` | 既存通過 | 抽出後も通過必須 |
| Biomeリント | `bun run lint` | 既存通過 | 抽出後も通過必須 |

---

## 4. 実装アプローチ選択肢

### Option A: 既存ファイルの漸進的分割

**概要**: `demo.ts`を維持しながら、少しずつ関数を外部モジュールに移動

**メリット**:
- 低リスク、段階的な移行
- 各ステップでE2Eテスト検証可能

**デメリット**:
- 移行中のコード重複可能性
- 完了まで時間がかかる

### Option B: 新規ディレクトリ作成（推奨）

**概要**: `src/ui/demo/`ディレクトリを新規作成し、目標構造を最初から確立

**メリット**:
- クリーンな構造を最初から実現
- 依存関係を明確に設計可能
- 要件R11のディレクトリ構造に完全準拠

**デメリット**:
- 初期投資が大きい
- 一度に多くの変更が発生

### Option C: ハイブリッドアプローチ

**概要**:
1. まず`types.ts`, `constants.ts`を抽出（低リスク）
2. 次に`state.ts`を抽出（依存の中心）
3. ビュー系モジュールを順次抽出
4. 最後に`index.ts`を整理

**メリット**:
- リスク分散
- 各フェーズでE2Eテスト検証

**デメリット**:
- 複数フェーズの管理が必要

---

## 5. 推奨アプローチ

**Option Bのディレクトリ構造を採用し、Option Cの段階的実装順序で進める**

**理由**:
1. 要件R11のディレクトリ構造に完全準拠
2. 循環依存を最初から回避可能
3. 段階的実装により各フェーズでE2Eテスト検証が可能
4. 既存の`demo.ts`を`export * from "./demo/index"`に置き換えるだけで後方互換性維持

**実装順序（推奨）**:

| フェーズ | 対象ファイル | 依存関係 | 検証 |
|---------|-------------|---------|------|
| 1 | `types.ts`, `constants.ts` | なし（Pure） | 型チェック |
| 2 | `state.ts` | types, constants | 型チェック |
| 3 | `views/utils.ts` *(追加提案)* | なし | 型チェック |
| 4 | `navigation.ts` | state, types | E2Eテスト |
| 5 | `cvd-controls.ts` | state, types | E2Eテスト |
| 6 | `export-handlers.ts` | state, types | E2Eテスト |
| 7 | `color-detail-modal.ts` | state, types | E2Eテスト |
| 8 | `sidebar.ts`, `editor.ts` | state, types | E2Eテスト |
| 9 | `palette-generator.ts` | state, types, harmony | E2Eテスト |
| 10 | `views/*.ts`（4ファイル） | state, types, cud-components | E2Eテスト |
| 11 | `views/index.ts` | views/* | 型チェック |
| 12 | `index.ts` | 全モジュール | 全E2Eテスト |
| 13 | `demo.ts`置き換え | index.ts | 全E2Eテスト + 循環依存チェック |

---

## 6. 工数・リスク評価

### 工数: M（3-7日）

**根拠**:
- 16-17ファイル作成（各ファイル平均0.3-0.4日）
- 依存関係の整理（1日）
- E2Eテスト検証（0.5日）
- 循環依存チェック・修正（0.5日）

### リスク: Medium

**Highリスク要素**:
- ネスト関数の状態共有解決（クロージャ→インポート変換）
- モーダル内の複雑なインタラクションロジック

**緩和策**:
- 抽出前に各関数の依存を明確化
- E2Eテストを各フェーズで実行（主要な挙動の検証）
- `madge --circular`で循環依存を継続的にチェック

---

## 7. 設計フェーズへの引き継ぎ事項

### 要調査項目（Research Needed）

1. **状態共有パターン**: `state`オブジェクトの共有方法
   - グローバルエクスポート（シンプル、現状に近い）
   - 依存性注入（テスタビリティ向上）
   - オブザーバパターン（変更通知が必要な場合）
2. **DOM要素参照**: ビュー関数へのDOM要素受け渡し方法（パラメータ vs セレクタ渡し）
3. **イベントハンドラ登録**: 各モジュールでのイベント登録タイミング

### 設計時の決定事項

1. `state`オブジェクトの変更通知パターン（オブザーバ vs 直接参照）
2. 共通ユーティリティの配置: `views/utils.ts`追加の要否（`renderEmptyState`等）
3. エラーハンドリングの統一パターン

#### 7.4 `_legacyRenderShadesView`の扱い

- **定義箇所**: `src/ui/demo.ts:2623`（関数定義のみ）
- **呼び出し箇所**: なし（`grep -r "_legacyRenderShadesView" src/`で検証済み、定義以外のマッチなし）
- **E2Eテストでの参照**: なし（`grep -r "legacyRenderShadesView\|legacy.*Shades" e2e/`でマッチなし）
- **命名規則**: `_`プレフィックスは TypeScript/JavaScript で「未使用」または「内部用」を示す慣習
- **判断**:
  - 実行パスに含まれないため、削除しても「挙動変更なし」制約に抵触しない
  - ただし、将来の使用意図や履歴的経緯が不明なため、設計フェーズで削除/保持を最終決定
  - 保持する場合は`views/shades-view.ts`に移動し、コメントで経緯を記載

### 制約条件（明確化済み）

- DOM構造（id, class, data-*属性）は一切変更禁止
- `runDemo` APIインターフェースは維持
- 既存E2Eテストはすべてパス必須（主要な挙動の同一性を検証）
- 各ファイル500行以下、`index.ts`は300行以下目標
- モジュール間の循環依存は禁止

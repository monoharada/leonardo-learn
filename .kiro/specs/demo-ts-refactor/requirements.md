# Requirements Document

## Introduction

本ドキュメントは `src/ui/demo.ts`（3,429行）を機能単位で分割し、保守性を向上させるリファクタリングの要件を定義する。

**制約**:
- 挙動変更なし（DOM構造・class名維持）
- `runDemo` APIインターフェース変更なし
- 既存のテスト（E2E含む）がすべて通ること

**背景**:
現在の `demo.ts` は1ファイルに以下の機能が混在しており、保守性・テスタビリティが低い:
- 状態管理（state オブジェクト）
- 4つのビューレンダリング（Harmony/Palette/Shades/Accessibility）
- エクスポート機能（CSS/Tailwind/DTCG）
- CVDシミュレーション
- 色詳細モーダル
- CUD対応機能
- ユーティリティ関数群

**検証方法**:
- E2Eテスト（Playwright）がすべてパスすること
- TypeScript型チェック（`bun run type-check`）がエラーなく通ること
- Biomeリント（`bun run lint`）がエラーなく通ること

**依存方向の制約**:
- モジュール間の循環依存は禁止
- 依存方向: views/* → state/constants/types ← 他のモジュール
- 循環依存検出ツール（例: `madge --circular`）で検証可能

## Requirements

### Requirement 1: 状態管理モジュールの分離

**Objective:** As a 開発者, I want グローバル状態管理を独立モジュールに分離したい, so that 状態の変更追跡とデバッグが容易になる

#### Acceptance Criteria
1. The system shall `state` オブジェクトを `src/ui/demo/state.ts` に抽出する（型定義は `types.ts` に配置し、state.tsからインポートする）
2. The system shall 状態アクセス用のヘルパー関数（`getActivePalette`, `parseKeyColor` 等）を状態モジュールに移動する
3. The system shall 既存の `state` オブジェクト構造（`palettes`, `shadesPalettes`, `activeId`, `activeHarmonyIndex`, `contrastIntensity`, `lightnessDistribution`, `viewMode`, `cvdSimulation`, `selectedHarmonyConfig`, `cudMode`）を維持する
4. When 状態モジュールをインポートしたとき, the system shall 既存のE2Eテストがすべてパスすることで挙動の同一性を検証する

### Requirement 2: ビューレンダリングモジュールの分離

**Objective:** As a 開発者, I want 各ビュー（Harmony/Palette/Shades/Accessibility）を独立モジュールに分離したい, so that 各ビューの修正が他のビューに影響しない

#### Acceptance Criteria
1. The system shall `src/ui/demo/views/` ディレクトリを作成し、以下のファイルに分割する:
   - `harmony-view.ts`: `renderHarmonyView` 関数
   - `palette-view.ts`: `renderPaletteView` 関数
   - `shades-view.ts`: `renderShadesView`, `renderDadsHueSection`, `renderBrandColorSection` 関数
   - `accessibility-view.ts`: `renderAccessibilityView`, `renderDistinguishabilityAnalysis`, `renderAdjacentShadesAnalysis` 関数
2. The system shall 各ビューモジュールから共通依存（state, CUD components等）をインポートする構造にする
3. When 各ビューをインポートしたとき, the system shall E2Eテストでスクリーンショット比較を行い、既存と同一のDOM構造・class名を出力することを検証する
4. The system shall `renderMain` 関数を `src/ui/demo/index.ts` に配置し、各ビューへのルーティングを行う

### Requirement 3: エクスポート機能モジュールの分離

**Objective:** As a 開発者, I want エクスポート関連ロジックを独立モジュールに分離したい, so that エクスポート形式の追加が容易になる

#### Acceptance Criteria
1. The system shall `src/ui/demo/export-handlers.ts` に以下を抽出する:
   - `generateExportColors` 関数
   - `downloadFile` 関数
   - `updateExportPreview` 関数
   - エクスポートダイアログの初期化ロジック
2. The system shall エクスポートボタン（CSS/Tailwind/JSON）のイベントハンドラを export-handlers モジュールに移動する
3. When エクスポート機能を使用したとき, the system shall E2Eテストでエクスポート内容を検証し、既存と同一のファイル内容を出力することを確認する

### Requirement 4: 色詳細モーダルモジュールの分離

**Objective:** As a 開発者, I want 色詳細モーダルロジックを独立モジュールに分離したい, so that モーダルUIの修正・拡張が容易になる

#### Acceptance Criteria
1. The system shall 色詳細モーダル機能を以下のように分離する:
   - `ColorDetailModalOptions` インターフェースは `src/ui/demo/types.ts` に配置（View→Feature間のコールバック型として共有層で定義）
   - `openColorDetailModal` 関数は `src/ui/demo/color-detail-modal.ts` に配置
   - スクラバー関連ロジック（`drawScrubber`, `handleScrubberStart/Move/End`, `resizeScrubber`）
   - `updateDetail` 関数
2. The system shall モーダル内の色同期ロジック（`syncPalette`, `updateCard`）を含める
3. When モーダルを開いたとき, the system shall E2Eテストでモーダルのインタラクションを検証し、既存と同一のUI・インタラクションを維持することを確認する

### Requirement 5: CVDシミュレーション関連の整理

**Objective:** As a 開発者, I want CVD関連ロジックを整理したい, so that CVDシミュレーションの拡張・修正が容易になる

#### Acceptance Criteria
1. The system shall `src/ui/demo/cvd-controls.ts` に以下を抽出する:
   - `applySimulation` 関数
   - CVDタイプボタンのイベントハンドラ
   - `generateKeyColors` 関数
   - `updateCVDScoreDisplay` 関数
2. The system shall CVD関連のUI初期化を一箇所にまとめる
3. When CVDシミュレーションを切り替えたとき, the system shall E2Eテストでシミュレーション結果を検証し、既存と同一のシミュレーション結果を表示することを確認する

### Requirement 6: 定数・型定義の分離

**Objective:** As a 開発者, I want 定数と型定義を独立モジュールに分離したい, so that 設定変更が容易になる

#### Acceptance Criteria
1. The system shall `src/ui/demo/types.ts` に以下を抽出する:
   - `KeyColorWithStep` インターフェース
   - `PaletteConfig` インターフェース
   - `LightnessDistribution` 型
   - `ViewMode` 型
   - `HarmonyTypeConfig` インターフェース
   - `CVDSimulationType` 型
2. The system shall `src/ui/demo/constants.ts` に以下を抽出する:
   - `HARMONY_TYPES` 配列
   - `DEFAULT_STATE` オブジェクト（初期状態のデフォルト値: `activeId: ""`, `activeHarmonyIndex: 0`, `contrastIntensity: "moderate"`, `lightnessDistribution: "linear"`, `viewMode: "harmony"`, `cvdSimulation: "normal"`, `selectedHarmonyConfig: null`, `cudMode: "guide"`, `palettes: []`, `shadesPalettes: []`）
3. When 型・定数をインポートしたとき, the system shall TypeScript型チェック（`bun run type-check`）がエラーなく通ることを検証する

### Requirement 7: サイドバー・エディタモジュールの分離

**Objective:** As a 開発者, I want サイドバー・エディタUIを独立モジュールに分離したい, so that ナビゲーションUIの修正が容易になる

#### Acceptance Criteria
1. The system shall `src/ui/demo/sidebar.ts` に以下を抽出する:
   - `renderSidebar` 関数
2. The system shall `src/ui/demo/editor.ts` に以下を抽出する:
   - `updateEditor` 関数
   - ハーモニーボタンのイベントハンドラ
3. When サイドバー・エディタを操作したとき, the system shall E2Eテストで操作結果を検証し、既存と同一の挙動を維持することを確認する

### Requirement 8: ビュー切替・ナビゲーション機能の分離

**Objective:** As a 開発者, I want ビュー切替ロジックを独立モジュールに分離したい, so that ナビゲーション動作の修正が容易になる

#### Acceptance Criteria
1. The system shall `src/ui/demo/navigation.ts` に以下を抽出する:
   - `updateViewButtons` 関数
   - `announceViewChange` 関数（スクリーンリーダー通知）
   - ナビゲーションボタンのイベントハンドラ
2. When ビューを切り替えたとき, the system shall E2Eテストでビュー表示を検証し、既存と同一のビュー表示・スクロール動作を維持することを確認する
3. When ビューを切り替えたとき, the system shall `#live-region` 要素のtextContentが適切なビュー名を含むことで、スクリーンリーダーへの通知を検証する

### Requirement 9: パレット生成ロジックの分離

**Objective:** As a 開発者, I want パレット生成ロジックを独立モジュールに分離したい, so that 生成アルゴリズムの修正・テストが容易になる

#### Acceptance Criteria
1. The system shall `src/ui/demo/palette-generator.ts` に以下を抽出する:
   - `handleGenerate` 関数
   - ハーモニーパレット生成ロジック
   - Shadesパレット生成ロジック
2. The system shall パレット生成結果のstate更新を明確に分離する
3. When パレットを生成したとき, the system shall E2Eテストで生成結果を検証し、既存と同一の色パレットを出力することを確認する

### Requirement 10: エントリポイント構造の整理

**Objective:** As a 開発者, I want エントリポイントをすっきりとした構造にしたい, so that 全体構造が把握しやすくなる

#### Acceptance Criteria
1. The system shall `src/ui/demo/index.ts` を真のエントリポイントとして、以下の構造に整理する:
   - 各モジュールのインポート
   - DOM要素の取得
   - イベントハンドラの登録
   - 初期レンダリングの呼び出し
2. The system shall `src/ui/demo.ts` を `src/ui/demo/index.ts` からの re-export のみに変更する（後方互換性維持）
3. The system shall `runDemo` 関数のシグネチャを維持する
4. When `runDemo()` を呼び出したとき, the system shall E2Eテストで初期表示を検証し、既存と同一の初期表示を行うことを確認する
5. The system shall `src/ui/demo/index.ts` を 300行以下に抑える（目標）

### Requirement 11: ディレクトリ構造の整備

**Objective:** As a 開発者, I want 分割後のファイル構造を一貫性のあるものにしたい, so that プロジェクト構造が理解しやすくなる

#### Acceptance Criteria
1. The system shall 以下のディレクトリ構造を構築する:
   ```
   src/ui/demo/
   ├── index.ts           # 真のエントリポイント（runDemo実装）
   ├── state.ts           # 状態管理
   ├── types.ts           # 型定義
   ├── constants.ts       # 定数（HARMONY_TYPES, DEFAULT_STATE）
   ├── navigation.ts      # ビュー切替
   ├── sidebar.ts         # サイドバー
   ├── editor.ts          # エディタ
   ├── palette-generator.ts # パレット生成
   ├── export-handlers.ts # エクスポート
   ├── cvd-controls.ts    # CVD制御
   ├── color-detail-modal.ts # 色詳細モーダル
   └── views/
       ├── index.ts       # ビューのre-export
       ├── harmony-view.ts
       ├── palette-view.ts
       ├── shades-view.ts
       └── accessibility-view.ts
   ```
2. The system shall 既存の `src/ui/demo.ts` を `export * from "./demo/index"` のみに変更する（後方互換性維持）
3. The system shall 各ファイルを 500行以下に抑える（目標）
4. The system shall モジュール間の循環依存がないことを `madge --circular src/ui/demo` で検証可能にする

### Requirement 12: テスト互換性の維持

**Objective:** As a 開発者, I want 既存のE2Eテストが通ることを保証したい, so that リファクタリングによるリグレッションを防止する

#### Acceptance Criteria
1. The system shall 既存の E2E テスト（Playwright）がすべてパスすること
2. The system shall DOM構造（id, class, data-*属性）を変更しないこと
3. The system shall イベントハンドラの動作を変更しないこと
4. When テストを実行したとき, the system shall `bun run test:e2e` がすべてのテストケースをパスすること


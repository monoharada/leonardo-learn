# Implementation Plan

## Dependency Graph

```
Task 1.1 (P) → Task 1.2 → Task 1.3 → Task 2.x, 3.x, 4.x → Task 5.1 → Task 5.2 → Task 6.x
```

**Critical Path**: 1.1 → 1.3 → 2.1 → 3.1 → 3.4a → 4.1 → 5.1 → 6.1 → 6.2 → 6.3 → 6.4

## Task 1: 基盤層モジュールの作成

State Layer（types.ts, constants.ts, state.ts）を作成し、他モジュールの基盤となる型定義・定数・状態管理を整備する。

- [x] 1.1 (P) 型定義モジュールを作成する
  - **依存**: なし（最初に着手可能）
  - demo機能で使用する全型定義（KeyColorWithStep, PaletteConfig, ViewMode等）を独立モジュールとして抽出
  - 外部型（HarmonyType, CVDType, ContrastIntensity等）の再エクスポートを整理
  - ColorDetailModalOptionsをView→Feature間のコールバック型として共有層に配置
  - TypeScript型チェックがエラーなく通ることを検証
  - _Requirements: 6.1, 6.3_

- [x] 1.2 定数モジュールを作成する
  - **依存**: Task 1.1（型定義のインポートが必要）
  - HARMONY_TYPES配列を独立モジュールとして抽出
  - DEFAULT_STATEオブジェクト（初期状態のデフォルト値）を定義
  - types.tsから型をインポートして型安全性を確保
  - _Requirements: 6.2, 6.3_

- [x] 1.3 状態管理モジュールを作成する
  - **依存**: Task 1.1, 1.2（型と定数が必要）
  - stateオブジェクトをシングルトンとしてエクスポート
  - getActivePalette, parseKeyColor, resetState等のヘルパー関数を実装
  - 既存のstate構造（palettes, shadesPalettes, activeId等）を完全に維持
  - types.tsとconstants.tsから必要な型と初期値をインポート
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Task 2: Feature Layerモジュールの作成（前半）

navigation, sidebar, editorモジュールを作成し、UI操作に関する機能を分離する。

- [x] 2.1 ナビゲーションモジュールを作成する
  - **依存**: Task 1.3（state参照が必要）
  - updateViewButtons, announceViewChange関数を実装
  - ビュー切替ボタンのイベントハンドラを設定
  - スクリーンリーダー通知（#live-region）機能を実装
  - 必須要素と任意要素のNull取り扱いを設計通りに実装
  - state.viewModeの更新後にrenderMainコールバックを呼び出す構造
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 2.2 サイドバーモジュールを作成する
  - **依存**: Task 1.3（state参照が必要）
  - renderSidebar関数を実装
  - パレット一覧のレンダリングとパレット選択コールバックを実装
  - state.palettesとstate.activeIdを参照して現在の選択状態を反映
  - 依存方向ルールに従い、setButtonActiveをモジュール内部で定義（style-constants依存を削除）
  - _Requirements: 7.1, 7.3_

- [x] 2.3 エディタモジュールを作成する
  - **依存**: Task 1.3（state参照が必要）
  - updateEditor関数を実装
  - ハーモニー選択ボタンのイベントハンドラを設定
  - 選択変更時のコールバック呼び出しを実装
  - _Requirements: 7.2, 7.3_

## Task 3: Feature Layerモジュールの作成（後半）

palette-generator, export-handlers, cvd-controls, color-detail-modalモジュールを作成する。

- [x] 3.1 パレット生成モジュールを作成する
  - **依存**: Task 1.3（state更新が必要）
  - handleGenerate関数を実装
  - ハーモニーパレット生成ロジックを移植
  - Shadesパレット生成ロジックを移植
  - state.palettesとstate.shadesPalettesの更新を明確に分離
  - @/core/harmonyとの連携を維持
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 3.2 エクスポートハンドラモジュールを作成する
  - **依存**: Task 1.3（state参照が必要）
  - generateExportColors, downloadFile, updateExportPreview関数を実装
  - エクスポートダイアログの初期化ロジックを移植
  - CSS/Tailwind/JSONエクスポートボタンのイベントハンドラを設定
  - @/core/export/*との連携を維持
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.3 CVD制御モジュールを作成する
  - **依存**: Task 1.3（state更新が必要）
  - applySimulation, generateKeyColors, updateCVDScoreDisplay関数を実装
  - CVDタイプボタンのイベントハンドラを設定
  - state.cvdSimulationの更新を管理
  - CVD関連のUI初期化を一箇所に集約（DOM取得・初期表示・イベント登録）
  - @/accessibilityとの連携を維持
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3.4a 色詳細モーダル：基本構造を作成する
  - **依存**: Task 1.1（ColorDetailModalOptions型が必要）, Task 1.3
  - openColorDetailModal関数のシグネチャとモーダル開閉ロジックを実装
  - types.tsのColorDetailModalOptions型を使用
  - AbortControllerによるイベントリスナーのクリーンアップ基盤を実装
  - _Requirements: 4.1_

- [x] 3.4b 色詳細モーダル：スクラバー機能を実装する
  - **依存**: Task 3.4a
  - drawScrubber関数を移植
  - handleScrubberStart/Move/End等のイベントハンドラを実装
  - キャンバス描画ロジックを移植
  - _Requirements: 4.1_

- [x] 3.4c 色詳細モーダル：色同期とreadOnlyモードを実装する
  - **依存**: Task 3.4b
  - updateDetail関数と色同期ロジック（syncPalette, updateCard）を移植
  - readOnlyモードでの編集操作無効化を実装
  - _Requirements: 4.2, 4.3_

## Task 4: View Layerモジュールの作成

各ビュー（Harmony, Palette, Shades, Accessibility）を独立モジュールとして作成する。

- [x] 4.1 ハーモニービューモジュールを作成する
  - **依存**: Task 1.1, 1.2, 1.3（型・定数・state参照が必要）
  - renderHarmonyView関数を実装
  - HARMONY_TYPES定数を使用してハーモニー選択UIを構築
  - onHarmonySelectとonColorClickコールバックを受け取る設計
  - state.selectedHarmonyConfigとstate.cudModeを参照
  - color-detail-modalへの直接importを避け、コールバック経由で接続
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4.2 パレットビューモジュールを作成する
  - **依存**: Task 1.1, 1.3（型・state参照が必要）
  - renderPaletteView関数を実装（非同期）
  - パレット詳細画面のレンダリングロジックを移植
  - onColorClickコールバックを受け取る設計
  - @/core/tokens/dads-data-providerとの連携を維持
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4.3 シェードビューモジュールを作成する
  - **依存**: Task 1.1, 1.3（型・state参照が必要）
  - renderShadesView, renderDadsHueSection, renderBrandColorSection関数を実装
  - シェード一覧画面のレンダリングロジックを移植
  - onColorClickコールバックを受け取る設計
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4.4 アクセシビリティビューモジュールを作成する
  - **依存**: Task 1.1, 1.3（型・state参照が必要）
  - renderAccessibilityView, renderDistinguishabilityAnalysis, renderAdjacentShadesAnalysis関数を実装
  - applySimulationヘルパーをコールバック経由で受け取る設計（直接import禁止）
  - @/accessibility/distinguishabilityとの連携を維持
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4.5 ビューモジュールのre-exportを作成する
  - **依存**: Task 4.1, 4.2, 4.3, 4.4
  - views/index.tsで全ビュー関数をre-export
  - 外部からのインポートを簡潔にする
  - _Requirements: 2.1, 11.1_

## Task 5: エントリポイントの整理と統合

index.tsを真のエントリポイントとして整理し、全モジュールを統合する。

- [x] 5.1 エントリポイントモジュールを作成する
  - **依存**: Task 2.x, 3.x, 4.x（全Feature/Viewモジュールが必要）
  - runDemo関数を実装
  - 必須DOM要素の取得と存在確認（app, palette-list等）
  - 各モジュールのsetup関数の呼び出しと初期化
  - renderMain関数の実装（ビューモードに応じたルーティング）
  - View→Featureのコールバック接続（循環依存回避）
  - 目標300行以下
  - _Requirements: 2.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5.2 後方互換性のためのre-exportを設定する
  - **依存**: Task 5.1
  - 既存のsrc/ui/demo.tsをexport * from "./demo/index"に変更
  - runDemo関数のシグネチャを維持
  - 既存のインポートパスが引き続き動作することを確認
  - _Requirements: 10.2, 10.3, 11.2_

## Task 6: 検証と品質保証

リファクタリング後のコードが既存動作を維持することを検証する。

- [ ] 6.1 循環依存の検証
  - **依存**: Task 5.2（全モジュール統合後に実施）
  - madge --circular src/ui/demoで循環依存がないことを確認
  - 依存方向ルール（Entry→Feature→View→State→External）の遵守を確認
  - View→Featureの直接依存がないことを確認
  - _Requirements: 11.4_

- [ ] 6.2 静的解析の実行
  - **依存**: Task 5.2
  - bun run type-checkでTypeScript型チェックを実行
  - bun run lintでBiomeリントを実行
  - すべてのエラーを解消
  - _Requirements: 6.3, 12.1_

- [ ] 6.3 E2Eテストの実行と検証
  - **依存**: Task 6.2（静的解析パス後に実施）
  - bun run test:e2eで既存のPlaywright E2Eテストを実行
  - 全テストケースがパスすることを確認
  - DOM構造（id, class, data-*属性）が変更されていないことを確認
  - イベントハンドラの動作が変更されていないことを確認
  - _Requirements: 1.4, 2.3, 3.3, 4.3, 5.3, 7.3, 8.2, 8.3, 9.3, 10.4, 12.1, 12.2, 12.3, 12.4_

- [ ] 6.4 ファイルサイズ目標の確認
  - **依存**: Task 6.2
  - 各ファイルが500行以下であることを確認
  - index.tsが300行以下であることを確認
  - 目標を超える場合は追加分割を検討
  - _Requirements: 10.5, 11.3_

## Task 7: ユニット/統合テストの追加（オプショナル）

主要モジュールの回帰検出精度を向上させるテストを追加する。

- [ ]* 7.1 palette-generatorのユニットテストを作成する
  - **依存**: Task 3.1
  - handleGenerate関数の正常系・異常系テスト
  - state.palettes/shadesPalettesの更新検証
  - _Requirements: 9.3_

- [ ]* 7.2 export-handlersのユニットテストを作成する
  - **依存**: Task 3.2
  - generateExportColors関数の出力形式検証
  - CSS/Tailwind/JSON各形式の出力内容検証
  - _Requirements: 3.3_

- [ ]* 7.3 cvd-controlsのユニットテストを作成する
  - **依存**: Task 3.3
  - applySimulation関数のCVDタイプ別変換検証
  - state.cvdSimulation更新の検証
  - _Requirements: 5.3_

- [ ]* 7.4 color-detail-modalの統合テストを作成する
  - **依存**: Task 3.4c
  - モーダル開閉の検証
  - 色同期ロジックの検証
  - readOnlyモードの動作検証
  - _Requirements: 4.3_

- [ ]* 7.5 navigationの統合テストを作成する
  - **依存**: Task 2.1
  - ビュー切替とstate.viewMode更新の検証
  - スクリーンリーダー通知の検証
  - _Requirements: 8.3_

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1, 1.2, 1.3, 1.4 | 1.3, 6.3 |
| 2.1, 2.2, 2.3, 2.4 | 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 6.3 |
| 3.1, 3.2, 3.3 | 3.2, 6.3, 7.2* |
| 4.1, 4.2, 4.3 | 3.4a, 3.4b, 3.4c, 6.3, 7.4* |
| 5.1, 5.2, 5.3 | 3.3, 6.3, 7.3* |
| 6.1, 6.2, 6.3 | 1.1, 1.2, 6.2 |
| 7.1, 7.2, 7.3 | 2.2, 2.3, 6.3 |
| 8.1, 8.2, 8.3 | 2.1, 6.3, 7.5* |
| 9.1, 9.2, 9.3 | 3.1, 6.3, 7.1* |
| 10.1, 10.2, 10.3, 10.4, 10.5 | 5.1, 5.2, 6.3, 6.4 |
| 11.1, 11.2, 11.3, 11.4 | 4.5, 5.2, 6.1, 6.4 |
| 12.1, 12.2, 12.3, 12.4 | 6.2, 6.3 |

## Design Document Reference

設計ドキュメント: `.kiro/specs/demo-ts-refactor/design.md`
- 4層アーキテクチャ: Entry → Feature → View → State → External
- 依存方向ルール: View→Featureの直接import禁止（コールバック経由）
- 目標行数: index.ts ≤ 300行、各ファイル ≤ 500行

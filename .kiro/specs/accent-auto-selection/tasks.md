# Implementation Plan

## 要件カバレッジ

| 要件ID | 概要 | タスク |
|--------|------|--------|
| 1.1 | 全130色スコア計算・ソート | 1.1, 1.2 |
| 1.2 | バランススコア（0-100）計算 | 1.1 |
| 1.3 | 上位10件の推奨リスト | 1.2 |
| 1.4 | ブランドカラー未設定時の処理 | 2.1 |
| 1.5 | 背景色未設定時のデフォルト処理 | 2.1 |
| 2.1 | 3指標のスコア計算 | 1.1 |
| 2.2 | デフォルト重み付け適用 | 1.1 |
| 2.3 | 重み正規化（合計100保証） | 1.1 |
| 2.4 | 背景色変更時の再計算 | 1.3 |
| 2.5 | スコア内訳表示 | 4.2 |
| 3.1 | ハーモニータイプフィルタ | 3.1 |
| 3.2 | ±30°以内の候補抽出 | 3.1 |
| 3.3 | フィルタ後のソート維持 | 3.2 |
| 3.4 | 候補0件時の代替表示 | 3.2 |
| 4.1 | アクセント選定パネル表示 | 4.1 |
| 4.2 | 候補カードグリッド表示 | 4.2 |
| 4.3 | 候補選択・パレット追加 | 4.3 |
| 4.4 | 選択後の調整（削除・変更） | 4.3 |
| 5.1 | カスタムアクセント追加機能 | 5.1 |
| 5.2 | DADSシェード一覧からの選択 | 5.1 |
| 5.3 | 手動追加色のスコア表示 | 5.1 |
| 5.4 | 低スコア警告表示 | 5.2 |
| 6.1 | 200ms以内のパフォーマンス | 6.1 |
| 6.2 | スコアメモ化 | 1.3 |
| 6.3 | フィルタ時の再計算回避 | 3.2 |
| 7.1 | DADSデータ読み込みエラー処理 | 2.1, 4.1 |
| 7.2 | スコア計算エラー処理 | 2.2, 2.3 |
| 7.3 | エラー時キャッシュ不使用 | 2.2 |

---

## タスク一覧

- [x] 1. バランススコア計算サービスの実装

- [x] 1.1 BalanceScoreCalculator コア機能の実装
  - ハーモニースコア計算を実装（既存の `calculateHueDistanceScore()` を活用、0-100スケールで返却）
  - CUDスコア計算を実装: `findNearestCudColor()` からΔEを取得し、`score = clamp(0, 100, 100 - (deltaE / 0.20) * 100)` で正規化（ΔE=0で100点、ΔE≥0.20で0点）
  - コントラストスコア計算を実装: `getContrast()` でコントラスト比を取得し、`score = clamp(0, 100, ((contrastRatio - 1) / 6) * 100)` で正規化（比1.0で0点、比7.0以上で100点）
  - 3指標の加重平均によるバランススコア計算を実装（デフォルト重み: ハーモニー40%、CUD30%、コントラスト30%）
  - 重み正規化機能を実装（合計100保証、端数調整ロジック含む）
  - HEX入力の正規化機能を実装（大文字統一、3桁展開、#プレフィックス保証）
  - 背景色フォールバック機能を実装（無効値または未設定時は#FFFFFFを使用）
  - **依存**: なし（他タスクから参照される基盤）
  - _Requirements: 1.2, 2.1, 2.2, 2.3_

- [x] 1.2 AccentCandidateService 候補生成機能の実装
  - DADSトークンからchromatic候補（10色相×13ステップ = 130色）を抽出
  - 全候補に対するスコア一括計算を実装
  - スコア降順ソート（同スコア時は主要ステップ500/600/700/800を優先）を実装
  - 上位N件（デフォルト10件）の推奨リスト取得機能を実装
  - **依存**: 1.1（BalanceScoreCalculatorのAPI確定後）
  - _Requirements: 1.1, 1.3_

- [x] 1.3 スコアキャッシュ機構の実装
  - 二段階キャッシュ構造を実装:
    - **partialScoreCache**: キー=`${normalizedBrandHex}_${normalizedCandidateHex}`（ブランド色+候補色）、値=ハーモニー・CUDスコア（背景色・重み非依存）
    - **fullScoreCache**: キー=`${normalizedBrandHex}_${normalizedCandidateHex}_${normalizedBackgroundHex}_${normalizedHarmony}_${normalizedCud}_${normalizedContrast}`（ブランド色+候補色+背景色+正規化済み重み3値）、値=完全スコア結果
  - キャッシュキーには正規化済みHEX・正規化済み重みを使用（入力バリエーションによるキャッシュミスを防止）
  - 背景色変更時の部分再計算機能を実装（コントラストスコアのみ再計算、partialScoreCacheを活用）
  - 重み変更時のキャッシュ無効化ポリシーを実装（fullScoreCacheをクリアして再計算）
  - **依存**: 1.1, 1.2（スコア計算・候補生成のAPI確定後）
  - _Requirements: 2.4, 6.2_

- [x] 2. エラーハンドリングの実装

- [x] 2.1 (P) 入力バリデーションとエラー処理
  - ブランドカラー未設定時のエラーハンドリングを実装（エラーコード: BRAND_COLOR_NOT_SET）
  - 無効なHEX形式の検出と InvalidColorError 送出を実装
  - DADSデータ読み込み失敗時のエラーハンドリングを実装（エラーコード: DADS_LOAD_FAILED、エラーメッセージ: 「DADSデータの読み込みに失敗しました」）
  - 背景色未設定/無効時のフォールバック処理を実装（#FFFFFF使用）
  - _Requirements: 1.4, 1.5, 7.1_

- [x] 2.2 (P) スコア計算エラー処理とキャッシュポリシー
  - スコア計算中のエラーハンドリングを実装（エラーコード: SCORE_CALCULATION_FAILED）
  - エラー発生時の全キャッシュクリア機能を実装（partialScoreCache + fullScoreCache）
  - 不完全な計算結果のキャッシュ禁止ポリシーを実装
  - DADSエラー状態のリセット機能を実装
  - _Requirements: 7.2, 7.3_

- [x] 2.3 エラー時のUI状態管理
  - スコア計算エラー時に自動選定を無効化しつつ、手動選択は継続可能とするエラー状態を実装
  - エラー状態フラグ（autoSelectionDisabled: boolean）の管理を実装
  - 手動選択パネルへのエラー状態伝播（スコア表示なしで色選択のみ許可）を実装
  - SCORE_CALCULATION_FAILED時のユーザー向けエラーメッセージ表示を実装（「スコア計算中にエラーが発生しました」）
  - **依存**: 2.2（エラーコード定義後）
  - _Requirements: 7.2_

- [x] 3. ハーモニーフィルタの実装

- [x] 3.1 (P) HarmonyFilterCalculator の実装
  - ハーモニータイプ定義を実装（all, complementary, triadic, analogous, split-complementary）
  - 各ハーモニータイプのターゲット色相計算を実装
  - ±30°の循環距離判定機能を実装（色相0-360°の循環対応）
  - 候補が指定色相範囲内かどうかの判定機能を実装
  - **Creates:** `src/core/accent/harmony-filter-calculator.ts`, `src/core/accent/harmony-filter-calculator.test.ts`
  - _Requirements: 3.1, 3.2_

- [x] 3.2 フィルタ適用とソート維持の実装
  - ハーモニーフィルタの適用機能を実装（スコア再計算なし）
  - フィルタ後のスコア順ソート維持を実装
  - フィルタ結果0件時の代替候補算出機能を実装（最も近い色相の候補を最大3件）
  - "all"フィルタ選択時の早期リターン最適化を実装
  - **依存**: 3.1（HarmonyFilterCalculatorのAPI確定後）
  - **Creates:** `src/core/accent/harmony-filter-service.ts`, `src/core/accent/harmony-filter-service.test.ts`
  - _Requirements: 3.3, 3.4, 6.3_

- [x] 4. アクセント選定パネルUIの実装

- [x] 4.1 AccentSelectorPanel 基本UIの実装
  - パネルの開閉制御を実装
  - ブランドカラー未設定時の無効化表示とエラーメッセージを実装
  - DADSデータ読み込み失敗時のエラーメッセージ表示（「DADSデータの読み込みに失敗しました」）とアクセント選定機能無効化を実装
  - ローディング状態の表示を実装
  - エラー状態の表示を実装
  - **依存**: 2.1, 2.3（エラー状態管理の確定後）
  - **Creates:** `src/ui/accent-selector/accent-selector-panel.ts`, `src/ui/accent-selector/accent-selector-panel.test.ts`
  - _Requirements: 4.1, 7.1_

- [x] 4.2 (P) AccentCandidateGrid 候補表示UIの実装
  - 候補カードのグリッド表示を実装
  - 各カードにカラースウォッチ、DADSソース名、総合スコアを表示
  - ホバー時のスコア内訳（ハーモニー/CUD/コントラスト）表示を実装
  - **Creates:** `src/ui/accent-selector/accent-candidate-grid.ts`, `src/ui/accent-selector/accent-candidate-grid.test.ts`
  - _Requirements: 4.2, 2.5_

- [x] 4.3 候補選択とパレット連携の実装
  - 候補カードクリック時のアクセント選択機能を実装
  - 選択したアクセントのパレットへの追加を実装（Demo State連携）
  - 選択済みアクセントの削除機能を実装
  - 選択済みアクセントの別候補への変更機能を実装
  - **依存**: 4.1, 4.2（UI基盤確定後）
  - **Creates:** `src/ui/accent-selector/accent-palette-integration.ts`, `src/ui/accent-selector/accent-palette-integration.test.ts`
  - _Requirements: 4.3, 4.4_

- [x] 4.4 (P) HarmonyFilter UI と WeightSlider UI の実装
  - ハーモニータイプ選択ドロップダウンを実装
  - フィルタ変更時の候補リスト更新を実装
  - 重み調整スライダー（3つ: ハーモニー/CUD/コントラスト）を実装
  - 重み変更時のスコア再計算トリガーを実装
  - **Creates:** `src/ui/accent-selector/harmony-filter-ui.ts`, `src/ui/accent-selector/harmony-filter-ui.test.ts`, `src/ui/accent-selector/weight-slider-ui.ts`, `src/ui/accent-selector/weight-slider-ui.test.ts`
  - _Requirements: 3.1, 2.3_

- [x] 5. 手動選択機能の実装

- [x] 5.1 ManualAccentSelector の実装
  - 手動選択パネルの開閉制御を実装
  - カテゴリタブ表示を実装（Chromatic/Neutral/Semantic の3種）
  - Chromaticカテゴリでの色相タブ表示を実装
  - Neutral/Semanticカテゴリでのトークン一覧表示を実装
  - トークン選択時のプレビューとスコア自動計算を実装（エラー時はスコア非表示で色選択のみ許可）
  - 選択したトークンの追加機能を実装
  - **依存**: 2.3（エラー時の手動選択継続ポリシー確定後）
  - **Creates:** `src/ui/accent-selector/manual-accent-selector.ts`, `src/ui/accent-selector/manual-accent-selector.test.ts`
  - _Requirements: 5.1, 5.2, 5.3, 7.2_

- [x] 5.2 低スコア警告の実装
  - 総合スコア50未満の判定機能を実装
  - 低スコア警告トースト表示を実装（追加は許可）
  - **Creates:** `src/ui/accent-selector/low-score-warning.ts`, `src/ui/accent-selector/low-score-warning.test.ts`
  - _Requirements: 5.4_

- [x] 6. パフォーマンス最適化とテスト

- [x] 6.1 パフォーマンス検証と最適化
  - 130色スコア計算のパフォーマンステストを実装（200ms以内を検証）
  - キャッシュヒット時のパフォーマンステストを実装（10ms以内を検証）
  - フィルタ適用のパフォーマンステストを実装（5ms以内を検証）
  - 必要に応じた最適化の実施
  - **Creates:** `src/core/accent/accent-performance.test.ts`
  - _Requirements: 6.1_

- [x] 6.2 (P) ユニットテストの実装
  - BalanceScoreCalculator のテストを実装（既知の色ペアで期待スコア検証、CUD/コントラストの正規化式検証含む）
  - 重み正規化のテストを実装（合計100保証、端数処理、境界値）
  - HarmonyFilterCalculator のテストを実装（各ハーモニータイプの色相計算）
  - 循環距離判定のテストを実装（±30°判定）
  - エラーハンドリングのテストを実装
  - **Modifies:** `src/core/accent/balance-score-calculator.test.ts`
  - _Requirements: 1.2, 2.1, 2.3, 3.1, 3.2_

- [x] 6.3 (P) 統合テストの実装
  - AccentCandidateService の統合テストを実装（DADSデータ読み込み→スコア計算→ソート）
  - メモ化動作のテストを実装（同一条件での2回目呼び出しがキャッシュヒット）
  - 背景色変更時の再計算テストを実装
  - 重み変更時のキャッシュ無効化テストを実装
  - エラー時のキャッシュクリア動作テストを実装
  - **Creates:** `src/core/accent/accent-integration.test.ts`
  - _Requirements: 6.2, 2.4, 7.3_

- [x] 6.4 E2Eテストの実装
  - アクセント選定パネルの表示/非表示テストを実装
  - 候補カードクリック→パレット追加のテストを実装
  - ハーモニーフィルタ切替→候補リスト更新のテストを実装
  - 重みスライダー変更→スコア再計算のテストを実装
  - 手動選択フローのテストを実装
  - エラー時の手動選択継続テストを実装
  - **Creates:** `e2e/accent-selector.e2e.ts`
  - _Requirements: 4.1, 4.3, 3.1, 2.3, 5.1, 7.2_

- [x] 7. ハーモニービュー → アクセント選定ビュー置換

- [x] 7.1 constants.tsの更新
  - 既存HARMONY_TYPES配列を削除（Complementary, Analogous, Triadic...）
  - ACCENT_HARMONY_TYPES配列を追加（HarmonyFilterTypeベース）
  - **Modifies:** `src/ui/demo/constants.ts`
  - _Requirements: 4.2, 4.3_

- [x] 7.2 harmony-view.ts → accent-selection-view.ts改変
  - 既存のハーモニーカード表示を削除
  - AccentSelectorPanelのコンポーネント（HarmonyFilterUI, WeightSliderUI, AccentCandidateGrid）を直接配置
  - Brand Color入力は維持
  - アクセント選択時のコールバック追加
  - **Modifies:** `src/ui/demo/views/harmony-view.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7.3 index.tsの更新
  - import文の更新（renderHarmonyView → renderAccentSelectionView）
  - handleHarmonySelectを削除し、handleAccentSelectに置換
  - renderMain()のharmonyケース更新
  - **Modifies:** `src/ui/demo/index.ts`
  - _Requirements: 4.1, 4.2_

- [x] 7.4 types.tsの更新
  - AccentHarmonyTypeConfig型の追加
  - DemoStateからselectedHarmonyConfigを更新
  - **Modifies:** `src/ui/demo/types.ts`
  - _Requirements: 4.2_

- [x] 7.5 ナビゲーション・ラベルの更新
  - 「ハーモニー」→「アクセント選定」
  - **Modifies:** `index.html`
  - _Requirements: 4.1_

- [x] 7.6 CSSスタイルの調整
  - アクセント選定ビューのレイアウトスタイル追加
  - **Modifies:** `src/ui/styles/app-components.css`
  - _Requirements: 4.1_

- [x] 7.7 E2Eテストの更新
  - accent-selector.e2e.tsをハーモニービュー対応に修正（ハーモニービュー経由でのテストに変更）
  - **Modifies:** `e2e/accent-selector.e2e.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. アクセント選定UI改善（カード形式ハーモニー選択）

- [x] 8.1 HarmonyPaletteGenerator の実装
  - 各ハーモニータイプに対して3色パレット（ブランド + 2アクセント）を生成する機能を実装
  - 補色: ブランドカラーの補色方向から異なるステップ（明暗）の2色を選定
  - トライアド/類似色/分裂補色: 各方向から最高スコアの1色ずつを選定
  - 全ハーモニータイプのプレビュー用パレット一括取得機能を実装
  - **Creates:** `src/core/accent/harmony-palette-generator.ts`, `src/core/accent/harmony-palette-generator.test.ts`
  - _Requirements: 4.1, 4.2_

- [x] 8.2 HarmonyTypeCard コンポーネントの実装
  - ハーモニータイプをカード形式で表示するUIコンポーネントを実装
  - 各カードにタイトル、説明、3色のプレビュースウォッチを表示
  - クリック時のコールバック機能を実装
  - ローディング/無効状態の表示を実装
  - 詳細選択カード（DetailSelectCard）を実装
  - ハーモニーカードグリッド生成関数を実装
  - **Creates:** `src/ui/accent-selector/harmony-type-card.ts`, `src/ui/accent-selector/harmony-type-card.test.ts`
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 8.3 harmony-view.ts の全面書き換え
  - カードモード: 4種類のハーモニーカード + 詳細選択カードを表示
  - 詳細選択モード: 従来のグリッドUIを表示（戻るボタン付き）
  - カードプレビュー色の動的読み込み機能を実装
  - **Modifies:** `src/ui/demo/views/harmony-view.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8.4 index.ts のハンドラ更新
  - handleHarmonyCardClickハンドラを追加（3色パレット生成→パレットビュー遷移）
  - renderAccentSelectionView呼び出しにonHarmonyCardClickコールバックを追加
  - **Modifies:** `src/ui/demo/index.ts`
  - _Requirements: 4.1, 4.3_

- [x] 8.5 CSSスタイルの追加
  - .harmony-type-cards グリッドスタイル
  - .harmony-type-card カードスタイル（ホバー、フォーカス、ローディング、無効状態）
  - .harmony-type-card--detail 詳細選択カードスタイル
  - .harmony-card-area, .accent-detail-area エリアスタイル
  - **Modifies:** `src/ui/styles/app-components.css`
  - _Requirements: 4.1_

- [x] 8.6 E2Eテストの更新
  - ハーモニーカード表示テスト（4種類 + 詳細選択）
  - カードクリック→パレット生成→パレットビュー遷移テスト
  - 詳細選択モードへの切り替えテスト
  - 戻るボタンでカードモードに戻るテスト
  - **Modifies:** `e2e/accent-selector.e2e.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. パレット名編集機能の実装

- [x] 9.1 カラー詳細モーダルでのパレット名編集
  - モーダルヘッダーに編集ボタン（鉛筆アイコン）を追加
  - インライン編集用入力フィールドを実装
  - Enter/Escapeキーでの確定/キャンセル機能を実装
  - blur時の自動保存機能を実装
  - AbortControllerによるイベントリスナーのクリーンアップを実装
  - **Modifies:** `index.html`, `src/ui/demo/color-detail-modal.ts`
  - _Requirements: 4.4_

- [x] 9.2 types.ts の更新
  - ColorDetailModalOptions.paletteInfoにpaletteIdプロパティを追加
  - パレット識別用IDを通じた状態更新を実現
  - **Modifies:** `src/ui/demo/types.ts`
  - _Requirements: 4.4_

- [x] 9.3 palette-view.ts の更新
  - モーダル呼び出し時にpaletteIdを渡すように修正
  - すべてのパレット（Primary含む）で名前編集を有効化
  - **Modifies:** `src/ui/demo/views/palette-view.ts`
  - _Requirements: 4.4_

- [x] 9.4 CSSスタイルの追加
  - .dads-drawer__name-container フレックスコンテナ
  - .dads-drawer__edit-btn 編集ボタンスタイル
  - .dads-drawer__name-input 入力フィールドスタイル
  - **Modifies:** `src/ui/styles/components.css`
  - _Requirements: 4.4_

- [x] 9.5 未使用コードの削除（サイドバー編集機能）
  - sidebar.tsからenterEditMode関数を削除
  - ダブルクリック編集ハンドラを削除
  - 未使用のCSSスタイル（.dads-palette-item__input等）を削除
  - **Modifies:** `src/ui/demo/sidebar.ts`, `src/ui/styles/components.css`
  - _Requirements: コードクリーンアップ_

- [x] 10. 新ハーモニータイプの追加（Adobe Color調査対応）

- [x] 10.1 HarmonyFilterCalculator への新タイプ追加
  - HarmonyFilterType に3タイプ追加: monochromatic, shades, compound
  - HARMONY_TYPES配列を8要素に拡張（all含む）
  - 各タイプの色相オフセット定義:
    - monochromatic: [0]（同一色相）
    - shades: [0]（同一色相）
    - compound: [30, 180]（類似色+補色）
  - getTargetHues()の更新
  - **Modifies:** `src/core/accent/harmony-filter-calculator.ts`, `src/core/accent/harmony-filter-calculator.test.ts`
  - _Requirements: Adobe Color調査レポート Section 6.1_

- [x] 10.2 役割ベースパレット選択の実装
  - PaletteRole型の定義（accent, accentLight, accentDark, secondary, baseMuted等）
  - 各ハーモニータイプ用のRoleConfig定義:
    - COMPLEMENTARY_ROLE_CONFIG
    - TRIADIC_ROLE_CONFIG
    - ANALOGOUS_ROLE_CONFIG
    - SPLIT_COMPLEMENTARY_ROLE_CONFIG
    - MONOCHROMATIC_ROLE_CONFIG
    - SHADES_ROLE_CONFIG
    - COMPOUND_ROLE_CONFIG
  - stepOffset による明度バリエーション生成
  - **Creates:** `src/core/accent/palette-role.ts`, `src/core/accent/palette-role.test.ts`
  - _Requirements: Adobe Color調査レポート Section 6.2_

- [x] 10.3 HarmonyPaletteGenerator の新タイプ対応
  - generateMonochromaticPalette()の実装（同一色相・異なるステップ）
  - generateShadesPalette()の実装（同一色相・段階的明度変化）
  - generateCompoundPalette()の実装（類似色+補色）
  - 役割ベース選択との統合
  - STEP_TARGETS定義（明度分布: 500, 300, 700, 800等）
  - **Modifies:** `src/core/accent/harmony-palette-generator.ts`, `src/core/accent/harmony-palette-generator.test.ts`
  - _Requirements: Adobe Color調査レポート Section 7_

- [x] 10.4 HarmonyTypeCard の新タイプ対応
  - HARMONY_TYPE_CARD_CONFIGS に3タイプ追加:
    - monochromatic: 「モノクロマティック」「同一色相で彩度・明度を変化」
    - shades: 「シェード」「同一色相で明度のみを変化」
    - compound: 「コンパウンド」「類似色と補色のハイブリッド」
  - プレビュースウォッチ（3色）の対応
  - **Modifies:** `src/ui/accent-selector/harmony-type-card.ts`, `src/ui/accent-selector/harmony-type-card.test.ts`
  - _Requirements: Adobe Color調査レポート Section 2_

- [x] 10.5 harmony-view.ts の新タイプ対応
  - loadCardPreviews() に3タイプ追加
  - カードモードで7種類のハーモニーカード表示
  - **Modifies:** `src/ui/demo/views/harmony-view.ts`
  - _Requirements: UI対応_

- [x] 10.6 index.ts の harmonyNames Record 更新
  - 新3タイプの日本語名追加:
    - monochromatic: 「モノクロマティック」
    - shades: 「シェード」
    - compound: 「コンパウンド」
  - TypeScriptビルドエラー解消
  - **Modifies:** `src/ui/demo/index.ts`
  - _Requirements: TypeScript型安全性_

- [x] 10.7 ユニットテストの追加・更新
  - harmony-filter-calculator.test.ts: 新3タイプの色相計算テスト
  - harmony-palette-generator.test.ts: 新ジェネレータのテスト
  - harmony-type-card.test.ts: 7カード+詳細選択カードのテスト
  - 全85テストケース合格確認
  - _Requirements: テストカバレッジ維持_

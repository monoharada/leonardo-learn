# Implementation Plan

## Task 1: Core層 - セマンティックロールマッピング基盤

- [x] 1. Core層 - セマンティックロールマッピング基盤構築

- [x] 1.1 (P) HueNameNormalizer関数群を実装する
  - DADS_CHROMAS.displayNameからDadsColorHueへの変換ロジックを作成
  - DADS_CHROMAS.nameからDadsColorHueへの変換ロジックを作成（chromaNameToDadsHue）
  - 既存のgetDadsHueFromDisplayName関数を活用
  - 変換不能な場合はundefinedを返却
  - ユニットテスト: 全10色相の正規化が正しく動作することを検証
  - ユニットテスト: 未知の表示名でundefinedが返ることを検証
  - _Requirements: 1.2_

- [x] 1.2 SemanticRoleMapper関数群を実装する
  - RoleCategory型とSemanticRole型を定義
  - generateRoleMapping(palettes, harmonyType)でDADS判定を含むマッピング生成
  - ハーモニー種別がDADS（HarmonyType.DADS）の場合のみマッピング生成（DADS以外は空Mapを返却）
  - **DADSセマンティックロール**: DADS_COLORSから直接マッピング生成、キー形式「${dadsHue}-${scale}」
  - **ブランドロール**: state.shadesPalettesからname === "Primary"/"Secondary"のパレットを検索し、キー「brand」に全ブランドロールを配列として集約
  - chromaName→displayName→DadsColorHueの正規化フローを実装
  - 計算時間200ms以内を保証
  - lookupRoles関数で特定hue-scaleのDADSロールを検索可能にする
  - lookupBrandRoles関数で「brand」キーから全ブランドロール配列を取得可能にする
  - ユニットテスト: DADS_COLORSから正しいマッピングが生成されること
  - ユニットテスト: ブランドロールが「brand」キーに集約されること
  - ユニットテスト: hue-scaleで正しいロールが返却されること
  - ユニットテスト: DADS以外のハーモニー種別では空マッピングが返ること
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1_

## Task 2: UI層 - ドットインジケーターとバッジラベル

- [ ] 2. UI層 - 視覚的インジケーターコンポーネント実装

- [x] 2.1 (P) RoleDotIndicator関数を実装する
  - ROLE_CATEGORY_COLORS定数を定義（Primary/Secondary/Accent/Semantic/Link）
  - createRoleDot関数で直径12pxの円形ドットを生成
  - カテゴリに応じた背景色を適用
  - 白い境界線（2px）とドロップシャドウを適用
  - position: absoluteで右上配置（top: 4px, right: 4px）
  - pointer-events: noneで操作を透過
  - z-index: 10で既存バッジより上に配置
  - ユニットテスト: カテゴリに応じた正しい色のドットが生成されること
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 4.3_

- [x] 2.2 (P) RoleBadgeLabel関数群を実装する
  - createRoleBadges関数でバッジコンテナを生成
  - createSingleBadge関数で個別バッジを生成
  - フォントサイズ9px、ウェイト600、角丸3px、白文字
  - カテゴリに応じた背景色を適用
  - 長いテキストは省略記号（...）で切り詰め（max-width: 60px）
  - 最大2つまで表示、3つ以上は「+N」形式（createOverflowBadge）
  - position: absoluteで左下配置（bottom: 4px, left: 4px）
  - flexbox columnでバッジを縦スタック
  - pointer-events: noneで操作を透過
  - z-index: 10で適切な重なり順を確保
  - ユニットテスト: 複数ロール時に最大2つ+「+N」形式で表示されること
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3_

## Task 3: UI層 - オーバーレイ統括とアクセシビリティ

- [x] 3. UI層 - SemanticRoleOverlay統括コンポーネント実装

- [x] 3.1 SemanticRoleOverlay関数群を実装する
  - applyOverlay関数でスウォッチにドット・バッジを追加
  - RoleDotIndicatorとRoleBadgeLabelを呼び出し
  - ロール配列が空の場合は何も追加しない
  - 既存CSSとの競合を回避（position: relativeがスウォッチに必要）
  - ユニットテスト: 空配列の場合にオーバーレイが追加されないこと
  - _Requirements: 4.2, 5.2_

- [x] 3.2 ツールチップ結合機能を実装する
  - mergeTooltipContent関数で既存title属性とロール情報を結合
  - フォーマット: 「${existingTitle}\n---\nセマンティックロール:\n${role.fullName}」
  - 既存title属性（HEX/トークン名）を保持しながらロール情報を追記
  - ユニットテスト: 既存titleとロール情報が正しく結合されること
  - _Requirements: 4.1_

- [x] 3.3 アクセシビリティ対応を実装する
  - createAccessibleDescription関数でスクリーンリーダー用説明要素を生成
  - ID形式: DADSシェードは「swatch-{dadsHue}-{scale}-desc」
  - ID形式: ブランドロールは「swatch-brand-desc」（単一キーで全ブランドロールを集約）
  - スウォッチにaria-describedby属性を設定
  - スウォッチにtabindex="0"を設定してキーボードフォーカス可能に
  - ユニットテスト: 一意のIDと正しいテキストが生成されること
  - _Requirements: 4.1_

## Task 4: 統合 - renderShadesViewへの組み込み

- [ ] 4. 統合 - 既存シェードビューへのオーバーレイ統合

- [x] 4.1 スウォッチにdata属性とdata-testidを追加する
  - renderDadsHueSectionのスウォッチ生成時にdata-hue属性を設定（colorScale.hueをそのまま使用、DadsColorHue値）
  - renderDadsHueSectionのスウォッチ生成時にdata-scale属性を設定（スケール値）
  - E2Eテスト用にdata-testid="swatch-{hue}-{scale}"を追加
  - renderBrandColorSectionのスウォッチにdata-testid="swatch-brand"を追加
  - _Requirements: 5.2_

- [x] 4.2 renderShadesViewにロールマッピング生成を統合する
  - generateRoleMapping(state.shadesPalettes, harmonyType)を呼び出し
  - ハーモニー種別がDADS以外の場合は空Mapが返却されるのでオーバーレイ表示なし
  - DADS_COLORSから直接マッピングを生成
  - ブランドロールはstate.shadesPalettesからname === "Primary"/"Secondary"のパレットを検索
  - _Requirements: 1.1_

- [x] 4.3 renderDadsHueSectionにオーバーレイ適用を統合する
  - 各スウォッチループ内でcolorScale.hue（既にDadsColorHue値）を使用
  - lookupRolesでスウォッチに対応するDADSセマンティックロールのみを取得
  - **ブランドロールはDADSスウォッチには表示しない**（設計書準拠）
  - applyOverlayでドット・バッジを適用
  - CVDシミュレーションモード時はドット・バッジ色を固定維持
  - 統合テスト: スウォッチにドット・バッジが追加されること
  - 統合テスト: CVDシミュレーション時にドット・バッジ色が固定されること
  - _Requirements: 2.1, 2.4, 3.1, 4.3_

- [x] 4.4 renderBrandColorSectionにブランドロール表示を統合する
  - ブランドカラースウォッチにオーバーレイを適用
  - lookupBrandRolesで「brand」キーから全ブランドロール配列を取得
  - 全ブランドロール（Primary/Secondary等）をバッジ表示
  - DADSシェードと同様のドット・バッジ表示スタイルを適用
  - 統合テスト: ブランドスウォッチに全ブランドロールが表示されること
  - _Requirements: 1.3_

## Task 5: E2Eテストとパフォーマンス検証

- [ ] 5. 品質保証 - E2Eテストとパフォーマンス検証

- [ ] 5.1 (P) E2Eテストを実装する
  - data-testid属性を使用した安定したセレクタでテスト実装
  - シェードビュー表示時にセマンティックロール割り当てシェードにドットが表示されること
  - ホバー時にツールチップが表示されること（既存情報+ロール情報）
  - スクリーンリーダーでロール情報が読み上げられること（aria-describedby検証）
  - キーボード操作（Tab）でスウォッチ間を移動できること
  - ブランドスウォッチにブランドロールのみ表示されること
  - DADS以外のハーモニー種別ではセマンティックロール表示がないこと
  - _Requirements: 1.1, 4.1_

- [ ] 5.2 (P) パフォーマンステストを実装する
  - 10色相×13スケール（130シェード）のマッピング生成が200ms以内であること
  - DOM追加によるレンダリングブロッキングがないこと
  - _Requirements: 5.1, 5.2_


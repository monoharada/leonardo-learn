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

- [x] 1.2 SemanticRoleMapper関数群を実装する（**再実装完了**）
  - RoleCategory型とSemanticRole型を定義
  - generateRoleMapping(palettes, harmonyType)でDADS判定を含むマッピング生成
  - ハーモニー種別がDADS（HarmonyType.DADS）の場合のみマッピング生成（DADS以外は空Mapを返却）
  - **DADSセマンティックロール**: DADS_COLORSから直接マッピング生成、キー形式「${dadsHue}-${scale}」
  - **ブランドロール（hue-scale特定可能時）**: state.shadesPalettesからname === "Primary"/"Secondary"のパレットを検索し、baseChromaNameとstepが存在する場合は「${dadsHue}-${scale}」キーに統合（DADSロールと同一キーにマージ）
  - **ブランドロール（hue-scale特定不可時）**: baseChromaName/stepが無い場合は「brand-unresolved」キーに集約（欄外情報のみ表示用）
  - chromaName→displayName→DadsColorHueの正規化フローを実装
  - 計算時間200ms以内を保証
  - lookupRoles(dadsHue, scale)関数で特定hue-scaleの全ロール（DADS+ブランド統合済み）を検索可能にする
  - lookupUnresolvedBrandRoles()関数で「brand-unresolved」キーからhue-scale不定のブランドロール配列を取得
  - ユニットテスト: DADS_COLORSから正しいマッピングが生成されること
  - ユニットテスト: hue-scale特定可能なブランドロールが該当DADSキーに統合されること
  - ユニットテスト: hue-scale特定不可なブランドロールが「brand-unresolved」に集約されること
  - ユニットテスト: lookupRolesでDADS+ブランド統合済みロールが返却されること
  - ユニットテスト: DADS以外のハーモニー種別では空マッピングが返ること
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1_

## Task 2: UI層 - ドットインジケーターとバッジラベル（旧実装）

- [x] 2. UI層 - 視覚的インジケーターコンポーネント実装（旧実装・Task 10で置き換え）

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

- [x] 3.3 アクセシビリティ対応を実装する（**再実装完了**）
  - createAccessibleDescription関数でスクリーンリーダー用説明要素を生成
  - **ID形式（新仕様）**: DADSシェードは「swatch-{dadsHue}-{scale}-desc」
  - **ブランドロール（hue-scale特定可能時）**: 該当DADSシェードのID（swatch-{dadsHue}-{scale}-desc）にロール情報をマージ（専用ID不使用）
  - **ブランドロール（hue-scale特定不可時）**: ARIA ID不要（欄外情報のみで表示、スウォッチ円形化なし）
  - **廃止**: `swatch-brand-desc`形式のIDは使用しない
  - スウォッチにaria-describedby属性を設定（hue-scale特定可能なロールのみ）
  - スウォッチにtabindex="0"を設定してキーボードフォーカス可能に
  - ユニットテスト: DADSシェードに一意のIDと正しいテキストが生成されること
  - ユニットテスト: hue-scale特定可能ブランドロールが該当DADSシェードIDにマージされること
  - ユニットテスト: hue-scale特定不可ブランドロールにARIA IDが生成されないこと
  - _Requirements: 4.1_

## Task 4: 統合 - renderShadesViewへの組み込み（旧実装）

- [x] 4. 統合 - 既存シェードビューへのオーバーレイ統合（旧実装・Task 10で置き換え）

- [x] 4.1 スウォッチにdata属性とdata-testidを追加する
  - renderDadsHueSectionのスウォッチ生成時にdata-hue属性を設定（colorScale.hueをそのまま使用、DadsColorHue値）
  - renderDadsHueSectionのスウォッチ生成時にdata-scale属性を設定（スケール値）
  - E2Eテスト用にdata-testid="swatch-{hue}-{scale}"を追加
  - renderBrandColorSectionのスウォッチにdata-testid="swatch-brand"を追加
  - _Requirements: 5.2_

- [x] 4.2 renderShadesViewにロールマッピング生成を統合する（**実装完了**）
  - generateRoleMapping(state.shadesPalettes, harmonyType)を呼び出し
  - ハーモニー種別がDADS以外の場合は空Mapが返却されるのでオーバーレイ表示なし
  - DADS_COLORSから直接マッピングを生成
  - **ブランドロール（hue-scale特定可能時）**: 該当する「${dadsHue}-${scale}」キーに統合済み
  - **ブランドロール（hue-scale特定不可時）**: lookupUnresolvedBrandRoles()で取得し欄外表示用に保持
  - _Requirements: 1.1_

- [x] 4.3 renderDadsHueSectionにオーバーレイ適用を統合する（**実装完了**）
  - 各スウォッチループ内でcolorScale.hue（既にDadsColorHue値）を使用
  - lookupRoles(dadsHue, scale)でDADS+ブランド統合済みロールを取得
  - **hue-scale特定可能なブランドロールはDADSスウォッチに統合表示**（設計書準拠）
  - applyOverlayでドット・バッジを適用（旧実装）→ Task 10で円形化に置き換え
  - CVDシミュレーションモード時はドット・バッジ色を固定維持
  - 統合テスト: スウォッチにドット・バッジが追加されること
  - 統合テスト: hue-scale特定可能ブランドロールが該当DADSスウォッチに表示されること
  - 統合テスト: CVDシミュレーション時にドット・バッジ色が固定されること
  - _Requirements: 2.1, 2.4, 2.6, 3.1, 4.3_

~~- [x] 4.4 renderBrandColorSectionにブランドロール表示を統合する（**削除**）~~
  - ~~ブランドスウォッチ自体へのロール表示は不要（設計変更により廃止）~~
  - ~~hue-scale特定可能時: DADSスウォッチに統合表示~~
  - ~~hue-scale特定不可時: 欄外情報のみで表示~~
  - ~~_Requirements: 1.3_~~

## Task 5: E2Eテストとパフォーマンス検証（旧実装）

- [x] 5. 品質保証 - E2Eテストとパフォーマンス検証（旧実装・Task 11で更新）

- [x] 5.1 (P) E2Eテストを実装する
  - data-testid属性を使用した安定したセレクタでテスト実装
  - シェードビュー表示時にセマンティックロール割り当てシェードにドットが表示されること
  - ホバー時にツールチップが表示されること（既存情報+ロール情報）
  - スクリーンリーダーでロール情報が読み上げられること（aria-describedby検証）
  - キーボード操作（Tab）でスウォッチ間を移動できること
  - ブランドスウォッチにブランドロールのみ表示されること
  - DADS以外のハーモニー種別ではセマンティックロール表示がないこと
  - _Requirements: 1.1, 4.1_

- [x] 5.2 (P) パフォーマンステストを実装する
  - 10色相×13スケール（130シェード）のマッピング生成が200ms以内であること
  - DOM追加によるレンダリングブロッキングがないこと
  - _Requirements: 5.1, 5.2_

---

## Task 6: Core層 - コントラスト境界計算

- [x] 6. Core層 - コントラスト境界計算機能を実装する

- [x] 6.1 (P) ContrastBoundaryCalculator関数群を実装する
  - ContrastBoundaryResult型を定義（white3to1, white4_5to1, black4_5to1, black3to1）
  - calculateBoundaries関数で色スケール配列からコントラスト境界位置を計算
  - findWhiteBoundary関数で白背景に対する境界を検索（scale昇順で走査、初めて閾値を超える位置）
  - findBlackBoundary関数で黒背景に対する境界を検索（scale降順で走査、初めて閾値を超える位置）
  - culori.jsのwcagContrast関数を使用してWCAG 2.x相対輝度アルゴリズムで計算
  - 閾値: 3.0（AA Large）、4.5（AA Normal）
  - 境界が存在しない場合はnullを返却
  - ユニットテスト: 白背景に対する3:1、4.5:1境界が正しく計算されること
  - ユニットテスト: 黒背景に対する4.5:1、3:1境界が正しく計算されること
  - ユニットテスト: 境界が存在しない色スケールでnullが返ること
  - _Requirements: 6.2, 6.3, 6.6_

## Task 7: UI層 - スウォッチ円形化とラベル表示

- [x] 7. UI層 - CircularSwatchTransformerコンポーネントを実装する

- [x] 7.1 CSSクラスを定義する
  - components.cssに.dads-swatch--circularクラスを追加（border-radius: 50%）
  - .dads-swatch__role-labelクラスを追加（中央配置、pointer-events: none）
  - 円形スウォッチ内のscaleラベル・hexラベルを非表示にするスタイル
  - サイズは隣接する四角形スウォッチと同等を維持
  - _Requirements: 2.1, 2.5_

- [x] 7.2 (P) ロールラベル短縮名生成機能を実装する
  - CATEGORY_SHORT_LABELS定数を定義（primary: "P", secondary: "S", accent: "A", link: "L"）
  - SEMANTIC_SUBTYPE_LABELS定数を定義（success: "Su", error: "E", warning: "W"）
  - ROLE_PRIORITY定数を定義（primary > secondary > accent > semantic > link）
  - getShortLabel関数でカテゴリとサブタイプから短縮ラベルを取得
  - Accentが複数ある場合はA1、A2等の番号付きラベル
  - selectPriorityRole関数で複数ロールから中央ラベル表示用の優先ロールを選択
  - ユニットテスト: 各カテゴリで正しい短縮ラベルが返ること
  - ユニットテスト: semanticカテゴリでサブタイプに応じた正しいラベル（Su/E/W）が返ること
  - ユニットテスト: 複数ロール時に優先順位に従ったロールが選択されること
  - _Requirements: 2.2_

- [x] 7.3 (P) テキスト色自動調整機能を実装する
  - getContrastTextColor関数で背景色に対する最適なテキスト色（黒/白）を取得
  - wcagContrast計算で4.5:1以上を確保する色を選択
  - 明るい背景→黒文字、暗い背景→白文字
  - ユニットテスト: 明るい背景で黒が返ること
  - ユニットテスト: 暗い背景で白が返ること
  - _Requirements: 2.3_

- [x] 7.4 transformToCircle関数を実装する（**実装完了**）
  - スウォッチ要素に.dads-swatch--circularクラスを追加
  - 中央ラベル要素を生成してスウォッチに追加
  - getContrastTextColorでテキスト色を動的設定（インラインstyle）
  - セマンティックロールがない場合は四角形スウォッチを維持
  - 統合テスト: ロール割り当てスウォッチが円形になること
  - 統合テスト: 中央にラベルが表示されること
  - 統合テスト: ラベル文字色が背景に応じて変わること
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

## Task 8: UI層 - 欄外ロール情報表示

- [x] 8. UI層 - ExternalRoleInfoBarコンポーネントを実装する

- [x] 8.1 CSSクラスを定義する
  - components.cssに.dads-role-info-barクラスを追加（パレット下部に配置）
  - .dads-role-info-itemクラスを追加（font-size: 11px, font-weight: 500, border-radius: 4px, padding: 2px 8px, color: white）
  - .dads-role-connectorクラスを追加（スウォッチと情報バーの縦線接続）
  - .dads-unresolved-roles-barクラスを追加（hue-scale不定ロール専用バー、シェードビュー先頭に1回のみ表示）
  - .dads-unresolved-roles-bar__labelクラスを追加（「未解決ロール:」ラベル用、font-size: 11px, font-weight: 600, color: #666）
  - pointer-events: noneで操作を透過
  - _Requirements: 3.3, 4.2_

- [x] 8.2 (P) RoleInfoItem型とロール情報要素生成関数を実装する
  - RoleInfoItem型を定義（role, scale, swatchElement）※全て必須
  - UnresolvedRoleItem型を定義（roleのみ、scale/swatchElementなし）
  - createRoleBadge関数でロールバッジ要素を生成（共通スタイル適用、scale任意）
  - createRoleInfoElement関数でRoleInfoItem用の完全な情報要素を生成（scale表示あり）
  - ロール名（例: "Primary", "Accent-Blue"）を完全表示
  - カテゴリに応じた背景色バッジ（ROLE_CATEGORY_COLORS使用）
  - ユニットテスト: ロール情報要素が正しいスタイルで生成されること
  - ユニットテスト: createRoleBadgeがscaleなしでも動作すること
  - _Requirements: 3.2_

- [x] 8.3 (P) renderConnector関数を実装する
  - スウォッチから情報バーへの縦線コネクタを生成
  - スウォッチの中央下部から情報バーまでの視覚的接続
  - RoleInfoItemは必ずswatchElementを持つため、常にコネクタ生成可能
  - ユニットテスト: コネクタ要素が正しい位置に生成されること
  - _Requirements: 3.4_

- [x] 8.4 renderRoleInfoBar関数を実装する（**実装完了**）
  - 欄外ロール情報バーコンテナを生成
  - hue-scale特定可能なRoleInfoItemをスウォッチ位置に対応して水平配置
  - 同一色相に複数ロールがある場合は全て水平表示
  - 各roleItemに対応するコネクタを生成
  - 統合テスト: 欄外にロール情報が完全表示されること
  - 統合テスト: 同一色相の複数ロールが水平に並ぶこと
  - _Requirements: 3.1, 3.5_

- [x] 8.5 renderUnresolvedRolesBar関数を実装する（**実装済み**）
  - **hue-scale特定不可のブランドロール専用バーを生成**
  - **シェードビュー全体で1回のみ表示**（最初の色相セクションの前に配置）
  - コネクタなし、左揃えで水平配置
  - **各ロール表示はcreateRoleBadge関数を使用**（カテゴリ色バッジ・11px・角丸4px等、scaleなし）
  - 先頭に「未解決ロール:」ラベルを表示（.dads-unresolved-roles-bar__labelクラス適用）
  - ユニットテスト: 未解決ロールバーが正しく生成されること
  - ユニットテスト: 各ロール要素が通常RoleInfoItemと同等のスタイルであること
  - ユニットテスト: 複数の未解決ロールが水平に並ぶこと
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

## Task 9: UI層 - コントラスト境界表示

- [x] 9. UI層 - ContrastBoundaryIndicatorコンポーネントを実装する

- [x] 9.1 CSSクラスを定義する
  - components.cssに.dads-contrast-boundaryクラスを追加（境界ピルコンテナ）
  - .dads-contrast-pillクラスを追加（共通ピルスタイル: border-radius: 9999px, font-size: 10px, padding: 2px 8px）
  - .dads-contrast-pill--outlineクラスを追加（白抜き: border: 1px solid #333, background: transparent, color: #333）
  - .dads-contrast-pill--filledクラスを追加（黒塗り: background: #333, color: white）
  - _Requirements: 6.4_

- [x] 9.2 (P) createBoundaryPill関数を実装する（**実装完了**）
  - BoundaryPillConfig型を定義（scale, label, style, direction）
  - 白背景用ピル: 「3:1→」「4.5:1→」（outlineスタイル、start方向）
  - 黒背景用ピル: 「←4.5:1」「←3:1」（filledスタイル、end方向）
  - 対応するscaleの下部に配置（左端/右端は方向に応じる）
  - ユニットテスト: 白抜きピルが正しいスタイルで生成されること
  - ユニットテスト: 黒塗りピルが正しいスタイルで生成されること
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 9.3 renderBoundaryPills関数を実装する（**実装完了**）
  - ContrastBoundaryResultから4種類のピルを生成
  - scaleElements（scale→DOM要素のマップ）から位置を参照
  - 境界がnullの場合は該当ピルを非表示
  - 統合テスト: 白背景境界ピルが正しいscale位置に表示されること
  - 統合テスト: 黒背景境界ピルが正しいscale位置に表示されること
  - 統合テスト: 境界がない場合にピルが表示されないこと
  - _Requirements: 6.1, 6.5_

## Task 10: 統合 - 新UIをrenderShadesViewに組み込み

- [ ] 10. 統合 - 円形スウォッチ・欄外情報・コントラスト境界をシェードビューに統合する

- [ ] 10.1 SemanticRoleOverlayを新UIコンポーネントに切り替える
  - applyOverlay関数をCircularSwatchTransformerベースに更新
  - **旧RoleDotIndicator/RoleBadgeLabelの呼び出しを削除**
  - 円形化とラベル表示の新ロジックを適用
  - 既存のツールチップ結合・アクセシビリティ機能は維持
  - **hue-scale特定可能なブランドロールは該当DADSスウォッチに統合表示**（円形化対象）
  - 統合テスト: 旧ドット・バッジが表示されないこと
  - 統合テスト: 新円形スウォッチとラベルが表示されること
  - 統合テスト: ブランドロール（hue-scale特定可能）が該当DADSスウォッチで円形化されること
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2_

- [ ] 10.2 renderShadesViewにhue-scale不定ロールバーを追加する
  - **最初の色相セクションの前**にExternalRoleInfoBar.renderUnresolvedRolesBarを呼び出し
  - lookupUnresolvedBrandRoles()でhue-scale不定のブランドロールを取得
  - **シェードビュー全体で1回のみ表示**（各色相セクションでの繰り返し表示は行わない）
  - **各ロール要素は通常RoleInfoItemと同等のスタイル**（要件3.2/3.3準拠）
  - 未解決ロールが存在しない場合はバーを非表示
  - 統合テスト: hue-scale不定ロールがシェードビュー先頭に1回だけ表示されること
  - 統合テスト: 各ロール要素が通常RoleInfoItemと同等のスタイルであること
  - 統合テスト: 未解決ロールがない場合にバーが表示されないこと
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 10.3 renderDadsHueSectionに欄外ロール情報バーを追加する
  - 各色相セクションの直後にExternalRoleInfoBar.renderRoleInfoBarを呼び出し
  - ロールが割り当てられたスウォッチからRoleInfoItemを収集
  - **hue-scale特定可能なブランドロールも対象に含める**（該当DADSスウォッチと連携）
  - **hue-scale特定不可ロールはTask 10.2で処理済みのため、ここでは除外**
  - セクション要素の子としてロール情報バーを追加
  - 統合テスト: 色相セクション下部に欄外ロール情報が表示されること
  - 統合テスト: hue-scale特定可能ブランドロールがコネクタ付きで表示されること
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 10.4 renderDadsHueSectionにコントラスト境界表示を追加する
  - 各色相セクションでContrastBoundaryCalculator.calculateBoundariesを呼び出し
  - ContrastBoundaryIndicator.renderBoundaryPillsで境界ピルを生成
  - セクション要素の子としてコントラスト境界インジケーターを追加
  - 統合テスト: 各色相セクションにコントラスト境界ピルが表示されること
  - _Requirements: 6.1, 6.5_

- [ ] 10.5 CVDシミュレーション時の表示を調整する
  - 欄外ロール情報のカテゴリ色は固定（シミュレーション適用外）
  - コントラスト境界ピルの色は固定（シミュレーション適用外）
  - スウォッチ自体のみシミュレーション色を表示
  - 統合テスト: CVDモード時に欄外情報とピルの色が固定されること
  - _Requirements: 4.3_

## Task 11: E2Eテストと品質保証

- [ ] 11. 品質保証 - 新UIのE2Eテストとパフォーマンス検証

- [ ] 11.1 旧E2Eテストを新UI仕様に更新する
  - **Task 5.1の「ドット表示」テストを「円形スウォッチ」テストに置換**
  - **旧仕様の「ブランドスウォッチにブランドロールのみ表示」を削除**（brandスウォッチへの表示は廃止）
  - 不要になった旧UIセレクタ（ドット、バッジ関連）を削除
  - 新UI要素のセレクタ（円形スウォッチ、欄外情報、コネクタ、ピル）に置換
  - _Requirements: 2.1, 2.2, 4.1_

- [ ] 11.2 (P) 円形スウォッチのE2Eテストを実装する
  - セマンティックロール割り当てスウォッチが円形表示されること
  - 円形スウォッチの中央にラベル（P/S/Su/E/W/A/L等）が表示されること
  - ロールがないスウォッチは四角形のままであること
  - **hue-scale特定可能なブランドロール（Primary/Secondary）も該当DADSスウォッチで円形化されること**
  - _Requirements: 2.1, 2.2, 2.4, 2.6_

- [ ] 11.3 (P) 欄外ロール情報のE2Eテストを実装する
  - 欄外にロール名が見切れなく完全表示されること
  - 円形スウォッチから欄外ロール情報への視覚的接続（コネクタ線）があること
  - 同一色相に複数ロールがある場合に水平に並ぶこと
  - **hue-scale特定不可ブランドロールはシェードビュー先頭に1回だけ表示、コネクタなし**
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 11.4 (P) コントラスト境界のE2Eテストを実装する
  - コントラスト境界ピル（3:1→、4.5:1→、←4.5:1、←3:1）が正しいscale位置に表示されること
  - 白背景用ピルは白抜きスタイルであること
  - 黒背景用ピルは黒塗りスタイルであること
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 11.5 パフォーマンステストを更新する
  - マッピング計算 + コントラスト境界計算が200ms以内であること
  - DOM追加（円形スウォッチ + 欄外情報 + 境界ピル）によるレンダリングブロッキングがないこと
  - 既存パフォーマンステストを新UI構造に合わせて更新
  - _Requirements: 5.1, 5.2_

- [ ] 11.6 アクセシビリティテストを更新する
  - 円形スウォッチにaria-describedbyでロール情報が関連付けられること
  - **hue-scale特定可能ブランドロールが該当DADSシェードのARIA説明にマージされること**
  - **hue-scale特定不可ブランドロールにはARIA IDが付与されないこと**
  - スクリーンリーダーで円形スウォッチのロール情報が読み上げられること
  - キーボード操作（Tab）で円形スウォッチ間を移動できること
  - _Requirements: 4.1_

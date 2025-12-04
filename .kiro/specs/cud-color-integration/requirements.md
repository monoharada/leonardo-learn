# Requirements Document

## Introduction

DADSハーモニーにCUD（カラーユニバーサルデザイン）推奨配色セットver.4を統合する。CUD 20色をOKLCH/OKLabベースでデータ化し、任意パレットをCUD/公的ガイドライン観点で自動検証するAPI・UIを提供する。

本機能により、色覚多様性への対応が暗黙知ではなく、検証可能な形でプロダクトに組み込まれる。

## Requirements

### Requirement 1: CUDカラーデータ管理

**Objective:** As a デザインシステム利用者, I want CUD推奨配色セット20色を正確なデータとして参照したい, so that 色覚多様性に配慮したパレット設計の基準として活用できる

#### Acceptance Criteria

1. The CUD Color Registry shall CUD ver.4の20色（アクセント9色、ベース7色、無彩色4色）を定数として保持する
2. The CUD Color Registry shall 各色についてid、group、nameJa、nameEn、hex、rgb、oklch、oklabの全プロパティを提供する
3. When HEX値が入力された場合, the CUD Color Registry shall OKLCH/OKLab値を自動計算してキャッシュする
4. The CUD Color Registry shall `CUD_COLOR_SET`配列として全20色をエクスポートする
5. The CUD Color Registry shall グループ別の統計情報（lRange、cRange、hueMean、hueStd）を`computeOklchStats`関数で提供する

### Requirement 2: CUDカラーサービスAPI

**Objective:** As a 開発者, I want CUDカラーセットを検索・比較するAPIを利用したい, so that 任意の色とCUD推奨色との関係を判定できる

#### Acceptance Criteria

1. The CUD Palette Service shall `getCudColorSet()`で全20色を取得できる
2. The CUD Palette Service shall `getCudColorsByGroup(group)`でグループ別に色を取得できる
3. When HEX値が指定された場合, the CUD Palette Service shall `findExactCudColorByHex`でCUD色との完全一致を判定する
4. When HEX値が指定された場合, the CUD Palette Service shall `findNearestCudColor`で最も近いCUD色とΔE（OKLab距離）を返す
5. The CUD Palette Service shall 入力HEXを正規化（大文字/小文字、#有無）して比較する
6. The CUD Palette Service shall ΔE閾値として≤0.03を「ほぼ一致」、0.03-0.06を「近似」、>0.06を「逸脱」と判定する

### Requirement 3: CVDシミュレーション

**Objective:** As a アクセシビリティ担当者, I want 色覚特性（P/D型）をシミュレーションしたい, so that 色覚多様性のある利用者にとっての見え方を確認できる

#### Acceptance Criteria

1. The CVD Simulator shall `simulateCvd(hex, type)`でprotan/deutan型のシミュレーション結果を返す
2. When CVDシミュレーションが実行された場合, the CVD Simulator shall sRGB空間でBrettel行列を適用し、結果をOKLab/OKLCHに変換して返す
3. The CVD Simulator shall シミュレーション結果としてhex、oklab、oklchの3形式を提供する
4. Where tritan型サポートが将来追加される場合, the CVD Simulator shall オプションで有効化できる拡張ポイントを確保する

### Requirement 4: パレット検証エンジン

**Objective:** As a デザイナー, I want パレットをCUD/公的ガイドライン観点で自動検証したい, so that アクセシビリティ上の問題を早期に発見できる

#### Acceptance Criteria

1. The Palette Checker shall `checkPaletteAgainstCudGuidelines(colors, options)`でパレット全体を検証する
2. The Palette Checker shall 検証結果として`ok`（合否）、`summary`（概要）、`issues`（問題リスト）を返す
3. The Palette Checker shall 各issueに`type`、`severity`（info/warning/error）、`message`、`colors`、`details`を含める
4. When パレット色がCUDセットに存在しない場合, the Palette Checker shall `not_in_cud_set`issueを発行し、最近接色とΔEをdetailsに含める
5. When text/accent役割の色と背景のコントラスト比が4.5:1未満の場合, the Palette Checker shall `low_contrast`issueを発行する
6. When `assumeSmallText`オプションまたは`context=chart`の場合, the Palette Checker shall コントラスト閾値を7:1に引き上げて`small_text_low_contrast`を検出する
7. When 一般色覚でΔE≥0.15かつCVD後でΔE<0.10の色ペアが存在する場合, the Palette Checker shall `cvd_confusion_risk`issueを発行する
8. When 同一色相クラスター・同一明度バケット・ΔE<0.04のペアが存在する場合, the Palette Checker shall `too_many_similar_hues`issueを発行する
9. When role指定がCUDグループと大きく乖離している場合, the Palette Checker shall `ambiguous_role`issueを発行する
10. When パレットがCUD良い例パターン（暖色アクセント+寒色ベース、明度差≥0.2）に合致する場合, the Palette Checker shall `cud_good_example_like`infoを発行する

### Requirement 5: 色相・明度分類

**Objective:** As a パレット検証システム, I want 色を色相クラスターと明度バケットに分類したい, so that 類似色の検出と役割判定ができる

#### Acceptance Criteria

1. The Color Classifier shall OKLCH色相値から9つのHueCluster（warm_red_orange、yellow、yellow_green、green、cyan_sky、blue、magenta_purple、brown、neutral）に分類する
2. When 彩度(c)が0.03未満の場合, the Color Classifier shall 色を`neutral`クラスターに分類する
3. The Color Classifier shall OKLCH明度値から4つのLightnessBucket（very_light≥0.9、light≥0.7、medium≥0.45、dark<0.45）に分類する
4. The Color Classifier shall yellow×yellow_green×high lightnessの組み合わせを特に警告対象とする

### Requirement 6: DADSハーモニーUI統合

**Objective:** As a UIユーザー, I want DADSハーモニー画面でCUD診断結果を確認したい, so that 生成したパレットの色覚多様性対応状況が分かる

#### Acceptance Criteria

1. When DADSモードでパレットが生成された場合, the DADS Harmony UI shall 各色にCUDバッジ（exact/near/off）を表示する
2. The DADS Harmony UI shall `checkPaletteAgainstCudGuidelines`結果を問題/注意/推奨例の3カラムで表示する
3. Where CUDサブモードが選択された場合, the DADS Harmony UI shall 「DADS + CUD安全域ガイド」として表示を切り替える
4. The DADS Harmony UI shall issue数が多い場合にアコーディオン形式で段階的開示する

### Requirement 7: アクセシビリティビュー統合

**Objective:** As a UIユーザー, I want アクセシビリティビューでCVD混同リスクを確認したい, so that 色覚多様性への配慮状況を詳細に把握できる

#### Acceptance Criteria

1. The Accessibility View shall 既存CVDシミュレーションセクションに`cvd_confusion_risk`issueを表示する
2. The Accessibility View shall コントラスト表に「小さい文字基準」切替ボタンを提供する
3. When 「小さい文字基準」がONの場合, the Accessibility View shall 7:1閾値でコントラストを再評価して表示する

### Requirement 8: エクスポート拡張

**Objective:** As a 開発者, I want エクスポートデータにCUDメタ情報を含めたい, so that 外部ツールでもCUD準拠状況を参照できる

#### Acceptance Criteria

1. When CSS/JSONエクスポートが実行された場合, the Export Module shall 各色に`cudMetadata`（nearestId、deltaE、group）を含める
2. The Export Module shall CUDメタ情報の有無をオプションで切り替え可能にする

### Requirement 9: deltaEok計算

**Objective:** As a 色計算システム, I want OKLab空間でのΔE（色差）を計算したい, so that 知覚的に正確な色差判定ができる

#### Acceptance Criteria

1. The Color Space Utility shall `deltaEok(oklab1, oklab2)`でOKLabユークリッド距離を計算する
2. The Color Space Utility shall 既存の`src/utils/color-space.ts`に関数を追加する
3. The Color Space Utility shall culori.jsのOKLab変換と整合性を保つ

### Requirement 10: テストとドキュメント

**Objective:** As a 開発チーム, I want CUD機能のテストとドキュメントを整備したい, so that 品質を担保し知識を共有できる

#### Acceptance Criteria

1. The Test Suite shall CUD 20色のHEX/RGB/OKLCH値がスナップショットと一致することを検証する
2. The Test Suite shall チェッカーのゴールデンパターン（CUD完全一致→ok、危険組合せ→issue生成）を検証する
3. The Test Suite shall import循環がないことを検証する
4. The Documentation shall `docs/reference/cud-color-set.md`にCUD値の出典URL・変換手順・閾値根拠を記載する

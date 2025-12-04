# Implementation Plan

## Task Overview

CUD（カラーユニバーサルデザイン）推奨配色セット ver.4 をDADSハーモニーに統合するための実装タスク。アーキテクチャはハイブリッドアプローチ（新規 `src/core/cud/` + 既存 utils 拡張）を採用。

---

## Tasks

- [x] 1. ColorSpace ユーティリティ拡張
- [x] 1.1 OKLab変換関数とdeltaEok関数の追加
  - HEX/OKLCHからOKLab形式への変換機能を追加する
  - culori.jsのconverter("oklab")と整合性を保つ
  - OKLab空間でのユークリッド距離（色差）を計算する関数を実装する
  - 計算式: sqrt((L2-L1)² + (a2-a1)² + (b2-b1)²)
  - 戻り値は0以上の数値
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. CUD カラーレジストリ
- [x] 2.1 (P) CUD 20色データの定義
  - アクセント9色、ベース7色、無彩色4色の計20色を定数として定義する
  - 各色にid、group、nameJa、nameEn、hex、rgbプロパティを設定する
  - 公式ガイドブックから正確なHEX/RGB値を使用する
  - グループ別の配列（アクセント、ベース、無彩色）を作成する
  - _Requirements: 1.1, 1.2_

- [x] 2.2 OKLCH/OKLab自動計算とキャッシュ
  - 各色のHEX値からOKLCH/OKLab値を計算してオブジェクトに含める
  - モジュール初期化時に一度だけ計算してキャッシュする
  - readonly配列で不変性を保証する
  - タスク1.1のtoOklab関数に依存
  - _Requirements: 1.3_

- [x] 2.3 全色セットエクスポートと統計関数
  - 全20色を含む配列をエクスポートする
  - グループ別の統計情報（lRange、cRange、hueMean、hueStd）を計算する関数を実装する
  - 統計情報は遅延計算でキャッシュする
  - _Requirements: 1.4, 1.5_

- [x] 3. CUD パレットサービス
- [x] 3.1 基本取得API
  - 全20色を取得する関数を実装する
  - グループ別にフィルタリングする関数を実装する
  - 戻り値はreadonly配列
  - タスク2.2のCUD色データに依存
  - _Requirements: 2.1, 2.2_

- [x] 3.2 完全一致検索
  - HEXでCUD色との完全一致を判定する関数を実装する
  - 入力HEXの正規化（大文字/小文字統一、#有無の吸収）を行う
  - 一致する場合はCUD色を、しない場合はnullを返却する
  - _Requirements: 2.3, 2.5_

- [x] 3.3 最近接色検索
  - 最も近いCUD色を検索する関数を実装する
  - deltaEokを使用して全20色との距離を計算し、最小距離の色を特定する
  - 戻り値にnearest（CUD色）、deltaE（数値）、matchLevel（exact/near/off）を含める
  - 閾値: exact ≤ 0.03、near ≤ 0.06、off > 0.06
  - _Requirements: 2.4, 2.6_

- [x] 4. 色分類器
- [x] 4.1 (P) 色相クラスター分類
  - OKLCH色相値から9つの色相クラスターに分類するロジックを実装する
  - クラスター: warm_red_orange、yellow、yellow_green、green、cyan_sky、blue、magenta_purple、brown、neutral
  - 彩度が0.03未満の場合は強制的にneutralに分類する
  - _Requirements: 5.1, 5.2_

- [x] 4.2 (P) 明度バケット分類
  - OKLCH明度値から4つの明度バケットに分類する
  - バケット: very_light (≥0.9)、light (≥0.7)、medium (≥0.45)、dark (<0.45)
  - _Requirements: 5.3_

- [x] 4.3 総合分類と警告検出
  - 色相・明度の総合分類を返却する関数を実装する
  - yellow × yellow_green × 高明度の組み合わせを特に警告対象としてフラグする
  - 2色が同クラスター・同バケットかを判定する関数を実装する
  - タスク4.1、4.2に依存
  - _Requirements: 5.4_

- [x] 5. CVD シミュレーター拡張
- [x] 5.1 (P) 複数形式シミュレーション関数
  - 既存のCVDシミュレーション機能を内部利用する拡張関数を追加する
  - protan/deutan型のシミュレーション結果をhex、oklab、oklchの3形式で返却する
  - sRGB空間でBrettel行列を適用後、OKLab/OKLCHに変換する
  - tritan型サポートを将来追加できるようオプション引数を設計する
  - タスク1.1のtoOklab関数に依存
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. パレット検証エンジン
- [x] 6.1 検証エンジン基盤
  - パレット全体を検証するエントリポイントを実装する
  - 戻り値としてok（合否）、summary（概要）、issues（問題リスト）を返却する
  - 各issueにtype、severity、message、colors、detailsを含める
  - optionsでcontext（chart/map/ui/text-heavy）とassumeSmallTextを受け付ける
  - タスク3.1、3.3に依存
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6.2 CUDセット外チェック
  - パレット色がCUDセットに存在しない場合、not_in_cud_set issueを発行する
  - detailsに最近接色のidとdeltaEを含める
  - severityはwarning
  - _Requirements: 4.4_

- [x] 6.3 コントラストチェック
  - text/accent役割の色と背景のコントラスト比を検証する
  - 4.5:1未満の場合low_contrast issue（error）を発行する
  - assumeSmallTextまたはcontext=chartの場合、7:1閾値でsmall_text_low_contrastを検出する
  - _Requirements: 4.5, 4.6_

- [x] 6.4 CVD混同リスクチェック
  - 一般色覚でΔE≥0.15かつCVDシミュレーション後でΔE<0.10の色ペアを検出する
  - protan/deutan両タイプでチェックする
  - cvd_confusion_risk issue（warning）を発行し、detailsにシミュレーション結果を含める
  - タスク5.1に依存
  - _Requirements: 4.7_

- [x] 6.5 類似色チェック
  - 同一色相クラスター・同一明度バケット・ΔE<0.04のペアを検出する
  - too_many_similar_hues issue（warning）を発行する
  - yellow × yellow_green × 高明度の組み合わせを重点チェックする
  - タスク4.3に依存
  - _Requirements: 4.8_

- [x] 6.6 役割判定と推奨例チェック
  - role指定がCUDグループと大きく乖離している場合ambiguous_role issue（info）を発行する
  - パレットがCUD良い例パターン（暖色アクセント+寒色ベース、明度差≥0.2）に合致する場合cud_good_example_like infoを発行する
  - _Requirements: 4.9, 4.10_

- [x] 7. DADS ハーモニー UI 統合
- [x] 7.1 CUDバッジ表示
  - DADSモードでパレット生成時、各色にCUDバッジ（exact/near/off）を表示する
  - バッジの色は診断結果に応じて視覚的に区別する
  - タスク3.3に依存
  - _Requirements: 6.1_

- [x] 7.2 診断結果表示
  - パレット検証結果を問題/注意/推奨例の3カラムで表示する
  - issue数が多い場合はアコーディオン形式で段階的開示する
  - タスク6.1に依存
  - _Requirements: 6.2, 6.4_

- [x] 7.3 CUDサブモード
  - CUDサブモードが選択された場合「DADS + CUD安全域ガイド」として表示を切り替える
  - CUD推奨色の範囲をビジュアルガイドとして表示する
  - _Requirements: 6.3_

- [x] 8. アクセシビリティビュー統合
- [x] 8.1 CVD混同リスク表示
  - 既存CVDシミュレーションセクションにcvd_confusion_risk issueを表示する
  - 混同リスクのある色ペアをハイライトする
  - タスク6.4に依存
  - _Requirements: 7.1_

- [x] 8.2 小さい文字基準切替
  - コントラスト表に「小さい文字基準」切替ボタンを追加する
  - ON時は7:1閾値でコントラストを再評価して表示を更新する
  - タスク6.3に依存
  - _Requirements: 7.2, 7.3_

- [x] 9. エクスポート拡張
- [x] 9.1 (P) CUDメタデータオプション
  - エクスポートオプションにincludeCudMetadataを追加する
  - デフォルトはfalseで後方互換性を維持する
  - _Requirements: 8.2_

- [x] 9.2 CUDメタデータ付加
  - オプションがtrueの場合、各色にcudMetadata（nearestId、deltaE、group、matchLevel）を付加する
  - 最近接色検索機能を使用してメタデータを生成する
  - タスク3.3、9.1に依存
  - _Requirements: 8.1_

- [x] 10. テストスイート
- [x] 10.1 CUDカラースナップショットテスト
  - CUD 20色のHEX/RGB/OKLCH値がスナップショットと一致することを検証する
  - 値の変更を検出し、意図しない変更を防止する
  - タスク2.2に依存
  - _Requirements: 10.1_

- [x] 10.2 検証エンジンゴールデンパターンテスト
  - CUD完全一致パレット → ok: trueを確認する
  - 危険な組み合わせ（低コントラスト、CVD混同リスク等）→ 適切なissue生成を確認する
  - 各issueタイプの検出ロジックをカバーする
  - タスク6全体に依存
  - _Requirements: 10.2_

- [x] 10.3 インポート循環検証
  - src/core/cud/からの循環依存がないことを検証する
  - CIに組み込んで継続的にチェックする
  - _Requirements: 10.3_

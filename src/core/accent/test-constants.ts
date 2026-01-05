/**
 * アクセントモジュール共通テスト定数
 *
 * 複数のテストファイルで使用される定数を一元管理。
 * DADSトークン更新時は1箇所の修正で全テストに反映される。
 *
 * @module @/core/accent/test-constants
 */

/**
 * vibrancyフィルタ適用後の期待候補数
 *
 * DADSカラーシェード（130色）から低彩度・問題色相帯の低明度色を除外した結果。
 *
 * 算出根拠:
 * - DADSカラーシェード総数: 130色
 * - 除外対象:
 *   - 彩度 < 0.04 の色（MIN_CHROMA_THRESHOLD）
 *   - 色相30-120°かつ明度 < 0.55 の色（問題色相帯の低明度）
 * - 結果: 112色が候補として残る
 *
 * 注意: DADSトークン更新により変動する可能性あり
 */
export const EXPECTED_CANDIDATES_AFTER_FILTER = 112;

/**
 * DADSカラーシェード総数（vibrancyフィルタ前）
 */
export const TOTAL_DADS_COLOR_SHADES = 130;

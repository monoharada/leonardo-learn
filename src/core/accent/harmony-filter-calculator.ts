/**
 * HarmonyFilterCalculator
 * ハーモニータイプに基づく候補フィルタリング
 *
 * Task 3.1: HarmonyFilterCalculator の実装
 * Requirements: 3.1, 3.2
 */

/**
 * ハーモニータイプ
 */
export type HarmonyFilterType =
	| "all"
	| "complementary"
	| "triadic"
	| "analogous"
	| "split-complementary"
	| "monochromatic"
	| "shades"
	| "compound"
	| "square";

/**
 * ハーモニータイプ定義
 */
export interface HarmonyTypeDefinition {
	id: HarmonyFilterType;
	nameJa: string;
	nameEn: string;
	/** 基準色相からのオフセット角度 */
	hueOffsets: number[];
}

/**
 * ハーモニータイプ定義一覧
 */
const HARMONY_TYPES: readonly HarmonyTypeDefinition[] = [
	{
		id: "all",
		nameJa: "全候補",
		nameEn: "All",
		hueOffsets: [],
	},
	{
		id: "complementary",
		nameJa: "補色",
		nameEn: "Complementary",
		hueOffsets: [180],
	},
	{
		id: "triadic",
		nameJa: "トライアド",
		nameEn: "Triadic",
		hueOffsets: [120, 240],
	},
	{
		id: "analogous",
		nameJa: "類似色",
		nameEn: "Analogous",
		hueOffsets: [-30, 30],
	},
	{
		id: "split-complementary",
		nameJa: "分裂補色",
		nameEn: "Split Complementary",
		hueOffsets: [150, 210],
	},
	{
		id: "monochromatic",
		nameJa: "モノクロマティック",
		nameEn: "Monochromatic",
		hueOffsets: [0], // 同一色相
	},
	{
		id: "shades",
		nameJa: "シェード",
		nameEn: "Shades",
		hueOffsets: [0], // 同一色相、明度のみ変化
	},
	{
		id: "compound",
		nameJa: "コンパウンド",
		nameEn: "Compound",
		hueOffsets: [30, 180], // 類似色 + 補色方向
	},
	{
		id: "square",
		nameJa: "正方形",
		nameEn: "Square",
		hueOffsets: [90, 180, 270], // 正方形（90度, 180度, 270度）
	},
] as const;

/**
 * フィルタ判定時の許容範囲（度）
 * Requirement 3.2: ±30°以内の候補抽出
 */
const HARMONY_RANGE_DEGREES = 30;

/**
 * 色相を0-360°に正規化する
 *
 * @param hue 入力色相
 * @returns 0-360の範囲に正規化された色相
 */
function normalizeHue(hue: number): number {
	let normalized = hue % 360;
	if (normalized < 0) {
		normalized += 360;
	}
	return normalized;
}

/**
 * ハーモニータイプ定義一覧を取得
 */
export function getHarmonyTypes(): readonly HarmonyTypeDefinition[] {
	return HARMONY_TYPES;
}

/**
 * ハーモニータイプのターゲット色相を取得
 *
 * @param brandHue ブランドカラーの色相（0-360）
 * @param type ハーモニータイプ
 * @returns ターゲット色相配列（0-360に正規化済み）
 */
export function getTargetHues(
	brandHue: number,
	type: HarmonyFilterType,
): number[] {
	const typeDefinition = HARMONY_TYPES.find((t) => t.id === type);
	if (!typeDefinition) {
		return [];
	}

	// "all" タイプの場合は空配列を返す
	if (type === "all") {
		return [];
	}

	return typeDefinition.hueOffsets.map((offset) =>
		normalizeHue(brandHue + offset),
	);
}

/**
 * 循環距離計算（色相用）
 * 色相0-360°の循環を考慮して最短距離を計算
 *
 * @param hue1 色相1
 * @param hue2 色相2
 * @returns 最短距離（0-180）
 */
export function calculateCircularDistance(hue1: number, hue2: number): number {
	// 正規化
	const normalizedHue1 = normalizeHue(hue1);
	const normalizedHue2 = normalizeHue(hue2);

	const diff = Math.abs(normalizedHue1 - normalizedHue2);
	return Math.min(diff, 360 - diff);
}

/**
 * 候補が指定色相から±30°以内かを判定
 *
 * @param candidateHue 候補の色相
 * @param targetHues ターゲット色相配列
 * @returns いずれかのターゲットの範囲内ならtrue
 */
export function isWithinHarmonyRange(
	candidateHue: number,
	targetHues: number[],
): boolean {
	if (targetHues.length === 0) {
		return false;
	}

	return targetHues.some((targetHue) => {
		const distance = calculateCircularDistance(candidateHue, targetHue);
		return distance <= HARMONY_RANGE_DEGREES;
	});
}

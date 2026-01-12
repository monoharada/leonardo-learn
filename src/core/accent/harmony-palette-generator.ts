/**
 * HarmonyPaletteGenerator
 * ハーモニータイプに基づいて3色パレットを生成する
 *
 * Section 8: アクセント選定UI改善
 * - 各ハーモニータイプに対して3色のパレットを生成
 * - 補色: ブランド + 補色（明）+ 補色（暗）
 * - トライアド/類似色/分裂補色: ブランド + 各方向から1色ずつ
 */

import { toOklch } from "../../utils/color-space";
import {
	generateCandidates,
	type ScoredCandidate,
} from "./accent-candidate-service";
import {
	calculateCircularDistance,
	getTargetHues,
	type HarmonyFilterType,
} from "./harmony-filter-calculator";
import { getRolesForCount, type PaletteRole } from "./palette-role";

/**
 * ハーモニーパレット生成結果
 */
export interface HarmonyPaletteResult {
	/** ブランドカラー */
	brandColor: string;
	/** アクセントカラー（可変長：2〜5色） */
	accentColors: string[];
	/** 選定された候補の詳細 */
	candidates: ScoredCandidate[];
	/** ハーモニータイプ */
	harmonyType: HarmonyFilterType;
	/** アクセントカラーの数（ブランドを含まない） */
	accentCount: number;
}

/**
 * ハーモニーパレット生成オプション
 */
export interface HarmonyPaletteOptions {
	/** 背景色（コントラスト計算用） */
	backgroundHex?: string;
	/** アクセントカラーの数（1〜3、デフォルト1） */
	accentCount?: 1 | 2 | 3;
	/**
	 * 除外するトークンID（hue-stepの形式）
	 * P/S/Tで使用されているステップを除外するために使用
	 * 例: ["blue-600", "blue-500", "blue-200"]
	 */
	excludeSteps?: string[];
}

/**
 * ハーモニーパレット生成結果またはエラー
 */
export type HarmonyPaletteResultOrError =
	| { ok: true; result: HarmonyPaletteResult }
	| { ok: false; error: { code: string; message: string } };

/**
 * 全ハーモニータイプのプレビュー用パレットを取得
 * カード表示用に各タイプの色を一度に取得
 */
export interface AllHarmonyPalettesResult {
	complementary: HarmonyPaletteResult | null;
	triadic: HarmonyPaletteResult | null;
	analogous: HarmonyPaletteResult | null;
	"split-complementary": HarmonyPaletteResult | null;
	monochromatic: HarmonyPaletteResult | null;
	shades: HarmonyPaletteResult | null;
	compound: HarmonyPaletteResult | null;
	square: HarmonyPaletteResult | null;
}

/**
 * 特定の色相方向に最も近い候補を取得
 *
 * @param candidates 候補リスト
 * @param targetHue ターゲット色相
 * @param range 許容範囲（度）
 * @returns ターゲットに最も近いスコア順の候補
 */
function getCandidatesNearHue(
	candidates: ScoredCandidate[],
	targetHue: number,
	range = 30,
): ScoredCandidate[] {
	return candidates
		.filter((c) => calculateCircularDistance(c.hue, targetHue) <= range)
		.sort((a, b) => b.score.total - a.score.total);
}

/**
 * brandColorに最も近いScoredCandidateを取得
 *
 * ランダム選択されたbrandColorと同じトークンがアクセントカラーとして
 * 選ばれないよう、brandColorに対応するトークンを特定する。
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @returns 最も近い候補（見つからない場合はnull）
 */
function findBrandTokenCandidate(
	brandColorHex: string,
	candidates: ScoredCandidate[],
): ScoredCandidate | null {
	// brandColorのhexと完全一致する候補を探す
	const exactMatch = candidates.find(
		(c) => c.hex.toLowerCase() === brandColorHex.toLowerCase(),
	);
	if (exactMatch) return exactMatch;

	// 完全一致がない場合、色相と明度が最も近い候補を返す
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;
	const brandL = brandOklch.l;

	// 色相が近く、明度も近い候補を探す
	const sorted = candidates
		.map((c) => ({
			candidate: c,
			hueDist: calculateCircularDistance(c.hue, brandHue),
			lDist: Math.abs((toOklch(c.hex)?.l ?? 0) - brandL),
		}))
		.filter((x) => x.hueDist <= 30) // 色相が30°以内
		.sort((a, b) => {
			// 色相距離が同じなら明度距離で比較
			if (a.hueDist === b.hueDist) {
				return a.lDist - b.lDist;
			}
			return a.hueDist - b.hueDist;
		});

	return sorted[0]?.candidate ?? null;
}

/**
 * brandColorに対応するトークンIDを含む除外セットを作成する
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @returns brandColorトークンIDを含む除外セット
 */
function createExclusionSetWithBrandCandidate(
	brandColorHex: string,
	candidates: ScoredCandidate[],
): Set<string> {
	const usedTokenIds = new Set<string>();
	const brandCandidate = findBrandTokenCandidate(brandColorHex, candidates);
	if (brandCandidate) {
		usedTokenIds.add(brandCandidate.tokenId);
	}
	return usedTokenIds;
}

/**
 * 基準候補からステップオフセットを適用して最適な候補を選択
 *
 * @param candidates 候補リスト（色相でフィルタ済み）
 * @param baseStep 基準ステップ（最高スコア候補のステップ）
 * @param stepOffset 目標ステップオフセット（正:明、負:暗）
 * @param usedTokenIds 使用済みトークンID（重複回避）
 * @returns 最適な候補
 */
function selectByStepOffset(
	candidates: ScoredCandidate[],
	baseStep: number,
	stepOffset: number,
	usedTokenIds: Set<string>,
): ScoredCandidate | null {
	if (candidates.length === 0) return null;

	// 目標ステップを計算（50-1200の範囲にクランプ）
	const targetStep = Math.max(50, Math.min(1200, baseStep - stepOffset));

	// 使用済みを除外し、目標ステップに近い順にソート
	const available = candidates
		.filter((c) => !usedTokenIds.has(c.tokenId))
		.sort((a, b) => {
			const distA = Math.abs(a.step - targetStep);
			const distB = Math.abs(b.step - targetStep);
			// ステップ距離が同じ場合はスコアで判定
			if (distA === distB) {
				return b.score.total - a.score.total;
			}
			return distA - distB;
		});

	return available[0] ?? null;
}

/**
 * 役割に基づいて候補を選択
 *
 * @param role 役割定義
 * @param candidates 全候補
 * @param brandHue ブランドカラーの色相
 * @param harmonyHues ハーモニー方向の色相配列
 * @param baseStep 基準ステップ
 * @param usedTokenIds 使用済みトークンID
 * @returns 選択された候補
 */
function selectCandidateByRole(
	role: PaletteRole,
	candidates: ScoredCandidate[],
	brandHue: number,
	harmonyHues: number[],
	baseStep: number,
	usedTokenIds: Set<string>,
): ScoredCandidate | null {
	// 色相方向を決定
	let targetHue: number;
	if (role.hueDirection === "harmony") {
		const dirIndex = role.harmonyDirectionIndex ?? 0;
		targetHue = harmonyHues[dirIndex] ?? harmonyHues[0] ?? brandHue;
	} else {
		targetHue = brandHue;
	}

	// 色相でフィルタ
	const hueCandidates = getCandidatesNearHue(candidates, targetHue);

	// ステップオフセットを適用して選択
	return selectByStepOffset(
		hueCandidates,
		baseStep,
		role.stepOffset,
		usedTokenIds,
	);
}

/**
 * 補色パレットを生成（役割ベース選択）
 * Adobe Color参考: 補色方向 + ベース方向のバリエーションを含む
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @param accentCount アクセントカラーの数（2〜5）
 * @returns パレット
 */
function generateComplementaryPalette(
	brandColorHex: string,
	candidates: ScoredCandidate[],
	accentCount = 2,
): HarmonyPaletteResult | null {
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;
	const harmonyHues = getTargetHues(brandHue, "complementary");

	if (harmonyHues.length === 0) return null;

	// 補色方向の最高スコア候補を取得して基準ステップを決定
	const complementaryCandidates = getCandidatesNearHue(
		candidates,
		harmonyHues[0] ?? brandHue,
	);
	if (complementaryCandidates.length === 0) return null;

	const baseCandidate = complementaryCandidates[0];
	if (!baseCandidate) return null;
	const baseStep = baseCandidate.step;

	// 役割に基づいて候補を選択
	const roles = getRolesForCount("complementary", accentCount as 1 | 2 | 3);
	const selectedCandidates: ScoredCandidate[] = [];
	const usedTokenIds = createExclusionSetWithBrandCandidate(
		brandColorHex,
		candidates,
	);

	for (const role of roles) {
		const selected = selectCandidateByRole(
			role,
			candidates,
			brandHue,
			harmonyHues,
			baseStep,
			usedTokenIds,
		);
		if (selected) {
			selectedCandidates.push(selected);
			usedTokenIds.add(selected.tokenId);
		}
	}

	if (selectedCandidates.length < 1) return null;

	// 明度順にソート（明るい方を先に）
	selectedCandidates.sort((a, b) => {
		const aOklch = toOklch(a.hex);
		const bOklch = toOklch(b.hex);
		return (bOklch?.l ?? 0) - (aOklch?.l ?? 0);
	});

	return {
		brandColor: brandColorHex,
		accentColors: selectedCandidates.map((c) => c.hex),
		candidates: selectedCandidates,
		harmonyType: "complementary",
		accentCount: selectedCandidates.length,
	};
}

/**
 * 複数方向パレットを生成（トライアド/類似色/分裂補色）
 * 役割ベース選択: 各方向から色を選定し、明暗バリエーションを役割で制御
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @param harmonyType ハーモニータイプ
 * @param accentCount アクセントカラーの数（2〜5）
 * @returns パレット
 */
function generateMultiDirectionPalette(
	brandColorHex: string,
	candidates: ScoredCandidate[],
	harmonyType: Exclude<HarmonyFilterType, "all" | "complementary">,
	accentCount = 2,
): HarmonyPaletteResult | null {
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;
	const harmonyHues = getTargetHues(brandHue, harmonyType);

	if (harmonyHues.length < 2) return null;

	// 最初の方向の最高スコア候補を取得して基準ステップを決定
	const firstDirectionCandidates = getCandidatesNearHue(
		candidates,
		harmonyHues[0] ?? brandHue,
	);
	if (firstDirectionCandidates.length === 0) return null;

	const baseCandidate = firstDirectionCandidates[0];
	if (!baseCandidate) return null;
	const baseStep = baseCandidate.step;

	// 役割に基づいて候補を選択
	const roles = getRolesForCount(harmonyType, accentCount as 1 | 2 | 3);
	const selectedCandidates: ScoredCandidate[] = [];
	const usedTokenIds = createExclusionSetWithBrandCandidate(
		brandColorHex,
		candidates,
	);

	for (const role of roles) {
		const selected = selectCandidateByRole(
			role,
			candidates,
			brandHue,
			harmonyHues,
			baseStep,
			usedTokenIds,
		);
		if (selected) {
			selectedCandidates.push(selected);
			usedTokenIds.add(selected.tokenId);
		}
	}

	// 2色未満の場合はエラー
	if (selectedCandidates.length < 1) return null;

	return {
		brandColor: brandColorHex,
		accentColors: selectedCandidates.map((c) => c.hex),
		candidates: selectedCandidates,
		harmonyType,
		accentCount: selectedCandidates.length,
	};
}

/**
 * ステップ目標値（モノクロマティック/シェード用）
 *
 * 【設計意図 - Issue #4 への回答】
 * Monochromatic/Shadesハーモニーは「均等な明度分布」が本質であるため、
 * 役割ベース選択（PaletteRole.stepOffset）ではなくSTEP_TARGETSを直接使用しています。
 *
 * 役割ベースは「アクセントLight/Dark」のような相対的な明度調整に適していますが、
 * モノクロマティック/シェードでは全色が同一色相内で均等に分布することが重要です。
 * これは意図的な設計判断であり、他のハーモニータイプとの実装差異は許容されます。
 *
 * DADS仕様: 50=最も明るい、1200=最も暗い
 */
const STEP_TARGETS: Record<1 | 2 | 3, number[]> = {
	1: [600],
	2: [200, 900],
	3: [100, 600, 1000],
};

/**
 * モノクロマティックパレットを生成
 * 同一色相内で異なるステップ（明度）の色を選定
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @param accentCount アクセントカラーの数（2〜5）
 * @returns パレット
 */
function generateMonochromaticPalette(
	brandColorHex: string,
	candidates: ScoredCandidate[],
	accentCount = 2,
): HarmonyPaletteResult | null {
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;

	// ブランドカラーに近い色相の候補をフィルタ（±30°）
	const hueCandidates = getCandidatesNearHue(candidates, brandHue, 30);
	if (hueCandidates.length === 0) return null;

	// ステップ目標に近い候補を選定
	const targetSteps = STEP_TARGETS[accentCount as 1 | 2 | 3];
	const selectedCandidates: ScoredCandidate[] = [];
	const usedTokenIds = new Set<string>();

	for (const targetStep of targetSteps) {
		// 使用済みを除外し、目標ステップに近い順にソート
		const available = hueCandidates
			.filter((c) => !usedTokenIds.has(c.tokenId))
			.sort((a, b) => {
				const distA = Math.abs(a.step - targetStep);
				const distB = Math.abs(b.step - targetStep);
				if (distA === distB) {
					return b.score.total - a.score.total;
				}
				return distA - distB;
			});

		if (available[0]) {
			selectedCandidates.push(available[0]);
			usedTokenIds.add(available[0].tokenId);
		}
	}

	if (selectedCandidates.length < 1) return null;

	// 明度順にソート（明るい方を先に）
	selectedCandidates.sort((a, b) => {
		const aOklch = toOklch(a.hex);
		const bOklch = toOklch(b.hex);
		return (bOklch?.l ?? 0) - (aOklch?.l ?? 0);
	});

	return {
		brandColor: brandColorHex,
		accentColors: selectedCandidates.map((c) => c.hex),
		candidates: selectedCandidates,
		harmonyType: "monochromatic",
		accentCount: selectedCandidates.length,
	};
}

/**
 * シェードパレットを生成
 * 同一色相内で均等な明度分布を持つ色を選定
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @param accentCount アクセントカラーの数（2〜5）
 * @returns パレット
 */
function generateShadesPalette(
	brandColorHex: string,
	candidates: ScoredCandidate[],
	accentCount = 2,
): HarmonyPaletteResult | null {
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;

	// ブランドカラーに近い色相の候補をフィルタ（±15°でより厳密に）
	const hueCandidates = getCandidatesNearHue(candidates, brandHue, 15);
	if (hueCandidates.length === 0) {
		// フォールバック: より広い範囲で検索
		const fallbackCandidates = getCandidatesNearHue(candidates, brandHue, 30);
		if (fallbackCandidates.length === 0) return null;
		return generateMonochromaticPalette(brandColorHex, candidates, accentCount);
	}

	// 均等なステップ間隔で選定（50-1200の範囲）
	const stepRange = 1150; // 1200 - 50
	const stepInterval = stepRange / (accentCount + 1);
	const targetSteps: number[] = [];
	for (let i = 1; i <= accentCount; i++) {
		targetSteps.push(Math.round(50 + stepInterval * i));
	}

	const selectedCandidates: ScoredCandidate[] = [];
	const usedTokenIds = new Set<string>();

	for (const targetStep of targetSteps) {
		const available = hueCandidates
			.filter((c) => !usedTokenIds.has(c.tokenId))
			.sort((a, b) => {
				const distA = Math.abs(a.step - targetStep);
				const distB = Math.abs(b.step - targetStep);
				if (distA === distB) {
					return b.score.total - a.score.total;
				}
				return distA - distB;
			});

		if (available[0]) {
			selectedCandidates.push(available[0]);
			usedTokenIds.add(available[0].tokenId);
		}
	}

	if (selectedCandidates.length < 1) return null;

	// 明度順にソート（明るい方を先に）
	selectedCandidates.sort((a, b) => {
		const aOklch = toOklch(a.hex);
		const bOklch = toOklch(b.hex);
		return (bOklch?.l ?? 0) - (aOklch?.l ?? 0);
	});

	return {
		brandColor: brandColorHex,
		accentColors: selectedCandidates.map((c) => c.hex),
		candidates: selectedCandidates,
		harmonyType: "shades",
		accentCount: selectedCandidates.length,
	};
}

/**
 * コンパウンドパレットを生成
 * 類似色（30°）と補色（180°）方向のハイブリッド
 *
 * @param brandColorHex ブランドカラー
 * @param candidates 全候補
 * @param accentCount アクセントカラーの数（2〜5）
 * @returns パレット
 */
function generateCompoundPalette(
	brandColorHex: string,
	candidates: ScoredCandidate[],
	accentCount = 2,
): HarmonyPaletteResult | null {
	const brandOklch = toOklch(brandColorHex);
	if (!brandOklch) return null;

	const brandHue = brandOklch.h ?? 0;
	// コンパウンド: 類似色（+30°）と補色（180°）
	const harmonyHues = getTargetHues(brandHue, "compound");

	if (harmonyHues.length < 2) return null;

	// 最初の方向の最高スコア候補を取得して基準ステップを決定
	const firstDirectionCandidates = getCandidatesNearHue(
		candidates,
		harmonyHues[0] ?? brandHue,
	);
	if (firstDirectionCandidates.length === 0) return null;

	const baseCandidate = firstDirectionCandidates[0];
	if (!baseCandidate) return null;
	const baseStep = baseCandidate.step;

	// 役割に基づいて候補を選択
	const roles = getRolesForCount("compound", accentCount as 1 | 2 | 3);
	const selectedCandidates: ScoredCandidate[] = [];
	const usedTokenIds = createExclusionSetWithBrandCandidate(
		brandColorHex,
		candidates,
	);

	for (const role of roles) {
		const selected = selectCandidateByRole(
			role,
			candidates,
			brandHue,
			harmonyHues,
			baseStep,
			usedTokenIds,
		);
		if (selected) {
			selectedCandidates.push(selected);
			usedTokenIds.add(selected.tokenId);
		}
	}

	if (selectedCandidates.length < 1) return null;

	return {
		brandColor: brandColorHex,
		accentColors: selectedCandidates.map((c) => c.hex),
		candidates: selectedCandidates,
		harmonyType: "compound",
		accentCount: selectedCandidates.length,
	};
}

/**
 * 指定されたハーモニータイプでパレットを生成
 *
 * @param brandColorHex ブランドカラー
 * @param harmonyType ハーモニータイプ（"all"は無効）
 * @param options オプション（accentCountで3-6色を指定可能）
 * @returns パレット生成結果
 */
export async function getHarmonyPaletteColors(
	brandColorHex: string,
	harmonyType: HarmonyFilterType,
	options?: HarmonyPaletteOptions,
): Promise<HarmonyPaletteResultOrError> {
	// "all" は無効
	if (harmonyType === "all") {
		return {
			ok: false,
			error: {
				code: "INVALID_HARMONY_TYPE",
				message: '"all" はパレット生成に使用できません',
			},
		};
	}

	// アクセントカラーの数（デフォルト1、範囲1-3）
	const accentCount = Math.max(1, Math.min(3, options?.accentCount ?? 1));

	// 全候補を取得
	const candidatesResult = await generateCandidates(brandColorHex, {
		backgroundHex: options?.backgroundHex,
		limit: 130, // 全候補を取得
	});

	if (!candidatesResult.ok) {
		return {
			ok: false,
			error: candidatesResult.error,
		};
	}

	const candidates = candidatesResult.result.candidates;

	// ハーモニータイプに応じてパレットを生成
	let palette: HarmonyPaletteResult | null = null;

	switch (harmonyType) {
		case "complementary":
			palette = generateComplementaryPalette(
				brandColorHex,
				candidates,
				accentCount,
			);
			break;
		case "triadic":
		case "analogous":
		case "split-complementary":
		case "square":
			palette = generateMultiDirectionPalette(
				brandColorHex,
				candidates,
				harmonyType,
				accentCount,
			);
			break;
		case "monochromatic":
			palette = generateMonochromaticPalette(
				brandColorHex,
				candidates,
				accentCount,
			);
			break;
		case "shades":
			palette = generateShadesPalette(brandColorHex, candidates, accentCount);
			break;
		case "compound":
			palette = generateCompoundPalette(brandColorHex, candidates, accentCount);
			break;
	}

	if (!palette) {
		return {
			ok: false,
			error: {
				code: "PALETTE_GENERATION_FAILED",
				message: "パレット生成に失敗しました",
			},
		};
	}

	return { ok: true, result: palette };
}

/**
 * 全ハーモニータイプのプレビュー用パレットを取得
 * カード表示用に各タイプの色を一度に取得
 *
 * @param brandColorHex ブランドカラー
 * @param options オプション（accentCountで色数を指定可能）
 * @returns 全ハーモニータイプのパレット
 */
export async function getAllHarmonyPalettes(
	brandColorHex: string,
	options?: HarmonyPaletteOptions,
): Promise<{
	ok: boolean;
	result?: AllHarmonyPalettesResult;
	error?: { code: string; message: string };
}> {
	// アクセントカラーの数（デフォルト1、範囲1-3）
	const accentCount = Math.max(1, Math.min(3, options?.accentCount ?? 1));

	// 全候補を一度だけ取得
	const candidatesResult = await generateCandidates(brandColorHex, {
		backgroundHex: options?.backgroundHex,
		limit: 130,
	});

	if (!candidatesResult.ok) {
		return {
			ok: false,
			error: candidatesResult.error,
		};
	}

	// 除外ステップのセットを作成（hue-step形式: "blue-600"）
	const excludeStepsSet = new Set(
		options?.excludeSteps?.map((s) => s.toLowerCase()) ?? [],
	);

	// 除外ステップに含まれる候補をフィルタリング
	// tokenId形式: "dads-blue-600" → "blue-600" として比較
	const candidates = candidatesResult.result.candidates.filter((c) => {
		const stepId = c.tokenId.replace(/^dads-/, "").toLowerCase();
		return !excludeStepsSet.has(stepId);
	});

	// 各ハーモニータイプのパレットを生成
	const result: AllHarmonyPalettesResult = {
		complementary: generateComplementaryPalette(
			brandColorHex,
			candidates,
			accentCount,
		),
		triadic: generateMultiDirectionPalette(
			brandColorHex,
			candidates,
			"triadic",
			accentCount,
		),
		analogous: generateMultiDirectionPalette(
			brandColorHex,
			candidates,
			"analogous",
			accentCount,
		),
		"split-complementary": generateMultiDirectionPalette(
			brandColorHex,
			candidates,
			"split-complementary",
			accentCount,
		),
		monochromatic: generateMonochromaticPalette(
			brandColorHex,
			candidates,
			accentCount,
		),
		shades: generateShadesPalette(brandColorHex, candidates, accentCount),
		compound: generateCompoundPalette(brandColorHex, candidates, accentCount),
		square: generateMultiDirectionPalette(
			brandColorHex,
			candidates,
			"square",
			accentCount,
		),
	};

	return { ok: true, result };
}

/**
 * CVD制御モジュール
 *
 * CVD（色覚多様性）シミュレーション制御とスコア表示機能を提供する。
 * state.cvdSimulationを管理し、シミュレーションを適用する。
 *
 * @module @/ui/demo/cvd-controls
 * Requirements: 5.1, 5.2, 5.3
 */

import { type CVDType, simulateCVD } from "@/accessibility/cvd-simulator";
import { calculateCVDScore } from "@/accessibility/distinguishability";
import { Color } from "@/core/color";
import { parseKeyColor, state } from "./state";
import type { CVDSimulationType } from "./types";

/**
 * 有効なCVDシミュレーションタイプのセット
 */
const VALID_CVD_TYPES = new Set<CVDSimulationType>([
	"normal",
	"protanopia",
	"deuteranopia",
	"tritanopia",
	"achromatopsia",
]);

/**
 * CVDタイプが有効かどうかを検証する
 * @param type 検証対象のタイプ
 * @returns 有効な場合はtrue
 */
function isValidCVDType(type: unknown): type is CVDSimulationType {
	return (
		typeof type === "string" && VALID_CVD_TYPES.has(type as CVDSimulationType)
	);
}

/**
 * ボタンのアクティブ状態を設定する（モジュール内ヘルパー）
 * @param btn ボタン要素
 * @param isActive アクティブ状態
 */
function setButtonActiveState(btn: HTMLElement, isActive: boolean): void {
	btn.dataset.active = isActive ? "true" : "false";
	btn.setAttribute("aria-pressed", isActive.toString());
}

/**
 * CVDスコア表示用データ
 */
export interface CVDScoreDisplay {
	score: number;
	grade: "A" | "B" | "C" | "D" | "F";
}

/**
 * CVDシミュレーションを色に適用する
 *
 * state.cvdSimulationの値に基づき、色にCVDシミュレーションを適用する。
 * "normal"の場合は元の色をそのまま返す。
 *
 * @param color シミュレーション対象の色
 * @returns シミュレーション適用後の色
 */
export function applySimulation(color: Color): Color {
	if (state.cvdSimulation === "normal") {
		return color;
	}
	return simulateCVD(color, state.cvdSimulation as CVDType);
}

/**
 * CVDスコア計算用のキーカラーを生成する
 *
 * shadesPalettesが存在する場合はそちらを使用、
 * ない場合はpalettesを使用する。
 * パレット名（またはbaseChromaName）を正規化してキーとする。
 *
 * @returns パレット名をキーとした色のRecord
 */
export function generateKeyColors(): Record<string, Color> {
	const colors: Record<string, Color> = {};
	// CVDスコアは全13色パレットで計算
	const palettesForScore =
		state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes;

	for (const p of palettesForScore) {
		const keyColorInput = p.keyColors[0];
		if (!keyColorInput) continue;

		const { color: hex } = parseKeyColor(keyColorInput);
		// baseChromaNameがあればそれを使い、なければnameを使用
		const paletteName = (p.baseChromaName || p.name)
			.toLowerCase()
			.replace(/\s+/g, "-");
		colors[paletteName] = new Color(hex);
	}
	return colors;
}

/**
 * CVDスコア表示用のデータを取得する
 *
 * state.cvdSimulationが"normal"の場合は総合スコア、
 * それ以外の場合は選択されたCVDタイプのスコアを返す。
 *
 * @returns スコアとグレード
 */
export function getScoreDisplay(): CVDScoreDisplay {
	const colors = generateKeyColors();
	const score = calculateCVDScore(colors);

	let displayScore: number;
	let displayGrade: CVDScoreDisplay["grade"];

	if (state.cvdSimulation === "normal") {
		displayScore = score.overallScore;
		displayGrade = score.grade;
	} else {
		// 選択されたCVDタイプのスコアを表示
		const typeKey = state.cvdSimulation as keyof typeof score.scoresByType;
		const typeScore = score.scoresByType[typeKey];

		// scoresByTypeに存在しない場合はoverallScoreにフォールバック
		if (typeof typeScore !== "number") {
			displayScore = score.overallScore;
			displayGrade = score.grade;
		} else {
			displayScore = typeScore;
			// このスコアに対するグレードを計算
			if (typeScore >= 90) displayGrade = "A";
			else if (typeScore >= 75) displayGrade = "B";
			else if (typeScore >= 60) displayGrade = "C";
			else if (typeScore >= 40) displayGrade = "D";
			else displayGrade = "F";
		}
	}

	return { score: displayScore, grade: displayGrade };
}

/**
 * CVDスコア表示を更新する
 *
 * DOM要素を検索してスコアとグレードを表示する。
 * 要素が見つからない場合は何もしない。
 */
export function updateCVDScoreDisplay(): void {
	const cvdScoreValue = document.getElementById("cvd-score-value");
	const cvdScoreGrade = document.getElementById("cvd-score-grade");

	const { score, grade } = getScoreDisplay();

	if (cvdScoreValue) {
		cvdScoreValue.textContent = `${score}`;
	}

	if (cvdScoreGrade) {
		cvdScoreGrade.textContent = grade;
		// CSSスタイリング用にdata属性を設定
		cvdScoreGrade.dataset.grade = grade;
	}
}

/**
 * CVD制御のセットアップ
 *
 * CVDタイプボタンのイベントハンドラを設定する。
 *
 * @param buttons CVDタイプボタンのNodeList
 * @param onSimulationChange シミュレーション変更時のコールバック
 */
export function setupCVDControls(
	buttons: NodeListOf<Element>,
	onSimulationChange: () => void,
): void {
	buttons.forEach((btn) => {
		(btn as HTMLElement).onclick = () => {
			const rawCvdType = (btn as HTMLElement).dataset.cvd;

			// data-cvd が未設定または無効な場合は "normal" にフォールバック
			const cvdType: CVDSimulationType = isValidCVDType(rawCvdType)
				? rawCvdType
				: "normal";

			state.cvdSimulation = cvdType;

			// ボタンのアクティブ状態を更新
			buttons.forEach((b) => {
				const isActive = (b as HTMLElement).dataset.cvd === cvdType;
				setButtonActiveState(b as HTMLElement, isActive);
			});

			// シミュレーション変更コールバックを呼び出し
			onSimulationChange();
		};
	});
}

/**
 * CVDコントロールの表示/非表示を切り替える
 *
 * アクセシビリティビューではCVDコントロールを非表示にする。
 *
 * @param viewMode 現在のビューモード
 */
export function updateCVDControlsVisibility(viewMode: string): void {
	const cvdControls = document.getElementById("cvd-controls");
	if (cvdControls) {
		cvdControls.style.display = viewMode === "accessibility" ? "none" : "flex";
	}
}

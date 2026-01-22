/**
 * パステルプリセットのコントラスト比分析スクリプト
 *
 * Phase 1: 数値的検証
 * - DADSトークンからパステル条件（L≥0.75, C≤0.1）を満たす色を抽出
 * - 白背景（#ffffff）に対するコントラスト比を計算
 * - min/max/avg/分布を出力
 * - 3:1を満たす色の割合を確認
 */

import { wcagContrast } from "culori";
import { Color } from "../src/core/color";
import { loadDadsTokens } from "../src/core/tokens/dads-data-provider";
import type { DadsToken } from "../src/core/tokens/types";

// 背景色の定義
const WHITE_BG = "#ffffff";
const DARK_BG = "#1a1a2e"; // 暗い背景の例

// コントラスト基準
const CONTRAST_THRESHOLDS = {
	"WCAG AA Large Text (3:1)": 3,
	"WCAG AA Normal Text (4.5:1)": 4.5,
	"WCAG AAA Large Text (4.5:1)": 4.5,
	"WCAG AAA Normal Text (7:1)": 7,
};

/**
 * パステルプリセット条件を満たすか判定
 */
function isPastelColor(hex: string): boolean {
	const oklch = new Color(hex).oklch;
	if (!oklch) return false;

	const l = oklch.l ?? 0.5;
	const c = oklch.c ?? 0;

	return l >= 0.75 && c <= 0.1;
}

/**
 * コントラスト比の統計を計算
 */
function calculateStats(values: number[]): {
	min: number;
	max: number;
	avg: number;
	median: number;
	stdDev: number;
} {
	const sorted = [...values].sort((a, b) => a - b);
	const sum = values.reduce((a, b) => a + b, 0);
	const avg = sum / values.length;
	const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
	const variance =
		values.reduce((acc, val) => acc + (val - avg) ** 2, 0) / values.length;
	const stdDev = Math.sqrt(variance);

	return {
		min: sorted[0] ?? 0,
		max: sorted[sorted.length - 1] ?? 0,
		avg,
		median,
		stdDev,
	};
}

/**
 * コントラスト分布を計算
 */
function calculateDistribution(
	contrasts: number[],
): Record<string, { count: number; percentage: number }> {
	const distribution: Record<string, { count: number; percentage: number }> = {
		"< 1.5:1 (非常に低い)": { count: 0, percentage: 0 },
		"1.5:1 - 2:1 (低い)": { count: 0, percentage: 0 },
		"2:1 - 3:1 (やや低い)": { count: 0, percentage: 0 },
		"3:1 - 4.5:1 (AA Large)": { count: 0, percentage: 0 },
		"4.5:1 - 7:1 (AA Normal)": { count: 0, percentage: 0 },
		">= 7:1 (AAA)": { count: 0, percentage: 0 },
	};

	for (const c of contrasts) {
		if (c < 1.5) {
			distribution["< 1.5:1 (非常に低い)"]!.count++;
		} else if (c < 2) {
			distribution["1.5:1 - 2:1 (低い)"]!.count++;
		} else if (c < 3) {
			distribution["2:1 - 3:1 (やや低い)"]!.count++;
		} else if (c < 4.5) {
			distribution["3:1 - 4.5:1 (AA Large)"]!.count++;
		} else if (c < 7) {
			distribution["4.5:1 - 7:1 (AA Normal)"]!.count++;
		} else {
			distribution[">= 7:1 (AAA)"]!.count++;
		}
	}

	const total = contrasts.length;
	for (const key of Object.keys(distribution)) {
		distribution[key]!.percentage = (distribution[key]!.count / total) * 100;
	}

	return distribution;
}

async function main() {
	console.log("=".repeat(70));
	console.log("パステルプリセット コントラスト比分析レポート");
	console.log("=".repeat(70));
	console.log();

	// DADSトークンを読み込み
	const allTokens = await loadDadsTokens();
	console.log(`総DADSトークン数: ${allTokens.length}`);

	// 有彩色トークンのみ抽出
	const chromaticTokens = allTokens.filter(
		(t) => t.classification.category === "chromatic" && t.hex.startsWith("#"),
	);
	console.log(`有彩色トークン数: ${chromaticTokens.length}`);

	// パステル条件を満たすトークンを抽出
	const pastelTokens = chromaticTokens.filter((t) => isPastelColor(t.hex));
	console.log(`パステル条件を満たすトークン数: ${pastelTokens.length}`);
	console.log(
		`パステル比率: ${((pastelTokens.length / chromaticTokens.length) * 100).toFixed(1)}%`,
	);
	console.log();

	// 各パステル色の詳細情報
	console.log("-".repeat(70));
	console.log("パステル色の詳細:");
	console.log("-".repeat(70));

	const pastelData: {
		token: DadsToken;
		oklch: { l: number; c: number; h: number };
		contrastWhite: number;
		contrastDark: number;
	}[] = [];

	for (const token of pastelTokens) {
		const oklch = new Color(token.hex).oklch;
		const contrastWhite = wcagContrast(WHITE_BG, token.hex) ?? 0;
		const contrastDark = wcagContrast(DARK_BG, token.hex) ?? 0;

		pastelData.push({
			token,
			oklch: {
				l: oklch?.l ?? 0,
				c: oklch?.c ?? 0,
				h: oklch?.h ?? 0,
			},
			contrastWhite,
			contrastDark,
		});
	}

	// 白背景でのコントラスト順にソート
	pastelData.sort((a, b) => a.contrastWhite - b.contrastWhite);

	console.log(
		"| HEX     | 名前              | L     | C     | 白背景比 | 暗背景比 |",
	);
	console.log(
		"|---------|-------------------|-------|-------|----------|----------|",
	);

	for (const data of pastelData) {
		console.log(
			`| ${data.token.hex} | ${data.token.nameEn.padEnd(17)} | ${data.oklch.l.toFixed(3)} | ${data.oklch.c.toFixed(3)} | ${data.contrastWhite.toFixed(2).padStart(8)} | ${data.contrastDark.toFixed(2).padStart(8)} |`,
		);
	}

	console.log();

	// 白背景に対するコントラスト統計
	const contrastsWhite = pastelData.map((d) => d.contrastWhite);
	const statsWhite = calculateStats(contrastsWhite);

	console.log("-".repeat(70));
	console.log("白背景（#ffffff）に対するコントラスト比統計:");
	console.log("-".repeat(70));
	console.log(`  最小値: ${statsWhite.min.toFixed(3)}:1`);
	console.log(`  最大値: ${statsWhite.max.toFixed(3)}:1`);
	console.log(`  平均値: ${statsWhite.avg.toFixed(3)}:1`);
	console.log(`  中央値: ${statsWhite.median.toFixed(3)}:1`);
	console.log(`  標準偏差: ${statsWhite.stdDev.toFixed(3)}`);
	console.log();

	// WCAG基準達成率
	console.log("-".repeat(70));
	console.log("WCAG基準達成率（白背景）:");
	console.log("-".repeat(70));
	for (const [name, threshold] of Object.entries(CONTRAST_THRESHOLDS)) {
		const passing = contrastsWhite.filter((c) => c >= threshold);
		const rate = (passing.length / contrastsWhite.length) * 100;
		console.log(
			`  ${name}: ${passing.length}/${contrastsWhite.length} (${rate.toFixed(1)}%)`,
		);
	}
	console.log();

	// 分布
	console.log("-".repeat(70));
	console.log("コントラスト比分布（白背景）:");
	console.log("-".repeat(70));
	const distribution = calculateDistribution(contrastsWhite);
	for (const [range, { count, percentage }] of Object.entries(distribution)) {
		const bar = "█".repeat(Math.round(percentage / 5));
		console.log(
			`  ${range.padEnd(25)}: ${count.toString().padStart(3)} (${percentage.toFixed(1).padStart(5)}%) ${bar}`,
		);
	}
	console.log();

	// 暗い背景との比較
	const contrastsDark = pastelData.map((d) => d.contrastDark);
	const statsDark = calculateStats(contrastsDark);

	console.log("-".repeat(70));
	console.log("暗い背景（#1a1a2e）に対するコントラスト比統計:");
	console.log("-".repeat(70));
	console.log(`  最小値: ${statsDark.min.toFixed(3)}:1`);
	console.log(`  最大値: ${statsDark.max.toFixed(3)}:1`);
	console.log(`  平均値: ${statsDark.avg.toFixed(3)}:1`);
	console.log(`  中央値: ${statsDark.median.toFixed(3)}:1`);
	console.log();

	// WCAG基準達成率（暗い背景）
	console.log("-".repeat(70));
	console.log("WCAG基準達成率（暗い背景）:");
	console.log("-".repeat(70));
	for (const [name, threshold] of Object.entries(CONTRAST_THRESHOLDS)) {
		const passing = contrastsDark.filter((c) => c >= threshold);
		const rate = (passing.length / contrastsDark.length) * 100;
		console.log(
			`  ${name}: ${passing.length}/${contrastsDark.length} (${rate.toFixed(1)}%)`,
		);
	}
	console.log();

	// 問題の核心：3:1を満たさない色の詳細
	console.log("=".repeat(70));
	console.log("【重要】3:1コントラストを満たさないパステル色（白背景）:");
	console.log("=".repeat(70));
	const failing = pastelData.filter((d) => d.contrastWhite < 3);
	console.log(`該当色数: ${failing.length}/${pastelData.length}`);
	console.log();

	if (failing.length > 0) {
		console.log(
			"| HEX     | 名前              | L     | コントラスト比 | 不足量 |",
		);
		console.log(
			"|---------|-------------------|-------|----------------|--------|",
		);
		for (const data of failing) {
			const deficit = 3 - data.contrastWhite;
			console.log(
				`| ${data.token.hex} | ${data.token.nameEn.padEnd(17)} | ${data.oklch.l.toFixed(3)} | ${data.contrastWhite.toFixed(3).padStart(14)} | ${deficit.toFixed(3).padStart(6)} |`,
			);
		}
	}

	console.log();
	console.log("=".repeat(70));
	console.log("結論:");
	console.log("=".repeat(70));

	const passingRate =
		((contrastsWhite.length - failing.length) / contrastsWhite.length) * 100;
	console.log(
		`パステル色のうち、白背景で3:1以上を達成: ${passingRate.toFixed(1)}%`,
	);

	if (passingRate < 100) {
		console.log();
		console.log("【問題】");
		console.log(
			`  ${failing.length}色がWCAG AA Large Text基準（3:1）を満たしていません。`,
		);
		console.log(
			"  これらの色を白背景で使用すると、アクセシビリティ問題が発生します。",
		);
		console.log();
		console.log("【推奨対策】");
		console.log("  1. 暗い背景色を使用する（全パステル色で3:1以上を達成可能）");
		console.log("  2. パステル定義のL上限を下げる（例: 0.75 → 0.70）");
		console.log("  3. フォールバック時に明度を自動調整する");
	}

	console.log();
	console.log("=".repeat(70));
}

main().catch(console.error);

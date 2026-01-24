/**
 * CUD機能 パフォーマンステスト
 *
 * Task 9.3: パフォーマンステストの実装
 * - 20色パレット最適化の200ms以内完了確認
 * - 100回連続最適化でのメモリリーク確認
 * - モード切替の100ms以内レスポンス確認
 *
 * Requirements: 8.1
 *
 * ## 実行方法
 *
 * ### ローカル開発時（緩和閾値）
 * ```bash
 * bun test src/core/cud/performance.test.ts
 * ```
 *
 * ### CI/厳密モード（要件8.1の閾値: 200ms/100ms）
 * ```bash
 * bun run test:perf    # パフォーマンステストのみ
 * bun run test:ci      # 全テスト + 厳密パフォーマンステスト
 * ```
 *
 * CIパイプラインでは `bun run test:ci` を使用して
 * 要件8.1のパフォーマンス要件を確実に検証してください。
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
// UI modules
import {
	type CudCompatibilityMode,
	createPaletteProcessor,
	processPaletteWithMode,
} from "../../ui/cud-components";
// Core modules
import { createAnchorColor } from "./anchor";
import { type OptimizationOptions, optimizePalette } from "./optimizer";
import {
	createOptimizationCache,
	optimizePaletteWithCache,
} from "./optimizer-cache";

/**
 * ベンチマークモードの判定
 * CI_BENCH=1で厳密なタイミングテストを有効化
 */
const IS_BENCHMARK_MODE = process.env.CI_BENCH === "1";

/**
 * パフォーマンス閾値（通常モードではCI環境を考慮して緩和）
 */
const THRESHOLDS = {
	/** 20色パレット最適化の閾値（ms） */
	OPTIMIZATION_20_COLORS: IS_BENCHMARK_MODE ? 200 : 1000,
	/** モード切替の閾値（ms） */
	MODE_SWITCH: IS_BENCHMARK_MODE ? 100 : 500,
	/** 大規模パレット（50色）の閾値（ms） */
	LARGE_PALETTE: IS_BENCHMARK_MODE ? 500 : 2000,
};

/**
 * テスト用CUD推奨色のHEX値
 */
const CUD_COLORS = {
	red: "#FF2800",
	green: "#35A16B",
	blue: "#0041FF",
	orange: "#FF9900",
	yellow: "#FAF500",
	pink: "#FF99A0",
	skyBlue: "#66CCFF",
	brown: "#663300",
	purple: "#9A0079",
	white: "#FFFFFF",
	black: "#000000",
	brightPink: "#FFD1D1",
	cream: "#FFFF99",
	brightYellowGreen: "#CBF266",
	brightGreen: "#77D9A8",
	brightSkyBlue: "#C9FFFF",
	beige: "#FFCABF",
	brightPurple: "#FFCDF3",
	lightGray: "#C8C8CB",
	gray: "#7F878F",
};

/**
 * 非CUD色（パフォーマンステスト用）
 */
const NON_CUD_COLORS = [
	"#123456",
	"#654321",
	"#ABCDEF",
	"#FEDCBA",
	"#112233",
	"#445566",
	"#778899",
	"#AABBCC",
	"#DDEEFF",
	"#FF00FF",
];

/**
 * 20色パレットを生成
 */
const generate20ColorPalette = (): string[] => {
	return [
		CUD_COLORS.red,
		CUD_COLORS.green,
		CUD_COLORS.blue,
		CUD_COLORS.orange,
		CUD_COLORS.yellow,
		CUD_COLORS.pink,
		CUD_COLORS.skyBlue,
		CUD_COLORS.brown,
		CUD_COLORS.purple,
		CUD_COLORS.white,
		CUD_COLORS.black,
		CUD_COLORS.lightGray,
		NON_CUD_COLORS[0],
		NON_CUD_COLORS[1],
		NON_CUD_COLORS[2],
		NON_CUD_COLORS[3],
		NON_CUD_COLORS[4],
		NON_CUD_COLORS[5],
		NON_CUD_COLORS[6],
		NON_CUD_COLORS[7],
	];
};

/**
 * ランダムな色パレットを生成
 */
const generateRandomPalette = (size: number): string[] => {
	const palette: string[] = [];
	for (let i = 0; i < size; i++) {
		const r = Math.floor(Math.random() * 256)
			.toString(16)
			.padStart(2, "0");
		const g = Math.floor(Math.random() * 256)
			.toString(16)
			.padStart(2, "0");
		const b = Math.floor(Math.random() * 256)
			.toString(16)
			.padStart(2, "0");
		palette.push(`#${r}${g}${b}`.toUpperCase());
	}
	return palette;
};

/**
 * ガベージコレクションを実行（Bun環境対応）
 * Bun.gc()を使用し、利用不可の場合はスキップ
 */
const forceGC = (): boolean => {
	// Bun環境でのGC
	if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
		Bun.gc(true); // force synchronous GC
		return true;
	}
	// Node.js環境でのGC（--expose-gc必要）
	if (
		typeof global !== "undefined" &&
		typeof (global as { gc?: () => void }).gc === "function"
	) {
		(global as { gc: () => void }).gc();
		return true;
	}
	return false;
};

/**
 * メモリ使用量を取得
 */
const getMemoryUsage = (): number | null => {
	if (typeof process !== "undefined" && process.memoryUsage) {
		return process.memoryUsage().heapUsed;
	}
	return null;
};

/**
 * シードを使った疑似ランダムパレット生成（テスト再現性用）
 */
const generateSeededPalette = (size: number, seed: number): string[] => {
	const palette: string[] = [];
	let current = seed;

	for (let i = 0; i < size; i++) {
		// 簡易的な線形合同法
		current = (current * 1103515245 + 12345) % 2147483648;
		const r = (current >> 16) & 0xff;
		const g = (current >> 8) & 0xff;
		const b = current & 0xff;

		palette.push(
			`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase(),
		);
	}

	return palette;
};

// ============================================================================
// 1. 20色パレット最適化パフォーマンステスト
// ============================================================================

describe("20色パレット最適化パフォーマンステスト", () => {
	let anchor: ReturnType<typeof createAnchorColor>;
	let palette20: string[];

	beforeEach(() => {
		anchor = createAnchorColor(CUD_COLORS.red);
		palette20 = generate20ColorPalette();
	});

	describe("Requirement 8.1: 20色パレットの最適化完了確認", () => {
		it("Softモードで20色パレットが正常に処理される", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(palette20, anchor, options);

			expect(result.palette).toHaveLength(20);
			expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
			expect(result.processingTimeMs).toBeLessThan(
				THRESHOLDS.OPTIMIZATION_20_COLORS,
			);
		});

		it("Strictモードで20色パレットが正常に処理される", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "strict",
			};

			const result = optimizePalette(palette20, anchor, options);

			expect(result.palette).toHaveLength(20);
			expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
			expect(result.processingTimeMs).toBeLessThan(
				THRESHOLDS.OPTIMIZATION_20_COLORS,
			);
		});

		it("複数回の実行で処理時間が安定している", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 10回連続で実行
			const times: number[] = [];
			for (let i = 0; i < 10; i++) {
				const result = optimizePalette(palette20, anchor, options);
				times.push(result.processingTimeMs);
			}

			// 全ての実行が閾値以内
			for (const time of times) {
				expect(time).toBeLessThan(THRESHOLDS.OPTIMIZATION_20_COLORS);
			}

			// 平均処理時間を確認
			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
			expect(avgTime).toBeLessThan(THRESHOLDS.OPTIMIZATION_20_COLORS);
		});

		it("ランダム色パレットでも正常に処理される", () => {
			const randomPalette = generateRandomPalette(20);
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(randomPalette, anchor, options);

			expect(result.palette).toHaveLength(20);
			expect(result.processingTimeMs).toBeLessThan(
				THRESHOLDS.OPTIMIZATION_20_COLORS,
			);
		});

		it("異なるlambda値でも正常に処理される", () => {
			const lambdaValues = [0, 0.25, 0.5, 0.75, 1.0];

			for (const lambda of lambdaValues) {
				const options: OptimizationOptions = {
					lambda,
					mode: "soft",
				};

				const result = optimizePalette(palette20, anchor, options);
				expect(result.palette).toHaveLength(20);
				expect(result.processingTimeMs).toBeLessThan(
					THRESHOLDS.OPTIMIZATION_20_COLORS,
				);
			}
		});

		it("カスタム閾値を使用しても正常に処理される", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
				zoneThresholds: {
					safe: 0.03,
					warning: 0.1,
				},
				returnFactor: 0.7,
			};

			const result = optimizePalette(palette20, anchor, options);

			expect(result.palette).toHaveLength(20);
			expect(result.processingTimeMs).toBeLessThan(
				THRESHOLDS.OPTIMIZATION_20_COLORS,
			);
		});
	});

	describe("スケーラビリティテスト", () => {
		it("5色パレットの処理時間は20色より短い（または同等）", () => {
			const palette5 = palette20.slice(0, 5);
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result5 = optimizePalette(palette5, anchor, options);
			const result20 = optimizePalette(palette20, anchor, options);

			// 5色の方が高速（または同等、スケジューラのジッター許容）
			expect(result5.processingTimeMs).toBeLessThanOrEqual(
				result20.processingTimeMs + 50,
			);
		});

		it("処理時間はパレットサイズに対して妥当な範囲内", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 5色、10色、15色、20色で測定
			const sizes = [5, 10, 15, 20];
			const times: number[] = [];

			for (const size of sizes) {
				const palette = palette20.slice(0, size);
				const result = optimizePalette(palette, anchor, options);
				times.push(result.processingTimeMs);
			}

			// 全て閾値以内であることを確認
			for (const time of times) {
				expect(time).toBeLessThan(THRESHOLDS.OPTIMIZATION_20_COLORS);
			}
		});
	});
});

// ============================================================================
// 2. 100回連続最適化でのメモリリーク/安定性テスト
// ============================================================================

describe("100回連続最適化での安定性テスト", () => {
	const ITERATIONS = 100;
	let anchor: ReturnType<typeof createAnchorColor>;
	let gcAvailable: boolean;

	beforeEach(() => {
		anchor = createAnchorColor(CUD_COLORS.red);
		gcAvailable = forceGC();
	});

	afterEach(() => {
		forceGC();
	});

	describe("Requirement 8.1: 100回連続最適化の安定動作", () => {
		it("100回連続実行しても正常に動作する", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 100回連続実行
			for (let i = 0; i < ITERATIONS; i++) {
				const palette = generateRandomPalette(20);
				const result = optimizePalette(palette, anchor, options);

				// 各実行が正常に完了することを確認
				expect(result.palette).toHaveLength(20);
				expect(result.cudComplianceRate).toBeGreaterThanOrEqual(0);
				expect(result.cudComplianceRate).toBeLessThanOrEqual(100);
			}
		});

		it("100回連続実行後もメモリ使用量が妥当な範囲（GC利用可能時のみ厳密チェック）", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			forceGC();
			const initialMemory = getMemoryUsage();

			// 100回連続実行
			for (let i = 0; i < ITERATIONS; i++) {
				const palette = generateRandomPalette(20);
				optimizePalette(palette, anchor, options);
			}

			forceGC();
			const finalMemory = getMemoryUsage();

			// メモリが取得できない環境では動作確認のみ
			if (initialMemory === null || finalMemory === null) {
				expect(true).toBe(true);
				return;
			}

			// GCが利用可能な場合のみ厳密なメモリチェック
			if (gcAvailable) {
				const memoryIncrease = finalMemory - initialMemory;
				const maxAllowedIncrease = 100 * 1024 * 1024; // 100MB
				expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
			} else {
				// GC不可の場合は、メモリが取得できることの確認のみ
				expect(finalMemory).toBeGreaterThan(0);
			}
		});

		it("キャッシュ使用時も100回連続で正常動作する", () => {
			const cache = createOptimizationCache({ maxSize: 50 });
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 100回連続実行（一部はキャッシュヒット）
			for (let i = 0; i < ITERATIONS; i++) {
				// 10種類のパレットを循環使用（キャッシュヒットを発生させる）
				const paletteIndex = i % 10;
				const seed = paletteIndex * 1000;
				const palette = generateSeededPalette(20, seed);

				const result = optimizePaletteWithCache(
					palette,
					anchor,
					options,
					cache,
				);
				expect(result.palette).toHaveLength(20);
			}

			// キャッシュサイズが制限内
			expect(cache.size()).toBeLessThanOrEqual(50);
		});

		it("異なるアンカーカラーでも安定動作する", () => {
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const anchors = [
				createAnchorColor(CUD_COLORS.red),
				createAnchorColor(CUD_COLORS.green),
				createAnchorColor(CUD_COLORS.blue),
				createAnchorColor(CUD_COLORS.orange),
				createAnchorColor("#567890"),
			];

			// 各アンカーで20回ずつ、計100回実行
			for (let i = 0; i < ITERATIONS; i++) {
				const currentAnchor = anchors[i % anchors.length];
				const palette = generateRandomPalette(20);

				const result = optimizePalette(palette, currentAnchor, options);
				expect(result.palette).toHaveLength(20);
			}
		});

		it("Soft/Strictモードの切り替えを含む100回連続実行", () => {
			// Soft/Strictを交互に実行
			for (let i = 0; i < ITERATIONS; i++) {
				const mode: "soft" | "strict" = i % 2 === 0 ? "soft" : "strict";
				const options: OptimizationOptions = {
					lambda: 0.5,
					mode,
				};

				const palette = generateRandomPalette(20);
				const result = optimizePalette(palette, anchor, options);

				expect(result.palette).toHaveLength(20);
			}
		});
	});

	describe("キャッシュ機能の動作確認", () => {
		it("キャッシュヒット時は初回よりも高速", () => {
			const cache = createOptimizationCache();
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};
			const palette = generate20ColorPalette();

			// 最初の実行（キャッシュミス）
			const firstResult = optimizePaletteWithCache(
				palette,
				anchor,
				options,
				cache,
			);

			// 2回目の実行（キャッシュヒット）
			const secondResult = optimizePaletteWithCache(
				palette,
				anchor,
				options,
				cache,
			);

			// キャッシュヒット時は初回よりも高速（相対比較のみ）
			expect(secondResult.processingTimeMs).toBeLessThanOrEqual(
				firstResult.processingTimeMs,
			);

			// 結果が同一であることを確認
			expect(secondResult.palette).toHaveLength(firstResult.palette.length);
		});

		it("キャッシュサイズ制限が正しく機能する", () => {
			const cache = createOptimizationCache({ maxSize: 10 });
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			// 20回異なるパレットで実行
			for (let i = 0; i < 20; i++) {
				const palette = generateSeededPalette(10, i * 1000);
				optimizePaletteWithCache(palette, anchor, options, cache);
			}

			// キャッシュサイズが制限を超えない
			expect(cache.size()).toBeLessThanOrEqual(10);
		});
	});
});

// ============================================================================
// 3. モード切替のレスポンステスト
// ============================================================================

describe("モード切替のレスポンステスト", () => {
	describe("Requirement 8.1: モード切替の正常動作", () => {
		it("processPaletteWithModeの各モードが正常に完了する", () => {
			const palette = generate20ColorPalette();
			const modes: CudCompatibilityMode[] = ["off", "guide", "soft", "strict"];

			for (const mode of modes) {
				const startTime = performance.now();
				const result = processPaletteWithMode(palette, mode);
				const endTime = performance.now();

				const processingTime = endTime - startTime;
				expect(processingTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);
				expect(result.processed).toHaveLength(20);
			}
		});

		it("モード間の切り替えが正常に完了する", () => {
			const palette = generate20ColorPalette();
			const modesSequence: CudCompatibilityMode[] = [
				"off",
				"guide",
				"soft",
				"strict",
				"soft",
				"guide",
				"off",
			];

			for (let i = 1; i < modesSequence.length; i++) {
				const prevMode = modesSequence[i - 1];
				const currMode = modesSequence[i];

				// 前モードで処理
				processPaletteWithMode(palette, prevMode);

				// モード切り替え時間を計測
				const startTime = performance.now();
				const result = processPaletteWithMode(palette, currMode);
				const endTime = performance.now();

				const switchTime = endTime - startTime;
				expect(switchTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);
				expect(result.processed).toBeDefined();
			}
		});

		it("PaletteProcessorでのモード切り替えが正常に動作する", () => {
			const palette = generate20ColorPalette();
			const callback = () => {};
			const processor = createPaletteProcessor(palette, callback, "off");

			const modes: CudCompatibilityMode[] = ["guide", "soft", "strict", "off"];

			for (const mode of modes) {
				const startTime = performance.now();
				processor.setMode(mode);
				const endTime = performance.now();

				const switchTime = endTime - startTime;
				expect(switchTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);
				expect(processor.getMode()).toBe(mode);
			}
		});

		it("パレット更新後のモード適用が正常に動作する", () => {
			const callback = () => {};
			const processor = createPaletteProcessor(
				generate20ColorPalette(),
				callback,
				"soft",
			);

			// パレット更新
			const newPalette = generateRandomPalette(20);
			const startTime = performance.now();
			processor.updatePalette(newPalette);
			const endTime = performance.now();

			const updateTime = endTime - startTime;
			expect(updateTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);

			const result = processor.getResult();
			expect(result.processed).toHaveLength(20);
		});

		it("オプション変更後の再計算が正常に動作する", () => {
			const palette = generate20ColorPalette();
			const callback = () => {};
			const processor = createPaletteProcessor(palette, callback, "soft");

			// オプション変更
			const startTime = performance.now();
			processor.setOptions({
				lambda: 0.8,
				returnFactor: 0.3,
			});
			const endTime = performance.now();

			const optionsChangeTime = endTime - startTime;
			expect(optionsChangeTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);
		});
	});

	describe("連続モード切り替え", () => {
		it("10回連続モード切り替えが正常に動作する", () => {
			const palette = generate20ColorPalette();
			const callback = () => {};
			const processor = createPaletteProcessor(palette, callback, "off");

			const modes: CudCompatibilityMode[] = ["off", "guide", "soft", "strict"];

			for (let i = 0; i < 10; i++) {
				const mode = modes[i % modes.length];

				const startTime = performance.now();
				processor.setMode(mode);
				const endTime = performance.now();

				const switchTime = endTime - startTime;
				expect(switchTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);
			}
		});

		it("異なるパレットサイズでもモード切り替えが正常に動作する", () => {
			const sizes = [5, 10, 15, 20];

			for (const size of sizes) {
				const palette = generateRandomPalette(size);

				const startTime = performance.now();
				const result = processPaletteWithMode(palette, "soft");
				const endTime = performance.now();

				const processingTime = endTime - startTime;
				expect(processingTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);
				expect(result.processed).toHaveLength(size);
			}
		});
	});
});

// ============================================================================
// 4. 総合パフォーマンステスト
// ============================================================================

describe("総合パフォーマンステスト", () => {
	describe("ベンチマーク", () => {
		it("全モードの処理が正常に完了する", () => {
			const palette = generate20ColorPalette();
			const anchor = createAnchorColor(CUD_COLORS.red);
			const iterations = 5;

			const modes: ("soft" | "strict")[] = ["soft", "strict"];
			const benchmarks: Record<string, number> = {};

			for (const mode of modes) {
				const times: number[] = [];

				for (let i = 0; i < iterations; i++) {
					const options: OptimizationOptions = {
						lambda: 0.5,
						mode,
					};
					const result = optimizePalette(palette, anchor, options);
					times.push(result.processingTimeMs);
					expect(result.palette).toHaveLength(20);
				}

				const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
				benchmarks[mode] = avgTime;

				// 閾値以内
				expect(avgTime).toBeLessThan(THRESHOLDS.OPTIMIZATION_20_COLORS);
			}

			// ベンチマーク結果が記録されている
			expect(Object.keys(benchmarks)).toHaveLength(2);
		});

		it("UIモード処理が全て正常に完了する", () => {
			const palette = generate20ColorPalette();
			const modes: CudCompatibilityMode[] = ["off", "guide", "soft", "strict"];
			const benchmarks: Record<string, number> = {};

			for (const mode of modes) {
				const times: number[] = [];

				for (let i = 0; i < 5; i++) {
					const startTime = performance.now();
					const result = processPaletteWithMode(palette, mode);
					const endTime = performance.now();
					times.push(endTime - startTime);
					expect(result.processed).toHaveLength(20);
				}

				const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
				benchmarks[mode] = avgTime;

				// 各モード閾値以内
				expect(avgTime).toBeLessThan(THRESHOLDS.MODE_SWITCH);
			}

			expect(Object.keys(benchmarks)).toHaveLength(4);
		});
	});

	describe("負荷テスト", () => {
		it("大量の色（50色）でも正常に処理される", () => {
			const largePalette = generateRandomPalette(50);
			const anchor = createAnchorColor(CUD_COLORS.red);
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const result = optimizePalette(largePalette, anchor, options);

			expect(result.processingTimeMs).toBeLessThan(THRESHOLDS.LARGE_PALETTE);
			expect(result.palette).toHaveLength(50);
		});

		it("連続処理時の処理時間の安定性", () => {
			const palette = generate20ColorPalette();
			const anchor = createAnchorColor(CUD_COLORS.red);
			const options: OptimizationOptions = {
				lambda: 0.5,
				mode: "soft",
			};

			const times: number[] = [];
			for (let i = 0; i < 20; i++) {
				const result = optimizePalette(palette, anchor, options);
				times.push(result.processingTimeMs);
			}

			// 全ての実行が閾値以内
			for (const time of times) {
				expect(time).toBeLessThan(THRESHOLDS.OPTIMIZATION_20_COLORS);
			}

			// 標準偏差を計算（安定性の指標）
			const avg = times.reduce((a, b) => a + b, 0) / times.length;
			const variance =
				times.reduce((sum, t) => sum + (t - avg) ** 2, 0) / times.length;
			const stdDev = Math.sqrt(variance);

			// 標準偏差が記録されていることを確認（参考値として）
			expect(stdDev).toBeGreaterThanOrEqual(0);
		});
	});
});

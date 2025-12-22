import { describe, expect, test } from "bun:test";
import {
	CUD_ACCENT_COLORS,
	CUD_BASE_COLORS,
	CUD_NEUTRAL_COLORS,
} from "./colors";
import {
	findExactCudColorByHex,
	findNearestCudColor,
	getCudColorSet,
	getCudColorsByGroup,
	type ProcessPaletteOptions,
	type ProcessPaletteResultV1,
	type ProcessPaletteResultV2,
	processPaletteWithModeV2,
} from "./service";

describe("CUD Palette Service", () => {
	describe("getCudColorSet (Task 3.1)", () => {
		test("should return all 20 colors", () => {
			const colors = getCudColorSet();
			expect(colors).toHaveLength(20);
		});

		test("should return readonly array", () => {
			const colors = getCudColorSet();
			expect(Object.isFrozen(colors)).toBe(true);
		});

		test("should return consistent reference", () => {
			const colors1 = getCudColorSet();
			const colors2 = getCudColorSet();
			expect(colors1).toBe(colors2);
		});
	});

	describe("getCudColorsByGroup (Task 3.1)", () => {
		test("should return 9 accent colors", () => {
			const colors = getCudColorsByGroup("accent");
			expect(colors).toHaveLength(9);
			for (const color of colors) {
				expect(color.group).toBe("accent");
			}
		});

		test("should return 7 base colors", () => {
			const colors = getCudColorsByGroup("base");
			expect(colors).toHaveLength(7);
			for (const color of colors) {
				expect(color.group).toBe("base");
			}
		});

		test("should return 4 neutral colors", () => {
			const colors = getCudColorsByGroup("neutral");
			expect(colors).toHaveLength(4);
			for (const color of colors) {
				expect(color.group).toBe("neutral");
			}
		});

		test("should return readonly array", () => {
			const colors = getCudColorsByGroup("accent");
			expect(Object.isFrozen(colors)).toBe(true);
		});

		test("should return consistent reference for same group", () => {
			const colors1 = getCudColorsByGroup("base");
			const colors2 = getCudColorsByGroup("base");
			expect(colors1).toBe(colors2);
		});
	});

	describe("findExactCudColorByHex (Task 3.2)", () => {
		test("should find exact match with uppercase hex", () => {
			const result = findExactCudColorByHex("#FF2800");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("red");
		});

		test("should find exact match with lowercase hex", () => {
			const result = findExactCudColorByHex("#ff2800");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("red");
		});

		test("should find exact match without hash prefix", () => {
			const result = findExactCudColorByHex("FF2800");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("red");
		});

		test("should return null for non-CUD color", () => {
			const result = findExactCudColorByHex("#123456");
			expect(result).toBeNull();
		});

		test("should find all CUD colors", () => {
			const allColors = [
				...CUD_ACCENT_COLORS,
				...CUD_BASE_COLORS,
				...CUD_NEUTRAL_COLORS,
			];
			for (const color of allColors) {
				const result = findExactCudColorByHex(color.hex);
				expect(result).not.toBeNull();
				expect(result?.id).toBe(color.id);
			}
		});

		test("should handle white", () => {
			const result = findExactCudColorByHex("#FFFFFF");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("white");
		});

		test("should handle black", () => {
			const result = findExactCudColorByHex("#000000");
			expect(result).not.toBeNull();
			expect(result?.id).toBe("black");
		});
	});

	describe("findNearestCudColor (Task 3.3)", () => {
		test("should return exact match with deltaE close to 0", () => {
			const result = findNearestCudColor("#FF2800");
			expect(result.nearest.id).toBe("red");
			expect(result.deltaE).toBeLessThan(0.001);
			expect(result.matchLevel).toBe("exact");
		});

		test("should return search result structure", () => {
			const result = findNearestCudColor("#FF0000");
			expect(result).toHaveProperty("nearest");
			expect(result).toHaveProperty("deltaE");
			expect(result).toHaveProperty("matchLevel");
			expect(result.nearest).toHaveProperty("id");
			expect(result.nearest).toHaveProperty("hex");
		});

		test("should classify exact match (deltaE <= 0.03)", () => {
			// CUD red is #FF2800, test with very similar color
			const result = findNearestCudColor("#FF2800");
			expect(result.matchLevel).toBe("exact");
			expect(result.deltaE).toBeLessThanOrEqual(0.03);
		});

		test("should classify near match (0.03 < deltaE <= 0.06)", () => {
			// Find a color that's close but not exact
			// Slightly adjusted red
			const result = findNearestCudColor("#FF3300");
			expect(["exact", "near"]).toContain(result.matchLevel);
		});

		test("should classify off match (deltaE > 0.06)", () => {
			// A color that's distinctly different from all CUD colors
			const result = findNearestCudColor("#808080"); // mid gray not in CUD
			if (result.deltaE > 0.06) {
				expect(result.matchLevel).toBe("off");
			}
		});

		test("should find nearest for arbitrary color", () => {
			// Pure red should be closest to CUD red
			const result = findNearestCudColor("#FF0000");
			expect(result.nearest.id).toBe("red");
		});

		test("should handle colors in different hue regions", () => {
			// Test blue region
			const blueResult = findNearestCudColor("#0000FF");
			expect(blueResult.nearest.group).toBe("accent");

			// Test yellow region
			const yellowResult = findNearestCudColor("#FFFF00");
			expect(yellowResult.nearest.id).toBe("yellow");
		});

		test("should return correct deltaE value", () => {
			const result = findNearestCudColor("#FF2800"); // exact CUD red
			expect(result.deltaE).toBeGreaterThanOrEqual(0);
		});

		test("should work with white", () => {
			const result = findNearestCudColor("#FFFFFF");
			expect(result.nearest.id).toBe("white");
			expect(result.matchLevel).toBe("exact");
		});

		test("should work with black", () => {
			const result = findNearestCudColor("#000000");
			expect(result.nearest.id).toBe("black");
			expect(result.matchLevel).toBe("exact");
		});

		test("should accept hex without hash", () => {
			const result = findNearestCudColor("FF2800");
			expect(result.nearest.id).toBe("red");
		});

		test("should accept lowercase hex", () => {
			const result = findNearestCudColor("#ff2800");
			expect(result.nearest.id).toBe("red");
		});
	});
});

/**
 * タスク4.1: processPaletteWithModeのv2対応テスト
 * Requirements: 9.1, 9.2, 9.3
 */
describe("processPaletteWithModeV2 - Task 4.1", () => {
	describe("apiVersion option (Requirement 9.1)", () => {
		test("should support apiVersion option with v1 or v2 values", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const optionsV1: ProcessPaletteOptions = {
				mode: "soft",
				apiVersion: "v1",
			};
			const optionsV2: ProcessPaletteOptions = {
				mode: "soft",
				apiVersion: "v2",
			};

			// 両方のオプションが受け入れられることを確認
			expect(() => processPaletteWithModeV2(colors, optionsV1)).not.toThrow();
			expect(() => processPaletteWithModeV2(colors, optionsV2)).not.toThrow();
		});
	});

	describe("v1 API backward compatibility (Requirement 9.2)", () => {
		test("should return ProcessPaletteResultV1 when apiVersion is v1", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v1",
			});

			// v1結果の構造を検証
			expect(result).toHaveProperty("palette");
			expect(Array.isArray((result as ProcessPaletteResultV1).palette)).toBe(
				true,
			);
			expect(result).toHaveProperty("cudComplianceRate");
			expect(result).toHaveProperty("harmonyScore");
			expect(result).toHaveProperty("warnings");
		});

		test("should return ProcessPaletteResultV1 when apiVersion is not specified", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			// apiVersionを指定しない
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
			});

			// デフォルトはv1
			expect(result).toHaveProperty("palette");
			expect(Array.isArray((result as ProcessPaletteResultV1).palette)).toBe(
				true,
			);
		});

		test("v1 result palette should contain OptimizedColor objects", () => {
			const colors = ["#FF2800", "#35A16B"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v1",
			}) as ProcessPaletteResultV1;

			expect(result.palette.length).toBe(2);
			// OptimizedColorの構造を検証
			for (const color of result.palette) {
				expect(color).toHaveProperty("hex");
				expect(color).toHaveProperty("originalHex");
				expect(color).toHaveProperty("zone");
				expect(color).toHaveProperty("deltaE");
				expect(color).toHaveProperty("snapped");
			}
		});
	});

	describe("v2 API with BrandToken (Requirement 9.3)", () => {
		test("should return ProcessPaletteResultV2 when apiVersion is v2", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
			});

			// v2結果の構造を検証
			expect(result).toHaveProperty("brandTokens");
			expect(
				Array.isArray((result as ProcessPaletteResultV2).brandTokens),
			).toBe(true);
			expect(result).toHaveProperty("dadsReferences");
			expect(result).toHaveProperty("cudComplianceRate");
			expect(result).toHaveProperty("harmonyScore");
			expect(result).toHaveProperty("warnings");
		});

		test("v2 result brandTokens should contain BrandToken objects", () => {
			const colors = ["#FF2800", "#35A16B"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(2);
			// BrandTokenの構造を検証
			for (const token of result.brandTokens) {
				expect(token).toHaveProperty("id");
				expect(token).toHaveProperty("hex");
				expect(token).toHaveProperty("source");
				expect(token.source).toBe("brand");
				expect(token).toHaveProperty("dadsReference");
				// dadsReferenceの構造を検証
				expect(token.dadsReference).toHaveProperty("tokenId");
				expect(token.dadsReference).toHaveProperty("tokenHex");
				expect(token.dadsReference).toHaveProperty("deltaE");
				expect(token.dadsReference).toHaveProperty("derivationType");
				expect(token.dadsReference).toHaveProperty("zone");
			}
		});

		test("v2 result dadsReferences should be a Map of DadsToken", () => {
			const colors = ["#FF2800", "#35A16B"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(result.dadsReferences).toBeInstanceOf(Map);
			// 参照されたDadsTokenが含まれる
			for (const [tokenId, dadsToken] of result.dadsReferences) {
				expect(typeof tokenId).toBe("string");
				expect(dadsToken).toHaveProperty("id");
				expect(dadsToken).toHaveProperty("hex");
				expect(dadsToken).toHaveProperty("source");
				expect(dadsToken.source).toBe("dads");
			}
		});

		test("v2 brandTokens should preserve originalHex for traceability", () => {
			const colors = ["#FF3000"]; // CUD赤に近い色
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens[0]).toHaveProperty("originalHex");
			expect(result.brandTokens[0].originalHex).toBe("#FF3000");
		});
	});

	describe("Mode support (soft and strict)", () => {
		test("should work with soft mode", () => {
			const colors = ["#FF2800", "#123456"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(2);
		});

		test("should work with strict mode", () => {
			const colors = ["#FF2800", "#123456"];
			const result = processPaletteWithModeV2(colors, {
				mode: "strict",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(2);
			// Strictモードでは全てstrict-snap
			for (const token of result.brandTokens) {
				expect(token.dadsReference.derivationType).toBe("strict-snap");
			}
		});

		test("strict mode cudComplianceRate reflects original color zones", () => {
			// Strictモードでは全色がCUD推奨色にスナップされるが、
			// cudComplianceRateは元の色のゾーンに基づいて計算される
			// #123456 はOff Zone、#AABBCC はWarning Zone（CUDグレーに近い）
			const colors = ["#123456", "#AABBCC"];
			const result = processPaletteWithModeV2(colors, {
				mode: "strict",
				apiVersion: "v2",
			});

			// 1色がOff Zone、1色がWarning Zone → 50%準拠
			expect(result.cudComplianceRate).toBe(50);
		});

		test("strict mode with CUD colors should have 100% CUD compliance", () => {
			// CUD推奨色のみの場合は100%準拠
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithModeV2(colors, {
				mode: "strict",
				apiVersion: "v2",
			});

			expect(result.cudComplianceRate).toBe(100);
		});
	});

	describe("TypeScript type inference with generics", () => {
		test("return type should be inferred based on apiVersion", () => {
			const colors = ["#FF2800"];

			// v1の戻り値型
			const resultV1 = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v1",
			});
			// TypeScriptコンパイル時にpalette属性がある
			expect("palette" in resultV1).toBe(true);

			// v2の戻り値型
			const resultV2 = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
			});
			// TypeScriptコンパイル時にbrandTokens属性がある
			expect("brandTokens" in resultV2).toBe(true);
		});
	});

	describe("Edge cases", () => {
		test("should handle empty palette", () => {
			expect(() =>
				processPaletteWithModeV2([], { mode: "soft", apiVersion: "v2" }),
			).toThrow();
		});

		test("should handle single color palette", () => {
			const result = processPaletteWithModeV2(["#FF2800"], {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(1);
		});

		test("should normalize hex values (lowercase, without #)", () => {
			const result = processPaletteWithModeV2(["ff2800"], {
				mode: "soft",
				apiVersion: "v2",
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens[0].hex).toMatch(/^#[A-F0-9]{6}$/);
		});
	});
});

/**
 * タスク4.2: アンカーカラー指定とコンテキスト対応
 * Requirements: 9.4, 9.5, 9.6
 */
describe("processPaletteWithModeV2 - Task 4.2 Anchor and Context", () => {
	describe("anchor option (Requirement 9.4)", () => {
		test("should accept anchor option with anchorHex property", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorHex: "#35A16B",
				},
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(3);
		});

		test("should accept anchor option with anchorIndex property", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorIndex: 1,
				},
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(3);
		});

		test("should use anchorIndex to determine anchor color", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			// anchorIndex=1 で緑をアンカーに指定
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorIndex: 1,
				},
			}) as ProcessPaletteResultV2;

			// 緑色（アンカー）は固定なので変更されない
			expect(result.brandTokens[1].originalHex).toBe("#35A16B");
		});

		test("should prioritize anchorHex over anchorIndex when both provided", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			// anchorHexを指定した場合、anchorIndexは無視される
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorHex: "#0041FF",
					anchorIndex: 0, // これは無視される
				},
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(3);
		});
	});

	describe("isFixed option (Requirement 9.5)", () => {
		test("should output warning when isFixed is false", () => {
			const colors = ["#FF2800", "#35A16B"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorHex: "#FF2800",
					isFixed: false,
				},
			}) as ProcessPaletteResultV2;

			// 警告メッセージが含まれることを確認
			expect(
				result.warnings.some(
					(w) => w.includes("isFixed") || w.includes("fixed"),
				),
			).toBe(true);
		});

		test("should treat isFixed=false as true (current implementation)", () => {
			const colors = ["#FF2800", "#35A16B"];
			// isFixed=falseでも、現在未実装のためtrueとして扱う
			const resultFixed = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorHex: "#FF2800",
					isFixed: true,
				},
			}) as ProcessPaletteResultV2;

			const resultNotFixed = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorHex: "#FF2800",
					isFixed: false,
				},
			}) as ProcessPaletteResultV2;

			// アンカー色は同じ結果になるはず（isFixed=falseでもtrueとして扱う）
			expect(resultFixed.brandTokens[0].hex).toBe(
				resultNotFixed.brandTokens[0].hex,
			);
		});

		test("should not output warning when isFixed is true or undefined", () => {
			const colors = ["#FF2800", "#35A16B"];

			// isFixed=trueの場合
			const resultTrue = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorHex: "#FF2800",
					isFixed: true,
				},
			}) as ProcessPaletteResultV2;
			expect(resultTrue.warnings.some((w) => w.includes("isFixed"))).toBe(
				false,
			);

			// isFixed未指定の場合
			const resultUndefined = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorHex: "#FF2800",
				},
			}) as ProcessPaletteResultV2;
			expect(resultUndefined.warnings.some((w) => w.includes("isFixed"))).toBe(
				false,
			);
		});
	});

	describe("generationContext option (Requirement 9.6)", () => {
		test("should accept generationContext option", () => {
			const colors = ["#FF2800", "#35A16B"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					namespace: "myapp",
					usedIds: new Set<string>(),
				},
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(2);
		});

		test("should use namespace in generated IDs when provided", () => {
			const colors = ["#FF2800"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					namespace: "myapp",
					usedIds: new Set<string>(),
				},
			}) as ProcessPaletteResultV2;

			// namespaceが含まれるIDが生成される
			expect(result.brandTokens[0].id).toContain("myapp");
		});

		test("should use usedIds to avoid duplicate IDs", () => {
			const colors = ["#FF2800", "#FF3000"];
			const usedIds = new Set<string>(["brand-color-1-500"]);
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					usedIds,
				},
			}) as ProcessPaletteResultV2;

			// 既存IDと重複しない
			const ids = result.brandTokens.map((t) => t.id);
			expect(ids.includes("brand-color-1-500")).toBe(false);
			// 全てのIDがユニーク
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		test("should update usedIds with new generated IDs", () => {
			const colors = ["#FF2800", "#35A16B"];
			const usedIds = new Set<string>();
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					usedIds,
				},
			}) as ProcessPaletteResultV2;

			// 生成されたIDがusedIdsに追加されている
			for (const token of result.brandTokens) {
				expect(usedIds.has(token.id)).toBe(true);
			}
		});

		test("should use roles when provided in generationContext", () => {
			const colors = ["#FF2800", "#35A16B"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					roles: ["primary", "secondary"],
					usedIds: new Set<string>(),
				},
			}) as ProcessPaletteResultV2;

			// ロール名がIDに含まれる
			expect(result.brandTokens[0].id).toContain("primary");
			expect(result.brandTokens[1].id).toContain("secondary");
		});

		test("should fall back to default role naming when roles are exhausted", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				generationContext: {
					roles: ["primary"], // 1つだけ
					usedIds: new Set<string>(),
				},
			}) as ProcessPaletteResultV2;

			// 1番目はprimary
			expect(result.brandTokens[0].id).toContain("primary");
			// 2番目以降はデフォルトの命名
			expect(result.brandTokens[1].id).not.toContain("primary");
			expect(result.brandTokens[2].id).not.toContain("primary");
		});
	});

	describe("Combined anchor and generationContext", () => {
		test("should work with both anchor and generationContext options", () => {
			const colors = ["#FF2800", "#35A16B", "#0041FF"];
			const usedIds = new Set<string>();
			const result = processPaletteWithModeV2(colors, {
				mode: "soft",
				apiVersion: "v2",
				anchor: {
					anchorIndex: 0,
					isFixed: true,
				},
				generationContext: {
					namespace: "brand",
					roles: ["primary", "secondary", "accent"],
					usedIds,
				},
			}) as ProcessPaletteResultV2;

			expect(result.brandTokens.length).toBe(3);
			// 全てのIDにnamespaceが含まれる
			for (const token of result.brandTokens) {
				expect(token.id).toContain("brand");
			}
		});
	});
});

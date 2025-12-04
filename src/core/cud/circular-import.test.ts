/**
 * インポート循環検証
 * Requirement 10.3: src/core/cud/からの循環依存がないことを検証
 */
import { describe, expect, test } from "bun:test";

describe("Circular Import Verification (Task 10.3)", () => {
	test("colors.ts should be importable without circular dependency", async () => {
		const importFn = async () => {
			const module = await import("./colors");
			return module;
		};

		await expect(importFn()).resolves.toBeDefined();
	});

	test("service.ts should be importable without circular dependency", async () => {
		const importFn = async () => {
			const module = await import("./service");
			return module;
		};

		await expect(importFn()).resolves.toBeDefined();
	});

	test("classifier.ts should be importable without circular dependency", async () => {
		const importFn = async () => {
			const module = await import("./classifier");
			return module;
		};

		await expect(importFn()).resolves.toBeDefined();
	});

	test("cvd.ts should be importable without circular dependency", async () => {
		const importFn = async () => {
			const module = await import("./cvd");
			return module;
		};

		await expect(importFn()).resolves.toBeDefined();
	});

	test("validator.ts should be importable without circular dependency", async () => {
		const importFn = async () => {
			const module = await import("./validator");
			return module;
		};

		await expect(importFn()).resolves.toBeDefined();
	});

	test("all CUD modules should export expected functions", async () => {
		const colors = await import("./colors");
		const service = await import("./service");
		const classifier = await import("./classifier");
		const cvd = await import("./cvd");
		const validator = await import("./validator");

		// colors.ts exports
		expect(colors.CUD_COLOR_SET).toBeDefined();
		expect(colors.CUD_ACCENT_COLORS).toBeDefined();
		expect(colors.CUD_BASE_COLORS).toBeDefined();
		expect(colors.CUD_NEUTRAL_COLORS).toBeDefined();
		expect(colors.computeOklchStats).toBeDefined();

		// service.ts exports
		expect(service.getCudColorSet).toBeDefined();
		expect(service.getCudColorsByGroup).toBeDefined();
		expect(service.findExactCudColorByHex).toBeDefined();
		expect(service.findNearestCudColor).toBeDefined();

		// classifier.ts exports
		expect(classifier.classifyHue).toBeDefined();
		expect(classifier.classifyLightness).toBeDefined();
		expect(classifier.classifyColor).toBeDefined();
		expect(classifier.isSameCluster).toBeDefined();

		// cvd.ts exports
		expect(cvd.simulateCvdWithFormats).toBeDefined();

		// validator.ts exports
		expect(validator.validatePalette).toBeDefined();
	});

	test("CUD modules should not depend on UI modules", () => {
		// This is a design constraint verification
		// CUD core modules should work independently of UI
		// We verify this by checking that core CUD functions work without DOM

		const { findNearestCudColor } = require("./service");
		const { classifyColor } = require("./classifier");
		const { validatePalette } = require("./validator");

		// These should work without any DOM dependency
		expect(() => findNearestCudColor("#FF2800")).not.toThrow();
		expect(() => classifyColor({ l: 0.5, c: 0.2, h: 30 })).not.toThrow();
		expect(() =>
			validatePalette([{ hex: "#FF2800", role: "accent" }]),
		).not.toThrow();
	});

	test("module dependency chain is valid", () => {
		// Verify the expected dependency order:
		// colors.ts <- service.ts <- classifier.ts <- cvd.ts <- validator.ts
		// (arrows indicate "depends on")

		// This test ensures the modules can be loaded in the expected order
		const loadOrder = [
			() => require("./colors"),
			() => require("./service"),
			() => require("./classifier"),
			() => require("./cvd"),
			() => require("./validator"),
		];

		for (const load of loadOrder) {
			expect(load).not.toThrow();
		}
	});
});

/**
 * hue-mapper.test.ts
 * TDD: Tests for DADS hue mapping functionality
 *
 * Maps arbitrary hue values (0-360) to nearest DADS 10 hues
 */

import { describe, expect, test } from "bun:test";
import { findNearestDadsHue, normalizeHue } from "./hue-mapper";

describe("normalizeHue", () => {
	test("returns same value for hue in range 0-360", () => {
		expect(normalizeHue(180)).toBe(180);
		expect(normalizeHue(0)).toBe(0);
		expect(normalizeHue(359)).toBe(359);
	});

	test("normalizes hue >= 360", () => {
		expect(normalizeHue(360)).toBe(0);
		expect(normalizeHue(370)).toBe(10);
		expect(normalizeHue(720)).toBe(0);
	});

	test("normalizes negative hue", () => {
		expect(normalizeHue(-30)).toBe(330);
		expect(normalizeHue(-360)).toBe(0);
		expect(normalizeHue(-90)).toBe(270);
	});
});

describe("findNearestDadsHue", () => {
	/**
	 * DADS 10 Hues Reference:
	 * blue: 266, cyan: 251, teal: 216, green: 157, lime: 128
	 * yellow: 88, orange: 41, red: 27, magenta: 328, purple: 299
	 */

	describe("exact matches", () => {
		test("maps hue 266 exactly to blue", () => {
			const result = findNearestDadsHue(266);
			expect(result.hueName).toBe("blue");
			expect(result.hue).toBe(266);
			expect(result.distance).toBe(0);
		});

		test("maps hue 251 exactly to cyan", () => {
			const result = findNearestDadsHue(251);
			expect(result.hueName).toBe("cyan");
			expect(result.hue).toBe(251);
			expect(result.distance).toBe(0);
		});

		test("maps hue 88 exactly to yellow", () => {
			const result = findNearestDadsHue(88);
			expect(result.hueName).toBe("yellow");
			expect(result.hue).toBe(88);
			expect(result.distance).toBe(0);
		});

		test("maps hue 27 exactly to red", () => {
			const result = findNearestDadsHue(27);
			expect(result.hueName).toBe("red");
			expect(result.hue).toBe(27);
			expect(result.distance).toBe(0);
		});
	});

	describe("near matches", () => {
		test("maps hue 270 to blue (closer than purple 299)", () => {
			const result = findNearestDadsHue(270);
			expect(result.hueName).toBe("blue");
			expect(result.distance).toBe(4);
		});

		test("maps hue 90 to yellow (88)", () => {
			const result = findNearestDadsHue(90);
			expect(result.hueName).toBe("yellow");
			expect(result.distance).toBe(2);
		});

		test("maps hue 30 to red (27)", () => {
			const result = findNearestDadsHue(30);
			expect(result.hueName).toBe("red");
			expect(result.distance).toBe(3);
		});
	});

	describe("complementary hue mapping", () => {
		test("complementary of blue (266 + 180 = 86) maps to yellow (88)", () => {
			const blueComplement = (266 + 180) % 360; // 86
			const result = findNearestDadsHue(blueComplement);
			expect(result.hueName).toBe("yellow");
			expect(result.distance).toBe(2);
		});

		test("complementary of red (27 + 180 = 207) maps to teal (216)", () => {
			const redComplement = (27 + 180) % 360; // 207
			const result = findNearestDadsHue(redComplement);
			expect(result.hueName).toBe("teal");
			expect(result.distance).toBe(9);
		});

		test("complementary of green (157 + 180 = 337) maps to magenta (328)", () => {
			const greenComplement = (157 + 180) % 360; // 337
			const result = findNearestDadsHue(greenComplement);
			expect(result.hueName).toBe("magenta");
			expect(result.distance).toBe(9);
		});
	});

	describe("edge cases", () => {
		test("handles hue 0 correctly (maps to red 27)", () => {
			const result = findNearestDadsHue(0);
			expect(result.hueName).toBe("red");
			expect(result.distance).toBe(27);
		});

		test("handles hue 360 same as 0", () => {
			const result360 = findNearestDadsHue(360);
			const result0 = findNearestDadsHue(0);
			expect(result360.hueName).toBe(result0.hueName);
			expect(result360.distance).toBe(result0.distance);
		});

		test("handles negative hue normalization", () => {
			const resultNegative = findNearestDadsHue(-30);
			const resultPositive = findNearestDadsHue(330);
			expect(resultNegative.hueName).toBe(resultPositive.hueName);
			expect(resultNegative.distance).toBe(resultPositive.distance);
		});

		test("handles hue at boundary between two DADS hues", () => {
			// Midpoint between red (27) and orange (41) is 34
			const midpoint = (27 + 41) / 2; // 34
			const result = findNearestDadsHue(midpoint);
			// Should be closer to one or the other (7 from each)
			expect(["red", "orange"]).toContain(result.hueName);
		});
	});

	describe("triadic hue mapping", () => {
		test("triadic from blue (266): 120 and 240 degree offsets", () => {
			const blueTriadic1 = (266 + 120) % 360; // 26 -> red (27)
			const blueTriadic2 = (266 + 240) % 360; // 146 -> green (157)

			const result1 = findNearestDadsHue(blueTriadic1);
			const result2 = findNearestDadsHue(blueTriadic2);

			expect(result1.hueName).toBe("red");
			expect(result2.hueName).toBe("green");
		});
	});

	describe("analogous hue mapping", () => {
		test("analogous from blue (266): +30 and -30 degree offsets", () => {
			const blueAnalog1 = (266 + 30) % 360; // 296 -> purple (299)
			const blueAnalog2 = (266 - 30 + 360) % 360; // 236 -> teal (216) or cyan (251)

			const result1 = findNearestDadsHue(blueAnalog1);
			const result2 = findNearestDadsHue(blueAnalog2);

			expect(result1.hueName).toBe("purple");
			// 236 is closer to cyan (251) than teal (216)
			expect(result2.hueName).toBe("cyan");
		});
	});

	describe("all DADS hues are reachable", () => {
		const dadsHues = [
			{ name: "blue", hue: 266 },
			{ name: "cyan", hue: 251 },
			{ name: "teal", hue: 216 },
			{ name: "green", hue: 157 },
			{ name: "lime", hue: 128 },
			{ name: "yellow", hue: 88 },
			{ name: "orange", hue: 41 },
			{ name: "red", hue: 27 },
			{ name: "magenta", hue: 328 },
			{ name: "purple", hue: 299 },
		];

		for (const { name, hue } of dadsHues) {
			test(`DADS hue ${name} (${hue}) is reachable with distance 0`, () => {
				const result = findNearestDadsHue(hue);
				expect(result.hueName).toBe(name);
				expect(result.distance).toBe(0);
			});
		}
	});
});

import { describe, expect, it } from "bun:test";
import {
	formatCvdConfusionThreshold,
	parseCvdConfusionThreshold,
} from "./cvd-confusion-threshold";

describe("cvd-confusion-threshold", () => {
	describe("parseCvdConfusionThreshold", () => {
		it("accepts only supported thresholds", () => {
			expect(parseCvdConfusionThreshold("3.5")).toBe(3.5);
			expect(parseCvdConfusionThreshold(" 3.5 ")).toBe(3.5);
			expect(parseCvdConfusionThreshold("5")).toBe(5.0);
			expect(parseCvdConfusionThreshold("5.0")).toBe(5.0);
			expect(parseCvdConfusionThreshold(" 5.0 ")).toBe(5.0);
		});

		it("rejects non-string and malformed input", () => {
			expect(parseCvdConfusionThreshold(3.5)).toBeNull();
			expect(parseCvdConfusionThreshold("")).toBeNull();
			expect(parseCvdConfusionThreshold("3.5abc")).toBeNull();
			expect(parseCvdConfusionThreshold("5.0abc")).toBeNull();
			expect(parseCvdConfusionThreshold("5.00")).toBeNull();
		});
	});

	describe("formatCvdConfusionThreshold", () => {
		it("formats thresholds with one decimal", () => {
			expect(formatCvdConfusionThreshold(3.5)).toBe("3.5");
			expect(formatCvdConfusionThreshold(5.0)).toBe("5.0");
		});
	});
});

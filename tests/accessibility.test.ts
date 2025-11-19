import { describe, expect, it } from "bun:test";
import { Color } from "../src/core/color";
import { verifyContrast } from "../src/accessibility/wcag2";
import { getAPCA, getAPCAStatus } from "../src/accessibility/apca";

describe("Accessibility", () => {
    describe("WCAG 2.1", () => {
        it("should verify contrast correctly", () => {
            const black = new Color("#000000");
            const white = new Color("#ffffff");

            const result = verifyContrast(black, white);
            expect(result.contrast).toBeCloseTo(21, 1);
            expect(result.status).toBe("AAA");
            expect(result.isAAA).toBe(true);
        });

        it("should handle font size logic", () => {
            // #777777 on white is ~4.5:1
            const gray = new Color("#777777");
            const white = new Color("#ffffff");

            const small = verifyContrast(gray, white, 'small');
            // 4.47:1 -> Fail AAA, Pass AA? 
            // Actually #777777 on white is 4.47:1. So it fails AA (4.5).
            // Let's use a known passing color. #767676 is 4.54:1

            const passingGray = new Color("#767676");
            const resSmall = verifyContrast(passingGray, white, 'small');
            expect(resSmall.isAA).toBe(true);

            // For large text, 3.0 is required for AA.
            // #949494 is 3.03:1
            const largeGray = new Color("#949494");
            const resLarge = verifyContrast(largeGray, white, 'large');
            expect(resLarge.isAA).toBe(true);
        });
    });

    describe("APCA", () => {
        it("should calculate Lc correctly", () => {
            const black = new Color("#000000");
            const white = new Color("#ffffff");

            const lc = getAPCA(black, white);
            // Black on White should be around -106 to -108
            expect(Math.abs(lc)).toBeGreaterThan(100);
        });

        it("should return correct status", () => {
            const status = getAPCAStatus(95);
            expect(status).toBe("Preferred for body text");

            const fail = getAPCAStatus(10);
            expect(fail).toBe("Fail");
        });
    });
});

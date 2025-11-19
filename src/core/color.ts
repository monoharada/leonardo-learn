import {
    type ColorObject,
    toHex,
    toOklch,
} from "../utils/color-space";
import { getContrast } from "../utils/wcag";

/**
 * Represents a color in the design system.
 * Stores state as OKLCH for perceptual uniformity.
 */
export class Color {
    private _oklch: ColorObject;

    constructor(color: string | ColorObject) {
        if (typeof color === "string") {
            const parsed = toOklch(color);
            if (!parsed) {
                throw new Error(`Invalid color string: ${color}`);
            }
            this._oklch = parsed;
        } else {
            this._oklch = { ...color, mode: "oklch" };
        }
    }

    /**
     * Get the underlying OKLCH object
     */
    get oklch(): ColorObject {
        return { ...this._oklch };
    }

    /**
     * Get Hex string representation
     */
    toHex(): string {
        return toHex(this._oklch);
    }

    /**
     * Get CSS string (oklch function)
     */
    toCss(): string {
        const { l, c, h } = this._oklch;
        // Handle undefined hue (achromatic)
        const hue = h === undefined ? 0 : h;
        return `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${hue.toFixed(4)})`;
    }

    /**
     * Get relative luminance
     */
    get luminance(): number {
        // culori's wcagContrast uses relative luminance internally,
        // but we might need to expose it.
        // For now, we can use a helper or just rely on contrast.
        // Let's implement getLuminance in wcag.ts if needed, or just use a placeholder.
        // Actually, I missed adding getLuminance to wcag.ts in the previous step.
        // I'll add it now or use a temporary implementation.
        // culori has wcagLuminance.
        return 0; // Placeholder, will fix in next step
    }

    /**
     * Calculate contrast ratio against another color
     */
    contrast(other: Color): number {
        return getContrast(this._oklch, other.oklch);
    }

    /**
     * Clone this color
     */
    clone(): Color {
        return new Color(this._oklch);
    }
}

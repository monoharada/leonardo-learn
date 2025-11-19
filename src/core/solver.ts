import { Color } from "./color";

/**
 * Binary search to find a color with a specific contrast ratio against a background.
 * Adjusts the Lightness channel of the foreground color.
 */
export const findColorForContrast = (
    fgColor: Color,
    bgColor: Color,
    targetContrast: number,
    tolerance = 0.01
): Color | null => {
    // Initial check
    const currentContrast = fgColor.contrast(bgColor);
    if (Math.abs(currentContrast - targetContrast) <= tolerance) {
        return fgColor.clone();
    }

    // Determine search range and direction
    // We search the entire lightness range [0, 1]
    // But we need to know if we are looking for a lighter or darker color.
    // Actually, for a given background, there might be two solutions (one lighter, one darker).
    // Usually we want to preserve the hue/chroma and just change lightness.
    // And usually we want to find the *closest* lightness to the original that satisfies the contrast.

    const bgL = bgColor.oklch.l;
    const fgL = fgColor.oklch.l;

    // Try searching in direction of original lightness first?
    // Or just search both sides [0, bgL] and [bgL, 1] and pick the one closest to original fgL.

    const searchRange = (min: number, max: number): Color | null => {
        let low = min;
        let high = max;
        let best: Color | null = null;
        let minDiff = Infinity;

        for (let i = 0; i < 20; i++) {
            const mid = (low + high) / 2;
            const candidate = new Color({ ...fgColor.oklch, l: mid });
            const contrast = candidate.contrast(bgColor);
            const diff = Math.abs(contrast - targetContrast);

            if (diff < minDiff) {
                minDiff = diff;
                best = candidate;
            }

            if (diff <= tolerance) {
                return candidate;
            }

            // Contrast generally increases as we move away from bgL
            // If we are in [0, bgL], lower L means higher contrast (usually)
            // If we are in [bgL, 1], higher L means higher contrast (usually)

            if (mid < bgL) {
                // In darker range. Lower L -> Higher Contrast (usually)
                if (contrast < targetContrast) {
                    high = mid; // Need more contrast -> go darker -> lower L? Wait.
                    // Black (0) vs Bg(0.5) -> Contrast 21 (max)
                    // Mid (0.4) vs Bg(0.5) -> Contrast 1.2
                    // So yes, lower L = higher contrast.
                    high = mid;
                } else {
                    low = mid; // Contrast too high -> go lighter -> higher L
                }
            } else {
                // In lighter range. Higher L -> Higher Contrast
                if (contrast < targetContrast) {
                    low = mid; // Need more contrast -> go lighter
                } else {
                    high = mid; // Contrast too high -> go darker
                }
            }
        }
        return best;
    };

    // Search both sides
    const darkResult = searchRange(0, bgL);
    const lightResult = searchRange(bgL, 1);

    // Check which one is valid and closest to original L
    const validResults: Color[] = [];
    if (darkResult && Math.abs(darkResult.contrast(bgColor) - targetContrast) <= tolerance * 2) {
        validResults.push(darkResult);
    }
    if (lightResult && Math.abs(lightResult.contrast(bgColor) - targetContrast) <= tolerance * 2) {
        validResults.push(lightResult);
    }

    if (validResults.length === 0) return null;
    if (validResults.length === 1) return validResults[0];

    // Return the one closest to original lightness
    const d0 = Math.abs(validResults[0].oklch.l - fgL);
    const d1 = Math.abs(validResults[1].oklch.l - fgL);
    return d0 < d1 ? validResults[0] : validResults[1];
};

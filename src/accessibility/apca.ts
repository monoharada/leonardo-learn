// @ts-ignore
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import { Color } from '../core/color';
import { toRgb } from '../utils/color-space';

/**
 * Calculate APCA contrast (Lc) between two colors.
 * Returns a value between roughly -108 and +106.
 * Negative values indicate light text on dark background.
 */
export const getAPCA = (textColor: Color, bgColor: Color): number => {
    // APCA requires RGB values (0-255)
    // We convert our OKLCH colors to RGB
    const textRgb = toRgb(textColor.oklch);
    const bgRgb = toRgb(bgColor.oklch);

    // Convert to Y (luminance) using apca-w3 helpers
    // Ensure values are clamped to 0-255 to avoid NaN from negative floating point errors
    const clamp = (v: number) => Math.max(0, Math.min(255, v * 255));

    const textY = sRGBtoY([clamp(textRgb.r), clamp(textRgb.g), clamp(textRgb.b)]);
    const bgY = sRGBtoY([clamp(bgRgb.r), clamp(bgRgb.g), clamp(bgRgb.b)]);

    return APCAcontrast(textY, bgY);
};

/**
 * Get APCA compliance level based on Lc value.
 * Based on APCA Bronze level recommendations.
 */
export const getAPCAStatus = (lc: number): string => {
    const absLc = Math.abs(lc);

    if (absLc >= 90) return 'Preferred for body text';
    if (absLc >= 75) return 'Minimum for body text';
    if (absLc >= 60) return 'Minimum for large text';
    if (absLc >= 45) return 'Minimum for large headers';
    if (absLc >= 30) return 'Minimum for spot text';
    if (absLc >= 15) return 'Minimum for non-text';
    return 'Fail';
};

import { interpolate } from 'culori';
import { Color } from './color';

/**
 * Interpolator function type
 * Takes a number t [0, 1] and returns a Color
 */
export type Interpolator = (t: number) => Color;

/**
 * Create an interpolator function from a list of key colors.
 * Uses OKLCH color space for interpolation by default.
 */
export const createInterpolator = (keyColors: Color[]): Interpolator => {
    const colors = keyColors.map((c) => c.oklch);
    // culori's interpolate returns a function that takes t and returns a color object
    const interpolator = interpolate(colors, 'oklch');

    return (t: number) => {
        const result = interpolator(t);
        // result is a generic ColorObject (Oklch in this case), wrap it in our Color class
        // The Color constructor can accept a culori color object directly.
        return new Color(result);
    };
};

/**
 * Generate a list of N colors evenly spaced along the interpolation path.
 */
export const generateScale = (keyColors: Color[], count: number): Color[] => {
    const interpolator = createInterpolator(keyColors);
    const result: Color[] = [];
    if (count <= 1) {
        const first = keyColors[0];
        return first ? [first] : [];
    }

    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        result.push(interpolator(t));
    }
    return result;
};

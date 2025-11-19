import { Color } from './color';
import { type ColorObject } from '../utils/color-space';

/**
 * Represents a background color.
 * Currently a simple wrapper around Color, but can be extended for multiple backgrounds (themes).
 */
export class BackgroundColor extends Color {
    constructor(color: string | ColorObject) {
        super(color);
    }

    /**
     * Create a default white background
     */
    static get White(): BackgroundColor {
        return new BackgroundColor('#ffffff');
    }

    /**
     * Create a default black background
     */
    static get Black(): BackgroundColor {
        return new BackgroundColor('#000000');
    }
}

import { Color } from "./color";

/**
 * Represents a background color.
 * Currently a simple wrapper around Color, but can be extended for multiple backgrounds (themes).
 */
export class BackgroundColor extends Color {
	/**
	 * Create a default white background
	 */
	static get White(): BackgroundColor {
		return new BackgroundColor("#ffffff");
	}

	/**
	 * Create a default black background
	 */
	static get Black(): BackgroundColor {
		return new BackgroundColor("#000000");
	}
}

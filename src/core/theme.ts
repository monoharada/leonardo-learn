import type { BackgroundColor } from "./background";
import type { Color } from "./color";
import { createInterpolator } from "./interpolation";
import { findColorForContrast } from "./solver";

export class Theme {
	private _keyColors: Color[];
	private _backgroundColor: BackgroundColor;
	private _ratios: number[];

	constructor(
		keyColors: Color[],
		backgroundColor: BackgroundColor,
		ratios: number[] = [],
	) {
		this._keyColors = keyColors;
		this._backgroundColor = backgroundColor;
		this._ratios = ratios;
	}

	get keyColors(): Color[] {
		return this._keyColors;
	}

	get backgroundColor(): BackgroundColor {
		return this._backgroundColor;
	}

	get ratios(): number[] {
		return this._ratios;
	}

	/**
	 * Generate the color palette based on the configuration.
	 */
	get colors(): Color[] {
		if (this._keyColors.length === 0) return [];
		if (this._ratios.length === 0) return this._keyColors;

		const interpolator = createInterpolator(this._keyColors);
		const firstColor = this._keyColors[0];
		const lastColor = this._keyColors[this._keyColors.length - 1];

		if (!firstColor || !lastColor) return [];

		const startContrast = firstColor.contrast(this._backgroundColor);
		const endContrast = lastColor.contrast(this._backgroundColor);
		const contrastRange = endContrast - startContrast;

		return this._ratios.map((targetRatio) => {
			// 1. Determine t based on contrast
			let t = 0;
			if (Math.abs(contrastRange) > 0.01) {
				t = (targetRatio - startContrast) / contrastRange;
			}
			// Clamp t to [0, 1]
			t = Math.max(0, Math.min(1, t));

			// 2. Get base color from interpolation
			const baseColor = interpolator(t);

			// 3. Solve for exact contrast
			// We use the base color's Hue/Chroma and adjust Lightness
			const solvedColor = findColorForContrast(
				baseColor,
				this._backgroundColor,
				targetRatio,
			);

			// If solver fails (e.g. impossible contrast), return the base color or closest possible?
			// Solver returns null if it can't find a solution within tolerance.
			// But our solver implementation tries to return the closest one if it fails?
			// Actually my solver returns null if no valid result found.
			// Let's fallback to baseColor if null.
			return solvedColor || baseColor;
		});
	}
}

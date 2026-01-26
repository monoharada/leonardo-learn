import type { CvdConfusionThreshold } from "../types";

export function parseCvdConfusionThreshold(
	value: unknown,
): CvdConfusionThreshold | null {
	if (typeof value !== "string") return null;
	const parsed = Number.parseFloat(value);
	if (parsed === 3.5) return 3.5;
	if (parsed === 5) return 5.0;
	return null;
}

export function formatCvdConfusionThreshold(
	threshold: CvdConfusionThreshold,
): string {
	return threshold.toFixed(1);
}

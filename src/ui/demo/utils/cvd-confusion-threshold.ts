import type { CvdConfusionThreshold } from "../types";

export function parseCvdConfusionThreshold(
	value: unknown,
): CvdConfusionThreshold | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (trimmed === "3.5") return 3.5;
	// localStorage stores String(5.0) as "5"
	if (trimmed === "5" || trimmed === "5.0") return 5.0;
	return null;
}

export function formatCvdConfusionThreshold(
	threshold: CvdConfusionThreshold,
): string {
	return threshold.toFixed(1);
}

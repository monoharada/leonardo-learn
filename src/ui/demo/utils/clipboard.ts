/**
 * Clipboard helper (best-effort).
 *
 * - Uses navigator.clipboard when available.
 * - Falls back to execCommand('copy') for broader compatibility.
 * - Never throws; returns success boolean.
 *
 * @module @/ui/demo/utils/clipboard
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
	// Modern API (secure context + permission)
	try {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Fall back below
	}

	// Legacy fallback
	try {
		if (typeof document === "undefined") return false;

		const el = document.createElement("textarea");
		el.value = text;
		el.setAttribute("readonly", "");
		el.style.position = "fixed";
		el.style.top = "0";
		el.style.left = "-9999px";
		el.style.opacity = "0";

		document.body.appendChild(el);
		try {
			el.focus();
			el.select();

			return document.execCommand("copy");
		} finally {
			el.remove();
		}
	} catch {
		return false;
	}
}

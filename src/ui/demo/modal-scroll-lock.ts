/**
 * Scroll lock integration for <dialog>.
 *
 * CSS uses `html.is-modal-open` as the single hook, so we keep it in sync with
 * the presence of any open dialog elements.
 */

export function syncModalOpenState(): void {
	if (typeof document === "undefined") return;
	const hasOpenDialog = document.querySelector("dialog[open]") !== null;
	document.documentElement.classList.toggle("is-modal-open", hasOpenDialog);
}

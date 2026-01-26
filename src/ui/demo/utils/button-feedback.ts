const buttonTextResetTimers = new WeakMap<
	HTMLButtonElement,
	ReturnType<typeof setTimeout>
>();

export function setTemporaryButtonText(
	btn: HTMLButtonElement,
	text: string,
	options?: { durationMs?: number; resetText?: string; resetHTML?: string },
): void {
	const durationMs = options?.durationMs ?? 2000;
	const resetHTML = options?.resetHTML;
	const resetText = options?.resetText ?? btn.textContent ?? "";

	btn.textContent = text;

	const existing = buttonTextResetTimers.get(btn);
	if (existing) globalThis.clearTimeout(existing);

	const timer = globalThis.setTimeout(() => {
		if (!btn.isConnected) return;
		if (resetHTML) {
			btn.innerHTML = resetHTML;
		} else {
			btn.textContent = resetText;
		}
	}, durationMs);
	buttonTextResetTimers.set(btn, timer);
}

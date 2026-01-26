let lastAbortController: AbortController | null = null;

export function createAbortController(): AbortController {
	const controller = new AbortController();
	lastAbortController = controller;
	return controller;
}

export function getLastAbortController(): AbortController | null {
	return lastAbortController;
}

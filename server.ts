/**
 * Simple static file server for local development
 */
Bun.serve({
	port: 3000,
	fetch(req) {
		const url = new URL(req.url);
		let path = url.pathname;
		if (path === "/") path = "/index.html";

		const file = Bun.file(`.${path}`);
		return new Response(file);
	},
});

console.log("Server running at http://localhost:3000");

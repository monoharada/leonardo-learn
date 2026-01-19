import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const sourcePath = ".context/generated/main-visual.svg";
const destinationPath = "dist/assets/main-visual.svg";

mkdirSync(dirname(destinationPath), { recursive: true });

if (!existsSync(sourcePath)) {
	console.log(`[build:assets] Skip (not found): ${sourcePath}`);
	process.exit(0);
}

copyFileSync(sourcePath, destinationPath);
console.log(`[build:assets] Copied: ${sourcePath} -> ${destinationPath}`);

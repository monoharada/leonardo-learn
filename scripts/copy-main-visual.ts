import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const bundledSourcePath = "src/ui/demo/assets/main-visual.svg";
const generatedOverridePath = ".context/generated/main-visual.svg";
const sourcePath =
	process.env.MAIN_VISUAL_SOURCE === "context" &&
	existsSync(generatedOverridePath)
		? generatedOverridePath
		: bundledSourcePath;
const destinationPath = "dist/assets/main-visual.svg";

mkdirSync(dirname(destinationPath), { recursive: true });

if (!existsSync(sourcePath)) {
	console.log(`[build:assets] Skip (not found): ${sourcePath}`);
	process.exit(0);
}

copyFileSync(sourcePath, destinationPath);
console.log(`[build:assets] Copied: ${sourcePath} -> ${destinationPath}`);

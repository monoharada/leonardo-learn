import { Color } from "./core/color";
import { generateHarmony, HarmonyType } from "./core/harmony";

const verify = () => {
	console.log("Verifying Harmony Generation...");

	const keyColor = new Color("#008BF2"); // Blue
	console.log(`Key Color: ${keyColor.toHex()}`);

	const types = [
		HarmonyType.COMPLEMENTARY,
		HarmonyType.TRIADIC,
		HarmonyType.ANALOGOUS,
		HarmonyType.SPLIT_COMPLEMENTARY,
		HarmonyType.TETRADIC,
		HarmonyType.SQUARE,
	];

	types.forEach((type) => {
		console.log(`\nTesting Harmony Type: ${type}`);
		const harmony = generateHarmony(keyColor, type);
		harmony.forEach((h) => {
			console.log(`  - ${h.name}: ${h.color.toHex()}`);
		});
	});

	console.log("\nVerification Complete.");
};

verify();

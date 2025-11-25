import { getAPCA } from "../accessibility/apca";
import {
	type CVDType,
	getAllCVDTypes,
	getCVDTypeName,
	simulateCVD,
} from "../accessibility/cvd-simulator";
import {
	calculateCVDScore,
	checkAdjacentShadesDistinguishability,
} from "../accessibility/distinguishability";
import { verifyContrast } from "../accessibility/wcag2";
import { Color } from "../core/color";
import { exportToCSS } from "../core/export/css-exporter";
import { exportToDTCG } from "../core/export/dtcg-exporter";
import { exportToTailwind } from "../core/export/tailwind-exporter";
import {
	generateFullChromaPalette,
	generateSystemPalette,
	HarmonyType,
} from "../core/harmony";
import { findColorForContrast } from "../core/solver";
import {
	type ContrastIntensity,
	getContrastRatios,
	STEP_NAMES,
	setButtonActive,
} from "./style-constants";

interface KeyColorWithStep {
	color: string;
	step?: number; // 50, 100, 200, ..., 1200
}

interface PaletteConfig {
	id: string;
	name: string;
	keyColors: string[]; // Format: "#hex" or "#hex@step" (e.g., "#b3e5fc@300")
	ratios: number[];
	harmony: HarmonyType;
	baseChromaName?: string; // 基本クロマ名（セマンティックカラー用）
}

type LightnessDistribution = "linear" | "easeIn" | "easeOut";
type ViewMode = "palette" | "shades" | "accessibility";

// CVD Simulation Type (includes "normal" for no simulation)
type CVDSimulationType = "normal" | CVDType;

// Default State
const state = {
	palettes: [] as PaletteConfig[],
	// Shadesビュー用の全13色パレット
	shadesPalettes: [] as PaletteConfig[],
	activeId: "",
	activeHarmonyIndex: 0, // 0 = Primary, 1+ = Derived
	contrastIntensity: "moderate" as ContrastIntensity,
	lightnessDistribution: "linear" as LightnessDistribution,
	viewMode: "palette" as ViewMode,
	cvdSimulation: "normal" as CVDSimulationType,
};

export const runDemo = () => {
	const app = document.getElementById("app");
	const paletteListEl = document.getElementById("palette-list");
	const keyColorsInput = document.getElementById(
		"keyColors",
	) as HTMLInputElement;
	const currentNameEl = document.getElementById("current-palette-name");
	const generateSystemBtn = document.getElementById("generate-system");
	const viewPaletteBtn = document.getElementById("view-palette");
	const viewShadesBtn = document.getElementById("view-shades");
	const viewAccessibilityBtn = document.getElementById("view-accessibility");

	if (!app || !paletteListEl) return;

	// Helper: Get Active Palette
	const getActivePalette = () => {
		const found = state.palettes.find((p) => p.id === state.activeId);
		return found || state.palettes[0];
	};

	// Helper: Parse Key Color Input
	const parseKeyColor = (input: string): KeyColorWithStep => {
		const parts = input.split("@");
		const color = parts[0] ?? "#000000";
		const stepStr = parts[1];
		const step = stepStr ? parseInt(stepStr, 10) : undefined;
		return { color, step };
	};

	const renderSidebar = () => {
		paletteListEl.innerHTML = "";
		state.palettes.forEach((p) => {
			const container = document.createElement("div");
			container.className = "dads-palette-item";

			// Main Palette Entry (Primary)
			const btn = document.createElement("div");
			btn.textContent = p.name;
			btn.className = "dads-palette-item__button";

			// Show color dot
			const dot = document.createElement("span");
			dot.className = "dads-palette-item__dot";

			// Parse first key color for dot
			const keyColorInput = p.keyColors[0];
			if (keyColorInput) {
				const { color: hex } = parseKeyColor(keyColorInput);
				dot.style.backgroundColor = hex;
			}
			btn.prepend(dot);

			// Set active state via data attribute
			setButtonActive(btn, p.id === state.activeId);

			btn.onclick = () => {
				state.activeId = p.id;
				state.activeHarmonyIndex = 0;
				updateEditor();
				renderSidebar();
				renderMain();
			};
			container.appendChild(btn);
			paletteListEl.appendChild(container);
		});
	};

	const updateEditor = () => {
		const p = getActivePalette();
		if (!p) return;

		if (currentNameEl) currentNameEl.textContent = `${p.name} Settings`;

		// Update Harmony Selector (Buttons) - only buttons with data-value attribute
		const harmonyButtons = document.querySelectorAll(
			"#harmony-buttons button[data-value]",
		);
		const harmonyInput = document.getElementById("harmony") as HTMLInputElement;

		if (harmonyButtons.length > 0 && harmonyInput) {
			// Set initial active state based on palette
			harmonyInput.value = p.harmony;
			harmonyButtons.forEach((btn) => {
				const val = (btn as HTMLElement).dataset.value;
				const isActive = val === p.harmony;
				setButtonActive(btn as HTMLElement, isActive);
				if (isActive) {
					(btn as HTMLElement).classList.add("active");
				} else {
					(btn as HTMLElement).classList.remove("active");
				}

				(btn as HTMLElement).onclick = () => {
					const newVal = (btn as HTMLElement).dataset.value as HarmonyType;
					p.harmony = newVal;
					harmonyInput.value = newVal;
					state.activeHarmonyIndex = 0;

					// Trigger generation immediately
					handleGenerate();
				};
			});
		}

		// Contrast Intensity
		const contrastBtns = document.querySelectorAll(
			"#contrastIntensityButtons button",
		);
		contrastBtns.forEach((btn) => {
			const val = (btn as HTMLElement).dataset.value as ContrastIntensity;
			setButtonActive(btn as HTMLElement, val === state.contrastIntensity);
			(btn as HTMLElement).onclick = () => {
				state.contrastIntensity = val;
				updateEditor();
				renderMain();
			};
		});
	};

	// Generate System Palette Logic
	const handleGenerate = () => {
		if (!keyColorsInput) return;
		const inputHex = keyColorsInput.value.trim();
		if (!/^#[0-9A-Fa-f]{6}$/.test(inputHex)) {
			alert("Please enter a valid hex color (e.g., #0066CC)");
			return;
		}

		const primaryColor = new Color(inputHex);

		// Get current harmony selection from hidden input
		const harmonyInput = document.getElementById("harmony") as HTMLInputElement;
		const harmonyType = harmonyInput
			? (harmonyInput.value as HarmonyType)
			: HarmonyType.COMPLEMENTARY;

		// Paletteビュー用: ハーモニーベースのパレット
		const harmonyColors = generateSystemPalette(primaryColor, harmonyType);

		// Convert to PaletteConfigs
		state.palettes = harmonyColors.map((sc, index) => {
			// For the Primary palette (index 0), preserve the harmony type
			// For others, set to NONE as they are derived
			const paletteHarmony = index === 0 ? harmonyType : HarmonyType.NONE;

			// Primaryの場合は元の入力HEX値を使用（丸め誤差を防ぐ）
			const hexValue = sc.role === "primary" ? inputHex : sc.keyColor.toHex();

			// DADSの場合は指定されたステップを使用、それ以外は600
			const step = sc.step ?? 600;

			return {
				id: `sys-${index}-${sc.name.toLowerCase().replace(/\s+/g, "-")}`,
				name: sc.name,
				keyColors: [`${hexValue}@${step}`],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: paletteHarmony,
				baseChromaName: sc.baseChromaName,
			};
		});

		// Shadesビュー用: 全13色パレット
		const fullChromaColors = generateFullChromaPalette(primaryColor);

		// ハーモニーパレットの役割名をbaseChromaNameでマッピング
		const harmonyRoleMap = new Map<string, string>();
		harmonyColors.forEach((hc) => {
			if (hc.baseChromaName && hc.name) {
				harmonyRoleMap.set(hc.baseChromaName, hc.name);
			}
		});

		state.shadesPalettes = fullChromaColors.map((sc, index) => {
			// ハーモニーパレットで使われている場合はその役割名を使用
			// それ以外はセマンティック名（Success, Warning等）またはデフォルト
			let displayName = sc.name;
			if (sc.baseChromaName && harmonyRoleMap.has(sc.baseChromaName)) {
				displayName = harmonyRoleMap.get(sc.baseChromaName) || sc.name;
			}

			// Primaryの場合は元の入力HEX値を使用（丸め誤差を防ぐ）
			const hexValue = sc.role === "primary" ? inputHex : sc.keyColor.toHex();

			return {
				id: `shades-${index}-${sc.baseChromaName?.toLowerCase().replace(/\s+/g, "-") || displayName.toLowerCase().replace(/\s+/g, "-")}`,
				name: displayName,
				keyColors: [hexValue],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: HarmonyType.NONE,
				baseChromaName: sc.baseChromaName,
			};
		});

		if (state.palettes.length > 0 && state.palettes[0]) {
			state.activeId = state.palettes[0].id;
		}
		state.activeHarmonyIndex = 0;
		renderSidebar();
		renderMain();
		updateEditor();
	};

	if (generateSystemBtn) {
		generateSystemBtn.onclick = handleGenerate;
	}

	// View Switcher Logic
	if (viewPaletteBtn && viewShadesBtn && viewAccessibilityBtn) {
		const contrastControls = document.getElementById(
			"header-contrast-controls",
		);

		const updateViewButtons = (mode: ViewMode) => {
			state.viewMode = mode;

			// Reset all buttons via data-active attribute
			[viewPaletteBtn, viewShadesBtn, viewAccessibilityBtn].forEach((btn) => {
				btn.classList.remove("active");
				setButtonActive(btn, false);
			});

			// Activate current button
			const activeBtn =
				mode === "palette"
					? viewPaletteBtn
					: mode === "shades"
						? viewShadesBtn
						: viewAccessibilityBtn;
			activeBtn.classList.add("active");
			setButtonActive(activeBtn, true);

			// Toggle controls
			if (contrastControls) {
				contrastControls.style.display = mode === "shades" ? "flex" : "none";
			}

			// CVD controls are relevant for all views now, but maybe different for accessibility view
			const cvdControls = document.getElementById("cvd-controls");
			if (cvdControls) {
				// Hide standard CVD controls in accessibility view as it shows all at once
				cvdControls.style.display = mode === "accessibility" ? "none" : "flex";
			}

			renderMain();
		};

		viewPaletteBtn.onclick = () => updateViewButtons("palette");
		viewShadesBtn.onclick = () => updateViewButtons("shades");
		viewAccessibilityBtn.onclick = () => updateViewButtons("accessibility");
	}

	// Add Palette Button
	const addPaletteBtn = document.getElementById("add-palette");
	if (addPaletteBtn) {
		addPaletteBtn.onclick = () => {
			const id = `custom-${Date.now()}`;
			state.palettes.push({
				id,
				name: `Custom Palette ${state.palettes.length + 1}`,
				keyColors: ["#000", "#fff"],
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: HarmonyType.NONE,
			});
			state.activeId = id;
			renderSidebar();
			updateEditor();
			renderMain();
		};
	}

	// Helper: Generate colors from all palettes for export
	const generateExportColors = (): Record<string, Color> => {
		const colors: Record<string, Color> = {};
		const bgColor = new Color("#ffffff");

		// エクスポートは全13色パレットを使用
		const palettesToExport =
			state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes;

		palettesToExport.forEach((p) => {
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return;
			const { color: hex } = parseKeyColor(keyColorInput);
			const keyColor = new Color(hex);

			const baseRatios = getContrastRatios(state.contrastIntensity);

			const keyContrastRatio = keyColor.contrast(bgColor);
			let keyColorIndex = -1;
			let minDiff = Infinity;

			for (let i = 0; i < baseRatios.length; i++) {
				const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
				if (diff < minDiff) {
					minDiff = diff;
					keyColorIndex = i;
				}
			}

			if (keyColorIndex >= 0) {
				baseRatios[keyColorIndex] = keyContrastRatio;
			}

			const scaleColors: Color[] = baseRatios.map((ratio, i) => {
				if (i === keyColorIndex) return keyColor;
				const solved = findColorForContrast(keyColor, bgColor, ratio);
				return solved || keyColor;
			});
			scaleColors.reverse();

			// Generate color name from palette name
			const paletteName = p.name.toLowerCase().replace(/\s+/g, "-");

			scaleColors.forEach((color, index) => {
				const stepName = STEP_NAMES[index] ?? index * 100 + 50;
				colors[`${paletteName}-${stepName}`] = color;
			});
		});

		return colors;
	};

	// Helper: Download file
	const downloadFile = (
		content: string,
		filename: string,
		mimeType: string,
	) => {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	// Export Logic
	const exportCssBtn = document.getElementById("export-css");
	if (exportCssBtn) {
		exportCssBtn.onclick = () => {
			const colors = generateExportColors();
			const result = exportToCSS(colors, {
				prefix: "color",
				includeWideGamutFallback: true,
			});
			downloadFile(result.css, "colors.css", "text/css");
		};
	}

	const exportTailwindBtn = document.getElementById("export-tailwind");
	if (exportTailwindBtn) {
		exportTailwindBtn.onclick = () => {
			const colors = generateExportColors();
			const result = exportToTailwind(colors, {
				colorSpace: "oklch",
				esModule: false,
			});
			downloadFile(
				result.config,
				"tailwind.colors.js",
				"application/javascript",
			);
		};
	}

	const exportJsonBtn = document.getElementById("export-json");
	if (exportJsonBtn) {
		exportJsonBtn.onclick = () => {
			const colors = generateExportColors();
			const result = exportToDTCG(colors, {
				colorSpace: "oklch",
			});
			downloadFile(result.json, "colors.tokens.json", "application/json");
		};
	}

	// Render Main Content
	const renderMain = () => {
		if (!app) return;
		app.innerHTML = "";

		if (state.viewMode === "palette") {
			renderPaletteView(app);
		} else if (state.viewMode === "shades") {
			renderShadesView(app);
		} else {
			renderAccessibilityView(app);
		}

		// Update CVD score after render
		updateCVDScoreDisplay();
	};

	// CVD score update function (will be defined later)
	let updateCVDScoreDisplay = () => {};

	// Helper: Apply CVD simulation to a color
	const applySimulation = (color: Color): Color => {
		if (state.cvdSimulation === "normal") {
			return color;
		}
		return simulateCVD(color, state.cvdSimulation as CVDType);
	};

	const renderPaletteView = (container: HTMLElement) => {
		container.className = "dads-section";

		// Group palettes by semantic category
		const getSemanticCategory = (name: string): string => {
			if (name === "Primary" || name.startsWith("Primary")) return "Primary";
			if (name.startsWith("Success")) return "Success";
			if (name.startsWith("Error")) return "Error";
			if (name.startsWith("Warning")) return "Warning";
			if (name.startsWith("Link")) return "Link";
			if (name.startsWith("Accent")) return "Accent";
			if (name === "Gray" || name === "Slate") return "Neutral";
			if (name === "Secondary") return "Secondary";
			return name; // For other harmony types (Comp, Analog, etc.)
		};

		const groupedPalettes = new Map<string, typeof state.palettes>();
		state.palettes.forEach((p) => {
			const category = getSemanticCategory(p.name);
			if (!groupedPalettes.has(category)) {
				groupedPalettes.set(category, []);
			}
			groupedPalettes.get(category)?.push(p);
		});

		// Render each group
		groupedPalettes.forEach((palettes, category) => {
			const section = document.createElement("section");

			// Section heading
			const heading = document.createElement("h2");
			heading.textContent = category;
			heading.className = "dads-section__heading";
			section.appendChild(heading);

			// Cards container
			const cardsContainer = document.createElement("div");
			cardsContainer.className = "dads-grid";
			cardsContainer.dataset.columns = "auto-fill";

			palettes.forEach((p) => {
				const card = document.createElement("button");
				card.type = "button";
				card.className = "dads-card";
				card.dataset.interactive = "true";

				const keyColorInput = p.keyColors[0];
				if (!keyColorInput) return;
				const { color: hex } = parseKeyColor(keyColorInput);
				const keyColor = new Color(hex);

				// Generate color scale for this palette
				const baseRatios = getContrastRatios(state.contrastIntensity);
				const bgColor = new Color("#ffffff");
				const keyContrastRatio = keyColor.contrast(bgColor);

				let keyColorIndex = -1;
				let minDiff = Infinity;
				for (let i = 0; i < baseRatios.length; i++) {
					const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
					if (diff < minDiff) {
						minDiff = diff;
						keyColorIndex = i;
					}
				}
				if (keyColorIndex >= 0) {
					baseRatios[keyColorIndex] = keyContrastRatio;
				}

				const colors: Color[] = baseRatios.map((ratio, i) => {
					if (i === keyColorIndex) return keyColor;
					const solved = findColorForContrast(keyColor, bgColor, ratio);
					return solved || keyColor;
				});
				colors.reverse();

				// Calculate index based on contrast ratio for accurate step display
				// After colors.reverse(), the key color's position changes
				// Original keyColorIndex is in baseRatios order (low to high contrast)
				// After reverse, it becomes (colors.length - 1 - keyColorIndex)
				const reversedKeyColorIndex = colors.length - 1 - keyColorIndex;

				card.onclick = () => {
					const dialog = document.getElementById(
						"color-detail-dialog",
					) as HTMLDialogElement;
					if (!dialog) return;

					// --- Elements ---
					// --- Elements ---
					let scrubberCanvas = document.getElementById(
						"tuner-scrubber",
					) as HTMLCanvasElement;

					// Clone canvas to remove old event listeners
					if (scrubberCanvas) {
						const newCanvas = scrubberCanvas.cloneNode(
							true,
						) as HTMLCanvasElement;
						scrubberCanvas.parentNode?.replaceChild(newCanvas, scrubberCanvas);
						scrubberCanvas = newCanvas;
					}

					let currentColor = keyColor;
					let isDraggingScrubber = false;

					// Helper to generate scale for real-time updates
					const generateScale = (
						baseColor: Color,
					): { colors: Color[]; keyIndex: number } => {
						const baseRatios = getContrastRatios(state.contrastIntensity);
						const bgColor = new Color("#ffffff");
						const keyContrastRatio = baseColor.contrast(bgColor);

						let keyColorIndex = -1;
						let minDiff = Infinity;
						for (let i = 0; i < baseRatios.length; i++) {
							const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
							if (diff < minDiff) {
								minDiff = diff;
								keyColorIndex = i;
							}
						}
						if (keyColorIndex >= 0) {
							baseRatios[keyColorIndex] = keyContrastRatio;
						}

						const newColors: Color[] = baseRatios.map((ratio, i) => {
							if (i === keyColorIndex) return baseColor;
							const solved = findColorForContrast(baseColor, bgColor, ratio);
							return solved || baseColor;
						});
						newColors.reverse();

						// Calculate reversed key index
						const reversedKeyIndex = newColors.length - 1 - keyColorIndex;

						return { colors: newColors, keyIndex: reversedKeyIndex };
					};

					// --- Infinite Hue Scrubber Logic ---
					const drawScrubber = () => {
						if (!scrubberCanvas) return;
						const ctx = scrubberCanvas.getContext("2d");
						if (!ctx) return;

						const width = scrubberCanvas.width;
						const height = scrubberCanvas.height;

						// Use initial hue as the center of the static background
						// We need to store the initial hue when opening the modal
						// Let's use `keyColor`'s hue for this reference point.
						const centerHue = keyColor.oklch?.h ?? 0;
						const currentH = currentColor.oklch?.h ?? 0;

						ctx.clearRect(0, 0, width, height);

						// 1. Draw Static Background (Gradient)
						// Range: +/- 15 degrees around centerHue (Total 30)
						const visibleRange = 30;
						const pixelsPerDegree = width / visibleRange;

						for (let x = 0; x < width; x++) {
							const offsetPixels = x - width / 2;
							const offsetDegrees = offsetPixels / pixelsPerDegree;
							let hue = centerHue + offsetDegrees;

							// Normalize hue
							hue = hue % 360;
							if (hue < 0) hue += 360;

							// Fixed vibrant L/C
							const displayL = 0.65;
							const displayC = 0.3;

							const color = new Color(`oklch(${displayL} ${displayC} ${hue})`);
							ctx.fillStyle = color.toCss();
							ctx.fillRect(x, 0, 1, height);
						}

						// 2. Draw Moving Handle
						// Calculate position based on currentHue relative to centerHue
						let diff = currentH - centerHue;
						// Handle wrap-around (e.g. 359 -> 1)
						if (diff > 180) diff -= 360;
						if (diff < -180) diff += 360;

						const handleX = width / 2 + diff * pixelsPerDegree;

						// Clamp handle to canvas bounds (optional, but good for UI)
						// Actually, if it goes off screen, it means we are out of range.
						// But user said "Infinite", so maybe we should scroll the background?
						// "Mental model: moving vertical line" usually implies fixed background.
						// If the background is fixed +/- 60deg, then we can only select within that range.
						// The user said "diverse Blue is sufficient", implying a limited range is fine.
						// So we will clamp the handle or just let it go off screen (but then you can't see it).
						// Let's clamp the handle visually, but maybe the value is already clamped by interaction?
						// We should probably clamp the interaction to the visible range if the background is static.

						if (handleX >= 0 && handleX <= width) {
							// Draw Handle Line
							ctx.beginPath();
							ctx.moveTo(handleX, 0);
							ctx.lineTo(handleX, height);
							ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
							ctx.lineWidth = 2;
							ctx.stroke();

							// Draw Handle Knob (Premium Feel)
							const knobY = height / 2;

							// Outer Glow/Shadow
							ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
							ctx.shadowBlur = 4;
							ctx.shadowOffsetY = 2;

							// Knob Body
							ctx.beginPath();
							// Rounded rectangle or capsule
							ctx.roundRect(handleX - 6, 4, 12, height - 8, 6);
							ctx.fillStyle = "white";
							ctx.fill();

							// Reset Shadow
							ctx.shadowColor = "transparent";
							ctx.shadowBlur = 0;
							ctx.shadowOffsetY = 0;

							// Inner Detail (Grip lines)
							ctx.fillStyle = "#ccc";
							ctx.fillRect(handleX - 1, knobY - 4, 2, 8);
						}
					};

					// Handle Scrubber Interaction
					const handleScrubberStart = (e: MouseEvent | TouchEvent) => {
						isDraggingScrubber = true;
						// We don't need startX/startHue logic anymore if we map position directly to hue
						// But for smooth dragging, relative motion is often better.
						// However, for a slider, absolute position is standard.
						// Let's use absolute position mapping.
						handleScrubberMove(e);

						// Prevent scrolling on touch
						if (e.type === "touchstart") {
							e.preventDefault();
						}
					};

					const handleScrubberMove = (e: MouseEvent | TouchEvent) => {
						if (!isDraggingScrubber) return;

						const touch =
							"touches" in e &&
							(e as TouchEvent).touches &&
							(e as TouchEvent).touches.length > 0
								? (e as TouchEvent).touches[0]
								: null;
						const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;

						// Calculate Hue based on X position
						const rect = scrubberCanvas.getBoundingClientRect();
						const x = clientX - rect.left;
						const width = rect.width;

						const visibleRange = 30;
						const pixelsPerDegree = width / visibleRange;
						const centerHue = keyColor.oklch?.h ?? 0;

						const offsetPixels = x - width / 2;
						const offsetDegrees = offsetPixels / pixelsPerDegree;

						let newHue = centerHue + offsetDegrees;
						newHue = newHue % 360;
						if (newHue < 0) newHue += 360;

						// Update Color (Keep L and C, only change H)
						const currentL = currentColor.oklch?.l ?? 0;
						const currentC = currentColor.oklch?.c ?? 0;
						const newColor = new Color(
							`oklch(${currentL} ${currentC} ${newHue})`,
						);

						updateDetail(newColor); // -1 to indicate manual tuning
						drawScrubber();
					};

					const handleScrubberEnd = () => {
						isDraggingScrubber = false;
					};

					const resizeScrubber = () => {
						if (!scrubberCanvas) return;
						const rect = scrubberCanvas.parentElement?.getBoundingClientRect();
						if (rect && rect.width > 0) {
							scrubberCanvas.width = rect.width;
							scrubberCanvas.height = rect.height;
							drawScrubber();
						}
					};

					if (scrubberCanvas) {
						// Initial size will be set after showModal

						scrubberCanvas.addEventListener("mousedown", handleScrubberStart);
						window.addEventListener("mousemove", handleScrubberMove);
						window.addEventListener("mouseup", handleScrubberEnd);

						scrubberCanvas.addEventListener("touchstart", handleScrubberStart, {
							passive: false,
						});
						window.addEventListener("touchmove", handleScrubberMove, {
							passive: false,
						});
						window.addEventListener("touchend", handleScrubberEnd);

						// Initial draw will happen after resize
						// drawScrubber();

						window.addEventListener("resize", resizeScrubber);
					}

					// --- Color Tuner Helpers ---

					// --- Update Detail ---
					const updateDetail = (color: Color) => {
						currentColor = color;
						const l = color.oklch.l ?? 0;
						// const c = color.oklch.c ?? 0; // Unused
						// const h = color.oklch.h ?? 0; // Unused

						// Update Header
						const detailSwatch = document.getElementById("detail-swatch");
						const detailTokenName =
							document.getElementById("detail-token-name");
						const detailHex = document.getElementById("detail-hex");
						const detailLightness = document.getElementById("detail-lightness");
						const detailChromaName =
							document.getElementById("detail-chroma-name");

						if (detailSwatch)
							detailSwatch.style.backgroundColor = color.toCss();

						// Calculate token name based on scale position
						const { keyIndex } = generateScale(color);
						// Standard mapping for 13 steps (0-12)
						// 0 is Darkest (1200), 12 is Lightest (50) because generateScale reverses the array (Light->Dark becomes Dark->Light)
						const tokenNum = STEP_NAMES[keyIndex] ?? 500;

						// Use baseChromaName (e.g. "Blue") if available, else name
						const hueName = p.baseChromaName || p.name;

						if (detailTokenName)
							detailTokenName.textContent = `${hueName}-${tokenNum}`;
						if (detailHex) detailHex.textContent = color.toHex();
						if (detailLightness)
							detailLightness.textContent = `${Math.round(l * 100)}% L`;
						if (detailChromaName)
							detailChromaName.textContent = p.baseChromaName || p.name;

						// Update Contrast Cards
						const updateCard = (bgHex: string, prefix: string) => {
							const bg = new Color(bgHex);
							const wcag = verifyContrast(color, bg);
							const apca = getAPCA(color, bg);
							const ratioVal = Math.round(wcag.contrast * 100) / 100;
							const lcVal = Math.round(apca);

							const badge = document.getElementById(`detail-${prefix}-badge`);
							const ratioEl = document.getElementById(`detail-${prefix}-ratio`);
							const apcaEl = document.getElementById(`detail-${prefix}-apca`);
							const preview = document.getElementById(
								`detail-${prefix}-preview`,
							);
							const previewLarge = document.getElementById(
								`detail-${prefix}-preview-large`,
							);
							const failIcon = document.getElementById(
								`detail-${prefix}-fail-icon`,
							);

							if (ratioEl) ratioEl.textContent = `${ratioVal}`;
							if (apcaEl) apcaEl.textContent = `${lcVal}`;
							if (preview) {
								preview.style.backgroundColor = color.toCss();
								preview.style.color = bgHex;
							}
							if (previewLarge) {
								previewLarge.style.backgroundColor = color.toCss();
								previewLarge.style.color = bgHex;
							}
							if (badge) {
								if (ratioVal >= 7.0) {
									badge.textContent = "AAA";
									badge.style.backgroundColor = "#e6f4ea";
									badge.style.color = "#137333";
									if (failIcon) failIcon.style.display = "none";
								} else if (ratioVal >= 4.5) {
									badge.textContent = "AA";
									badge.style.backgroundColor = "#e6f4ea";
									badge.style.color = "#137333";
									if (failIcon) failIcon.style.display = "none";
								} else if (ratioVal >= 3.0) {
									badge.textContent = "Large Text";
									badge.style.backgroundColor = "#fef7e0";
									badge.style.color = "#b06000";
									if (failIcon) failIcon.style.display = "none";
								} else {
									badge.textContent = "Fail";
									badge.style.backgroundColor = "#fce8e6";
									badge.style.color = "#c5221f";
									if (failIcon) failIcon.style.display = "block";
								}
							}
						};
						updateCard("#ffffff", "white");
						updateCard("#000000", "black");

						// Redraw scrubber
						drawScrubber();

						// Update Mini Scale
						const miniScaleContainer =
							document.getElementById("detail-mini-scale");
						if (miniScaleContainer) {
							miniScaleContainer.innerHTML = "";
							const { colors: scaleColors, keyIndex: currentKeyIndex } =
								generateScale(color);

							scaleColors.forEach((c, i) => {
								const div = document.createElement("div");
								div.style.flex = "1";
								div.style.backgroundColor = c.toCss();
								div.style.position = "relative";

								// Add click handler
								div.onclick = () => {
									updateDetail(c);
								};

								// Highlight current color
								if (i === currentKeyIndex) {
									const check = document.createElement("div");
									check.textContent = "✓";
									check.style.position = "absolute";
									check.style.top = "50%";
									check.style.left = "50%";
									check.style.transform = "translate(-50%, -50%)";
									check.style.color =
										c.contrast(new Color("#fff")) > 4.5 ? "white" : "black";
									check.style.fontSize = "12px";
									check.style.fontWeight = "bold";
									div.appendChild(check);
								}

								miniScaleContainer.appendChild(div);
							});
						}
					};

					// --- Interaction Logic ---

					// --- Initialization ---

					// --- Reset & Save Logic ---
					const resetBtn = document.getElementById("detail-reset-btn");
					const saveBtn = document.getElementById("detail-save-btn");

					if (resetBtn) {
						resetBtn.onclick = () => {
							currentColor = keyColor;
							updateDetail(currentColor);
							drawScrubber();
						};
					}

					if (saveBtn) {
						saveBtn.onclick = () => {
							// Update Key Color
							p.keyColors = [currentColor.toHex()];

							// SYNC Logic: Update the corresponding palette in the other list
							// If p is in state.palettes, find match in state.shadesPalettes
							// If p is in state.shadesPalettes, find match in state.palettes

							const syncPalette = (targetList: PaletteConfig[]) => {
								const match = targetList.find((other) => {
									// Match by baseChromaName if available (most reliable for system colors)
									if (p.baseChromaName && other.baseChromaName) {
										return p.baseChromaName === other.baseChromaName;
									}
									// Fallback to name match
									return p.name === other.name;
								});

								if (match) {
									match.keyColors = [currentColor.toHex()];
								}
							};

							// Try syncing both ways to be safe (though p belongs to one)
							syncPalette(state.palettes);
							syncPalette(state.shadesPalettes);

							dialog.close();
							renderMain();
						};
					}

					// --- Initialization ---
					// Initial update
					updateDetail(keyColor);
					dialog.showModal();

					// Resize scrubber after modal is visible
					requestAnimationFrame(() => {
						resizeScrubber();
					});
				};

				const swatch = document.createElement("div");
				swatch.className = "dads-card__swatch";
				// Apply CVD simulation to display color
				const displayColor = applySimulation(keyColor);
				swatch.style.backgroundColor = displayColor.toCss();

				const info = document.createElement("div");
				info.className = "dads-card__body";

				// Token name (e.g., "blue-800")
				const step = STEP_NAMES[reversedKeyColorIndex] ?? 600;
				const chromaNameLower = (p.baseChromaName || p.name || "color")
					.toLowerCase()
					.replace(/\s+/g, "-");

				const tokenName = document.createElement("h3");
				tokenName.textContent = `${chromaNameLower}-${step}`;
				tokenName.className = "dads-card__title";

				const hexCode = document.createElement("code");
				hexCode.textContent = hex;
				hexCode.className = "dads-text-mono";

				info.appendChild(tokenName);
				info.appendChild(hexCode);

				// Show simulated color if CVD mode is active
				if (state.cvdSimulation !== "normal") {
					const simInfo = document.createElement("div");
					simInfo.textContent = `(${displayColor.toHex()})`;
					simInfo.style.fontSize = "0.75rem";
					simInfo.style.color = "#999";
					simInfo.style.marginTop = "0.25rem";
					info.appendChild(simInfo);
				}

				card.appendChild(swatch);
				card.appendChild(info);
				cardsContainer.appendChild(card);
			});

			section.appendChild(cardsContainer);
			container.appendChild(section);
		});
	};

	const renderShadesView = (container: HTMLElement) => {
		container.className = "dads-section";

		// Shadesビューでは全13色パレットを使用
		const palettesToRender =
			state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes;

		palettesToRender.forEach((p) => {
			const section = document.createElement("section");

			const header = document.createElement("h2");
			header.className = "dads-section__heading";
			// 表示形式: baseChromaName | name (name が空の場合は baseChromaName のみ)
			if (p.baseChromaName && p.name) {
				header.textContent = `${p.baseChromaName} | ${p.name}`;
			} else if (p.baseChromaName) {
				header.textContent = p.baseChromaName;
			} else {
				header.textContent = p.name;
			}
			section.appendChild(header);

			// Generate Scale using Theme
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return;
			const { color: keyHex } = parseKeyColor(keyColorInput);
			const keyColor = new Color(keyHex);

			// Define ratios for 13 steps based on intensity
			const baseRatios = getContrastRatios(state.contrastIntensity);

			// Background color (White)
			const bgColor = new Color("#ffffff");

			// Calculate key color's contrast ratio and insert into ratios
			const keyContrastRatio = keyColor.contrast(bgColor);

			// Find the best position to insert/replace
			let keyColorIndex = -1;
			let minDiff = Infinity;

			for (let i = 0; i < baseRatios.length; i++) {
				const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
				if (diff < minDiff) {
					minDiff = diff;
					keyColorIndex = i;
				}
			}

			// Replace the closest ratio with the key color's exact contrast
			if (keyColorIndex >= 0) {
				baseRatios[keyColorIndex] = keyContrastRatio;
			}

			// Generate colors by adjusting Lightness only, keeping Hue/Chroma fixed
			const colors: Color[] = baseRatios.map((ratio, i) => {
				if (i === keyColorIndex) {
					// Use the exact key color for this step
					return keyColor;
				}
				// Find color with target contrast, preserving Hue/Chroma
				const solved = findColorForContrast(keyColor, bgColor, ratio);
				return solved || keyColor;
			});

			// Reverse for display (light to dark)
			colors.reverse();

			// Adjust keyColorIndex for reversed array
			const reversedKeyColorIndex = colors.length - 1 - keyColorIndex;

			const scaleContainer = document.createElement("div");
			scaleContainer.className = "dads-scale";

			colors.forEach((stepColor, index) => {
				// Apply CVD simulation to display color
				const displayColor = applySimulation(stepColor);

				const swatch = document.createElement("button");
				swatch.type = "button";
				swatch.className = "dads-swatch";

				const isKeyColor = index === reversedKeyColorIndex;

				// Calculate contrast against both white and black using display color
				const whiteContrast = verifyContrast(
					displayColor,
					new Color("#ffffff"),
				).contrast;
				const blackContrast = verifyContrast(
					displayColor,
					new Color("#000000"),
				).contrast;

				// Use the higher contrast (safer choice)
				const useWhite = whiteContrast >= blackContrast;
				const ratio =
					Math.round((useWhite ? whiteContrast : blackContrast) * 100) / 100;
				const textColor = useWhite ? "white" : "black";

				// Check if both are usable (for showing dual indicators)
				const whiteLevel =
					whiteContrast >= 7
						? "AAA"
						: whiteContrast >= 4.5
							? "AA"
							: whiteContrast >= 3
								? "L"
								: "";
				const blackLevel =
					blackContrast >= 7
						? "AAA"
						: blackContrast >= 4.5
							? "AA"
							: blackContrast >= 3
								? "L"
								: "";

				// Create badge element showing both white and black usability
				const createBadge = (parent: HTMLElement) => {
					if (!whiteLevel && !blackLevel) return;

					const badgeContainer = document.createElement("div");
					badgeContainer.className = "dads-swatch__badges";

					// Show white indicator if usable
					if (whiteLevel) {
						const whiteBadge = document.createElement("div");
						whiteBadge.className = "dads-contrast-indicator";
						whiteBadge.dataset.color = "white";
						if (whiteLevel === "L") whiteBadge.dataset.level = "L";
						whiteBadge.textContent = whiteLevel;
						badgeContainer.appendChild(whiteBadge);
					}

					// Show black indicator if usable
					if (blackLevel) {
						const blackBadge = document.createElement("div");
						blackBadge.className = "dads-contrast-indicator";
						blackBadge.dataset.color = "black";
						if (blackLevel === "L") blackBadge.dataset.level = "L";
						blackBadge.textContent = blackLevel;
						badgeContainer.appendChild(blackBadge);
					}

					parent.appendChild(badgeContainer);
				};

				if (isKeyColor) {
					// キーカラーは円形で表示
					swatch.dataset.keyColor = "true";
					swatch.style.backgroundColor = "transparent";

					// 真円のインジケーター
					const circle = document.createElement("div");
					circle.className = "dads-swatch__key-indicator";
					circle.style.backgroundColor = displayColor.toCss();

					const label = document.createElement("span");
					label.textContent = `${ratio}`;
					label.style.color = textColor;
					label.style.fontWeight = "bold";
					label.style.fontSize = "0.75rem";

					circle.appendChild(label);
					swatch.appendChild(circle);
					createBadge(swatch); // Bottom-center badge
				} else {
					swatch.style.backgroundColor = displayColor.toCss();

					const label = document.createElement("span");
					label.textContent = `${ratio}`;
					label.style.color = textColor;
					label.style.fontWeight = "bold";

					swatch.appendChild(label);
					createBadge(swatch); // Bottom-center badge
				}

				// Accessibility and focus styles
				swatch.setAttribute("aria-label", `Color ${stepColor.toHex()}`);
				swatch.onfocus = () => {
					swatch.style.outline = "2px solid white";
					swatch.style.outlineOffset = "-2px";
					swatch.style.zIndex = "1";
				};
				swatch.onblur = () => {
					swatch.style.outline = "none";
					swatch.style.zIndex = "";
				};

				// Click to open detail popover
				swatch.style.cursor = "pointer";
				swatch.onclick = () => {
					const dialog = document.getElementById(
						"color-detail-dialog",
					) as HTMLDialogElement;
					if (!dialog) return;

					// Helper to update detail panel with a specific color
					const updateDetail = (color: Color, selectedIndex: number) => {
						const colorL = color.oklch.l as number;

						// Populate Basic Info
						const detailSwatch = document.getElementById("detail-swatch");
						const detailTokenName =
							document.getElementById("detail-token-name");
						const detailHex = document.getElementById("detail-hex");
						const detailLightness = document.getElementById("detail-lightness");
						const detailChromaName =
							document.getElementById("detail-chroma-name");

						// Step names for token generation (dark to light order: 1200→50)
						const step = STEP_NAMES[selectedIndex] ?? 600;
						const chromaNameLower = (p.baseChromaName || p.name || "color")
							.toLowerCase()
							.replace(/\s+/g, "-");

						if (detailSwatch)
							detailSwatch.style.backgroundColor = color.toCss();
						if (detailTokenName)
							detailTokenName.textContent = `${chromaNameLower}-${step}`;
						if (detailHex) detailHex.textContent = color.toHex();
						if (detailLightness)
							detailLightness.textContent = `${Math.round(colorL * 100)}% L`;

						// Update chroma name display
						if (detailChromaName) {
							if (p.baseChromaName && p.name) {
								detailChromaName.textContent = `${p.baseChromaName} | ${p.name}`;
							} else if (p.baseChromaName) {
								detailChromaName.textContent = p.baseChromaName;
							} else {
								detailChromaName.textContent = p.name;
							}
						}

						// Update "Set as key color" button
						const setKeyColorBtn = document.getElementById(
							"set-key-color-btn",
						) as HTMLButtonElement;
						if (setKeyColorBtn) {
							const paletteName = p.name || p.baseChromaName || "";
							setKeyColorBtn.textContent = `${color.toHex()} を ${paletteName} のパレットの色に指定`;
							setKeyColorBtn.onclick = () => {
								// Update the palette's key color
								p.keyColors = [color.toHex()];

								// Close dialog and re-render
								dialog.close();
								renderMain();
							};
						}

						// Helper to update contrast card
						const updateCard = (bgHex: string, prefix: string) => {
							const bgColor = new Color(bgHex);
							const wcag = verifyContrast(color, bgColor);
							const apca = getAPCA(color, bgColor);
							const ratioVal = Math.round(wcag.contrast * 100) / 100;
							const lc = Math.round(apca);

							const badge = document.getElementById(`detail-${prefix}-badge`);
							const ratioEl = document.getElementById(`detail-${prefix}-ratio`);
							const apcaEl = document.getElementById(`detail-${prefix}-apca`);
							const preview = document.getElementById(
								`detail-${prefix}-preview`,
							);
							const previewLarge = document.getElementById(
								`detail-${prefix}-preview-large`,
							);
							const failIcon = document.getElementById(
								`detail-${prefix}-fail-icon`,
							);

							if (ratioEl) ratioEl.textContent = `${ratioVal}`;
							if (apcaEl) apcaEl.textContent = `${lc}`;

							if (preview) {
								preview.style.backgroundColor = color.toCss();
								preview.style.color = bgHex;
							}
							if (previewLarge) {
								previewLarge.style.backgroundColor = color.toCss();
								previewLarge.style.color = bgHex;
							}

							if (badge) {
								if (ratioVal >= 7.0) {
									badge.textContent = "AAA";
									badge.style.backgroundColor = "#e6f4ea";
									badge.style.color = "#137333";
									if (failIcon) failIcon.style.display = "none";
								} else if (ratioVal >= 4.5) {
									badge.textContent = "AA";
									badge.style.backgroundColor = "#e6f4ea";
									badge.style.color = "#137333";
									if (failIcon) failIcon.style.display = "none";
								} else if (ratioVal >= 3.0) {
									badge.textContent = "Large Text";
									badge.style.backgroundColor = "#fef7e0";
									badge.style.color = "#b06000";
									if (failIcon) failIcon.style.display = "none";
								} else {
									badge.textContent = "Fail";
									badge.style.backgroundColor = "#fce8e6";
									badge.style.color = "#c5221f";
									if (failIcon) failIcon.style.display = "block";
								}
							}
						};

						// Calculate both contrasts for comparison
						const whiteContrastVal = verifyContrast(
							color,
							new Color("#ffffff"),
						).contrast;
						const blackContrastVal = verifyContrast(
							color,
							new Color("#000000"),
						).contrast;

						updateCard("#ffffff", "white");
						updateCard("#000000", "black");

						// Highlight the better contrast card with slightly stronger border
						const whiteCard = document.querySelector(
							".contrast-card:first-child",
						) as HTMLElement;
						const blackCard = document.querySelector(
							".contrast-card:last-child",
						) as HTMLElement;

						if (whiteCard && blackCard) {
							if (whiteContrastVal >= blackContrastVal) {
								whiteCard.style.borderColor = "#ccc";
								whiteCard.style.borderWidth = "2px";
								blackCard.style.borderColor = "#eee";
								blackCard.style.borderWidth = "1px";
							} else {
								blackCard.style.borderColor = "#ccc";
								blackCard.style.borderWidth = "2px";
								whiteCard.style.borderColor = "#eee";
								whiteCard.style.borderWidth = "1px";
							}
						}

						// Update mini scale selection indicator
						const miniScale = document.getElementById("detail-mini-scale");
						if (miniScale) {
							const miniSwatches = miniScale.children;
							for (let i = 0; i < miniSwatches.length; i++) {
								const ms = miniSwatches[i] as HTMLElement;
								// Remove existing checkmark if any
								const existingCheck = ms.querySelector(".mini-check");
								if (existingCheck) existingCheck.remove();

								if (i === selectedIndex) {
									// Add checkmark
									const check = document.createElement("div");
									check.className = "mini-check";
									check.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
									check.style.position = "absolute";
									check.style.top = "50%";
									check.style.left = "50%";
									check.style.transform = "translate(-50%, -50%)";
									// Use actual contrast ratio to determine checkmark color
									const contrastToWhite = color.contrast(new Color("white"));
									const contrastToBlack = color.contrast(new Color("black"));
									check.style.color =
										contrastToWhite > contrastToBlack ? "white" : "black";
									ms.appendChild(check);
								}
							}
						}
					};

					// Build mini scale
					const miniScale = document.getElementById("detail-mini-scale");
					if (miniScale) {
						miniScale.innerHTML = "";
						colors.forEach((c, i) => {
							const miniSwatch = document.createElement("button");
							miniSwatch.type = "button";
							miniSwatch.className = "dads-mini-scale__item";
							miniSwatch.style.backgroundColor = c.toCss();
							miniSwatch.setAttribute("aria-label", `Color ${c.toHex()}`);
							miniSwatch.onclick = (e) => {
								e.stopPropagation();
								updateDetail(c, i);
							};
							miniScale.appendChild(miniSwatch);
						});
					}

					// Initial update with clicked color
					updateDetail(stepColor, index);

					dialog.showModal();
				};

				scaleContainer.appendChild(swatch);
			});

			section.appendChild(scaleContainer);
			container.appendChild(section);
		});
	};

	// CVD Simulation Controls
	const cvdTypeButtons = document.querySelectorAll("#cvdTypeButtons button");
	const cvdScoreValue = document.getElementById("cvd-score-value");
	const cvdScoreGrade = document.getElementById("cvd-score-grade");

	// Helper: Generate key colors only for CVD score calculation
	const generateKeyColors = (): Record<string, Color> => {
		const colors: Record<string, Color> = {};
		// CVDスコアは全13色パレットで計算
		const palettesForScore =
			state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes;

		palettesForScore.forEach((p) => {
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return;
			const { color: hex } = parseKeyColor(keyColorInput);
			// baseChromaNameがあればそれを使い、なければnameを使用
			const paletteName = (p.baseChromaName || p.name)
				.toLowerCase()
				.replace(/\s+/g, "-");
			colors[paletteName] = new Color(hex);
		});
		return colors;
	};

	// Set up CVD score display function
	updateCVDScoreDisplay = () => {
		const colors = generateKeyColors();
		const score = calculateCVDScore(colors);

		// Show score for selected CVD type, or overall if "normal"
		let displayScore: number;
		let displayGrade: "A" | "B" | "C" | "D" | "F";

		if (state.cvdSimulation === "normal") {
			displayScore = score.overallScore;
			displayGrade = score.grade;
		} else {
			// Show score for the selected CVD type
			const typeScore =
				score.scoresByType[
					state.cvdSimulation as keyof typeof score.scoresByType
				];
			displayScore = typeScore;
			// Calculate grade for this specific score
			if (typeScore >= 90) displayGrade = "A";
			else if (typeScore >= 75) displayGrade = "B";
			else if (typeScore >= 60) displayGrade = "C";
			else if (typeScore >= 40) displayGrade = "D";
			else displayGrade = "F";
		}

		if (cvdScoreValue) {
			cvdScoreValue.textContent = `${displayScore}`;
		}

		if (cvdScoreGrade) {
			cvdScoreGrade.textContent = displayGrade;

			// Set grade color
			switch (displayGrade) {
				case "A":
					cvdScoreGrade.style.backgroundColor = "#e6f4ea";
					cvdScoreGrade.style.color = "#137333";
					break;
				case "B":
					cvdScoreGrade.style.backgroundColor = "#e3f2fd";
					cvdScoreGrade.style.color = "#0052cc";
					break;
				case "C":
					cvdScoreGrade.style.backgroundColor = "#fef7e0";
					cvdScoreGrade.style.color = "#b06000";
					break;
				case "D":
					cvdScoreGrade.style.backgroundColor = "#fce8e6";
					cvdScoreGrade.style.color = "#c5221f";
					break;
				case "F":
					cvdScoreGrade.style.backgroundColor = "#fce8e6";
					cvdScoreGrade.style.color = "#c5221f";
					break;
			}
		}
	};

	// CVD Type Button Handlers
	cvdTypeButtons.forEach((btn) => {
		(btn as HTMLElement).onclick = () => {
			const cvdType = (btn as HTMLElement).dataset.cvd as CVDSimulationType;
			state.cvdSimulation = cvdType;

			// Update button styles via data-active attribute
			cvdTypeButtons.forEach((b) => {
				const isActive = (b as HTMLElement).dataset.cvd === cvdType;
				setButtonActive(b as HTMLElement, isActive);
			});

			// Re-render with simulation applied
			renderMain();
		};
	});

	// Initial Render

	// ColorSystem Demo has been integrated into Harmony buttons (M3 option)
	// The separate demo panel is no longer needed
	const renderAccessibilityView = (container: HTMLElement) => {
		container.className = "dads-section";

		// 0. Explanation Section
		const explanationSection = document.createElement("section");
		explanationSection.className = "dads-a11y-explanation";

		const explanationHeading = document.createElement("h2");
		explanationHeading.textContent = "この機能について";
		explanationHeading.className = "dads-a11y-explanation__heading";
		explanationSection.appendChild(explanationHeading);

		const explanationContent = document.createElement("div");
		explanationContent.className = "dads-a11y-explanation__content";
		explanationContent.innerHTML = `
			<p>
				この画面では、多様な色覚特性を持つユーザーが、あなたのカラーパレットをどのように知覚するかをシミュレーションし、
				<strong>隣接する色が識別困難になっていないか</strong>を確認できます。
			</p>

			<h3>確認すべきポイント</h3>
			<ul>
				<li><strong>キーカラー間の識別性:</strong> 生成された各パレット（Primary, Secondaryなど）のキーカラー同士が、色覚特性によって混同されないか確認します。</li>
				<li><strong>階調の識別性:</strong> 各パレット内の隣接するステップ（例: 500と600）が、十分なコントラストを持って区別できるか確認します。</li>
			</ul>

			<h3>判定ロジックと計算方法</h3>
			<ul>
				<li><strong>シミュレーション手法:</strong> Brettel (1997) および Viénot (1999) のアルゴリズムを使用し、P型（1型）、D型（2型）、T型（3型）、全色盲の知覚を再現しています。</li>
				<li><strong>色差計算 (DeltaE):</strong> OKLCH色空間におけるユークリッド距離を用いて、色の知覚的な差を計算しています。</li>
				<li><strong>警告基準:</strong> シミュレーション後の色差（DeltaE）が <strong>3.0未満</strong> の場合、隣接する色が識別困難であると判断し、<span class="dads-cvd-conflict-icon" style="display:inline-flex; position:static; transform:none; width:16px; height:16px; font-size:10px; margin:0 4px;">!</span>アイコンで警告を表示します。</li>
			</ul>
		`;
		explanationSection.appendChild(explanationContent);
		container.appendChild(explanationSection);

		// 1. Key Colors Check Section
		const keyColorsSection = document.createElement("section");
		const keyColorsHeading = document.createElement("h2");
		keyColorsHeading.textContent =
			"キーカラーの識別性確認 (Key Colors Harmony Check)";
		keyColorsHeading.className = "dads-section__heading";
		keyColorsSection.appendChild(keyColorsHeading);

		const keyColorsDesc = document.createElement("p");
		keyColorsDesc.textContent =
			"生成された各パレットのキーカラー同士が、多様な色覚特性において区別できるかを確認します。";
		keyColorsDesc.className = "dads-section__description";
		keyColorsSection.appendChild(keyColorsDesc);

		// Gather key colors
		const keyColorsMap: Record<string, Color> = {};
		state.palettes.forEach((p) => {
			const keyColorInput = p.keyColors[0];
			if (keyColorInput) {
				const { color: hex } = parseKeyColor(keyColorInput);
				keyColorsMap[p.name] = new Color(hex);
			}
		});

		// Render Key Colors Analysis
		renderDistinguishabilityAnalysis(keyColorsSection, keyColorsMap);
		container.appendChild(keyColorsSection);

		// 2. Per-Palette Step Check Section
		const palettesSection = document.createElement("section");
		const palettesHeading = document.createElement("h2");
		palettesHeading.textContent =
			"パレット階調の識別性確認 (Palette Steps Check)";
		palettesHeading.className = "dads-section__heading";
		palettesSection.appendChild(palettesHeading);

		const palettesDesc = document.createElement("p");
		palettesDesc.textContent =
			"各パレット内の隣接する階調（シェード）が、多様な色覚特性において区別できるかを確認します。";
		palettesDesc.className = "dads-section__description";
		palettesSection.appendChild(palettesDesc);

		state.palettes.forEach((p) => {
			const pContainer = document.createElement("div");
			pContainer.className = "dads-a11y-palette-card";

			const pTitle = document.createElement("h3");
			pTitle.textContent = p.name;
			pTitle.className = "dads-a11y-palette-card__title";
			pContainer.appendChild(pTitle);

			// Generate scale
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return;
			const { color: hex } = parseKeyColor(keyColorInput);
			const keyColor = new Color(hex);

			const baseRatios = getContrastRatios(state.contrastIntensity);
			const bgColor = new Color("#ffffff");
			const keyContrastRatio = keyColor.contrast(bgColor);

			let keyColorIndex = -1;
			let minDiff = Infinity;
			for (let i = 0; i < baseRatios.length; i++) {
				const diff = Math.abs((baseRatios[i] ?? 0) - keyContrastRatio);
				if (diff < minDiff) {
					minDiff = diff;
					keyColorIndex = i;
				}
			}
			if (keyColorIndex >= 0) {
				baseRatios[keyColorIndex] = keyContrastRatio;
			}

			const colors: Color[] = baseRatios.map((ratio, i) => {
				if (i === keyColorIndex) return keyColor;
				const solved = findColorForContrast(keyColor, bgColor, ratio);
				return solved || keyColor;
			});
			colors.reverse();

			const shadesList: { name: string; color: Color }[] = [];
			colors.forEach((c, i) => {
				shadesList.push({ name: `${STEP_NAMES[i]}`, color: c });
			});

			// Render analysis for this palette
			// We use a special mode for adjacent shades
			renderAdjacentShadesAnalysis(pContainer, shadesList);
			palettesSection.appendChild(pContainer);
		});

		container.appendChild(palettesSection);
	};

	const renderDistinguishabilityAnalysis = (
		container: HTMLElement,
		colorsInput: Record<string, Color> | { name: string; color: Color }[],
	) => {
		const cvdTypes = getAllCVDTypes();

		let colorEntries: [string, Color][];
		if (Array.isArray(colorsInput)) {
			colorEntries = colorsInput.map((item) => [item.name, item.color]);
		} else {
			colorEntries = Object.entries(colorsInput);
		}

		// 1. Normal View
		const normalRow = document.createElement("div");
		normalRow.className = "dads-cvd-row";

		const normalLabel = document.createElement("div");
		normalLabel.textContent = "一般色覚 (Normal Vision)";
		normalLabel.className = "dads-cvd-row__label";
		normalRow.appendChild(normalLabel);

		const normalStrip = document.createElement("div");
		normalStrip.className = "dads-cvd-strip";

		colorEntries.forEach(([name, color]) => {
			const swatch = document.createElement("div");
			swatch.className = "dads-cvd-strip__swatch";
			swatch.style.backgroundColor = color.toCss();
			swatch.title = `${name} (${color.toHex()})`;
			swatch.style.color =
				color.contrast(new Color("white")) > 4.5 ? "white" : "black";
			swatch.textContent = name;
			normalStrip.appendChild(swatch);
		});
		normalRow.appendChild(normalStrip);
		container.appendChild(normalRow);

		// 2. Simulations
		const simContainer = document.createElement("div");
		simContainer.className = "dads-cvd-simulations";

		cvdTypes.forEach((type: CVDType) => {
			const row = document.createElement("div");

			const label = document.createElement("div");
			label.textContent = getCVDTypeName(type);
			label.className = "dads-cvd-row__label";
			row.appendChild(label);

			const stripContainer = document.createElement("div");
			stripContainer.className = "dads-cvd-strip-container";

			const strip = document.createElement("div");
			strip.className = "dads-cvd-strip";

			// Calculate conflicts first
			const simulatedColors = colorEntries.map(([name, color]) => ({
				name,
				color: simulateCVD(color, type),
			}));

			// Check adjacent pairs in the list
			const conflicts: number[] = []; // Indices of left side of conflict pair
			for (let i = 0; i < simulatedColors.length - 1; i++) {
				const c1 = simulatedColors[i]!.color;
				const c2 = simulatedColors[i + 1]!.color;
				// Use a stricter threshold for "warning" visualization
				// DeltaE < 3.0 is usually considered hard to distinguish
				// DeltaE < 5.0 might be a warning
				const result = checkAdjacentShadesDistinguishability(
					[
						{ name: "1", color: c1 },
						{ name: "2", color: c2 },
					],
					{ visionTypes: [type], threshold: 3.0 },
				);
				if (result.problematicPairs.length > 0) {
					conflicts.push(i);
				}
			}

			simulatedColors.forEach((item) => {
				const swatch = document.createElement("div");
				swatch.className = "dads-cvd-strip__swatch";
				swatch.style.backgroundColor = item.color.toCss();
				swatch.title = `${item.name} (Simulated)`;
				strip.appendChild(swatch);
			});
			stripContainer.appendChild(strip);

			// Draw conflict lines
			if (conflicts.length > 0) {
				const overlay = document.createElement("div");
				overlay.className = "dads-cvd-overlay";

				const segmentWidth = 100 / simulatedColors.length;

				conflicts.forEach((index) => {
					const leftPos = (index + 1) * segmentWidth;

					const line = document.createElement("div");
					line.className = "dads-cvd-conflict-line";
					line.style.left = `calc(${leftPos}% - 1px)`;
					overlay.appendChild(line);

					const icon = document.createElement("div");
					icon.className = "dads-cvd-conflict-icon";
					icon.textContent = "!";
					icon.style.left = `calc(${leftPos}% - 10px)`;
					overlay.appendChild(icon);
				});

				stripContainer.appendChild(overlay);
			}

			row.appendChild(stripContainer);
			simContainer.appendChild(row);
		});
		container.appendChild(simContainer);
	};

	const renderAdjacentShadesAnalysis = (
		container: HTMLElement,
		colorsInput: Record<string, Color> | { name: string; color: Color }[],
	) => {
		// Similar to above but optimized for shades (gradient)
		// We want to show the gradient strip and mark where steps are too close
		renderDistinguishabilityAnalysis(container, colorsInput);
	};

	// Initial Render
	renderSidebar();
	updateEditor();
	renderMain();
};
// End of runDemo

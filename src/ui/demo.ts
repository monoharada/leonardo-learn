import { getAPCA } from "../accessibility/apca";
import { verifyContrast } from "../accessibility/wcag2";
import { Color } from "../core/color";
import { generateSystemPalette, HarmonyType } from "../core/harmony";
import { findColorForContrast } from "../core/solver";

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
}

type ContrastIntensity = "subtle" | "moderate" | "strong" | "vivid";
type LightnessDistribution = "linear" | "easeIn" | "easeOut";
type ViewMode = "palette" | "shades";

// Default State
const state = {
	palettes: [
		{
			id: "color",
			name: "Primary",
			keyColors: ["#0066CC@600"],
			ratios: [21, 15, 10, 7, 4.5, 3, 1],
			harmony: HarmonyType.NONE,
		},
	] as PaletteConfig[],
	activeId: "color",
	activeHarmonyIndex: 0, // 0 = Primary, 1+ = Derived
	contrastIntensity: "moderate" as ContrastIntensity,
	lightnessDistribution: "linear" as LightnessDistribution,
	viewMode: "palette" as ViewMode,
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
			container.style.marginBottom = "4px";

			// Main Palette Entry (Primary)
			const btn = document.createElement("div");
			btn.textContent = p.name;
			btn.style.padding = "0.5rem 1rem";
			btn.style.cursor = "pointer";
			btn.style.borderRadius = "4px";
			btn.style.fontWeight = "500";
			btn.style.fontSize = "0.9rem";
			btn.style.display = "flex";
			btn.style.alignItems = "center";
			btn.style.justifyContent = "space-between";

			// Show color dot
			const dot = document.createElement("span");
			dot.style.width = "12px";
			dot.style.height = "12px";
			dot.style.borderRadius = "50%";
			dot.style.display = "inline-block";
			dot.style.marginRight = "8px";

			// Parse first key color for dot
			const keyColorInput = p.keyColors[0];
			if (keyColorInput) {
				const { color: hex } = parseKeyColor(keyColorInput);
				dot.style.backgroundColor = hex;
			}
			btn.prepend(dot);

			if (p.id === state.activeId) {
				btn.style.background = "#e3f2fd";
				btn.style.color = "#0052cc";
				btn.style.fontWeight = "bold";
			} else {
				btn.style.background = "transparent";
				btn.style.color = "#333";
			}

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

		// Update Harmony Selector (Buttons)
		const harmonyButtons = document.querySelectorAll("#harmony-buttons button");
		const harmonyInput = document.getElementById("harmony") as HTMLInputElement;

		if (harmonyButtons.length > 0 && harmonyInput) {
			// Set initial active state based on palette
			harmonyInput.value = p.harmony;
			harmonyButtons.forEach((btn) => {
				const val = (btn as HTMLElement).dataset.value;
				if (val === p.harmony) {
					(btn as HTMLElement).style.background = "#e3f2fd";
					(btn as HTMLElement).style.borderColor = "#0052cc";
					(btn as HTMLElement).style.fontWeight = "bold";
					(btn as HTMLElement).classList.add("active");
				} else {
					(btn as HTMLElement).style.background = "white";
					(btn as HTMLElement).style.borderColor = "#ccc";
					(btn as HTMLElement).style.fontWeight = "normal";
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
			if (val === state.contrastIntensity) {
				(btn as HTMLElement).style.background = "#e3f2fd";
				(btn as HTMLElement).style.borderColor = "#0052cc";
				(btn as HTMLElement).style.fontWeight = "bold";
			} else {
				(btn as HTMLElement).style.background = "white";
				(btn as HTMLElement).style.borderColor = "#ccc";
				(btn as HTMLElement).style.fontWeight = "normal";
			}
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

		const systemColors = generateSystemPalette(primaryColor, harmonyType);

		// Convert to PaletteConfigs
		state.palettes = systemColors.map((sc, index) => {
			// For the Primary palette (index 0), preserve the harmony type
			// For others, set to NONE as they are derived
			const paletteHarmony = index === 0 ? harmonyType : HarmonyType.NONE;

			return {
				id: `sys-${index}-${sc.name.toLowerCase().replace(/\s+/g, "-")}`,
				name: sc.name,
				keyColors: [`${sc.keyColor.toHex()}@600`], // Default to step 600
				ratios: [21, 15, 10, 7, 4.5, 3, 1],
				harmony: paletteHarmony,
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
	if (viewPaletteBtn && viewShadesBtn) {
		const contrastControls = document.getElementById(
			"header-contrast-controls",
		);

		viewPaletteBtn.onclick = () => {
			state.viewMode = "palette";
			viewPaletteBtn.classList.add("active");
			viewPaletteBtn.style.background = "white";
			viewPaletteBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

			viewShadesBtn.classList.remove("active");
			viewShadesBtn.style.background = "transparent";
			viewShadesBtn.style.boxShadow = "none";

			if (contrastControls) contrastControls.style.display = "none";

			renderMain();
		};

		viewShadesBtn.onclick = () => {
			state.viewMode = "shades";
			viewShadesBtn.classList.add("active");
			viewShadesBtn.style.background = "white";
			viewShadesBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

			viewPaletteBtn.classList.remove("active");
			viewPaletteBtn.style.background = "transparent";
			viewPaletteBtn.style.boxShadow = "none";

			if (contrastControls) contrastControls.style.display = "flex";

			renderMain();
		};
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

	// Export Logic
	const exportCssBtn = document.getElementById("export-css");
	if (exportCssBtn) {
		exportCssBtn.onclick = () => {
			console.log("Exporting CSS...");
		};
	}

	const exportJsonBtn = document.getElementById("export-json");
	if (exportJsonBtn) {
		exportJsonBtn.onclick = () => {
			console.log("Exporting JSON...");
		};
	}

	// Render Main Content
	const renderMain = () => {
		if (!app) return;
		app.innerHTML = "";

		if (state.viewMode === "palette") {
			renderPaletteView(app);
		} else {
			renderShadesView(app);
		}
	};

	const renderPaletteView = (container: HTMLElement) => {
		container.style.display = "grid";
		container.style.gridTemplateColumns =
			"repeat(auto-fill, minmax(200px, 1fr))";
		container.style.gap = "1.5rem";

		state.palettes.forEach((p) => {
			const card = document.createElement("div");
			card.style.background = "white";
			card.style.borderRadius = "8px";
			card.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
			card.style.overflow = "hidden";
			card.style.cursor = "pointer";
			card.onclick = () => {
				state.activeId = p.id;
				state.viewMode = "shades";
				// Update UI state
				const vShades = document.getElementById("view-shades");
				const vPalette = document.getElementById("view-palette");
				if (vShades && vPalette) {
					vShades.click(); // Trigger click handler to update styles
				}
				renderSidebar(); // Update active state in sidebar
			};

			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return;
			const { color: hex } = parseKeyColor(keyColorInput);

			const swatch = document.createElement("div");
			swatch.style.height = "120px";
			swatch.style.backgroundColor = hex;

			const info = document.createElement("div");
			info.style.padding = "1rem";

			const name = document.createElement("h3");
			name.textContent = p.name;
			name.style.margin = "0 0 0.5rem 0";
			name.style.fontSize = "1rem";

			const hexCode = document.createElement("code");
			hexCode.textContent = hex;
			hexCode.style.color = "#666";
			hexCode.style.fontSize = "0.85rem";

			info.appendChild(name);
			info.appendChild(hexCode);
			card.appendChild(swatch);
			card.appendChild(info);
			container.appendChild(card);
		});
	};

	const renderShadesView = (container: HTMLElement) => {
		container.style.display = "flex";
		container.style.flexDirection = "column";
		container.style.gap = "2rem";

		state.palettes.forEach((p) => {
			const section = document.createElement("section");

			const header = document.createElement("h2");
			header.textContent = p.name;
			header.style.fontSize = "1.1rem";
			header.style.marginBottom = "1rem";
			header.style.color = "#333";
			section.appendChild(header);

			// Generate Scale using Theme
			const keyColorInput = p.keyColors[0];
			if (!keyColorInput) return;
			const { color: keyHex } = parseKeyColor(keyColorInput);
			const keyColor = new Color(keyHex);

			// Define ratios for 13 steps based on intensity
			const contrastRanges: Record<ContrastIntensity, number[]> = {
				subtle: [
					1.05, 1.1, 1.15, 1.2, 1.3, 1.5, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0, 12.0,
				],
				moderate: [
					1.05, 1.1, 1.2, 1.35, 1.7, 2.5, 3.5, 4.5, 6.0, 8.5, 11.0, 14.0, 17.0,
				],
				strong: [
					1.1, 1.2, 1.3, 1.5, 2.0, 3.0, 4.5, 6.0, 8.0, 11.0, 14.0, 17.0, 21.0,
				],
				vivid: [
					1.15, 1.25, 1.4, 1.7, 2.5, 3.5, 5.0, 7.0, 9.0, 12.0, 15.0, 18.0, 21.0,
				],
			};

			const baseRatios = [
				...(contrastRanges[state.contrastIntensity] || contrastRanges.moderate),
			];

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
			scaleContainer.style.display = "flex";
			scaleContainer.style.borderRadius = "8px";
			scaleContainer.style.overflow = "visible";

			colors.forEach((stepColor, index) => {
				const swatch = document.createElement("div");
				swatch.style.flex = "1";
				swatch.style.aspectRatio = "1";
				swatch.style.display = "flex";
				swatch.style.alignItems = "center";
				swatch.style.justifyContent = "center";
				swatch.style.flexDirection = "column";
				swatch.style.fontSize = "0.75rem";
				swatch.style.position = "relative"; // For badges

				const isKeyColor = index === reversedKeyColorIndex;

				// Calculate contrast against both white and black
				const whiteContrast = verifyContrast(
					stepColor,
					new Color("#ffffff"),
				).contrast;
				const blackContrast = verifyContrast(
					stepColor,
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
					badgeContainer.style.display = "flex";
					badgeContainer.style.gap = "2px";
					badgeContainer.style.fontSize = "0.55rem";
					badgeContainer.style.position = "absolute";
					badgeContainer.style.bottom = "4px";
					badgeContainer.style.left = "50%";
					badgeContainer.style.transform = "translateX(-50%)";

					// Show white indicator if usable
					if (whiteLevel) {
						const whiteBadge = document.createElement("div");
						whiteBadge.style.padding = "2px 4px";
						whiteBadge.style.borderRadius = "4px";
						whiteBadge.style.fontWeight = "bold";
						whiteBadge.style.backgroundColor = "transparent";
						whiteBadge.style.color = "white";
						whiteBadge.style.border =
							whiteLevel === "L" ? "1px dashed white" : "1px solid white";
						whiteBadge.textContent = whiteLevel;
						badgeContainer.appendChild(whiteBadge);
					}

					// Show black indicator if usable
					if (blackLevel) {
						const blackBadge = document.createElement("div");
						blackBadge.style.padding = "2px 4px";
						blackBadge.style.borderRadius = "4px";
						blackBadge.style.fontWeight = "bold";
						blackBadge.style.backgroundColor = "transparent";
						blackBadge.style.color = "black";
						blackBadge.style.border =
							blackLevel === "L" ? "1px dashed black" : "1px solid black";
						blackBadge.textContent = blackLevel;
						badgeContainer.appendChild(blackBadge);
					}

					parent.appendChild(badgeContainer);
				};

				if (isKeyColor) {
					// No background for key color swatch - circle only
					swatch.style.backgroundColor = "transparent";

					// Show circle that fills the swatch
					const circle = document.createElement("div");
					circle.style.width = "100%";
					circle.style.height = "100%";
					circle.style.borderRadius = "50%";
					circle.style.backgroundColor = stepColor.toCss();
					circle.style.display = "flex";
					circle.style.alignItems = "center";
					circle.style.justifyContent = "center";
					circle.style.flexDirection = "column";

					const label = document.createElement("span");
					label.textContent = `${ratio}`;
					label.style.color = textColor;
					label.style.fontWeight = "bold";
					label.style.fontSize = "0.75rem";

					circle.appendChild(label);
					swatch.appendChild(circle);
					createBadge(swatch); // Bottom-center badge
				} else {
					swatch.style.backgroundColor = stepColor.toCss();

					const label = document.createElement("span");
					label.textContent = `${ratio}`;
					label.style.color = textColor;
					label.style.fontWeight = "bold";

					swatch.appendChild(label);
					createBadge(swatch); // Bottom-center badge
				}

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
						const detailStep = document.getElementById("detail-step");
						const detailHex = document.getElementById("detail-hex");

						if (detailSwatch)
							detailSwatch.style.backgroundColor = color.toCss();
						if (detailStep)
							detailStep.textContent = `${Math.round(colorL * 100)}% Lightness`;
						if (detailHex) detailHex.textContent = color.toHex();

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

						updateCard("#ffffff", "white");
						updateCard("#000000", "black");

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
									check.style.color = color.oklch.l > 0.5 ? "black" : "white";
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
							miniSwatch.style.flex = "1";
							miniSwatch.style.backgroundColor = c.toCss();
							miniSwatch.style.cursor = "pointer";
							miniSwatch.style.position = "relative";
							miniSwatch.style.border = "none";
							miniSwatch.style.padding = "0";
							miniSwatch.style.outline = "none";
							miniSwatch.setAttribute("aria-label", `Color ${c.toHex()}`);
							miniSwatch.onclick = (e) => {
								e.stopPropagation();
								updateDetail(c, i);
							};
							// Focus style
							miniSwatch.onfocus = () => {
								miniSwatch.style.outline = "2px solid white";
								miniSwatch.style.outlineOffset = "-2px";
							};
							miniSwatch.onblur = () => {
								miniSwatch.style.outline = "none";
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

	// Initial Render
	renderSidebar();
	updateEditor();
	renderMain();
};

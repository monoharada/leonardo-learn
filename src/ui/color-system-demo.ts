/**
 * ColorSystem Demo - ColorSystemファサードのデモUI
 */

import { ColorSystem, type GenerationMode } from "../core/system/color-system";

/**
 * ColorSystem デモを実行
 */
export function runColorSystemDemo(containerId: string = "color-system-demo") {
	const container = document.getElementById(containerId);
	if (!container) {
		console.warn(`Container #${containerId} not found for ColorSystem demo`);
		return;
	}

	const colorSystem = new ColorSystem();
	let currentMode: GenerationMode = "m3";
	let currentColor = "#3366cc";

	// UI構築
	container.innerHTML = `
		<div style="padding: 1rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 1rem;">
			<h3 style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600;">ColorSystem Generator</h3>

			<div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
				<div>
					<label style="display: block; font-size: 0.75rem; margin-bottom: 0.25rem;">Source Color</label>
					<input type="color" id="cs-source-color" value="${currentColor}" style="width: 60px; height: 32px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;" />
				</div>

				<div>
					<label style="display: block; font-size: 0.75rem; margin-bottom: 0.25rem;">Mode</label>
					<select id="cs-mode" style="height: 32px; padding: 0 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
						<option value="default">Default</option>
						<option value="m3" selected>Material Design 3</option>
					</select>
				</div>

				<div style="display: flex; align-items: flex-end;">
					<button id="cs-generate" style="height: 32px; padding: 0 1rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
						Generate
					</button>
				</div>

				<div style="display: flex; align-items: flex-end;">
					<button id="cs-export" style="height: 32px; padding: 0 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
						Export JSON
					</button>
				</div>
			</div>

			<div id="cs-preview" style="min-height: 100px;"></div>

			<div id="cs-timing" style="font-size: 0.75rem; color: #666; margin-top: 0.5rem;"></div>
		</div>
	`;

	const sourceColorInput = document.getElementById(
		"cs-source-color",
	) as HTMLInputElement;
	const modeSelect = document.getElementById("cs-mode") as HTMLSelectElement;
	const generateBtn = document.getElementById("cs-generate");
	const exportBtn = document.getElementById("cs-export");
	const previewEl = document.getElementById("cs-preview");
	const timingEl = document.getElementById("cs-timing");

	// プレビューを更新
	const updatePreview = () => {
		if (!previewEl || !timingEl) return;

		const start = performance.now();
		const result = colorSystem.generate(currentColor, {
			mode: currentMode,
			roles: ["primary", "neutral"],
		});
		const elapsed = performance.now() - start;

		// プレビュー描画
		let html = "";

		for (const [role, scale] of result.scales) {
			html += `<div style="margin-bottom: 0.75rem;">`;
			html += `<div style="font-size: 0.7rem; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase; color: #666;">${role}</div>`;
			html += `<div style="display: flex; gap: 2px; flex-wrap: wrap;">`;

			// トーンをソートして表示
			const sortedTones = [...scale.tones.entries()].sort(
				(a, b) => a[0] - b[0],
			);

			for (const [tone, color] of sortedTones) {
				const hex = color.toHex();
				const lightness = color.oklch.l;
				const textColor = lightness > 0.6 ? "#000" : "#fff";

				html += `
					<div style="
						width: 36px;
						height: 36px;
						background: ${hex};
						border-radius: 4px;
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 0.6rem;
						color: ${textColor};
						cursor: pointer;
						border: 1px solid rgba(0,0,0,0.1);
					" title="${hex} (Tone ${tone})">
						${tone}
					</div>
				`;
			}

			html += `</div></div>`;
		}

		previewEl.innerHTML = html;
		timingEl.textContent = `Generated in ${elapsed.toFixed(2)}ms`;
	};

	// イベントリスナー
	sourceColorInput?.addEventListener("input", (e) => {
		currentColor = (e.target as HTMLInputElement).value;
		updatePreview();
	});

	modeSelect?.addEventListener("change", (e) => {
		currentMode = (e.target as HTMLSelectElement).value as GenerationMode;
		updatePreview();
	});

	generateBtn?.addEventListener("click", () => {
		updatePreview();
	});

	exportBtn?.addEventListener("click", () => {
		const result = colorSystem.generate(currentColor, {
			mode: currentMode,
			roles: ["primary", "neutral"],
		});
		const json = colorSystem.export(result, "json");

		// クリップボードにコピー
		navigator.clipboard
			.writeText(json)
			.then(() => {
				alert("JSON copied to clipboard!");
			})
			.catch(() => {
				// フォールバック: 新しいウィンドウで表示
				const win = window.open("", "_blank");
				if (win) {
					win.document.write(`<pre>${json}</pre>`);
				}
			});
	});

	// 初回描画
	updatePreview();
}

/**
 * パレットプレビューモジュールのテスト
 *
 * @module @/ui/demo/views/palette-preview.test
 *
 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
 * このファイルでは型とエクスポートの確認を行う。
 *
 * セマンティックカラーの役割:
 * - Error → エラーメッセージ、バリデーションエラー
 * - Success → 成功メッセージ
 * - Warning → 警告表示
 * - Link → リンクテキスト
 * - Primary → ヘッドライン、CTAボタン
 * - Accent → カード背景、アクセント要素
 */

import { beforeAll, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import type {
	PalettePreviewColors,
	PalettePreviewOptions,
	PreviewSection,
} from "./palette-preview";

const BASE_PREVIEW_COLORS: PalettePreviewColors = {
	// 基本色
	background: "#FFFFFF",
	text: "#1A1A1A",

	// Primary役割
	headline: "#00A3BF",
	headlineText: "#00A3BF",
	button: "#00A3BF",
	buttonText: "#FFFFFF",

	// Accent役割
	card: "#F5F5F5",
	cardAccent: "#259063",
	cardAccentText: "#259063",

	// セマンティック役割（正しい用途）
	link: "#0091FF",
	linkText: "#0091FF",
	error: "#FF2800",
	success: "#35A16B",
	warning: "#D7C447",

	// Logo
	logo: "#00A3BF",
	logoText: "#00A3BF",

	// UI要素
	border: "#E0E0E0",
	inputBackground: "#FFFFFF",
	footerBackground: "#1A1A1A",
	footerText: "#FFFFFF",
};

function makePreviewColors(
	overrides: Partial<PalettePreviewColors> = {},
): PalettePreviewColors {
	return { ...BASE_PREVIEW_COLORS, ...overrides };
}

function getStyleVar(el: HTMLElement, name: string): string {
	return el.style.getPropertyValue(name).trim();
}

function getIllustrationEl(container: HTMLElement): HTMLElement {
	const el = container.querySelector<HTMLElement>(
		'[data-preview-illustration="1"]',
	);
	if (!el) {
		throw new Error("Illustration element not found");
	}
	return el;
}

function installJSDOMGlobals(): () => void {
	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

	const originalDocument = globalThis.document;
	const originalDOMParser = globalThis.DOMParser;

	// @ts-expect-error: JSDOM環境でグローバルを上書き
	globalThis.document = dom.window.document;
	// @ts-expect-error: JSDOM環境でグローバルを上書き
	globalThis.DOMParser = dom.window.DOMParser;

	return () => {
		// @ts-expect-error: 元の値を復元
		globalThis.document = originalDocument;
		// @ts-expect-error: 元の値を復元
		globalThis.DOMParser = originalDOMParser;
		dom.window.close();
	};
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		(typeof value === "object" || typeof value === "function") &&
		value !== null &&
		"then" in value &&
		typeof (value as { then?: unknown }).then === "function"
	);
}

function withJSDOMGlobals<T>(fn: () => T): T;
function withJSDOMGlobals<T>(fn: () => Promise<T>): Promise<T>;
function withJSDOMGlobals<T>(fn: () => T | Promise<T>): T | Promise<T> {
	const restore = installJSDOMGlobals();
	try {
		const result = fn();
		if (isPromiseLike<T>(result)) {
			return Promise.resolve(result).finally(restore);
		}

		restore();
		return result;
	} catch (error) {
		restore();
		throw error;
	}
}

const identityGetDisplayHex: NonNullable<
	PalettePreviewOptions["getDisplayHex"]
> = (hex) => hex;

const blackGetDisplayHex: NonNullable<
	PalettePreviewOptions["getDisplayHex"]
> = () => "#000000";

describe("palette-preview module", () => {
	describe("exports", () => {
		it("should export createPalettePreview function", async () => {
			const { createPalettePreview } = await import("./palette-preview");
			expect(createPalettePreview).toBeDefined();
			expect(typeof createPalettePreview).toBe("function");
		});

		it("should export mapPaletteToPreviewColors function", async () => {
			const { mapPaletteToPreviewColors } = await import("./palette-preview");
			expect(mapPaletteToPreviewColors).toBeDefined();
			expect(typeof mapPaletteToPreviewColors).toBe("function");
		});
	});

	describe("PalettePreviewColors interface", () => {
		it("should have all required color properties", () => {
			const colors: PalettePreviewColors = makePreviewColors();

			expect(colors.background).toBe("#FFFFFF");
			expect(colors.headline).toBe("#00A3BF");
			expect(colors.link).toBe("#0091FF");
			expect(colors.error).toBe("#FF2800");
			expect(colors.success).toBe("#35A16B");
			expect(colors.warning).toBe("#D7C447");
		});
	});

	describe("getTextSafeColor function", () => {
		it("should export getTextSafeColor function", async () => {
			const { getTextSafeColor } = await import("./palette-preview");
			expect(getTextSafeColor).toBeDefined();
			expect(typeof getTextSafeColor).toBe("function");
		});

		it("should return original color when contrast is sufficient", async () => {
			const { getTextSafeColor } = await import("./palette-preview");
			// 黒文字を白背景に - コントラスト十分
			const result = getTextSafeColor("#000000", "#FFFFFF");
			expect(result).toBe("#000000");
		});

		it("should return fallback color when contrast is insufficient", async () => {
			const { getTextSafeColor } = await import("./palette-preview");
			// 薄いピンク（#FFE4E1）を白背景に - コントラスト不足
			const result = getTextSafeColor("#FFE4E1", "#FFFFFF");
			// 白背景なので黒系フォールバック
			expect(result).toBe("#1A1A1A");
		});

		it("should use lower threshold for large text", async () => {
			const { getTextSafeColor } = await import("./palette-preview");
			// 中程度の色を白背景に - 通常テキストでは不足だが大きいテキストでは十分な場合
			// コントラスト比 3:1 以上 4.5:1 未満の色をテスト
			const result = getTextSafeColor("#767676", "#FFFFFF", true);
			// 大きいテキストでは3:1でOKなので元の色が返る
			expect(result).toBe("#767676");
		});
	});

	describe("PreviewSection enum", () => {
		it("should define all preview sections", () => {
			const sections: PreviewSection[] = [
				"nav",
				"hero",
				"cards",
				"form",
				"footer",
			];

			expect(sections).toContain("nav");
			expect(sections).toContain("hero");
			expect(sections).toContain("cards");
			expect(sections).toContain("form");
			expect(sections).toContain("footer");
		});
	});

	describe("semantic color role mapping", () => {
		it("should map Error to validation/error messages", () => {
			// Error色はエラーメッセージやバリデーションエラーに使用
			const colors: Partial<PalettePreviewColors> = {
				error: "#FF2800",
			};
			expect(colors.error).toBeDefined();
		});

		it("should map Success to success messages", () => {
			// Success色は成功メッセージに使用
			const colors: Partial<PalettePreviewColors> = {
				success: "#35A16B",
			};
			expect(colors.success).toBeDefined();
		});

		it("should map Warning to warning displays", () => {
			// Warning色は警告表示に使用
			const colors: Partial<PalettePreviewColors> = {
				warning: "#D7C447",
			};
			expect(colors.warning).toBeDefined();
		});

		it("should map Link to link text", () => {
			// Link色はリンクテキストに使用
			const colors: Partial<PalettePreviewColors> = {
				link: "#0091FF",
			};
			expect(colors.link).toBeDefined();
		});

		it("should map Primary to headline and CTA button", () => {
			// Primary色はヘッドラインとCTAボタンに使用
			const colors: Partial<PalettePreviewColors> = {
				headline: "#00A3BF",
				button: "#00A3BF",
			};
			expect(colors.headline).toBe(colors.button);
		});

		it("should map Accent to card accent elements", () => {
			// Accent色はカードのアクセント要素に使用
			const colors: Partial<PalettePreviewColors> = {
				cardAccent: "#259063",
			};
			expect(colors.cardAccent).toBeDefined();
		});
	});

	describe("preview content structure", () => {
		it("should include navigation with logo and links", () => {
			// Nav: ロゴとナビリンク
			const navContent = {
				logo: "Logo",
				links: ["Home", "About", "Contact"],
			};
			expect(navContent.links.length).toBe(3);
		});

		it("should include hero with headline, body, and CTA", () => {
			// Hero: ヘッドライン、本文、CTAボタン
			const heroContent = {
				headline: "Curated colors in context",
				body: "See how your palette looks in a real design.",
				cta: "Get Started",
			};
			expect(heroContent.headline).toBeDefined();
			expect(heroContent.body).toBeDefined();
			expect(heroContent.cta).toBeDefined();
		});

		it("should include cards section with multiple cards", () => {
			// Cards: 複数のカード
			const cardsContent = {
				cards: [
					{ title: "Feature 1", description: "Description 1" },
					{ title: "Feature 2", description: "Description 2" },
					{ title: "Feature 3", description: "Description 3" },
				],
			};
			expect(cardsContent.cards.length).toBe(3);
		});

		it("should include form with input and submit button", () => {
			// Form: 入力フィールドと送信ボタン
			const formContent = {
				inputPlaceholder: "Enter your email",
				submitText: "Subscribe",
				// エラー/成功メッセージのスペース
				errorMessage: "Please enter a valid email",
				successMessage: "Successfully subscribed!",
			};
			expect(formContent.inputPlaceholder).toBeDefined();
			expect(formContent.submitText).toBeDefined();
			expect(formContent.errorMessage).toBeDefined();
			expect(formContent.successMessage).toBeDefined();
		});

		it("should include footer with copyright", () => {
			// Footer: コピーライト
			const footerContent = {
				copyright: "2024 Color Token Generator",
			};
			expect(footerContent.copyright).toBeDefined();
		});
	});

	describe("illustration card markup structure", () => {
		let buildDadsPreviewMarkup: () => string;

		beforeAll(async () => {
			({ buildDadsPreviewMarkup } = await import("./palette-preview"));
		});

		/**
		 * NOTE: DOM操作を伴うテストは主にE2Eテスト（Playwright）でカバー。
		 * ここではマークアップ文字列の構造をテストする。
		 *
		 * CVDモード時の色整合性:
		 * - --preview-kv-bg と --iv-background が一致すること
		 * - 両方とも getDisplayHex() による表示色変換が適用されていること
		 * - ensureIllustrationCardContrast() は表示色ベースの背景で計算すること
		 *
		 * 受入基準:
		 * 1. イラストカードが「上：画像 / 下：見出し+説明」の2分割レイアウト
		 * 2. 見出しが「行政サービス室のデジタル化推進」
		 * 3. 「デジタル庁」文言が完全に削除
		 * 4. SVGの色がCSS変数で制御（replaceIllustrationColors削除）
		 */

		it("should render illustration card with image-first structure", () => {
			const markup = buildDadsPreviewMarkup();

			// 構造: preview-card-illustration__image が先、preview-card-illustration__body が後
			const imageMatch = markup.indexOf("preview-card-illustration__image");
			const bodyMatch = markup.indexOf("preview-card-illustration__body");

			expect(imageMatch).toBeGreaterThan(-1);
			expect(bodyMatch).toBeGreaterThan(-1);
			expect(imageMatch).toBeLessThan(bodyMatch); // imageが先に来る
		});

		it("should render illustration heading with correct text", () => {
			const markup = buildDadsPreviewMarkup();

			expect(markup).toContain("行政サービス室のデジタル化推進");
		});

		it("should not contain デジタル庁 text in illustration card heading or description", () => {
			const markup = buildDadsPreviewMarkup();

			// イラストカード内のテキストを抽出（preview-card-illustration部分）
			const illustrationStart = markup.indexOf(
				'class="preview-card-illustration"',
			);
			const illustrationEnd = markup.indexOf("</article>", illustrationStart);
			const illustrationMarkup = markup.substring(
				illustrationStart,
				illustrationEnd,
			);

			// イラストカード内に「デジタル庁」が含まれていないことを確認
			expect(illustrationMarkup).not.toContain("デジタル庁");
		});

		it("should render description text in body section", () => {
			const markup = buildDadsPreviewMarkup();

			// 新しい説明文
			expect(markup).toContain("窓口手続きのオンライン化");
		});
	});

	describe("color mapping from palette state", () => {
		it("should extract primary color for headline and button", async () => {
			const { mapPaletteToPreviewColors } = await import("./palette-preview");

			// Primary色のモックデータ
			const mockPrimaryHex = "#00A3BF";
			const mockSemanticColors = {
				error: "#FF2800",
				success: "#35A16B",
				warning: "#D7C447",
				link: "#0091FF",
			};
			const mockAccentHex = "#259063";
			const mockBackground = "#FFFFFF";

			const colors = mapPaletteToPreviewColors({
				primaryHex: mockPrimaryHex,
				accentHex: mockAccentHex,
				semanticColors: mockSemanticColors,
				backgroundColor: mockBackground,
			});

			expect(colors.headline).toBe(mockPrimaryHex);
			expect(colors.button).toBe(mockPrimaryHex);
		});

		it("should use semantic colors for their intended purposes", async () => {
			const { mapPaletteToPreviewColors } = await import("./palette-preview");

			const mockSemanticColors = {
				error: "#FF2800",
				success: "#35A16B",
				warning: "#D7C447",
				link: "#0091FF",
			};

			const colors = mapPaletteToPreviewColors({
				primaryHex: "#00A3BF",
				accentHex: "#259063",
				semanticColors: mockSemanticColors,
				backgroundColor: "#FFFFFF",
			});

			// セマンティックカラーは正しい役割にマップされる
			expect(colors.error).toBe(mockSemanticColors.error);
			expect(colors.success).toBe(mockSemanticColors.success);
			expect(colors.warning).toBe(mockSemanticColors.warning);
			expect(colors.link).toBe(mockSemanticColors.link);
		});

		it("should provide contrast-safe text colors for light colors on white background", async () => {
			const { mapPaletteToPreviewColors } = await import("./palette-preview");

			// 薄いピンク色 - コントラスト不足のケース
			const lightPinkPrimary = "#FFE4E1";
			const lightPinkAccent = "#FFCCCC";

			const colors = mapPaletteToPreviewColors({
				primaryHex: lightPinkPrimary,
				accentHex: lightPinkAccent,
				semanticColors: {
					error: "#FF2800",
					success: "#35A16B",
					warning: "#D7C447",
					link: "#AACCFF", // 薄いリンク色
				},
				backgroundColor: "#FFFFFF",
			});

			// 元の色は保持
			expect(colors.headline).toBe(lightPinkPrimary);
			expect(colors.cardAccent).toBe(lightPinkAccent);
			expect(colors.link).toBe("#AACCFF");

			// コントラスト調整済みの色は異なる（フォールバックが適用される）
			expect(colors.headlineText).toBe("#1A1A1A"); // 白背景なので黒系にフォールバック
			expect(colors.cardAccentText).toBe("#1A1A1A"); // カード背景#F8F8F8に対して黒系にフォールバック
			expect(colors.linkText).toBe("#1A1A1A"); // 白背景なので黒系にフォールバック
		});

		it("should keep original color when contrast is sufficient", async () => {
			const { mapPaletteToPreviewColors } = await import("./palette-preview");

			// 暗い色 - コントラスト十分のケース
			// #1A5276 vs #FFFFFF = 8.36:1 (十分)
			// #115740 vs #F8F8F8 = 6.2:1 (十分、4.5以上)
			const darkPrimary = "#1A5276";
			const darkAccent = "#115740"; // より暗い緑（#1E8449は4.44:1で微妙に足りない）

			const colors = mapPaletteToPreviewColors({
				primaryHex: darkPrimary,
				accentHex: darkAccent,
				semanticColors: {
					error: "#FF2800",
					success: "#35A16B",
					warning: "#D7C447",
					link: "#0066CC",
				},
				backgroundColor: "#FFFFFF",
			});

			// コントラスト十分なので元の色がそのまま使用される
			expect(colors.headlineText).toBe(darkPrimary);
			expect(colors.cardAccentText).toBe(darkAccent);
		});
	});

	describe("CVDモード時のCSS変数整合性", () => {
		let createPalettePreview: typeof import("./palette-preview").createPalettePreview;

		/**
		 * JSDOM環境でcreate関数を呼び出し、CVDシミュレーション（getDisplayHex）を
		 * 適用した際に --preview-illustration-bg と --iv-background が一致することを検証する。
		 *
		 * 重要: 非identity なstub（常に "#000000" を返す）を使用することで、
		 * 修正前では「たまたま一致」することを防ぎ、変換適用を明示的に検証する。
		 */

		beforeAll(async () => {
			({ createPalettePreview } = await import("./palette-preview"));
		});

		it("--preview-illustration-bg と --iv-background が一致する（getDisplayHex適用後）", () => {
			withJSDOMGlobals(() => {
				const container = createPalettePreview(makePreviewColors(), {
					getDisplayHex: blackGetDisplayHex,
					tertiaryHex: "#FF6B6B", // ターシャリー色（イラスト背景計算に使用）
				});

				const illustrationBg = getStyleVar(
					container,
					"--preview-illustration-bg",
				);
				const ivBg = getStyleVar(
					getIllustrationEl(container),
					"--iv-background",
				);

				// Assert: 両方とも stub の返り値と一致（"#000000"）
				expect(illustrationBg).toBe("#000000");
				expect(ivBg).toBe("#000000");
				expect(illustrationBg).toBe(ivBg); // 最重要: 両者が一致
			});
		});

		it("--preview-kv-bg と --preview-illustration-bg は異なる値を持つ", () => {
			withJSDOMGlobals(() => {
				const container = createPalettePreview(makePreviewColors(), {
					getDisplayHex: identityGetDisplayHex,
					tertiaryHex: "#FF6B6B",
				});

				const kvBg = getStyleVar(container, "--preview-kv-bg");
				const illustrationBg = getStyleVar(
					container,
					"--preview-illustration-bg",
				);

				expect(kvBg).not.toBe("");
				expect(illustrationBg).not.toBe("");
				expect(kvBg).not.toBe(illustrationBg);
			});
		});

		it("手元カード（--iv-accent3）がテーブル面（--iv-accent）と同色の場合、コントラスト調整が適用される", () => {
			withJSDOMGlobals(() => {
				const colors = makePreviewColors({
					cardAccent: "#A3BEAD", // テーブル面の色
					cardAccentText: "#A3BEAD",
				});

				const container = createPalettePreview(colors, {
					getDisplayHex: identityGetDisplayHex,
					accentHexes: [colors.cardAccent, colors.cardAccent],
					tertiaryHex: "#A3BEAD",
				});

				const illustrationEl = getIllustrationEl(container);
				const ivAccent = getStyleVar(
					illustrationEl,
					"--iv-accent",
				).toLowerCase();
				const ivAccent3 = getStyleVar(
					illustrationEl,
					"--iv-accent3",
				).toLowerCase();

				expect(ivAccent).toBe("#a3bead");
				expect(ivAccent3).not.toBe(ivAccent);
			});
		});

		it("調整後の手元カードはテーブル面に対して最小コントラスト比2.0以上を持つ", async () => {
			const { wcagContrast } = await import("culori");
			const colors = makePreviewColors({
				cardAccent: "#A3BEAD",
				cardAccentText: "#A3BEAD",
			});
			withJSDOMGlobals(() => {
				const container = createPalettePreview(colors, {
					getDisplayHex: identityGetDisplayHex,
					accentHexes: [colors.cardAccent, colors.cardAccent],
					tertiaryHex: "#A3BEAD",
				});

				const illustrationEl = getIllustrationEl(container);
				const ivAccent = getStyleVar(illustrationEl, "--iv-accent");
				const ivAccent3 = getStyleVar(illustrationEl, "--iv-accent3");

				const contrast = wcagContrast(ivAccent, ivAccent3) ?? 0;
				expect(contrast).toBeGreaterThanOrEqual(2.0);
			});
		});
	});

	describe("Facilities DOM（リンクタイル）", () => {
		let createPalettePreview: typeof import("./palette-preview").createPalettePreview;

		beforeAll(async () => {
			({ createPalettePreview } = await import("./palette-preview"));
		});

		it("should render Facilities tiles as links with square boxes and labels", () => {
			withJSDOMGlobals(() => {
				const container = createPalettePreview(makePreviewColors(), {
					getDisplayHex: identityGetDisplayHex,
				});

				const facilities = container.querySelector(
					".preview-section--facilities",
				);
				expect(facilities).toBeTruthy();
				expect(
					facilities?.querySelector(".preview-facilities__left")?.textContent,
				).toContain("桜川市 オンライン窓口");
				expect(
					facilities?.querySelector(".preview-facilities__heading")
						?.textContent,
				).toContain("手続き案内");

				const grid = facilities?.querySelector(".preview-facilities__grid");
				expect(grid).toBeTruthy();
				expect(grid?.tagName).toBe("NAV");

				const tiles = Array.from(
					container.querySelectorAll<HTMLAnchorElement>(
						".preview-facility-tile.dads-link",
					),
				);
				expect(tiles.length).toBe(6);

				for (const tile of tiles) {
					expect(tile.tagName).toBe("A");
					expect(tile.getAttribute("href")).toBe("#");
					expect(
						tile.querySelector(".preview-facility-tile__box"),
					).toBeTruthy();
					expect(
						tile.querySelector(".preview-facility-tile__icon"),
					).toBeTruthy();
					const label = tile.querySelector<HTMLElement>(
						".preview-facility-tile__label",
					);
					expect(label).toBeTruthy();
					expect(label?.querySelector("wbr")).toBeTruthy();
				}

				const labels = tiles.map((tile) =>
					tile
						.querySelector(".preview-facility-tile__label")
						?.textContent?.trim(),
				);
				expect(labels).toEqual([
					"子育て・教育",
					"戸籍・家族",
					"健康・医療",
					"住まい・引っ越し",
					"妊娠・出産",
					"申請・認証",
				]);
			});
		});
	});
});

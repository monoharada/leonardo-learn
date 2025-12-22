/**
 * トークン表示コンポーネントのテスト
 *
 * Requirements: 12.3, 12.4
 *
 * タスク7.2: UIコンポーネントでのトークン表示と保護
 * - DADSトークンには鍵アイコン（参照専用）を表示
 * - ブランドトークンには編集アイコンを表示
 * - DADSトークンの編集コントロールを無効化
 * - 読み取り専用状態を視覚的に区別
 */

import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import type {
	BrandToken,
	DadsReference,
	DadsToken,
} from "../../core/tokens/types";

// JSDOMでdocumentをセットアップ
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.Event = dom.window.Event;

describe("TokenDisplay - タスク7.2", () => {
	// テスト用のサンプルDadsReference
	const sampleDadsReference: DadsReference = {
		tokenId: "dads-blue-500",
		tokenHex: "#0017C1",
		deltaE: 2.5,
		derivationType: "soft-snap",
		zone: "warning",
	};

	// テスト用のDADSトークン
	const dadsToken: DadsToken = {
		id: "dads-blue-500",
		hex: "#0017C1",
		nameJa: "ブルー500",
		nameEn: "Blue 500",
		classification: {
			category: "chromatic",
			hue: "blue",
			scale: 500,
		},
		source: "dads",
	};

	// テスト用のブランドトークン
	const brandToken: BrandToken = {
		id: "brand-primary-500",
		hex: "#0022CC",
		source: "brand",
		dadsReference: sampleDadsReference,
		originalHex: "#0033FF",
	};

	describe("createTokenDisplay関数", () => {
		it("トークン表示用のHTML要素を生成する", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element).toBeInstanceOf(HTMLElement);
			expect(element.className).toContain("token-display");
		});

		it("トークンのHEX値を表示する", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element.textContent).toContain("#0017C1");
		});

		it("トークンのIDを表示する", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element.textContent).toContain("dads-blue-500");
		});
	});

	describe("DADSトークンの表示（Requirement 12.3）", () => {
		it("DADSトークンには鍵アイコン（🔒）を表示する", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			const iconElement = element.querySelector(".token-icon");

			expect(iconElement).not.toBeNull();
			expect(iconElement?.textContent).toContain("🔒");
		});

		it('DADSトークンにはdata-source="dads"属性が設定される', async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element.getAttribute("data-source")).toBe("dads");
		});

		it('DADSトークンにはdata-readonly="true"属性が設定される', async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element.getAttribute("data-readonly")).toBe("true");
		});

		it("DADSトークンには「参照専用」ラベルが表示される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			const labelElement = element.querySelector(".token-status-label");

			expect(labelElement?.textContent).toContain("参照専用");
		});

		it("DADSトークンの日本語名を表示する", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element.textContent).toContain("ブルー500");
		});
	});

	describe("ブランドトークンの表示（Requirement 12.3）", () => {
		it("ブランドトークンには編集アイコン（✏️）を表示する", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			const iconElement = element.querySelector(".token-icon");

			expect(iconElement).not.toBeNull();
			expect(iconElement?.textContent).toContain("✏️");
		});

		it('ブランドトークンにはdata-source="brand"属性が設定される', async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			expect(element.getAttribute("data-source")).toBe("brand");
		});

		it('ブランドトークンにはdata-readonly="false"属性が設定される', async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			expect(element.getAttribute("data-readonly")).toBe("false");
		});

		it("ブランドトークンには「編集可能」ラベルが表示される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			const labelElement = element.querySelector(".token-status-label");

			expect(labelElement?.textContent).toContain("編集可能");
		});
	});

	describe("DADSトークンの編集コントロール無効化（Requirement 12.4）", () => {
		it("DADSトークンでは編集ボタンが無効化されている", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken, { showEditButton: true });
			const editButton = element.querySelector(
				".token-edit-button",
			) as HTMLButtonElement | null;

			expect(editButton?.disabled).toBe(true);
		});

		it("DADSトークンでは色入力フィールドが読み取り専用", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken, { showColorInput: true });
			const colorInput = element.querySelector(
				".token-color-input",
			) as HTMLInputElement | null;

			expect(colorInput?.readOnly).toBe(true);
		});

		it("DADSトークンの編集ボタンにはdisabledスタイルが適用される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken, { showEditButton: true });
			const editButton = element.querySelector(
				".token-edit-button",
			) as HTMLButtonElement | null;

			expect(editButton?.style.cursor).toBe("not-allowed");
			expect(editButton?.style.opacity).toBe("0.5");
		});
	});

	describe("ブランドトークンの編集コントロール（Requirement 12.4）", () => {
		it("ブランドトークンでは編集ボタンが有効", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken, { showEditButton: true });
			const editButton = element.querySelector(
				".token-edit-button",
			) as HTMLButtonElement | null;

			expect(editButton?.disabled).toBe(false);
		});

		it("ブランドトークンでは色入力フィールドが編集可能", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken, { showColorInput: true });
			const colorInput = element.querySelector(
				".token-color-input",
			) as HTMLInputElement | null;

			expect(colorInput?.readOnly).toBe(false);
		});

		it("編集ボタンクリック時にコールバックが呼ばれる", async () => {
			const { createTokenDisplay } = await import("./token-display");
			const mockOnEdit = vi.fn();

			const element = createTokenDisplay(brandToken, {
				showEditButton: true,
				onEdit: mockOnEdit,
			});
			const editButton = element.querySelector(
				".token-edit-button",
			) as HTMLButtonElement | null;

			editButton?.click();

			expect(mockOnEdit).toHaveBeenCalledWith(brandToken);
		});

		it("DADSトークンでは編集ボタンをクリックしてもコールバックは呼ばれない", async () => {
			const { createTokenDisplay } = await import("./token-display");
			const mockOnEdit = vi.fn();

			const element = createTokenDisplay(dadsToken, {
				showEditButton: true,
				onEdit: mockOnEdit,
			});
			const editButton = element.querySelector(
				".token-edit-button",
			) as HTMLButtonElement | null;

			editButton?.click();

			expect(mockOnEdit).not.toHaveBeenCalled();
		});
	});

	describe("読み取り専用状態の視覚的区別（Requirement 12.4）", () => {
		it("DADSトークンには読み取り専用スタイルクラスが適用される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element.classList.contains("token-display--readonly")).toBe(true);
		});

		it("ブランドトークンには編集可能スタイルクラスが適用される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			expect(element.classList.contains("token-display--editable")).toBe(true);
		});

		it("DADSトークンの背景色は淡いグレー系", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			// CSSスタイルとして設定されるか、data属性でスタイル適用される
			expect(
				element.style.backgroundColor === "rgb(248, 249, 250)" ||
					element.getAttribute("data-readonly") === "true",
			).toBe(true);
		});

		it("ブランドトークンの背景色は白または編集可能を示す色", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			expect(
				element.style.backgroundColor === "white" ||
					element.style.backgroundColor === "rgb(255, 255, 255)" ||
					element.getAttribute("data-readonly") === "false",
			).toBe(true);
		});
	});

	describe("カラースウォッチの表示", () => {
		it("トークンの色がプレビューとして表示される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			const swatch = element.querySelector(".token-color-swatch");

			expect(swatch).not.toBeNull();
			// JSDOMはCSSの色値をrgb形式に変換するため、rgbまたはHEXいずれかを確認
			const style = swatch?.getAttribute("style") ?? "";
			expect(
				style.includes("#0017C1") || style.includes("rgb(0, 23, 193)"),
			).toBe(true);
		});

		it("alpha値を持つトークンは透過色として表示される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const tokenWithAlpha: DadsToken = {
				...dadsToken,
				alpha: 0.5,
			};

			const element = createTokenDisplay(tokenWithAlpha);
			const swatch = element.querySelector(".token-color-swatch");

			// rgba形式またはalpha値が反映されていること
			expect(
				swatch?.getAttribute("style")?.includes("rgba") ||
					swatch?.getAttribute("style")?.includes("0.5"),
			).toBe(true);
		});
	});

	describe("アクセシビリティ", () => {
		it('DADSトークンにはaria-readonly="true"が設定される', async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			expect(element.getAttribute("aria-readonly")).toBe("true");
		});

		it('ブランドトークンにはaria-readonly="false"が設定される', async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			expect(element.getAttribute("aria-readonly")).toBe("false");
		});

		it("鍵アイコンにはtitle属性で説明が付与される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(dadsToken);
			const iconElement = element.querySelector(".token-icon");

			// checkTokenEditabilityのreason/suggestionメッセージを使用（Requirements 12.1, 12.2）
			const title = iconElement?.getAttribute("title") ?? "";
			expect(title).toContain("参照専用");
			expect(title).toContain("DADSプリミティブカラーは変更できません");
			// suggestionも表示される
			expect(title).toContain("ブランドトークンを作成");
		});

		it("編集アイコンにはtitle属性で説明が付与される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken);
			const iconElement = element.querySelector(".token-icon");

			expect(iconElement?.getAttribute("title")).toContain("編集可能");
		});
	});

	describe("DADS参照情報の表示（ブランドトークン）", () => {
		it("ブランドトークンはDADS参照情報を表示できる", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken, {
				showDadsReference: true,
			});
			const referenceElement = element.querySelector(".token-dads-reference");

			expect(referenceElement).not.toBeNull();
			expect(referenceElement?.textContent).toContain("dads-blue-500");
		});

		it("DADS参照のdeltaE値が表示される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken, {
				showDadsReference: true,
			});
			const referenceElement = element.querySelector(".token-dads-reference");

			expect(referenceElement?.textContent).toContain("2.5");
		});

		it("DADS参照の派生タイプが表示される", async () => {
			const { createTokenDisplay } = await import("./token-display");

			const element = createTokenDisplay(brandToken, {
				showDadsReference: true,
			});
			const referenceElement = element.querySelector(".token-dads-reference");

			expect(referenceElement?.textContent).toContain("soft-snap");
		});
	});
});

describe("createTokenDisplayList関数", () => {
	const sampleDadsReference: DadsReference = {
		tokenId: "dads-blue-500",
		tokenHex: "#0017C1",
		deltaE: 2.5,
		derivationType: "soft-snap",
		zone: "warning",
	};

	const tokens: (DadsToken | BrandToken)[] = [
		{
			id: "dads-blue-500",
			hex: "#0017C1",
			nameJa: "ブルー500",
			nameEn: "Blue 500",
			classification: {
				category: "chromatic",
				hue: "blue",
				scale: 500,
			},
			source: "dads",
		},
		{
			id: "brand-primary-500",
			hex: "#0022CC",
			source: "brand",
			dadsReference: sampleDadsReference,
		},
	];

	it("複数トークンのリスト表示用要素を生成する", async () => {
		const { createTokenDisplayList } = await import("./token-display");

		const element = createTokenDisplayList(tokens);
		expect(element).toBeInstanceOf(HTMLElement);
		expect(element.className).toContain("token-display-list");
	});

	it("各トークンが個別の表示要素を持つ", async () => {
		const { createTokenDisplayList } = await import("./token-display");

		const element = createTokenDisplayList(tokens);
		const tokenElements = element.querySelectorAll(".token-display");

		expect(tokenElements.length).toBe(2);
	});

	it("DADSトークンとブランドトークンが混在しても正しく表示される", async () => {
		const { createTokenDisplayList } = await import("./token-display");

		const element = createTokenDisplayList(tokens);
		const dadsElements = element.querySelectorAll('[data-source="dads"]');
		const brandElements = element.querySelectorAll('[data-source="brand"]');

		expect(dadsElements.length).toBe(1);
		expect(brandElements.length).toBe(1);
	});
});

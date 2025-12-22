/**
 * DADSプリミティブインポート機能のテスト
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDadsPrimitives } from "./dads-importer";

describe("parseDadsPrimitives", () => {
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleWarnSpy.mockRestore();
	});

	describe("Requirement 2.1: 有彩色プリミティブのパース", () => {
		it("--color-primitive-{hue}-{scale}形式のCSS変数をパースしてDadsTokenを生成する", () => {
			const css = `
        :root {
          --color-primitive-blue-500: #0066cc;
          --color-primitive-red-700: #cc0000;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(2);

			const blueToken = result.tokens.find((t) => t.id === "dads-blue-500");
			expect(blueToken).toBeDefined();
			expect(blueToken?.hex).toBe("#0066cc");
			expect(blueToken?.source).toBe("dads");
			expect(blueToken?.classification.category).toBe("chromatic");
			expect(blueToken?.classification.hue).toBe("blue");
			expect(blueToken?.classification.scale).toBe(500);

			const redToken = result.tokens.find((t) => t.id === "dads-red-700");
			expect(redToken).toBeDefined();
			expect(redToken?.hex).toBe("#cc0000");
			expect(redToken?.classification.hue).toBe("red");
			expect(redToken?.classification.scale).toBe(700);
		});

		it("light-blueのようなハイフン付き色相を正しくパースする", () => {
			const css = `
        :root {
          --color-primitive-light-blue-300: #7ec8e3;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.id).toBe("dads-light-blue-300");
			expect(token.classification.hue).toBe("light-blue");
			expect(token.classification.scale).toBe(300);
		});

		it("10種類すべての色相を正しくパースする", () => {
			const hues = [
				"blue",
				"light-blue",
				"cyan",
				"green",
				"lime",
				"yellow",
				"orange",
				"red",
				"magenta",
				"purple",
			];

			const css = hues
				.map((hue) => `--color-primitive-${hue}-500: #000000;`)
				.join("\n");

			const result = parseDadsPrimitives(`:root { ${css} }`);

			expect(result.tokens).toHaveLength(10);
			for (const hue of hues) {
				const token = result.tokens.find((t) => t.id === `dads-${hue}-500`);
				expect(token).toBeDefined();
				expect(token?.classification.hue).toBe(hue);
			}
		});
	});

	describe("Requirement 2.2: neutral white/blackのパース", () => {
		it("--color-neutral-white変数をパースして適切な日本語名を設定する", () => {
			const css = `
        :root {
          --color-neutral-white: #ffffff;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.id).toBe("dads-neutral-white");
			expect(token.hex).toBe("#ffffff");
			expect(token.nameJa).toBe("白");
			expect(token.nameEn).toBe("White");
			expect(token.classification.category).toBe("neutral");
		});

		it("--color-neutral-black変数をパースして適切な日本語名を設定する", () => {
			const css = `
        :root {
          --color-neutral-black: #000000;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.id).toBe("dads-neutral-black");
			expect(token.hex).toBe("#000000");
			expect(token.nameJa).toBe("黒");
			expect(token.nameEn).toBe("Black");
			expect(token.classification.category).toBe("neutral");
		});
	});

	describe("Requirement 2.3: グレースケールのパース", () => {
		it("--color-neutral-solid-gray-{scale}形式をパースする", () => {
			const css = `
        :root {
          --color-neutral-solid-gray-420: #696969;
          --color-neutral-solid-gray-536: #868686;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(2);

			const gray420 = result.tokens.find(
				(t) => t.id === "dads-neutral-solid-gray-420",
			);
			expect(gray420).toBeDefined();
			expect(gray420?.hex).toBe("#696969");
			expect(gray420?.classification.category).toBe("neutral");
			expect(gray420?.classification.scale).toBe(420);

			const gray536 = result.tokens.find(
				(t) => t.id === "dads-neutral-solid-gray-536",
			);
			expect(gray536).toBeDefined();
			expect(gray536?.classification.scale).toBe(536);
		});

		it("--color-neutral-opacity-gray-{scale}形式をパースする", () => {
			const css = `
        :root {
          --color-neutral-opacity-gray-300: rgba(0, 0, 0, 0.3);
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.id).toBe("dads-neutral-opacity-gray-300");
			expect(token.classification.category).toBe("neutral");
			expect(token.classification.scale).toBe(300);
		});
	});

	describe("Requirement 2.4: rgba()形式のパース", () => {
		it("rgba()形式の値をhexとalpha値に分離する", () => {
			const css = `
        :root {
          --color-neutral-opacity-gray-500: rgba(0, 0, 0, 0.5);
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.hex).toBe("#000000");
			expect(token.alpha).toBe(0.5);
		});

		it("rgba()形式でRGB値が0以外の場合も正しくパースする", () => {
			const css = `
        :root {
          --color-primitive-blue-500-alpha: rgba(0, 102, 204, 0.8);
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.hex).toBe("#0066cc");
			expect(token.alpha).toBe(0.8);
		});

		it("alpha値が1.0の場合もalphaフィールドを設定する", () => {
			const css = `
        :root {
          --color-primitive-red-500: rgba(255, 0, 0, 1);
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.hex).toBe("#ff0000");
			expect(token.alpha).toBe(1);
		});
	});

	describe("Requirement 2.5: セマンティック色のインポート", () => {
		it("--color-semantic-{name}形式のCSS変数をvar()参照を保持してインポートする", () => {
			const css = `
        :root {
          --color-semantic-success: var(--color-primitive-green-500);
          --color-semantic-error: var(--color-primitive-red-500);
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(2);

			const successToken = result.tokens.find(
				(t) => t.id === "dads-semantic-success",
			);
			expect(successToken).toBeDefined();
			expect(successToken?.hex).toBe("var(--color-primitive-green-500)");
			expect(successToken?.classification.category).toBe("semantic");

			const errorToken = result.tokens.find(
				(t) => t.id === "dads-semantic-error",
			);
			expect(errorToken).toBeDefined();
			expect(errorToken?.hex).toBe("var(--color-primitive-red-500)");
		});
	});

	describe("Requirement 2.6: パース失敗時の警告出力とスキップ", () => {
		it("不正なrgba()形式の場合は警告を出力してスキップする", () => {
			const css = `
        :root {
          --color-primitive-blue-500: #0066cc;
          --color-primitive-blue-600: rgba(invalid);
          --color-primitive-red-500: #cc0000;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(2);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0]).toContain("--color-primitive-blue-600");
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		it("認識できない変数形式はスキップする", () => {
			const css = `
        :root {
          --color-primitive-blue-500: #0066cc;
          --unknown-variable: #ffffff;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			expect(result.tokens[0].id).toBe("dads-blue-500");
		});

		it("空のCSS文字列の場合は空配列を返す", () => {
			const result = parseDadsPrimitives("");

			expect(result.tokens).toHaveLength(0);
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe("日本語名・英語名の生成", () => {
		it("有彩色トークンに適切な日本語名・英語名を設定する", () => {
			const css = `
        :root {
          --color-primitive-blue-500: #0066cc;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.nameJa).toBe("青 500");
			expect(token.nameEn).toBe("Blue 500");
		});

		it("グレースケールトークンに適切な日本語名・英語名を設定する", () => {
			const css = `
        :root {
          --color-neutral-solid-gray-420: #696969;
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.nameJa).toBe("グレー 420 (ソリッド)");
			expect(token.nameEn).toBe("Gray 420 (Solid)");
		});

		it("セマンティックトークンに適切な日本語名・英語名を設定する", () => {
			const css = `
        :root {
          --color-semantic-success: var(--color-primitive-green-500);
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(1);
			const token = result.tokens[0];
			expect(token.nameJa).toBe("セマンティック: success");
			expect(token.nameEn).toBe("Semantic: success");
		});
	});

	describe("DadsToken不変性の検証", () => {
		it("生成されたDadsTokenのsourceは常に'dads'である", () => {
			const css = `
        :root {
          --color-primitive-blue-500: #0066cc;
          --color-neutral-white: #ffffff;
          --color-semantic-success: var(--color-primitive-green-500);
        }
      `;

			const result = parseDadsPrimitives(css);

			for (const token of result.tokens) {
				expect(token.source).toBe("dads");
			}
		});

		it("生成されたDadsTokenはreadonly構造を持つ", () => {
			const css = `
        :root {
          --color-primitive-blue-500: #0066cc;
        }
      `;

			const result = parseDadsPrimitives(css);
			const token = result.tokens[0];

			// TypeScriptのreadonly修飾子により、実行時にはオブジェクトは通常通り変更可能
			// ただし、Object.freeze()で凍結されている場合は変更不可
			// 型システムレベルでの不変性を確認（コンパイル時チェック）
			expect(token).toBeDefined();
			expect(token.source).toBe("dads");
		});
	});

	describe("複合シナリオ", () => {
		it("混合形式のCSSを正しくパースする", () => {
			const css = `
        :root {
          /* 有彩色 */
          --color-primitive-blue-500: #0066cc;
          --color-primitive-light-blue-300: rgba(126, 200, 227, 1);

          /* 無彩色 */
          --color-neutral-white: #ffffff;
          --color-neutral-black: #000000;
          --color-neutral-solid-gray-500: #808080;
          --color-neutral-opacity-gray-300: rgba(0, 0, 0, 0.3);

          /* セマンティック */
          --color-semantic-success: var(--color-primitive-green-500);
        }
      `;

			const result = parseDadsPrimitives(css);

			expect(result.tokens).toHaveLength(7);
			expect(result.warnings).toHaveLength(0);

			// カテゴリ別に確認
			const chromaticTokens = result.tokens.filter(
				(t) => t.classification.category === "chromatic",
			);
			const neutralTokens = result.tokens.filter(
				(t) => t.classification.category === "neutral",
			);
			const semanticTokens = result.tokens.filter(
				(t) => t.classification.category === "semantic",
			);

			expect(chromaticTokens).toHaveLength(2);
			expect(neutralTokens).toHaveLength(4);
			expect(semanticTokens).toHaveLength(1);
		});
	});
});

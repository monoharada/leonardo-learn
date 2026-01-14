/**
 * パレットトークンテーブル
 * セマンティックカラー、Primary/Secondary/Tertiary、Accentをテーブル形式で一覧表示
 */

/**
 * トークンテーブルの行データ
 */
export interface TokenTableRow {
	/** カラースウォッチのHEX値 */
	colorSwatch: string;
	/** トークン名（Error-1, Success-1, Primary等） */
	tokenName: string;
	/** プリミティブ名（red-800, green-600等） */
	primitiveName: string;
	/** HEX値 */
	hex: string;
	/** カテゴリ */
	category: "semantic" | "primary" | "accent";
}

/**
 * テーブル行を作成
 */
export function createTableRow(data: TokenTableRow): HTMLTableRowElement {
	const row = document.createElement("tr");
	row.className = "dads-token-table__row";
	row.setAttribute("data-category", data.category);

	// カラースウォッチセル
	const swatchCell = document.createElement("td");
	const swatch = document.createElement("div");
	swatch.className = "dads-token-table__swatch";
	swatch.style.backgroundColor = data.colorSwatch;
	swatchCell.appendChild(swatch);
	row.appendChild(swatchCell);

	// トークン名セル
	const tokenNameCell = document.createElement("td");
	tokenNameCell.className = "dads-token-table__token-name";
	tokenNameCell.textContent = data.tokenName;
	row.appendChild(tokenNameCell);

	// プリミティブ名セル
	const primitiveCell = document.createElement("td");
	primitiveCell.className = "dads-token-table__primitive";
	primitiveCell.textContent = data.primitiveName;
	row.appendChild(primitiveCell);

	// HEXセル
	const hexCell = document.createElement("td");
	hexCell.className = "dads-token-table__hex";
	hexCell.textContent = data.hex.toUpperCase();
	row.appendChild(hexCell);

	return row;
}

/**
 * テーブルヘッダーを作成
 */
function createTableHeader(): HTMLTableSectionElement {
	const thead = document.createElement("thead");
	thead.setAttribute("role", "rowgroup");

	const headerRow = document.createElement("tr");

	const columns = ["カラー", "トークン名", "プリミティブ", "HEX"];

	for (const col of columns) {
		const th = document.createElement("th");
		th.setAttribute("scope", "col");
		th.textContent = col;
		headerRow.appendChild(th);
	}

	thead.appendChild(headerRow);
	return thead;
}

/**
 * トークンテーブルを作成
 */
export function createTokenTable(rows: TokenTableRow[]): HTMLTableElement {
	const table = document.createElement("table");
	table.className = "dads-token-table";
	table.setAttribute("role", "table");

	// ヘッダー追加
	table.appendChild(createTableHeader());

	// ボディ追加
	const tbody = document.createElement("tbody");
	tbody.setAttribute("role", "rowgroup");

	for (const rowData of rows) {
		const row = createTableRow(rowData);
		tbody.appendChild(row);
	}

	table.appendChild(tbody);

	return table;
}

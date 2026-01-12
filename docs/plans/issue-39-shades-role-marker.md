# Issue #39: Shades view のロールマーク位置ずれ 修正プラン

## 0. 背景 / 症状

ハーモニービューで選択された色（例: `lime-1100`, `lime-1200`, `green-1100`）が、シェードビューで **別のスケール位置**（例: `green-800`）に円形マークとして表示される。

期待:
- `green-1100` に円形マーク

実際:
- `green-800` に円形マーク（DADS既定ロールの位置）

## 1. 原因整理（現行コードベース）

### 1.1 `createPalettesFromHarmonyColors` が `harmony: DADS` 固定

`src/ui/demo/palette-generator.ts` の `createPalettesFromHarmonyColors()` が、ハーモニービュー経由で作る `Primary` / `Accent` パレットの `harmony` を常に `HarmonyType.DADS` にしている。

この結果、シェードビューは「DADSモード」と判定し、DADS既定の `DADS_COLORS` ロール（例: `Accent-Green` = `green-800`）が優先表示されてしまう。

### 1.2 `role-mapper` が DADS 以外で空Mapを返す

`src/core/semantic-role/role-mapper.ts` の `generateRoleMapping()` が `harmonyType !== HarmonyType.DADS` で即 return するため、
「`harmony` を正しく直す」だけだと **ブランドロール（Primary/Accent等）の円形化が一切起きない**。

### 1.3 シェードビューが `state.shadesPalettes` のみをロール入力にしている

`src/ui/demo/views/shades-view.ts` が `palettesInfo` を `state.shadesPalettes` から作っている。

ハーモニービュー（アクセント選定）経由のフローでは `state.shadesPalettes` が生成されないため、`role-mapper` に「選択した色の `baseChromaName/step`」が届かず、結果として **DADS既定ロールだけが表示**される。

## 2. 目標仕様（このIssueでの到達点）

1. **DADSセマンティック/リンク/アクセントの既定ロール**は、`HarmonyType.DADS` のときのみ表示する（現仕様維持）。
2. **ブランドロール（Primary/Secondary/Accent-*）**は、`HarmonyType` に依存せず表示できるようにする。
3. 円形化（`dads-swatch--circular`）は **ブランドロールのみ**（primary/secondary/accent）に限定する。
4. ハーモニービューで選んだ色は、DADS Hue/Scale に解決できる場合は必ず `"{hue}-{step}"` の正しい位置で円形化される。

## 3. 実装方針（差分を最小にしつつ精度を上げる）

### Step 1: ハーモニービュー生成パレットの `harmony` を正しく設定する

対象: `src/ui/demo/palette-generator.ts`

- `createPalettesFromHarmonyColors(harmonyType: HarmonyFilterType, ...)` で
  - `Primary` の `harmony` を `HarmonyFilterType -> HarmonyType` に変換して設定
  - 変換できないタイプ（`monochromatic`/`shades`/`compound` 等）は `HarmonyType.NONE` 扱いにする
- `Accent` パレットの `harmony` は `HarmonyType.NONE` でよい（ロール表示は `baseChromaName/step` に依存するため）

目的:
- シェードビュー側が DADS と誤判定しないようにする（= DADS既定ロールが勝たないようにする）

### Step 2: シェードビューのロール入力をフォールバック対応にする

対象: `src/ui/demo/views/shades-view.ts`

- `palettesInfo` を作る元を
  - `state.shadesPalettes.length > 0 ? state.shadesPalettes : state.palettes`
  にする
- さらにノイズを減らすなら、`Primary`/`Secondary`/`Accent*` のみに絞って `PaletteInfo` 化する

目的:
- ハーモニービュー経由でも「選択色の `baseChromaName/step`」を `role-mapper` に渡す

### Step 3: `role-mapper` を “DADSロール” と “ブランドロール” に分離して登録する

対象: `src/core/semantic-role/role-mapper.ts`

- `harmonyType === HarmonyType.DADS` のときだけ `DADS_COLORS` を登録
- `Primary` / `Secondary` / `Accent*` のブランドロールは **全ハーモニータイプで登録**

目的:
- DADS以外でも正しい `{hue}-{step}` にブランドロールを紐付けられるようにする

### Step 4: 円形化の条件をブランドロールのみに限定する

対象: `src/ui/semantic-role/semantic-role-overlay.ts`

- `applyOverlay()` 内の円形化条件を
  - `priorityRole.category in (primary|secondary|accent)` のときだけ有効化
- `semantic` / `link` は円形化しない（オーバーレイ/ツールチップ更新は継続）

目的:
- DADS既定の `Accent-*`（仕様ロール）や `Success` 等で「意図しない円形」が出ないようにする

## 4. テスト方針（回帰を防ぐ最小セット）

### 4.1 `role-mapper` のユニットテスト追加/修正

対象: `src/core/semantic-role/role-mapper.test.ts`

- 既存の「非DADSは空Map」系テストは、ブランドロールがある場合は空でなくなるため更新
- 追加ケース（例）:
  - `HarmonyType.ANALOGOUS` でも `{ name: "Accent-2", baseChromaName: "Green", step: 1100 }` が `green-1100` に登録される

### 4.2 シェードビュー統合テスト

対象: `src/ui/semantic-role/shades-view-integration.test.ts`

- `semantic` ロールが円形化されないこと
- `primary/secondary/accent` が円形化されること

### 4.3 シェードビュー単体（最小）

対象: `src/ui/demo/views/shades-view.test.ts`

- “`state.shadesPalettes` が空でも `state.palettes` から `palettesInfo` を作る” をコード上で検出できる形にする（文字列検査 or 追加の軽いモック）

## 5. 受け入れ条件（手動確認）

1. ハーモニービューで `analogous` 等を選び、生成後にシェードビューへ遷移する
2. 選択したアクセント色（例: `Green 1100`）のスウォッチ（`data-testid="swatch-green-1100"` 相当）に円形マークが付く
3. `Green 800` 等のDADS既定ロール位置に “勝手な円形” が出ない

## 6. 注意点

- `HarmonyFilterType` と `HarmonyType` は表現域が一致しない（`monochromatic` 等）ため、変換不能タイプは `HarmonyType.NONE` に落とす。
- `baseChromaName` は DADS の表示名（`"Light Blue"` 等）で `normalizeToDadsHue()` が解決できる形にする（候補由来の `dadsSourceName` を優先）。

